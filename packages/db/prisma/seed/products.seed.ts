import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { seedConfig } from "./config";
import {
  chunk,
  measureTime,
  progress,
  randomFromArray,
  randomInt,
  slugify,
} from "./utils";

const COLORS = [
  "red",
  "blue",
  "green",
  "black",
  "white",
  "gray",
  "yellow",
  "pink",
  "purple",
] as const;

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

const MATERIALS = [
  "cotton",
  "leather",
  "plastic",
  "metal",
  "wood",
  "glass",
  "rubber",
] as const;

const WARRANTY_MONTHS = [0, 6, 12, 24, 36] as const;

type AttributeKey =
  | "color"
  | "size"
  | "material"
  | "weight_kg"
  | "warranty_months";

function buildAttributes(): Record<string, string | number> {
  const keys = faker.helpers.arrayElements<AttributeKey>(
    ["color", "size", "material", "weight_kg", "warranty_months"],
    { min: 2, max: 4 },
  );
  const attrs: Record<string, string | number> = {};
  for (const key of keys) {
    switch (key) {
      case "color":
        attrs.color = randomFromArray(COLORS);
        break;
      case "size":
        attrs.size = randomFromArray(SIZES);
        break;
      case "material":
        attrs.material = randomFromArray(MATERIALS);
        break;
      case "weight_kg":
        attrs.weight_kg =
          Math.round((Math.random() * 49.9 + 0.1) * 10) / 10;
        break;
      case "warranty_months":
        attrs.warranty_months = randomFromArray(WARRANTY_MONTHS);
        break;
    }
  }
  return attrs;
}

function randomRating(): { ratingAvg: Prisma.Decimal; ratingCount: number } {
  if (Math.random() < 0.3) {
    return { ratingAvg: new Prisma.Decimal(0), ratingCount: 0 };
  }
  const r1 = randomInt(30, 50) / 10;
  const r2 = randomInt(30, 50) / 10;
  const avg = Math.min(5, (r1 + r2) / 2);
  return {
    ratingAvg: new Prisma.Decimal(avg.toFixed(2)),
    ratingCount: faker.number.int({ min: 1, max: 5000 }),
  };
}

function buildDescription(): string {
  const parts = [
    faker.commerce.productDescription(),
    faker.commerce.productDescription(),
    faker.commerce.productDescription(),
    faker.lorem.paragraphs(2),
  ];
  return parts.join("\n\n");
}

function offerPrice(base: number): number {
  const delta = base * 0.2;
  const price = base + (Math.random() * 2 - 1) * delta;
  return Math.max(0.01, Math.round(price * 100) / 100);
}

/**
 * Seeds products, images, and offers in batches.
 */
export async function seedProducts(
  prisma: PrismaClient,
  categoryLeafIds: string[],
  brandIds: string[],
): Promise<void> {
  const endProducts = measureTime("Products");
  const usedSkus = new Set<string>();
  const usedSlugs = new Set<string>();
  const productRows: Prisma.ProductCreateManyInput[] = [];

  for (let i = 0; i < seedConfig.PRODUCT_COUNT; i++) {
    let sku: string;
    do {
      sku = `SKU-${faker.string.alphanumeric(8).toUpperCase()}`;
    } while (usedSkus.has(sku));
    usedSkus.add(sku);

    const name = faker.commerce.productName();
    let slug = slugify(name);
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${faker.string.alphanumeric(6).toLowerCase()}`;
    }
    usedSlugs.add(slug);

    const { ratingAvg, ratingCount } = randomRating();
    const basePriceStr = faker.commerce.price({
      min: 5,
      max: 5000,
      dec: 2,
    });

    productRows.push({
      sku,
      name,
      slug,
      description: buildDescription(),
      shortDescription: faker.commerce.productDescription(),
      categoryId: randomFromArray(categoryLeafIds),
      brandId: randomFromArray(brandIds),
      basePrice: new Prisma.Decimal(basePriceStr),
      currency: "USD",
      attributes: buildAttributes(),
      ratingAvg,
      ratingCount,
      popularityScore: faker.number.int({ min: 0, max: 100_000 }),
      viewCount: faker.number.int({ min: 0, max: 50_000 }),
      isActive: Math.random() < 0.97,
    });
  }

  const batches = chunk(productRows, seedConfig.BATCH_SIZE);
  let inserted = 0;

  for (const batch of batches) {
    await prisma.product.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += batch.length;
    progress(inserted, seedConfig.PRODUCT_COUNT, "products");

    const batchSkus = batch.map((p) => p.sku as string);
    const products = await prisma.product.findMany({
      where: { sku: { in: batchSkus } },
      select: {
        id: true,
        name: true,
        basePrice: true,
      },
    });

    const imageData: Prisma.ProductImageCreateManyInput[] = [];
    const offerData: Prisma.ProductOfferCreateManyInput[] = [];

    for (const product of products) {
      const imageCount = randomInt(
        seedConfig.IMAGES_PER_PRODUCT_MIN,
        seedConfig.IMAGES_PER_PRODUCT_MAX,
      );
      for (let idx = 0; idx < imageCount; idx++) {
        imageData.push({
          productId: product.id,
          url: `https://picsum.photos/seed/${product.id}-${idx}/600/600`,
          altText: product.name,
          position: idx,
          isPrimary: idx === 0,
        });
      }

      const offerCount = randomInt(
        seedConfig.OFFERS_PER_PRODUCT_MIN,
        seedConfig.OFFERS_PER_PRODUCT_MAX,
      );
      const base = Number(product.basePrice);
      for (let o = 0; o < offerCount; o++) {
        const price = offerPrice(base);
        const stockQuantity = faker.number.int({ min: 0, max: 1000 });
        const hasCompare = Math.random() < 0.3;
        offerData.push({
          productId: product.id,
          sellerId: faker.string.uuid(),
          sellerName: faker.company.name(),
          price: new Prisma.Decimal(price.toFixed(2)),
          compareAtPrice: hasCompare
            ? new Prisma.Decimal((price * 1.2).toFixed(2))
            : null,
          currency: "USD",
          stockQuantity,
          isAvailable: stockQuantity > 0,
          shippingDays: faker.number.int({ min: 1, max: 14 }),
        });
      }
    }

    for (const imgBatch of chunk(imageData, seedConfig.BATCH_SIZE)) {
      if (imgBatch.length > 0) {
        await prisma.productImage.createMany({
          data: imgBatch,
          skipDuplicates: true,
        });
      }
    }
    for (const offerBatch of chunk(offerData, seedConfig.BATCH_SIZE)) {
      if (offerBatch.length > 0) {
        await prisma.productOffer.createMany({
          data: offerBatch,
          skipDuplicates: true,
        });
      }
    }
  }

  endProducts();
}
