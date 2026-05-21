import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { seedConfig } from "./config";
import { chunk, slugify } from "./utils";

/**
 * Seeds brands with unique names/slugs.
 */
export async function seedBrands(prisma: PrismaClient): Promise<string[]> {
  const names = new Set<string>();
  while (names.size < seedConfig.BRAND_COUNT) {
    names.add(faker.company.name());
  }

  const usedSlugs = new Set<string>();
  const brandData: Prisma.BrandCreateManyInput[] = [];

  for (const name of names) {
    let slug = slugify(name);
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${faker.string.alphanumeric(6).toLowerCase()}`;
    }
    usedSlugs.add(slug);

    brandData.push({
      name,
      slug,
      description: faker.company.catchPhrase(),
      logoUrl: `https://picsum.photos/seed/${slug}/200/200`,
      websiteUrl: faker.internet.url(),
      isActive: Math.random() < 0.95,
    });
  }

  for (const batch of chunk(brandData, seedConfig.BATCH_SIZE)) {
    await prisma.brand.createMany({ data: batch, skipDuplicates: true });
  }

  const brands = await prisma.brand.findMany({
    select: { id: true },
    take: seedConfig.BRAND_COUNT,
  });

  return brands.map((b) => b.id);
}
