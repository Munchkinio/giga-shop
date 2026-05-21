import type { Brand as PrismaBrand } from "@prisma/client";

/** Mirrors Prisma `Brand` model (`brands` table). */
export type Brand = PrismaBrand;

/** Brand fields commonly exposed in list/card UIs. */
export type BrandSummary = Pick<
  Brand,
  "id" | "name" | "slug" | "logoUrl" | "isActive"
>;
