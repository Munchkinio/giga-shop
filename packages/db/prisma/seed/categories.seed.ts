import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { slugify, slugToLtreeLabel } from "./utils";

/** 3-level category tree: root → subcategory → leaf */
const CATEGORY_TREE: Record<string, Record<string, string[]>> = {
  Electronics: {
    Smartphones: ["Android Phones", "iPhones", "Phone Accessories"],
    Laptops: ["Gaming Laptops", "Business Laptops", "Ultrabooks"],
    TVs: ["LED TVs", "OLED TVs", "Smart TVs"],
    Audio: ["Headphones", "Speakers", "Soundbars"],
    Gaming: ["Gaming Consoles", "Gaming Keyboards", "PC Gaming Gear"],
  },
  "Clothing & Fashion": {
    "Men's Clothing": ["T-Shirts", "Jeans", "Jackets"],
    "Women's Clothing": ["Dresses", "Blouses", "Skirts"],
    Shoes: ["Sneakers", "Boots", "Sandals"],
    Accessories: ["Belts", "Watches", "Sunglasses"],
    Bags: ["Backpacks", "Handbags", "Travel Bags"],
  },
  "Home & Garden": {
    Furniture: ["Sofas", "Dining Tables", "Office Chairs"],
    Kitchen: ["Cookware Sets", "Blenders", "Cutlery"],
    Bathroom: ["Towels", "Shower Curtains", "Bath Accessories"],
    Decor: ["Wall Art", "Table Lamps", "Vases"],
    "Garden Tools": ["Lawn Mowers", "Pruners", "Hose Reels"],
  },
  "Sports & Outdoors": {
    Fitness: ["Dumbbells", "Yoga Mats", "Treadmills"],
    Cycling: ["Road Bikes", "Mountain Bikes", "Bike Helmets"],
    Camping: ["Tents", "Sleeping Bags", "Camping Stoves"],
    "Team Sports": ["Soccer Balls", "Basketball Hoops", "Baseball Gloves"],
    "Water Sports": ["Kayaks", "Snorkel Sets", "Paddleboards"],
  },
  "Books & Media": {
    Fiction: ["Mystery", "Romance", "Science Fiction"],
    "Non-Fiction": ["Biography", "History", "Self-Help"],
    "Children's Books": ["Picture Books", "Early Readers", "Young Adult"],
    Movies: ["Blu-ray", "DVD", "Digital Movies"],
    Music: ["Vinyl Records", "CDs", "Digital Albums"],
  },
};

export type SeedCategoriesResult = {
  leafCategoryIds: string[];
  totalCount: number;
  pathById: Map<string, string>;
};

/**
 * Seeds the fixed 3-level category hierarchy and sets ltree paths via raw SQL.
 */
export async function seedCategories(
  prisma: PrismaClient,
): Promise<SeedCategoriesResult> {
  const pathBySlug = new Map<string, string>();
  const slugToId = new Map<string, string>();
  const pathById = new Map<string, string>();
  const leafCategoryIds: string[] = [];

  const rootData: Prisma.CategoryCreateManyInput[] = [];
  let rootOrder = 0;
  for (const rootName of Object.keys(CATEGORY_TREE)) {
    const rootSlug = slugify(rootName);
    pathBySlug.set(rootSlug, slugToLtreeLabel(rootSlug));
    rootData.push({
      name: rootName,
      slug: rootSlug,
      description: faker.lorem.sentence(),
      imageUrl: null,
      displayOrder: rootOrder++,
      isActive: true,
    });
  }

  await prisma.category.createMany({ data: rootData });
  const rootRecords = await prisma.category.findMany({
    where: { slug: { in: rootData.map((r) => r.slug as string) } },
    select: { id: true, slug: true },
  });
  for (const r of rootRecords) {
    slugToId.set(r.slug, r.id);
    pathById.set(r.id, pathBySlug.get(r.slug) ?? "");
  }

  const subData: Prisma.CategoryCreateManyInput[] = [];
  for (const [rootName, subcategories] of Object.entries(CATEGORY_TREE)) {
    const rootSlug = slugify(rootName);
    const rootPath = pathBySlug.get(rootSlug)!;
    let subOrder = 0;
    for (const subName of Object.keys(subcategories)) {
      const subSlug = `${rootSlug}-${slugify(subName)}`;
      const subPath = `${rootPath}.${slugToLtreeLabel(slugify(subName))}`;
      pathBySlug.set(subSlug, subPath);
      subData.push({
        name: subName,
        slug: subSlug,
        description: faker.lorem.sentence(),
        parentId: slugToId.get(rootSlug)!,
        imageUrl: null,
        displayOrder: subOrder++,
        isActive: true,
      });
    }
  }

  await prisma.category.createMany({ data: subData });
  const subRecords = await prisma.category.findMany({
    where: { slug: { in: subData.map((r) => r.slug as string) } },
    select: { id: true, slug: true },
  });
  for (const r of subRecords) {
    slugToId.set(r.slug, r.id);
    pathById.set(r.id, pathBySlug.get(r.slug) ?? "");
  }

  const leafData: Prisma.CategoryCreateManyInput[] = [];
  for (const [rootName, subcategories] of Object.entries(CATEGORY_TREE)) {
    const rootSlug = slugify(rootName);
    for (const [subName, leaves] of Object.entries(subcategories)) {
      const subSlug = `${rootSlug}-${slugify(subName)}`;
      let leafOrder = 0;
      for (const leafName of leaves) {
        const leafSlug = `${subSlug}-${slugify(leafName)}`;
        const subPath = pathBySlug.get(subSlug)!;
        const leafPath = `${subPath}.${slugToLtreeLabel(slugify(leafName))}`;
        pathBySlug.set(leafSlug, leafPath);
        leafData.push({
          name: leafName,
          slug: leafSlug,
          description: faker.lorem.sentence(),
          parentId: slugToId.get(subSlug)!,
          imageUrl: null,
          displayOrder: leafOrder++,
          isActive: true,
        });
      }
    }
  }

  await prisma.category.createMany({ data: leafData });
  const leafRecords = await prisma.category.findMany({
    where: { slug: { in: leafData.map((r) => r.slug as string) } },
    select: { id: true, slug: true },
  });
  for (const r of leafRecords) {
    leafCategoryIds.push(r.id);
    pathById.set(r.id, pathBySlug.get(r.slug) ?? "");
  }

  for (const [id, path] of pathById) {
    await prisma.$executeRaw(
      Prisma.sql`UPDATE categories SET path = ${path}::ltree WHERE id = ${id}::uuid`,
    );
  }

  const totalCount = rootData.length + subData.length + leafData.length;
  return { leafCategoryIds, totalCount, pathById };
}
