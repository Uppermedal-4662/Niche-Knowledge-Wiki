import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { Plan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
  }

  async createCheckoutSession(organizationId: string, priceId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new InternalServerErrorException('Organization not found');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: org.stripeCustomerId ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: organizationId,
      success_url: `${process.env.FRONTEND_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/billing?canceled=true`,
    });
    return { url: session.url };
  }

  async createPortalSession(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org?.stripeCustomerId) throw new InternalServerErrorException('No Stripe customer found');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
    });
    return { url: session.url };
  }

  async getSubscription(organizationId: string) {
    return this.prisma.subscription.findUnique({ where: { organizationId } });
  }

  async activateSubscription(organizationId: string, subscriptionId: string, customerId: string) {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId: customerId, plan: Plan.PRO },
    });

    const sub = await this.stripe.subscriptions.retrieve(subscriptionId) as any;
    return this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        stripeSubscriptionId: subscriptionId,
        status: sub.status.toUpperCase() as SubscriptionStatus,
        seats: sub.items.data[0]?.quantity ?? 1,
        currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      },
      update: {
        stripeSubscriptionId: subscriptionId,
        status: sub.status.toUpperCase() as SubscriptionStatus,
        seats: sub.items.data[0]?.quantity ?? 1,
        currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      },
    });
  }

  async syncSubscription(subscriptionId: string) {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId) as any;
    const dbSub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!dbSub) return;

    return this.prisma.subscription.update({
      where: { id: dbSub.id },
      data: {
        status: sub.status.toUpperCase() as SubscriptionStatus,
        seats: sub.items.data[0]?.quantity ?? 1,
        currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      },
    });
  }

  async handleWebhook(rawBody: Buffer | undefined, sig: string | undefined) {
    if (!rawBody || !sig) throw new InternalServerErrorException('Missing webhook payload or signature');

    const event = this.stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '');
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.client_reference_id && session.subscription && session.customer) {
          await this.activateSubscription(
            session.client_reference_id,
            session.subscription.toString(),
            session.customer.toString(),
          );
        }
        break;
      case 'customer.subscription.updated':
        await this.syncSubscription((event.data.object as Stripe.Subscription).id);
        break;
      case 'customer.subscription.deleted':
        await this.cancelSubscription((event.data.object as Stripe.Subscription).id);
        break;
    }
    return { received: true };
  }

  async cancelSubscription(subscriptionId: string) {
    const dbSub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!dbSub) return;

    await this.prisma.subscription.update({
      where: { id: dbSub.id },
      data: { status: SubscriptionStatus.CANCELED },
    });

    await this.prisma.organization.update({
      where: { id: dbSub.organizationId },
      data: { plan: Plan.FREE },
    });
  }
}
