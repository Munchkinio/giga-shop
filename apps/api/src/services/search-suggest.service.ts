import { getSearchSuggestions } from "@ecommerce/db";
import type { SearchSuggestResponse } from "@ecommerce/shared-types";
import type { Redis } from "@upstash/redis";
import { buildCatalogCacheKey, getCached, setCached } from "@/lib/cache.js";

const SUGGEST_CACHE_TTL_SECONDS = 120;

/**
 * Autocomplete suggestions with short Redis cache.
 */
export async function suggest(
  redis: Redis | null,
  query: string,
  limit: number,
): Promise<SearchSuggestResponse> {
  const cacheKey = await buildCatalogCacheKey(redis, "search:suggest", {
    query,
    limit,
  });
  const cached = await getCached<SearchSuggestResponse>(redis, cacheKey);
  if (cached) {
    return cached;
  }

  const suggestions = await getSearchSuggestions(query, limit);
  const result: SearchSuggestResponse = { query, suggestions };

  await setCached(redis, cacheKey, result, SUGGEST_CACHE_TTL_SECONDS);

  return result;
}
