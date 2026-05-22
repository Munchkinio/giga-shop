import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "@/env.js";
import {
  checkDatabaseHealth,
  checkRedisHealth,
} from "@/lib/health-checks.js";
import errorHandlerPlugin from "@/plugins/error-handler.js";
import rateLimitPlugin from "@/plugins/rate-limit.js";
import redisPlugin from "@/plugins/redis.js";
import { requestIdOptions } from "@/plugins/request-id.js";
import swaggerPlugin from "@/plugins/swagger.js";
import { brandRoutes } from "@/routes/brands.js";
import { offerRoutes } from "@/routes/offers.js";
import { categoryRoutes } from "@/routes/categories.js";
import { productRoutes } from "@/routes/products.js";
import { savedSearchRoutes } from "@/routes/saved-searches.js";
import { searchSuggestRoutes } from "@/routes/search-suggest.js";
import { searchRoutes } from "@/routes/search.js";
import { healthReadySchema, healthSchema } from "@/openapi/route-schemas.js";

/**
 * Builds and configures the Fastify application (plugins + routes).
 */
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
    ...requestIdOptions,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    exposedHeaders: [requestIdOptions.requestIdHeader],
  });

  await app.register(redisPlugin);
  await app.register(errorHandlerPlugin);

  app.get("/health", { schema: healthSchema }, async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  app.get("/health/ready", { schema: healthReadySchema }, async (request, reply) => {
    const [database, redis] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(app.redis),
    ]);

    const checks = { database, redis };
    const redisBlocksReady =
      redis.status === "error" ||
      (env.HEALTH_READY_REQUIRE_REDIS && redis.status !== "ok");
    const ready = database.status === "ok" && !redisBlocksReady;

    const body = {
      status: ready ? ("ok" as const) : ("fail" as const),
      timestamp: new Date().toISOString(),
      checks,
    };

    if (!ready) {
      request.log.warn({ checks }, "Readiness check failed");
      return reply.status(503).send(body);
    }

    return body;
  });

  if (env.OPENAPI_ENABLED) {
    await app.register(swaggerPlugin);
  }

  await app.register(rateLimitPlugin);

  await app.register(offerRoutes);
  await app.register(productRoutes);
  await app.register(searchRoutes);
  await app.register(searchSuggestRoutes);
  await app.register(categoryRoutes);
  await app.register(brandRoutes);
  await app.register(savedSearchRoutes);

  return app;
}
