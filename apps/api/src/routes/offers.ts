import { updateOfferSchema } from "@ecommerce/shared-types";
import type { FastifyPluginAsync } from "fastify";
import { patchOfferSchema } from "@/openapi/route-schemas.js";
import { patchProductOffer } from "@/services/offers.service.js";

export const offerRoutes: FastifyPluginAsync = async (app) => {
  app.patch<{ Params: { id: string } }>(
    "/offers/:id",
    { schema: patchOfferSchema },
    async (request) => {
      const body = updateOfferSchema.parse(request.body);
      return patchProductOffer(app.redis, request.params.id, body);
    },
  );
};
