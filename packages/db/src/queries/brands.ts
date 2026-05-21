import type { Prisma } from "@prisma/client";
import type { Brand, BrandSummary } from "@ecommerce/shared-types";
import { prisma } from "../client";

const brandSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  websiteUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BrandSelect;

const brandSummarySelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  isActive: true,
} satisfies Prisma.BrandSelect;

/**
 * Returns active brands for filters and brand pages.
 */
export async function getBrands(): Promise<BrandSummary[]> {
  return prisma.brand.findMany({
    where: { isActive: true },
    select: brandSummarySelect,
    orderBy: { name: "asc" },
  });
}

/**
 * Returns a single brand by slug.
 */
export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  return prisma.brand.findUnique({
    where: { slug },
    select: brandSelect,
  });
}
