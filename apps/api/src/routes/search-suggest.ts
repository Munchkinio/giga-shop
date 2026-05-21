import { searchSuggestQuerySchema } from "@ecommerce/shared-types";
import type { FastifyPluginAsync } from "fastify";
import { suggest } from "@/services/search-suggest.service.js";

export const searchSuggestRoutes: FastifyPluginAsync = async (app) => {
  app.get("/search/suggest", async (request) => {
    const { q, limit } = searchSuggestQuerySchema.parse(request.query);
    return suggest(app.redis, q, limit);
  });
};
