import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { AdminController } from "./admin.controller";
import { AdminKeyGuard } from "./admin-key.guard";

@Module({
  imports: [OrdersModule],
  controllers: [AdminController],
  providers: [AdminKeyGuard],
})
export class AdminModule {}
