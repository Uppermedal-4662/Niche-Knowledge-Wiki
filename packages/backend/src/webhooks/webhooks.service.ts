import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async handleClerkWebhook(body: any): Promise<{ received: boolean }> {
    const event = body;

    switch (event.type) {
      case 'organization.created':
        await this.prisma.organization.create({
          data: {
            id: event.data.id,
            name: event.data.name,
            slug: event.data.slug,
          },
        });
        break;

      case 'organization.updated':
        await this.prisma.organization.update({
          where: { id: event.data.id },
          data: { name: event.data.name, slug: event.data.slug },
        });
        break;

      case 'organization.deleted':
        await this.prisma.organization.update({
          where: { id: event.data.id },
          data: { status: 'SUSPENDED' },
        });
        break;

      case 'user.created':
        await this.prisma.user.create({
          data: {
            id: event.data.id,
            email: event.data.email_addresses?.[0]?.email_address ?? '',
            name: [event.data.first_name, event.data.last_name].filter(Boolean).join(' ') || null,
            clerkId: event.data.id,
          },
        });
        break;

      case 'user.updated':
        await this.prisma.user.update({
          where: { clerkId: event.data.id },
          data: {
            email: event.data.email_addresses?.[0]?.email_address ?? '',
            name: [event.data.first_name, event.data.last_name].filter(Boolean).join(' ') || null,
          },
        });
        break;

      case 'organizationMembership.created':
        await this.prisma.organizationMembership.create({
          data: {
            organizationId: event.data.organization.id,
            userId: event.data.user.id,
            role: (event.data.role ?? 'MEMBER').toUpperCase(),
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
          data: { role: (event.data.role ?? 'MEMBER').toUpperCase() },
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
}
