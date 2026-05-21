import { searchProducts } from "@ecommerce/db";
import type { SearchRequest, SearchResult } from "@ecommerce/shared-types";
import type { Redis } from "@upstash/redis";
import { buildCacheKey, getCached, setCached } from "@/lib/cache.js";

/**
 * Full-text search with Redis cache (5 min TTL).
 */
export async function search(
  redis: Redis | null,
  request: SearchRequest,
): Promise<SearchResult> {
  const cacheKey = buildCacheKey("search", request);
  const cached = await getCached<SearchResult>(redis, cacheKey);
  if (cached) {
    return cached;
  }

  const result = await searchProducts(request);
  await setCached(redis, cacheKey, result);
  return result;
}
