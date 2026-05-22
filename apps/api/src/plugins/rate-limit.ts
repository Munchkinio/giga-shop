import rateLimit from "@fastify/rate-limit";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { env } from "@/env.js";

/**
 * Per-IP rate limit for API routes registered after this plugin.
 * Register `/health` before this plugin so probes are not limited.
 */
const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });
};

export default fp(rateLimitPlugin, { name: "rate-limit" });
