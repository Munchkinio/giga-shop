import type { Redis } from "@upstash/redis";
import {
  bumpCatalogCacheVersion,
  buildProductSlugCacheKey,
} from "@/lib/cache.js";

export type InvalidateCatalogOptions = {
  /** Clears PDP cache for one product. */
  productSlug?: string;
  /**
   * When true (default), bumps catalog version so all list/search/suggest
   * cache keys miss without scanning Redis.
   */
  listings?: boolean;
};

/**
 * Invalidates API cache after catalog data changes (offers, prices, stock, product row).
 * Call from mutation handlers when offer/product write APIs exist.
 */
export async function invalidateProductCatalog(
  redis: Redis | null,
  options: InvalidateCatalogOptions = {},
): Promise<{ catalogVersion: number | null; deletedProductKey: boolean }> {
  const listings = options.listings ?? true;
  let catalogVersion: number | null = null;
  let deletedProductKey = false;

  if (listings && redis) {
    catalogVersion = await bumpCatalogCacheVersion(redis);
  }

  if (options.productSlug && redis) {
    const key = buildProductSlugCacheKey(options.productSlug);
    await redis.del(key);
    deletedProductKey = true;
  }

  return { catalogVersion, deletedProductKey };
}
