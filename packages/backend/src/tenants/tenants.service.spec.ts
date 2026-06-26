import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { createMockPrisma } from '../test/test-utils';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createMockPrisma();
    service = new TenantsService(prisma);
  });

  describe('create', () => {
    it('should create an organization', async () => {
      const dto = { name: 'Acme', slug: 'acme' };
      prisma.organization.create.mockResolvedValue({ id: 'org-1', ...dto, plan: 'FREE', status: 'ACTIVE' });
      const result = await service.create(dto);
      expect(prisma.organization.create).toHaveBeenCalledWith({ data: dto });
      expect(result.id).toBe('org-1');
    });
  });

  describe('findOne', () => {
    it('should return organization when found', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Acme' });
      const result = await service.findOne('org-1');
      expect(result.id).toBe('org-1');
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update organization when found', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Acme' });
      prisma.organization.update.mockResolvedValue({ id: 'org-1', name: 'Updated' });
      const result = await service.update('org-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });
});
