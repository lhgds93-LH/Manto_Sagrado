import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { DatabaseModule } from "./database/database.module";
import { ProductsModule } from "./products/products.module";
import { OrdersModule } from "./orders/orders.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [DatabaseModule, ProductsModule, OrdersModule, AdminModule],
  controllers: [HealthController],
})
export class AppModule {}
