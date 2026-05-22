import { getBrandBySlug, getBrands } from "@ecommerce/db";
import type { FastifyPluginAsync } from "fastify";
import { NotFoundError } from "@/errors/http-errors.js";
import {
  getBrandBySlugSchema,
  listBrandsSchema,
} from "@/openapi/route-schemas.js";

export const brandRoutes: FastifyPluginAsync = async (app) => {
  app.get("/brands", { schema: listBrandsSchema }, async () => getBrands());

  app.get<{ Params: { slug: string } }>(
    "/brands/:slug",
    { schema: getBrandBySlugSchema },
    async (request) => {
    const brand = await getBrandBySlug(request.params.slug);
    if (!brand) {
      throw new NotFoundError(`Brand not found: ${request.params.slug}`);
    }
    return brand;
  });
};
