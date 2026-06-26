import { InternalServerErrorException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { createMockPrisma } from '../test/test-utils';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: { create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/abc' }) },
    },
    billingPortal: {
      sessions: { create: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/portal' }) },
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        items: { data: [{ quantity: 3 }] },
      }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

describe('BillingService', () => {
  let service: BillingService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let stripe: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    prisma = createMockPrisma();
    service = new BillingService(prisma);
    stripe = (service as any).stripe;
  });

  describe('createCheckoutSession', () => {
    it('should throw InternalServerErrorException when org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.createCheckoutSession('org-1', 'price_123')).rejects.toThrow(InternalServerErrorException);
    });

    it('should create checkout session with correct params', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1', stripeCustomerId: 'cus_abc' });
      const result = await service.createCheckoutSession('org-1', 'price_123');
      expect(result.url).toBe('https://checkout.stripe.com/abc');
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          customer: 'cus_abc',
          client_reference_id: 'org-1',
        }),
      );
    });

    it('should not set customer when stripeCustomerId is null', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1', stripeCustomerId: null });
      await service.createCheckoutSession('org-1', 'price_123');
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: undefined }),
      );
    });
  });

  describe('createPortalSession', () => {
    it('should throw when org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.createPortalSession('org-1')).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw when stripeCustomerId is null', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1', stripeCustomerId: null });
      await expect(service.createPortalSession('org-1')).rejects.toThrow(InternalServerErrorException);
    });

    it('should create portal session', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1', stripeCustomerId: 'cus_abc' });
      const result = await service.createPortalSession('org-1');
      expect(result.url).toBe('https://billing.stripe.com/portal');
    });
  });

  describe('getSubscription', () => {
    it('should return subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ id: 'sub-1', status: 'ACTIVE' });
      const result = await service.getSubscription('org-1');
      expect(result?.status).toBe('ACTIVE');
    });
  });

  describe('activateSubscription', () => {
    it('should update org plan to PRO and upsert subscription', async () => {
      prisma.organization.update.mockResolvedValue({});
      prisma.subscription.upsert.mockResolvedValue({});
      await service.activateSubscription('org-1', 'stripe-sub-1', 'cus_new');
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { stripeCustomerId: 'cus_new', plan: 'PRO' },
      });
      expect(prisma.subscription.upsert).toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it('should do nothing if subscription not in DB', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await service.cancelSubscription('stripe-sub-1');
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('should set status to CANCELED and plan to FREE', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ id: 'sub-1', organizationId: 'org-1' });
      prisma.subscription.update.mockResolvedValue({});
      prisma.organization.update.mockResolvedValue({});
      await service.cancelSubscription('stripe-sub-1');
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'CANCELED' },
      });
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { plan: 'FREE' },
      });
    });
  });

  describe('handleWebhook', () => {
    it('should throw when rawBody is missing', async () => {
      await expect(service.handleWebhook(undefined, 'sig')).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw when sig is missing', async () => {
      await expect(service.handleWebhook(Buffer.from('{}'), undefined)).rejects.toThrow(InternalServerErrorException);
    });

    it('should process checkout.session.completed', async () => {
      stripe.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'org-1',
            subscription: { toString: () => 'stripe-sub-1' },
            customer: { toString: () => 'cus_new' },
          },
        },
      });
      prisma.organization.update.mockResolvedValue({});
      prisma.subscription.upsert.mockResolvedValue({});
      const result = await service.handleWebhook(Buffer.from('{}'), 'sig');
      expect(result.received).toBe(true);
      expect(prisma.organization.update).toHaveBeenCalled();
    });

    it('should process customer.subscription.deleted', async () => {
      stripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'stripe-sub-1' } },
      });
      prisma.subscription.findUnique.mockResolvedValue({ id: 'sub-1', organizationId: 'org-1' });
      prisma.subscription.update.mockResolvedValue({});
      prisma.organization.update.mockResolvedValue({});
      const result = await service.handleWebhook(Buffer.from('{}'), 'sig');
      expect(result.received).toBe(true);
    });
  });
});
