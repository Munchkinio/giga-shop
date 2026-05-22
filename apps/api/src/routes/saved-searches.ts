import { createSavedSearchSchema } from "@ecommerce/shared-types";
import type { FastifyPluginAsync } from "fastify";
import { getSessionIdFromRequest } from "@/lib/session-id.js";
import {
  createSavedSearchSchema as createSavedSearchRouteSchema,
  deleteSavedSearchSchema,
  listSavedSearchesSchema,
} from "@/openapi/route-schemas.js";
import {
  getSavedSearchesForSession,
  removeSavedSearchForSession,
  saveSearchForSession,
} from "@/services/saved-searches.service.js";

export const savedSearchRoutes: FastifyPluginAsync = async (app) => {
  app.get("/saved-searches", { schema: listSavedSearchesSchema }, async (request) => {
    const sessionId = getSessionIdFromRequest(request);
    return getSavedSearchesForSession(sessionId);
  });

  app.post(
    "/saved-searches",
    { schema: createSavedSearchRouteSchema },
    async (request, reply) => {
      const sessionId = getSessionIdFromRequest(request);
      const body = createSavedSearchSchema.parse(request.body);
      const saved = await saveSearchForSession(sessionId, body);
      return reply.status(201).send(saved);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/saved-searches/:id",
    { schema: deleteSavedSearchSchema },
    async (request) => {
      const sessionId = getSessionIdFromRequest(request);
      await removeSavedSearchForSession(sessionId, request.params.id);
      return { ok: true };
    },
  );
};
