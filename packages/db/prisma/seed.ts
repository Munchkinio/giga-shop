import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { seedBrands } from "./seed/brands.seed";
import { seedCategories } from "./seed/categories.seed";
import { seedProducts } from "./seed/products.seed";

const seedDir = path.dirname(fileURLToPath(import.meta.url));
// Same order as prisma.config.ts: optional packages/db/.env, then root .env wins.
config({ path: path.join(seedDir, "..", ".env") });
config({ path: path.join(seedDir, "..", "..", "..", ".env"), override: true });

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Starting database seed...\n");
  const startTime = Date.now();

  if (process.argv.includes("--reset")) {
    console.log("🗑️  Clearing existing data...");
    await prisma.productOffer.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.searchHistory.deleteMany();
    await prisma.savedSearch.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.category.deleteMany();
    console.log("✓ Cleared\n");
  }

  console.log("📁 Seeding categories...");
  const { leafCategoryIds, totalCount: categoryCount } =
    await seedCategories(prisma);
  console.log(
    `✓ Created ${categoryCount} categories (${leafCategoryIds.length} leaves)\n`,
  );

  console.log("🏷️  Seeding brands...");
  const brandIds = await seedBrands(prisma);
  console.log(`✓ Created ${brandIds.length} brands\n`);

  console.log("📦 Seeding products...");
  await seedProducts(prisma, leafCategoryIds, brandIds);
  console.log("✓ Done\n");

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Seed complete in ${elapsedSec}s`);
}

main()
  .catch((e: unknown) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
