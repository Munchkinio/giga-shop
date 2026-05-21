import { Redis } from "@upstash/redis";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { env } from "@/env.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis | null;
  }
}

const redisPlugin: FastifyPluginAsync = async (app) => {
  const hasUpstash =
    env.UPSTASH_REDIS_REST_URL !== undefined &&
    env.UPSTASH_REDIS_REST_TOKEN !== undefined;

  const redis = hasUpstash
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : null;

  if (!redis) {
    app.log.warn(
      "Upstash Redis not configured (UPSTASH_REDIS_REST_URL/TOKEN) — caching disabled",
    );
  }

  app.decorate("redis", redis);
};

export default fp(redisPlugin, { name: "redis" });
