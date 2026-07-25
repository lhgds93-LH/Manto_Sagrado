import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { OrdersService } from "../orders/orders.service";
import { AdminKeyGuard } from "./admin-key.guard";

@Controller("admin/orders")
@UseGuards(AdminKeyGuard)
export class AdminController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(): Promise<unknown[]> {
    return this.ordersService.listAdmin();
  }

  @Get(":number/template")
  template(@Param("number") number: string): Promise<{ number: string; template: string }> {
    return this.ordersService.getOperationalTemplate(number);
  }

  @Patch(":number/payment-approved")
  markPaid(@Param("number") number: string): Promise<unknown> {
    return this.ordersService.markPaid(number);
  }

  @Patch(":number/sent")
  markSent(@Param("number") number: string): Promise<unknown> {
    return this.ordersService.markSentToPartner(number);
  }

  @Patch(":number/tracking")
  registerTracking(
    @Param("number") number: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new BadRequestException("Dados de rastreio inválidos.");
    }

    const record = body as Record<string, unknown>;
    return this.ordersService.registerTracking(
      number,
      record.trackingCode,
      record.carrier,
    );
  }
}
