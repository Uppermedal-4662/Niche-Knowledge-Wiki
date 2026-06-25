import { Controller, Get, Post, Body, Req, Headers, RawBodyRequest, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OrgGuard } from '../auth/org.guard';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(AuthGuard, OrgGuard)
  async checkout(@Req() req: Request, @Body() dto: CreateCheckoutDto) {
    return this.billingService.createCheckoutSession((req as any).orgId, dto.priceId);
  }

  @Get('subscription')
  @UseGuards(AuthGuard, OrgGuard)
  async getSubscription(@Req() req: Request) {
    return this.billingService.getSubscription((req as any).orgId);
  }

  @Get('portal')
  @UseGuards(AuthGuard, OrgGuard)
  async portal(@Req() req: Request) {
    return this.billingService.createPortalSession((req as any).orgId);
  }

  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
    return this.billingService.handleWebhook(req.rawBody, sig);
  }
}
