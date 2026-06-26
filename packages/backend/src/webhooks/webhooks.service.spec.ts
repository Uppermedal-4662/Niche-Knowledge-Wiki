import { WebhooksService } from './webhooks.service';
import { createMockPrisma } from '../test/test-utils';
import { MemberRole, OrgStatus } from '@prisma/client';

jest.mock('svix', () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: jest.fn((body: string) => JSON.parse(body)),
  })),
}));

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test';
    prisma = createMockPrisma();
    service = new WebhooksService(prisma);
  });

  const fakeHeaders = {
    'svix-id': 'msg_1',
    'svix-timestamp': '1234567890',
    'svix-signature': 'v1,abc123',
  };

  describe('organization.created', () => {
    it('should create organization in DB', async () => {
      prisma.organization.create.mockResolvedValue({ id: 'org_1', name: 'Acme' });
      const event = { type: 'organization.created', data: { id: 'org_1', name: 'Acme', slug: 'acme' } };
      const result = await service.handleClerkWebhook(JSON.stringify(event), fakeHeaders['svix-signature'], fakeHeaders['svix-id'], fakeHeaders['svix-timestamp']);
      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: { id: 'org_1', name: 'Acme', slug: 'acme' },
      });
      expect(result.received).toBe(true);
    });
  });

  describe('organization.updated', () => {
    it('should update organization', async () => {
      prisma.organization.update.mockResolvedValue({});
      const event = { type: 'organization.updated', data: { id: 'org_1', name: 'Acme Inc', slug: 'acme-inc' } };
      await service.handleClerkWebhook(JSON.stringify(event), 'sig', 'id', 'ts');
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org_1' },
        data: { name: 'Acme Inc', slug: 'acme-inc' },
      });
    });
  });

  describe('organization.deleted', () => {
    it('should set status to SUSPENDED', async () => {
      prisma.organization.update.mockResolvedValue({});
      const event = { type: 'organization.deleted', data: { id: 'org_1' } };
      await service.handleClerkWebhook(JSON.stringify(event), 'sig', 'id', 'ts');
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org_1' },
        data: { status: OrgStatus.SUSPENDED },
      });
    });
  });

  describe('user.created', () => {
    it('should create user with email from email_addresses', async () => {
      prisma.user.create.mockResolvedValue({ id: 'user_1' });
      const event = {
        type: 'user.created',
        data: {
          id: 'user_1',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'John',
          last_name: 'Doe',
        },
      };
      await service.handleClerkWebhook(JSON.stringify(event), 'sig', 'id', 'ts');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'John Doe',
          clerkId: 'user_1',
        },
      });
    });

    it('should handle missing email gracefully', async () => {
      prisma.user.create.mockResolvedValue({ id: 'user_1' });
      const event = {
        type: 'user.created',
        data: { id: 'user_1', email_addresses: [], first_name: null, last_name: null },
      };
      await service.handleClerkWebhook(JSON.stringify(event), 'sig', 'id', 'ts');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: '', name: null }),
        }),
      );
    });
  });

  describe('user.updated', () => {
    it('should update user', async () => {
      prisma.user.update.mockResolvedValue({});
      const event = {
        type: 'user.updated',
        data: {
          id: 'user_1',
          email_addresses: [{ email_address: 'new@example.com' }],
          first_name: 'Jane',
          last_name: 'Smith',
        },
      };
      await service.handleClerkWebhook(JSON.stringify(event), 'sig', 'id', 'ts');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { clerkId: 'user_1' },
        data: { email: 'new@example.com', name: 'Jane Smith' },
      });
    });
  });

  describe('organizationMembership.created', () => {
    it('should create membership with parsed role', async () => {
      prisma.organizationMembership.create.mockResolvedValue({});
      const event = {
        type: 'organizationMembership.created',
        data: {
          organization: { id: 'org_1' },
          user: { id: 'user_1' },
          role: 'org:admin',
        },
      };
      await service.handleClerkWebhook(JSON.stringify(event), 'sig', 'id', 'ts');
      expect(prisma.organizationMembership.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org_1',
          userId: 'user_1',
          role: MemberRole.ADMIN,
        },
      });
    });

    it('should default to MEMBER role when role is org:member', async () => {
      prisma.organizationMembership.create.mockResolvedValue({});
      const event = {
        type: 'organizationMembership.created',
        data: {
          organization: { id: 'org_1' },
          user: { id: 'user_1' },
          role: 'org:member',
        },
      };
      await service.handleClerkWebhook(JSON.stringify(event), 'sig', 'id', 'ts');
      expect(prisma.organizationMembership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: MemberRole.MEMBER }),
      });
    });
  });

  describe('organizationMembership.updated', () => {
    it('should update membership role', async () => {
      prisma.organizationMembership.update.mockResolvedValue({});
      const event = {
        type: 'organizationMembership.updated',
        data: {
          organization: { id: 'org_1' },
          user: { id: 'user_1' },
          role: 'org:admin',
        },
      };
      await service.handleClerkWebhook(JSON.stringify(event), 'sig', 'id', 'ts');
      expect(prisma.organizationMembership.update).toHaveBeenCalledWith({
        where: {
          organizationId_userId: { organizationId: 'org_1', userId: 'user_1' },
        },
        data: { role: MemberRole.ADMIN },
      });
    });
  });

  describe('organizationMembership.deleted', () => {
    it('should delete membership', async () => {
      prisma.organizationMembership.delete.mockResolvedValue({});
      const event = {
        type: 'organizationMembership.deleted',
        data: {
          organization: { id: 'org_1' },
          user: { id: 'user_1' },
        },
      };
      await service.handleClerkWebhook(JSON.stringify(event), 'sig', 'id', 'ts');
      expect(prisma.organizationMembership.delete).toHaveBeenCalledWith({
        where: {
          organizationId_userId: { organizationId: 'org_1', userId: 'user_1' },
        },
      });
    });
  });

  describe('invalid webhook signature', () => {
    it('should return received: false when verification fails', async () => {
      const { Webhook } = require('svix');
      Webhook.mockImplementation(() => ({
        verify: jest.fn(() => { throw new Error('Invalid signature'); }),
      }));
      const result = await service.handleClerkWebhook('bad-body', 'bad-sig', 'id', 'ts');
      expect(result.received).toBe(false);
    });
  });
});
