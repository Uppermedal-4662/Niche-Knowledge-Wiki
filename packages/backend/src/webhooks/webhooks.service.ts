import { Injectable } from '@nestjs/common';
import { MemberRole, OrgStatus } from '@prisma/client';
import { Webhook } from 'svix';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async handleClerkWebhook(
    rawBody: string,
    svixSignature: string,
    svixId: string,
    svixTimestamp: string,
  ): Promise<{ received: boolean }> {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET ?? '');
    let event: { type: string; data: Record<string, any> };
    try {
      const payload = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as any;
      event = payload;
    } catch {
      return { received: false };
    }

    switch (event.type) {
      case 'organization.created':
        await this.prisma.organization.create({
          data: {
            id: event.data.id,
            name: event.data.name as string,
            slug: event.data.slug as string,
          },
        });
        break;

      case 'organization.updated':
        await this.prisma.organization.update({
          where: { id: event.data.id },
          data: { name: event.data.name as string, slug: event.data.slug as string },
        });
        break;

      case 'organization.deleted':
        await this.prisma.organization.update({
          where: { id: event.data.id },
          data: { status: OrgStatus.SUSPENDED },
        });
        break;

      case 'user.created':
        await this.prisma.user.create({
          data: {
            id: event.data.id,
            email: (event.data.email_addresses as any[])?.[0]?.email_address ?? '',
            name: [event.data.first_name, event.data.last_name].filter(Boolean).join(' ') || null,
            clerkId: event.data.id,
          },
        });
        break;

      case 'user.updated':
        await this.prisma.user.update({
          where: { clerkId: event.data.id },
          data: {
            email: (event.data.email_addresses as any[])?.[0]?.email_address ?? '',
            name: [event.data.first_name, event.data.last_name].filter(Boolean).join(' ') || null,
          },
        });
        break;

      case 'organizationMembership.created':
        await this.prisma.organizationMembership.create({
          data: {
            organizationId: event.data.organization.id,
            userId: event.data.user.id,
            role: this.parseMemberRole(event.data.role as string),
          },
        });
        break;

      case 'organizationMembership.updated':
        await this.prisma.organizationMembership.update({
          where: {
            organizationId_userId: {
              organizationId: event.data.organization.id,
              userId: event.data.user.id,
            },
          },
          data: { role: this.parseMemberRole(event.data.role as string) },
        });
        break;

      case 'organizationMembership.deleted':
        await this.prisma.organizationMembership.delete({
          where: {
            organizationId_userId: {
              organizationId: event.data.organization.id,
              userId: event.data.user.id,
            },
          },
        });
        break;
    }

    return { received: true };
  }

  private parseMemberRole(role: string): MemberRole {
    const normalized = role.replace('org:', '').toUpperCase();
    if (normalized === 'ADMIN') return MemberRole.ADMIN;
    return MemberRole.MEMBER;
  }
}
