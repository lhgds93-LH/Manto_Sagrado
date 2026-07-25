import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não foi definida.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const products = [
  {
    sku: "MS-AURORA-2026",
    slug: "camisa-aurora-2026",
    name: "Camisa Aurora 2026",
    description: "Camisa de futebol com acabamento premium e opções de personalização.",
    category: "BRASILEIRAO" as const,
    price: 149.9,
    compareAtPrice: 179.9,
    badge: "Lançamento",
    supplierRef: "REF-AURORA-26",
    sizes: ["P", "M", "G", "GG"],
  },
  {
    sku: "MS-IMPERIAL-AWAY",
    slug: "camisa-imperial-away",
    name: "Camisa Imperial Away",
    description: "Modelo visitante com tecido leve e identidade moderna.",
    category: "INTERNACIONAIS" as const,
    price: 159.9,
    compareAtPrice: 189.9,
    badge: "Mais vendido",
    supplierRef: "REF-IMPERIAL-A",
    sizes: ["P", "M", "G", "GG", "XGG"],
  },
  {
    sku: "MS-SELECAO-CLASSICA",
    slug: "camisa-selecao-classica",
    name: "Camisa Seleção Clássica",
    description: "Inspiração retrô para quem carrega a história do futebol.",
    category: "SELECOES" as const,
    price: 139.9,
    compareAtPrice: 169.9,
    badge: "Retrô",
    supplierRef: "REF-SEL-CLASSIC",
    sizes: ["P", "M", "G", "GG"],
  },
  {
    sku: "MS-ECLIPSE-PLAYER",
    slug: "camisa-eclipse-player",
    name: "Camisa Eclipse Player",
    description: "Versão jogador com corte ajustado e tecido respirável.",
    category: "INTERNACIONAIS" as const,
    price: 179.9,
    compareAtPrice: 209.9,
    badge: "Versão jogador",
    supplierRef: "REF-ECLIPSE-P",
    sizes: ["P", "M", "G", "GG"],
  },
  {
    sku: "MS-PEQUENO-CRAQUE",
    slug: "kit-pequeno-craque",
    name: "Kit Pequeno Craque",
    description: "Conjunto infantil com camisa e calção.",
    category: "INFANTIL" as const,
    price: 129.9,
    compareAtPrice: 149.9,
    badge: "Infantil",
    supplierRef: "REF-KIDS-01",
    sizes: ["16", "18", "20", "22", "24", "26", "28"],
  },
  {
    sku: "MS-LENDARIA-1999",
    slug: "camisa-lendaria-1999",
    name: "Camisa Lendária 1999",
    description: "Edição especial inspirada em uma era inesquecível.",
    category: "RETRO" as const,
    price: 169.9,
    compareAtPrice: 199.9,
    badge: "Edição especial",
    supplierRef: "REF-LEND-1999",
    sizes: ["P", "M", "G", "GG"],
  },
];

async function main(): Promise<void> {
  for (const product of products) {
    const saved = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        category: product.category,
        status: "ACTIVE",
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        badge: product.badge,
        supplierCode: "FORN-001",
        supplierRef: product.supplierRef,
      },
      create: {
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        description: product.description,
        category: product.category,
        status: "ACTIVE",
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        badge: product.badge,
        supplierCode: "FORN-001",
        supplierRef: product.supplierRef,
      },
    });

    for (const size of product.sizes) {
      await prisma.productVariant.upsert({
        where: {
          productId_size: {
            productId: saved.id,
            size,
          },
        },
        update: {
          active: true,
          stock: 99,
        },
        create: {
          productId: saved.id,
          size,
          active: true,
          stock: 99,
        },
      });
    }
  }

  console.log(`${products.length} produtos demonstrativos cadastrados.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
