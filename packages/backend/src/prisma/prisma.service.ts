import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

const TENANT_MODELS = ['Organization', 'User', 'OrganizationMembership', 'Subscription'];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly cls: ClsService) {
    super();
    this.$use(async (params, next) => {
      const orgId = this.cls.get<string>('organizationId');
      if (orgId && params.model && TENANT_MODELS.includes(params.model) && !params.args?.skipTenantFilter) {
        params.args = params.args || {};
        params.args.where = { ...params.args.where, organizationId: orgId };
      }
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
