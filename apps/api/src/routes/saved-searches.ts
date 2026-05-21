import { createSavedSearchSchema } from "@ecommerce/shared-types";
import type { FastifyPluginAsync } from "fastify";
import { getSessionIdFromRequest } from "@/lib/session-id.js";
import {
  getSavedSearchesForSession,
  removeSavedSearchForSession,
  saveSearchForSession,
} from "@/services/saved-searches.service.js";

export const savedSearchRoutes: FastifyPluginAsync = async (app) => {
  app.get("/saved-searches", async (request) => {
    const sessionId = getSessionIdFromRequest(request);
    return getSavedSearchesForSession(sessionId);
  });

  app.post("/saved-searches", async (request) => {
    const sessionId = getSessionIdFromRequest(request);
    const body = createSavedSearchSchema.parse(request.body);
    return saveSearchForSession(sessionId, body);
  });

  app.delete<{ Params: { id: string } }>(
    "/saved-searches/:id",
    async (request) => {
      const sessionId = getSessionIdFromRequest(request);
      await removeSavedSearchForSession(sessionId, request.params.id);
      return { ok: true };
    },
  );
};
