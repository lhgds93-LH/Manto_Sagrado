import { Controller, Get, Param, Query } from "@nestjs/common";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query("q") query?: string,
    @Query("category") category?: string,
  ): Promise<unknown[]> {
    return this.productsService.findAll({ query, category });
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string): Promise<unknown> {
    return this.productsService.findOne(slug);
  }
}
