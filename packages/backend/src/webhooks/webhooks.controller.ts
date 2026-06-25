import { Controller, Post, Body } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('clerk')
  async handleClerkWebhook(@Body() body: any) {
    return this.webhooksService.handleClerkWebhook(body);
  }
}
