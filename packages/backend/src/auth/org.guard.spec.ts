import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OrgGuard } from './org.guard';
import { createMockContext, createMockCls } from '../test/test-utils';

describe('OrgGuard', () => {
  let guard: OrgGuard;
  let cls: ReturnType<typeof createMockCls>;

  beforeEach(() => {
    jest.clearAllMocks();
    cls = createMockCls();
    guard = new OrgGuard(cls);
  });

  it('should throw ForbiddenException when no org_id in sessionClaims', () => {
    const ctx = createMockContext({ headers: {} });
    const req = ctx.switchToHttp().getRequest();
    req.sessionClaims = {};
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when sessionClaims is undefined', () => {
    const ctx = createMockContext({ headers: {} });
    const req = ctx.switchToHttp().getRequest();
    req.sessionClaims = undefined;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should set request.orgId and cls when org_id exists', () => {
    const ctx = createMockContext({ headers: {} });
    const req = ctx.switchToHttp().getRequest();
    req.sessionClaims = { org_id: 'org-789' };
    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.orgId).toBe('org-789');
    expect(cls.set).toHaveBeenCalledWith('organizationId', 'org-789');
  });

  it('should handle org_id as number (Clerk sometimes sends numbers)', () => {
    const ctx = createMockContext({ headers: {} });
    const req = ctx.switchToHttp().getRequest();
    req.sessionClaims = { org_id: 12345 };
    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.orgId).toBe(12345);
    expect(cls.set).toHaveBeenCalledWith('organizationId', 12345);
  });
});
