import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { createMockContext } from '../test/test-utils';

jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
}));

import { verifyToken } from '@clerk/backend';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLERK_SECRET_KEY = 'test-key';
    process.env.CLERK_JWT_KEY = 'test-jwt-key';
    guard = new AuthGuard();
  });

  it('should throw UnauthorizedException when no auth header', async () => {
    const ctx = createMockContext({ headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token is invalid', async () => {
    (verifyToken as jest.Mock).mockRejectedValue(new Error('bad token'));
    const ctx = createMockContext({ headers: { authorization: 'Bearer bad-token' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should set userId and sessionClaims on valid token', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'user-123', org_id: 'org-456' });
    const ctx = createMockContext({ headers: { authorization: 'Bearer valid-token' } });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest();
    expect(req.userId).toBe('user-123');
    expect(req.sessionClaims).toEqual({ sub: 'user-123', org_id: 'org-456' });
  });

  it('should call verifyToken with correct arguments', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'u1' });
    const ctx = createMockContext({ headers: { authorization: 'Bearer my-token' } });
    await guard.canActivate(ctx);
    expect(verifyToken).toHaveBeenCalledWith('my-token', {
      secretKey: 'test-key',
      jwtKey: 'test-jwt-key',
    });
  });

  it('should strip "Bearer " prefix from token', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'u1' });
    const ctx = createMockContext({ headers: { authorization: 'Bearer abc123' } });
    await guard.canActivate(ctx);
    expect(verifyToken).toHaveBeenCalledWith('abc123', expect.any(Object));
  });
});
