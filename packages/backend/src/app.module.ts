import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { HealthModule } from './health/health.module';
import { TenantsModule } from './tenants/tenants.module';
import { MembersModule } from './members/members.module';
import { BillingModule } from './billing/billing.module';
import { ClsMiddleware } from './common/cls.middleware';

@Module({
  imports: [
    ClsModule.forRoot({ global: true }),
    PrismaModule,
    AuthModule,
    WebhooksModule,
    HealthModule,
    TenantsModule,
    MembersModule,
    BillingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClsMiddleware).forRoutes('*');
  }
}
