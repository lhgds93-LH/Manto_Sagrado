import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

const CATEGORY_MAP: Record<string, string> = {
  BRASILEIRAO: "BRASILEIRAO",
  BRASILEIRÃO: "BRASILEIRAO",
  INTERNACIONAIS: "INTERNACIONAIS",
  SELECOES: "SELECOES",
  SELEÇÕES: "SELECOES",
  RETRO: "RETRO",
  RETRÔ: "RETRO",
  INFANTIL: "INFANTIL",
  FEMININA: "FEMININA",
};

interface ProductFilters {
  query?: string;
  category?: string;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: ProductFilters): Promise<unknown[]> {
    const category = this.normalizeCategory(filters.category);
    const query = filters.query?.trim();

    const products = await this.prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(category ? { category: category as never } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { badge: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        sku: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        price: true,
        compareAtPrice: true,
        imageUrl: true,
        badge: true,
        variants: {
          where: { active: true },
          select: { id: true, size: true, stock: true },
          orderBy: { size: "asc" },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    });

    return products.map((product) => this.toPublicProduct(product));
  }

  async findOne(slug: string): Promise<unknown> {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: "ACTIVE" },
      select: {
        id: true,
        sku: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        price: true,
        compareAtPrice: true,
        imageUrl: true,
        badge: true,
        variants: {
          where: { active: true },
          select: { id: true, size: true, stock: true },
          orderBy: { size: "asc" },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Produto não encontrado.");
    }

    return this.toPublicProduct(product);
  }

  private normalizeCategory(category?: string): string | undefined {
    if (!category) return undefined;
    return CATEGORY_MAP[category.trim().toLocaleUpperCase("pt-BR")];
  }

  private toPublicProduct(product: {
    price: unknown;
    compareAtPrice: unknown;
    [key: string]: unknown;
  }): Record<string, unknown> {
    return {
      ...product,
      price: Number(product.price),
      compareAtPrice:
        product.compareAtPrice === null || product.compareAtPrice === undefined
          ? null
          : Number(product.compareAtPrice),
    };
  }
}
