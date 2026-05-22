import { prisma } from "@ecommerce/db";
import type { Redis } from "@upstash/redis";

export type HealthCheckStatus = "ok" | "error" | "skipped";

export type HealthCheckResult = {
  status: HealthCheckStatus;
  message?: string;
};

/**
 * Verifies PostgreSQL connectivity (Supabase / local Docker).
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database unreachable";
    return { status: "error", message };
  }
}

/**
 * Pings Upstash when configured; skipped when cache is disabled.
 */
export async function checkRedisHealth(
  redis: Redis | null,
): Promise<HealthCheckResult> {
  if (!redis) {
    return { status: "skipped" };
  }
  try {
    const pong = await redis.ping();
    if (pong !== "PONG") {
      return { status: "error", message: `Unexpected PING response: ${String(pong)}` };
    }
    return { status: "ok" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Redis unreachable";
    return { status: "error", message };
  }
}
