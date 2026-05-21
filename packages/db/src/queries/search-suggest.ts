import type { SearchSuggestion } from "@ecommerce/shared-types";
import { prisma } from "../client";

const MIN_QUERY_LENGTH = 2;

/**
 * Returns mixed autocomplete suggestions (recent queries, products, brands).
 */
export async function getSearchSuggestions(
  query: string,
  limit = 8,
): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const queryLimit = Math.min(3, limit);
  const productLimit = Math.min(5, Math.max(limit - queryLimit, 1));
  const brandLimit = Math.min(2, limit);

  const [queries, products, brands] = await Promise.all([
    prisma.$queryRaw<Array<{ query: string; count: number }>>`
      SELECT sh.query, COUNT(*)::int AS count
      FROM search_history sh
      WHERE lower(sh.query) LIKE lower(${trimmed}) || '%'
      GROUP BY sh.query
      ORDER BY count DESC, MAX(sh.created_at) DESC
      LIMIT ${queryLimit}
    `,
    prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        brand_name: string;
        score: number;
      }>
    >`
      SELECT
        p.id,
        p.name,
        p.slug,
        b.name AS brand_name,
        similarity(p.name, ${trimmed}) AS score
      FROM products p
      INNER JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = true
        AND p.name % ${trimmed}
      ORDER BY score DESC, p.popularity_score DESC
      LIMIT ${productLimit}
    `,
    prisma.$queryRaw<
      Array<{ id: string; name: string; slug: string; score: number }>
    >`
      SELECT id, name, slug, similarity(name, ${trimmed}) AS score
      FROM brands
      WHERE is_active = true
        AND name % ${trimmed}
      ORDER BY score DESC
      LIMIT ${brandLimit}
    `,
  ]);

  const suggestions: SearchSuggestion[] = [];

  for (const row of queries) {
    suggestions.push({
      type: "query",
      label: row.query,
      value: row.query,
    });
  }

  for (const row of products) {
    suggestions.push({
      type: "product",
      label: row.name,
      value: row.name,
      id: row.id,
      slug: row.slug,
      meta: row.brand_name,
    });
  }

  for (const row of brands) {
    suggestions.push({
      type: "brand",
      label: row.name,
      value: row.name,
      id: row.id,
      slug: row.slug,
      meta: "Brand",
    });
  }

  return suggestions.slice(0, limit);
}
