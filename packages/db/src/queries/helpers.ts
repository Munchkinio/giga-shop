import { Prisma } from "@prisma/client";
import type { Filters, ProductListItem, SortOptions } from "@ecommerce/shared-types";

type AttributeFilterValue = string | number | boolean | (string | number | boolean)[];

function attributeEntries(
  attributes: NonNullable<Filters["attributes"]>,
  excludeKey?: string,
): [string, AttributeFilterValue][] {
  return Object.entries(attributes).filter(([key]) => key !== excludeKey);
}

function attributeWhereClause(
  key: string,
  value: AttributeFilterValue,
): Prisma.ProductWhereInput {
  if (Array.isArray(value)) {
    return {
      OR: value.map(
        (entry) =>
          ({
            attributes: { path: [key], equals: entry },
          }) satisfies Prisma.ProductWhereInput,
      ),
    };
  }
  return { attributes: { path: [key], equals: value } };
}

function attributeSqlClause(key: string, value: AttributeFilterValue): Prisma.Sql {
  if (Array.isArray(value)) {
    const parts = value.map(
      (entry) =>
        Prisma.sql`p.attributes @> ${JSON.stringify({ [key]: entry })}::jsonb`,
    );
    return Prisma.sql`(${Prisma.join(parts, " OR ")})`;
  }
  return Prisma.sql`p.attributes @> ${JSON.stringify({ [key]: value })}::jsonb`;
}

/** Select shape for catalog list / search results. */
export const productListItemSelect = {
  id: true,
  sku: true,
  name: true,
  slug: true,
  shortDescription: true,
  basePrice: true,
  currency: true,
  ratingAvg: true,
  ratingCount: true,
  popularityScore: true,
  isActive: true,
  categoryId: true,
  brandId: true,
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true },
  },
  category: { select: { name: true } },
  brand: { select: { name: true } },
} satisfies Prisma.ProductSelect;

export type ProductListItemRow = Prisma.ProductGetPayload<{
  select: typeof productListItemSelect;
}>;

export function mapToProductListItem(row: ProductListItemRow): ProductListItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    basePrice: row.basePrice.toString(),
    currency: row.currency,
    ratingAvg: row.ratingAvg.toString(),
    ratingCount: row.ratingCount,
    popularityScore: row.popularityScore,
    isActive: row.isActive,
    categoryId: row.categoryId,
    brandId: row.brandId,
    primaryImageUrl: row.images[0]?.url ?? null,
    brandName: row.brand.name,
    categoryName: row.category.name,
  };
}

/** Builds Prisma `where` for catalog filters (no full-text). */
export function buildProductWhere(filters?: Filters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    isActive: filters?.isActive ?? true,
  };

  if (!filters) {
    return where;
  }

  if (filters.categoryId !== undefined) {
    where.categoryId = Array.isArray(filters.categoryId)
      ? { in: filters.categoryId }
      : filters.categoryId;
  }

  if (filters.brandId !== undefined) {
    where.brandId = Array.isArray(filters.brandId)
      ? { in: filters.brandId }
      : filters.brandId;
  }

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    where.basePrice = {
      ...(filters.priceMin !== undefined ? { gte: filters.priceMin } : {}),
      ...(filters.priceMax !== undefined ? { lte: filters.priceMax } : {}),
    };
  }

  if (filters.ratingMin !== undefined) {
    where.ratingAvg = { gte: filters.ratingMin };
  }

  if (filters.attributes && filters.categoryId !== undefined) {
    const attributeClauses = attributeEntries(filters.attributes).map(
      ([key, value]) => attributeWhereClause(key, value),
    );
    where.AND = [...toAndArray(where.AND), ...attributeClauses];
  }

  if (filters.inStock === true) {
    where.offers = {
      some: {
        isAvailable: true,
        stockQuantity: { gt: 0 },
      },
    };
  }

  return where;
}

function toAndArray(
  value: Prisma.ProductWhereInput | Prisma.ProductWhereInput[] | undefined,
): Prisma.ProductWhereInput[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function resolveSort(
  sort?: SortOptions,
  hasQuery?: boolean,
): SortOptions {
  if (sort) {
    return sort;
  }
  if (hasQuery) {
    return { field: "relevance", order: "desc" };
  }
  return { field: "popularityScore", order: "desc" };
}

export function toPrismaOrderBy(
  sort: SortOptions,
): Prisma.ProductOrderByWithRelationInput[] {
  const direction = sort.order;
  const tieBreaker: Prisma.ProductOrderByWithRelationInput = { id: direction };

  switch (sort.field) {
    case "ratingAvg":
      return [{ ratingAvg: direction }, tieBreaker];
    case "basePrice":
      return [{ basePrice: direction }, tieBreaker];
    case "createdAt":
      return [{ createdAt: direction }, tieBreaker];
    case "name":
      return [{ name: direction }, tieBreaker];
    case "relevance":
    case "popularityScore":
    default:
      return [{ popularityScore: direction }, tieBreaker];
  }
}

/** Max Levenshtein distance per name token vs full query string. */
export const WORD_LEVENSHTEIN_MAX = 2;

/** Fuzzy name match: any word in product name is close to the query. */
export function nameWordLevenshteinMatchSql(query: string): Prisma.Sql {
  return Prisma.sql`
    EXISTS (
      SELECT 1 FROM unnest(string_to_array(lower(p.name), ' ')) AS word
      WHERE levenshtein(word, lower(${query})) <= ${WORD_LEVENSHTEIN_MAX}
    )`;
}

/** FTS on search_vector OR per-word Levenshtein fallback. */
export function productSearchMatchSql(query: string): Prisma.Sql {
  return Prisma.sql`
    (
      p.search_vector @@ plainto_tsquery('english', ${query})
      OR ${nameWordLevenshteinMatchSql(query)}
    )`;
}

export type ProductFilterSqlOptions = {
  defaultActive?: boolean;
  /** Omit one attribute key when computing disjunctive facets for that key. */
  excludeAttributeKey?: string;
  /** Omit category filter when computing category facets (disjunctive). */
  excludeCategory?: boolean;
  /** Omit brand filter when computing brand facets (disjunctive). */
  excludeBrand?: boolean;
};

/** Builds SQL AND clauses for raw FTS queries (table alias `p`). */
export function buildProductFilterSql(
  filters?: Filters,
  options?: ProductFilterSqlOptions,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];

  if (options?.defaultActive !== false) {
    parts.push(Prisma.sql`p.is_active = true`);
  } else if (filters?.isActive !== undefined) {
    parts.push(Prisma.sql`p.is_active = ${filters.isActive}`);
  }

  if (!filters) {
    return parts.length > 0 ? Prisma.join(parts, " AND ") : Prisma.sql`TRUE`;
  }

  if (filters.categoryId !== undefined && !options?.excludeCategory) {
    const ids = Array.isArray(filters.categoryId)
      ? filters.categoryId
      : [filters.categoryId];
    parts.push(
      Prisma.sql`p.category_id IN (${Prisma.join(
        ids.map((id) => Prisma.sql`${id}::uuid`),
      )})`,
    );
  }

  if (filters.brandId !== undefined && !options?.excludeBrand) {
    const ids = Array.isArray(filters.brandId)
      ? filters.brandId
      : [filters.brandId];
    parts.push(
      Prisma.sql`p.brand_id IN (${Prisma.join(
        ids.map((id) => Prisma.sql`${id}::uuid`),
      )})`,
    );
  }

  if (filters.priceMin !== undefined) {
    parts.push(Prisma.sql`p.base_price >= ${filters.priceMin}`);
  }
  if (filters.priceMax !== undefined) {
    parts.push(Prisma.sql`p.base_price <= ${filters.priceMax}`);
  }
  if (filters.ratingMin !== undefined) {
    parts.push(Prisma.sql`p.rating_avg >= ${filters.ratingMin}`);
  }
  if (filters.isActive !== undefined && options?.defaultActive === false) {
    parts.push(Prisma.sql`p.is_active = ${filters.isActive}`);
  }

  if (filters.attributes && filters.categoryId !== undefined) {
    for (const [key, value] of attributeEntries(
      filters.attributes,
      options?.excludeAttributeKey,
    )) {
      parts.push(attributeSqlClause(key, value));
    }
  }

  if (filters.inStock === true) {
    parts.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM product_offers o
        WHERE o.product_id = p.id
          AND o.is_available = true
          AND o.stock_quantity > 0
      )`);
  }

  return parts.length > 0 ? Prisma.join(parts, " AND ") : Prisma.sql`TRUE`;
}
