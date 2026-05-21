import type { Category as PrismaCategory } from "@prisma/client";

/**
 * Mirrors Prisma `Category` model (`categories` table).
 * `path` is stored as PostgreSQL `ltree` and exposed as a string in the API layer.
 */
export type Category = Omit<PrismaCategory, "path"> & {
  /** Dot-separated ltree labels, e.g. `electronics.smartphones.android_phones` */
  path: string | null;
};

/** Category with direct children (one hierarchy level). */
export type CategoryWithChildren = Category & {
  children: Category[];
};

/** Full category tree from root nodes. */
export type CategoryTree = CategoryWithChildren[];

/** Minimal category payload for breadcrumbs and filters. */
export type CategorySummary = Pick<
  Category,
  "id" | "name" | "slug" | "parentId" | "path" | "isActive"
>;
