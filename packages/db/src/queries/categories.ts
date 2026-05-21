import { Prisma } from "@prisma/client";
import type {
  Category,
  CategorySummary,
  CategoryTree,
  CategoryWithChildren,
} from "@ecommerce/shared-types";
import { prisma } from "../client";

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  parentId: true,
  imageUrl: true,
  displayOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CategorySelect;

type CategoryRow = Prisma.CategoryGetPayload<{ select: typeof categorySelect }>;

/** Loads ltree paths for categories (Unsupported in Prisma client). */
async function attachPaths(rows: CategoryRow[]): Promise<Category[]> {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((r) => r.id);
  const paths = await prisma.$queryRaw<Array<{ id: string; path: string | null }>>`
    SELECT id, path::text AS path FROM categories WHERE id IN (${Prisma.join(
      ids.map((id) => Prisma.sql`${id}::uuid`),
    )})
  `;

  const pathById = new Map(paths.map((p) => [p.id, p.path]));
  return rows.map((row) => ({
    ...row,
    path: pathById.get(row.id) ?? null,
  }));
}

/**
 * Returns all active categories ordered by display order.
 */
export async function getCategories(): Promise<Category[]> {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    select: categorySelect,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  return attachPaths(rows);
}

/**
 * Returns a single category by slug.
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const row = await prisma.category.findUnique({
    where: { slug },
    select: categorySelect,
  });
  if (!row) {
    return null;
  }
  const [withPath] = await attachPaths([row]);
  return withPath ?? null;
}

function buildTree(
  rows: Category[],
  parentId: string | null,
): CategoryWithChildren[] {
  return rows
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((category) => ({
      ...category,
      children: buildTree(rows, category.id),
    }));
}

/**
 * Returns the full active category hierarchy (roots → children → leaves).
 */
export async function getCategoryTree(): Promise<CategoryTree> {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    select: categorySelect,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  const categories = await attachPaths(rows);
  return buildTree(categories, null);
}

const categoryBreadcrumbSelect = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  isActive: true,
} satisfies Prisma.CategorySelect;

type CategoryBreadcrumbRow = Prisma.CategoryGetPayload<{
  select: typeof categoryBreadcrumbSelect;
}>;

/**
 * Returns the category chain from root to the given category (for breadcrumbs).
 */
export async function getCategoryBreadcrumb(
  categoryId: string,
): Promise<CategorySummary[]> {
  const chain: CategorySummary[] = [];
  const seen = new Set<string>();
  let currentId: string | null = categoryId;

  for (let depth = 0; depth < 20 && currentId; depth++) {
    if (seen.has(currentId)) {
      break;
    }
    seen.add(currentId);

    const row: CategoryBreadcrumbRow | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: categoryBreadcrumbSelect,
    });
    if (!row) {
      break;
    }

    chain.unshift({ ...row, path: null });
    currentId = row.parentId;
  }

  return chain;
}

/**
 * Returns the category and all descendants (products on leaves match via `path <@`).
 */
export async function getCategoryDescendantIds(
  categoryId: string,
): Promise<string[]> {
  const ltreeRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT c.id
    FROM categories c
    INNER JOIN categories anchor ON anchor.id = ${categoryId}::uuid
    WHERE anchor.path IS NOT NULL
      AND c.path IS NOT NULL
      AND c.path <@ anchor.path
  `;

  if (ltreeRows.length > 0) {
    return ltreeRows.map((row) => row.id);
  }

  return getCategoryDescendantIdsByParent(categoryId);
}

async function getCategoryDescendantIdsByParent(
  categoryId: string,
): Promise<string[]> {
  const rows = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });

  const childrenByParent = new Map<string, string[]>();
  for (const row of rows) {
    if (row.parentId) {
      const list = childrenByParent.get(row.parentId) ?? [];
      list.push(row.id);
      childrenByParent.set(row.parentId, list);
    }
  }

  const ids: string[] = [];
  const queue = [categoryId];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
    for (const childId of childrenByParent.get(id) ?? []) {
      queue.push(childId);
    }
  }

  return ids;
}
