import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { OrgGuard } from './org.guard';

@Module({
  providers: [AuthGuard, OrgGuard],
  exports: [AuthGuard, OrgGuard],
})
export class AuthModule {}
