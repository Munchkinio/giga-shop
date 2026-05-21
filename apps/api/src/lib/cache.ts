import { createHash } from "node:crypto";
import type { Redis } from "@upstash/redis";

export const CACHE_TTL_SECONDS = 300;

export function buildCacheKey(prefix: string, params: unknown): string {
  const hash = createHash("sha256")
    .update(JSON.stringify(params))
    .digest("hex");
  return `${prefix}:${hash}`;
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
): Promise<void> {
  if (!redis) {
    return;
  }
  await redis.set(key, value, { ex: CACHE_TTL_SECONDS });
}
