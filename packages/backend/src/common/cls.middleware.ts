import { Injectable, NestMiddleware } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class ClsMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: any, _res: any, next: () => void) {
    this.cls.set('organizationId', req.orgId);
    next();
  }
}
