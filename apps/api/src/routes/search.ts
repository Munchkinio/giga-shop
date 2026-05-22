import type { FastifyPluginAsync } from "fastify";
import { parseSearchRequestQuery } from "@/lib/parse-search-query.js";
import { searchSchema } from "@/openapi/route-schemas.js";
import { search } from "@/services/search.service.js";

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get("/search", { schema: searchSchema }, async (request) => {
    const searchRequest = parseSearchRequestQuery(
      request.query as Record<string, unknown>,
    );
    return search(app.redis, searchRequest);
  });
};
