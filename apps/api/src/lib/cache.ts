import { createHash } from "node:crypto";
import type { Redis } from "@upstash/redis";

export const CACHE_TTL_SECONDS = 300;

/** Bumped on catalog-wide invalidation; embedded in list/search/suggest keys. */
export const CATALOG_CACHE_VERSION_KEY = "cache:catalog:version";

const LOCAL_VERSION_TTL_MS = 2_000;

let localCatalogVersion: { value: string; fetchedAt: number } | null = null;

export function buildCacheKey(prefix: string, params: unknown): string {
  const hash = createHash("sha256")
    .update(JSON.stringify(params))
    .digest("hex");
  return `${prefix}:${hash}`;
}

/** Cache key for GET /products/:slug (invalidated by DEL, not version). */
export function buildProductSlugCacheKey(slug: string): string {
  return `product:slug:${slug}`;
}

/**
 * Resolves the catalog cache generation (short in-process cache to limit Redis GETs).
 */
export async function resolveCatalogCacheVersion(
  redis: Redis | null,
): Promise<string> {
  if (!redis) {
    return "0";
  }

  const now = Date.now();
  if (
    localCatalogVersion &&
    now - localCatalogVersion.fetchedAt < LOCAL_VERSION_TTL_MS
  ) {
    return localCatalogVersion.value;
  }

  const stored = await redis.get<number>(CATALOG_CACHE_VERSION_KEY);
  const value = String(stored ?? 1);
  localCatalogVersion = { value, fetchedAt: now };
  return value;
}

/**
 * List/search/suggest keys include catalog version so INCR invalidates all listing caches at once.
 */
export async function buildCatalogCacheKey(
  redis: Redis | null,
  prefix: string,
  params: unknown,
): Promise<string> {
  const version = await resolveCatalogCacheVersion(redis);
  const hash = createHash("sha256")
    .update(JSON.stringify(params))
    .digest("hex");
  return `${prefix}:v${version}:${hash}`;
}

/**
 * Increments catalog generation; old `products:vN:*` / `search:vN:*` keys expire via TTL.
 */
export async function bumpCatalogCacheVersion(
  redis: Redis,
): Promise<number> {
  localCatalogVersion = null;
  return redis.incr(CATALOG_CACHE_VERSION_KEY);
}

export async function getCached<T>(
  redis: Redis | null,
  key: string,
): Promise<T | null> {
  if (!redis) {
    return null;
  }
  return redis.get<T>(key);
}

export async function setCached(
  redis: Redis | null,
  key: string,
  value: unknown,
  ttlSeconds: number = CACHE_TTL_SECONDS,
): Promise<void> {
  if (!redis) {
    return;
  }
  await redis.set(key, value, { ex: ttlSeconds });
}
