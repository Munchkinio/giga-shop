import { sessionIdSchema } from "@ecommerce/shared-types";
import type { FastifyRequest } from "fastify";
import { BadRequestError } from "@/errors/http-errors.js";

const SESSION_HEADER = "x-session-id";

/**
 * Reads and validates the anonymous browser session id from `X-Session-Id`.
 */
export function getSessionIdFromRequest(request: FastifyRequest): string {
  const raw = request.headers[SESSION_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;

  const parsed = sessionIdSchema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestError(
      "Missing or invalid X-Session-Id header (UUID required)",
    );
  }

  return parsed.data;
}
