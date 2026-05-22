import {
  getCategories,
  getCategoryBySlug,
  getCategoryTree,
} from "@ecommerce/db";
import type { FastifyPluginAsync } from "fastify";
import { NotFoundError } from "@/errors/http-errors.js";
import {
  getCategoryBySlugSchema,
  listCategoriesSchema,
} from "@/openapi/route-schemas.js";

export const categoryRoutes: FastifyPluginAsync = async (app) => {
  app.get("/categories", { schema: listCategoriesSchema }, async (request) => {
    const { tree } = request.query as { tree?: string };
    if (tree === "true" || tree === "1") {
      return getCategoryTree();
    }
    return getCategories();
  });

  app.get<{ Params: { slug: string } }>(
    "/categories/:slug",
    { schema: getCategoryBySlugSchema },
    async (request) => {
      const category = await getCategoryBySlug(request.params.slug);
      if (!category) {
        throw new NotFoundError(`Category not found: ${request.params.slug}`);
      }
      return category;
    },
  );
};
