import { Controller, Post, Req, Headers, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('clerk')
  async handleClerkWebhook(
    @Req() req: Request,
    @Headers('svix-signature') svixSignature?: string,
    @Headers('svix-id') svixId?: string,
    @Headers('svix-timestamp') svixTimestamp?: string,
  ) {
    if (!svixSignature || !svixId || !svixTimestamp) {
      throw new BadRequestException('Missing Svix signature headers');
    }
    return this.webhooksService.handleClerkWebhook(
      JSON.stringify(req.body),
      svixSignature,
      svixId,
      svixTimestamp,
    );
  }
}
