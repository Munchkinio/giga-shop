import type { FastifyPluginAsync } from "fastify";
import { parseSearchRequestQuery } from "@/lib/parse-search-query.js";
import { listProducts, getProductDetail } from "@/services/products.service.js";

export const productRoutes: FastifyPluginAsync = async (app) => {
  app.get("/products", async (request) => {
    const searchRequest = parseSearchRequestQuery(
      request.query as Record<string, unknown>,
    );
    return listProducts(app.redis, searchRequest);
  });

  app.get<{ Params: { slug: string } }>("/products/:slug", async (request) => {
    return getProductDetail(app.redis, request.params.slug);
  });
};
