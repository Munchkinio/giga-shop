import type { FastifyPluginAsync } from "fastify";
import { parseSearchRequestQuery } from "@/lib/parse-search-query.js";
import {
  getProductBySlugSchema,
  listProductsSchema,
} from "@/openapi/route-schemas.js";
import { listProducts, getProductDetail } from "@/services/products.service.js";

export const productRoutes: FastifyPluginAsync = async (app) => {
  app.get("/products", { schema: listProductsSchema }, async (request) => {
    const searchRequest = parseSearchRequestQuery(
      request.query as Record<string, unknown>,
    );
    return listProducts(app.redis, searchRequest);
  });

  app.get<{ Params: { slug: string } }>(
    "/products/:slug",
    { schema: getProductBySlugSchema },
    async (request) => {
    return getProductDetail(app.redis, request.params.slug);
  });
};
