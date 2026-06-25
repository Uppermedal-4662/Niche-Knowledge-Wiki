import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OrgGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const orgId = request.sessionClaims?.org_id;
    if (!orgId) throw new ForbiddenException('No organization context in session');
    request.orgId = orgId;
    return true;
  }
}
