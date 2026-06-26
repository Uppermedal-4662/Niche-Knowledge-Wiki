import { NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import { createMockPrisma } from '../test/test-utils';

describe('MembersService', () => {
  let service: MembersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createMockPrisma();
    service = new MembersService(prisma);
  });

  describe('findAll', () => {
    it('should return members with user included', async () => {
      const members = [{ id: 'm1', role: 'MEMBER', user: { id: 'u1', email: 'a@b.com' } }];
      prisma.organizationMembership.findMany.mockResolvedValue(members);
      const result = await service.findAll('org-1');
      expect(prisma.organizationMembership.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        include: { user: true },
      });
      expect(result).toEqual(members);
    });
  });

  describe('invite', () => {
    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.invite('org-1', { email: 'no@user.com' })).rejects.toThrow(NotFoundException);
    });

    it('should create membership when user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      prisma.organizationMembership.create.mockResolvedValue({ id: 'm1', role: 'MEMBER' });
      const result = await service.invite('org-1', { email: 'a@b.com' });
      expect(prisma.organizationMembership.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          userId: 'u1',
          role: 'MEMBER',
        },
        include: { user: true },
      });
      expect(result.id).toBe('m1');
    });

    it('should use provided role when given', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      prisma.organizationMembership.create.mockResolvedValue({ id: 'm1' });
      await service.invite('org-1', { email: 'a@b.com', role: 'ADMIN' });
      expect(prisma.organizationMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when membership not found', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValue(null);
      await expect(service.remove('org-1', 'm1')).rejects.toThrow(NotFoundException);
    });

    it('should delete membership when found', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValue({ id: 'm1', organizationId: 'org-1' });
      prisma.organizationMembership.delete.mockResolvedValue({ id: 'm1' });
      const result = await service.remove('org-1', 'm1');
      expect(prisma.organizationMembership.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
      expect(result.id).toBe('m1');
    });
  });

  describe('updateRole', () => {
    it('should throw NotFoundException when membership not found', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValue(null);
      await expect(service.updateRole('org-1', 'm1', { role: 'ADMIN' })).rejects.toThrow(NotFoundException);
    });

    it('should update role when membership found', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValue({ id: 'm1', organizationId: 'org-1' });
      prisma.organizationMembership.update.mockResolvedValue({ id: 'm1', role: 'ADMIN' });
      const result = await service.updateRole('org-1', 'm1', { role: 'ADMIN' });
      expect(prisma.organizationMembership.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { role: 'ADMIN' },
      });
      expect(result.role).toBe('ADMIN');
    });
  });
});
