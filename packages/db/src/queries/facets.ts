import { Prisma } from "@prisma/client";
import type { AttributeFacet, FacetBucket, Filters } from "@ecommerce/shared-types";
import { prisma } from "../client";
import {
  buildProductFilterSql,
  productSearchMatchSql,
  type ProductFilterSqlOptions,
} from "./helpers";

const MAX_ATTRIBUTE_FACET_VALUES = 50;

export type CatalogFacetsResult = {
  categories: FacetBucket[];
  brands: FacetBucket[];
  attributes: AttributeFacet[];
};

function parseFacetValue(raw: string): string | number | boolean {
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  const asNumber = Number(raw);
  if (raw !== "" && !Number.isNaN(asNumber) && String(asNumber) === raw) {
    return asNumber;
  }
  return raw;
}

function buildFacetScopeSql(
  filters?: Filters,
  query?: string,
  scopeOptions?: ProductFilterSqlOptions,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [buildProductFilterSql(filters, scopeOptions)];
  const trimmed = query?.trim();
  if (trimmed) {
    parts.push(productSearchMatchSql(trimmed));
  }
  return Prisma.join(parts, " AND ");
}

/**
 * Category facets (disjunctive): counts use brand/price/search/attributes, not categoryId.
 */
export async function getCategoryFacets(
  filters?: Filters,
  query?: string,
): Promise<FacetBucket[]> {
  const scopeSql = buildFacetScopeSql(filters, query, { excludeCategory: true });

  return prisma.$queryRaw<FacetBucket[]>`
    SELECT
      c.id,
      c.name,
      c.slug,
      COUNT(*)::int AS count
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id AND c.is_active = true
    WHERE ${scopeSql}
    GROUP BY c.id, c.name, c.slug
    ORDER BY count DESC, c.name ASC
  `;
}

/**
 * Brand facets (disjunctive): counts use category/price/search/attributes, not brandId.
 */
export async function getBrandFacets(
  filters?: Filters,
  query?: string,
): Promise<FacetBucket[]> {
  const scopeSql = buildFacetScopeSql(filters, query, { excludeBrand: true });

  return prisma.$queryRaw<FacetBucket[]>`
    SELECT
      b.id,
      b.name,
      b.slug,
      COUNT(*)::int AS count
    FROM products p
    INNER JOIN brands b ON b.id = p.brand_id AND b.is_active = true
    WHERE ${scopeSql}
    GROUP BY b.id, b.name, b.slug
    ORDER BY count DESC, b.name ASC
  `;
}

/**
 * Contextual attribute facets (disjunctive per key): counts reflect current
 * category/brand/price/search and other attributes, but not the facet key itself.
 */
export async function getAttributeFacets(
  filters?: Filters,
  query?: string,
): Promise<AttributeFacet[]> {
  const scopeSql = buildFacetScopeSql(filters, query);

  const keyRows = await prisma.$queryRaw<Array<{ key: string }>>`
    SELECT DISTINCT jsonb_object_keys(p.attributes) AS key
    FROM products p
    WHERE ${scopeSql}
    ORDER BY key
  `;

  if (keyRows.length === 0) {
    return [];
  }

  return Promise.all(
    keyRows.map(async ({ key }) => {
      const perKeyScope = buildFacetScopeSql(filters, query, {
        excludeAttributeKey: key,
      });
      const valueRows = await prisma.$queryRaw<
        Array<{ value: string; count: number }>
      >`
        SELECT
          CASE
            WHEN jsonb_typeof(e.value) = 'number' THEN (e.value #>> '{}')
            WHEN jsonb_typeof(e.value) = 'boolean' THEN (e.value #>> '{}')
            WHEN jsonb_typeof(e.value) = 'string' THEN (e.value #>> '{}')
            ELSE NULL
          END AS value,
          COUNT(*)::int AS count
        FROM products p
        CROSS JOIN LATERAL jsonb_each(p.attributes) AS e(key, value)
        WHERE e.key = ${key}
          AND ${perKeyScope}
        GROUP BY value
        HAVING value IS NOT NULL
        ORDER BY count DESC, value ASC
        LIMIT ${MAX_ATTRIBUTE_FACET_VALUES}
      `;

      return {
        key,
        values: valueRows.map((row) => ({
          value: parseFacetValue(row.value),
          count: row.count,
        })),
      };
    }),
  );
}

/**
 * Loads contextual category, brand, and (optionally) attribute facets for the catalog.
 */
export async function getCatalogFacets(
  filters?: Filters,
  query?: string,
  options?: { includeAttributes?: boolean },
): Promise<CatalogFacetsResult> {
  const includeAttributes = options?.includeAttributes ?? false;

  const [categories, brands, attributes] = await Promise.all([
    getCategoryFacets(filters, query),
    getBrandFacets(filters, query),
    includeAttributes
      ? getAttributeFacets(filters, query)
      : Promise.resolve([]),
  ]);

  return { categories, brands, attributes };
}
