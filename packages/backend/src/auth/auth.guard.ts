import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';

@Injectable()
export class AuthGuard implements CanActivate {
  private clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    try {
      const session = await this.clerk.sessions.verifySession(token, token);
      request.userId = session.userId;
      request.sessionClaims = session;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
