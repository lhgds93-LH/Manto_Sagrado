import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() body: unknown): Promise<unknown> {
    return this.ordersService.create(body);
  }

  @Get(":number")
  track(
    @Param("number") number: string,
    @Query("email") email?: string,
  ): Promise<unknown> {
    return this.ordersService.track(number, email);
  }
}
