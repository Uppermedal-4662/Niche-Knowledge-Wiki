import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

const TENANT_MODELS = ['OrganizationMembership', 'Subscription'];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly cls: ClsService) {
    super();
    this.$use(async (params, next) => {
      const orgId = this.cls.get<string>('organizationId');
      if (orgId && TENANT_MODELS.includes(params.model ?? '') && !(params.args as any)?.skipTenantFilter) {
        params.args = params.args || {};
        (params.args as any).where = { ...((params.args as any).where || {}), organizationId: orgId };
      }
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
