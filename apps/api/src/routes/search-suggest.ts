import { searchSuggestQuerySchema } from "@ecommerce/shared-types";
import type { FastifyPluginAsync } from "fastify";
import { searchSuggestSchema } from "@/openapi/route-schemas.js";
import { suggest } from "@/services/search-suggest.service.js";

export const searchSuggestRoutes: FastifyPluginAsync = async (app) => {
  app.get("/search/suggest", { schema: searchSuggestSchema }, async (request) => {
    const { q, limit } = searchSuggestQuerySchema.parse(request.query);
    return suggest(app.redis, q, limit);
  });
};
