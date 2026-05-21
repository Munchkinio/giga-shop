import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "@/env.js";
import errorHandlerPlugin from "@/plugins/error-handler.js";
import redisPlugin from "@/plugins/redis.js";
import { brandRoutes } from "@/routes/brands.js";
import { categoryRoutes } from "@/routes/categories.js";
import { productRoutes } from "@/routes/products.js";
import { savedSearchRoutes } from "@/routes/saved-searches.js";
import { searchSuggestRoutes } from "@/routes/search-suggest.js";
import { searchRoutes } from "@/routes/search.js";

/**
 * Builds and configures the Fastify application (plugins + routes).
 */
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
  });

  await app.register(redisPlugin);
  await app.register(errorHandlerPlugin);

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  await app.register(productRoutes);
  await app.register(searchRoutes);
  await app.register(searchSuggestRoutes);
  await app.register(categoryRoutes);
  await app.register(brandRoutes);
  await app.register(savedSearchRoutes);

  return app;
}
