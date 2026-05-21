import { Prisma } from "@prisma/client";
import type { AttributeFacet, Filters } from "@ecommerce/shared-types";
import { prisma } from "../client";
import { buildProductFilterSql, productSearchMatchSql } from "./helpers";

const MAX_ATTRIBUTE_FACET_VALUES = 50;

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
  excludeAttributeKey?: string,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    buildProductFilterSql(filters, { excludeAttributeKey }),
  ];
  const trimmed = query?.trim();
  if (trimmed) {
    parts.push(productSearchMatchSql(trimmed));
  }
  return Prisma.join(parts, " AND ");
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
      const perKeyScope = buildFacetScopeSql(filters, query, key);
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
