import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const claims = request.sessionClaims as Record<string, unknown> | undefined;
    const orgId = claims?.org_id as string | undefined;
    if (!orgId) throw new ForbiddenException('No organization context in session');
    request.orgId = orgId;
    this.cls.set('organizationId', orgId);
    return true;
  }
}
