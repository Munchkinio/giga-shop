import { randomUUID } from "node:crypto";

const REQUEST_ID_MAX_LENGTH = 128;

/**
 * Fastify server options for request correlation.
 * Reuses valid incoming `X-Request-Id`; otherwise generates a UUID.
 * Logs include `reqId`; responses echo `X-Request-Id` (see CORS exposedHeaders).
 */
export const requestIdOptions = {
  genReqId: (request: {
    headers: Record<string, string | string[] | undefined>;
  }) => {
    const header = request.headers["x-request-id"];
    if (typeof header === "string") {
      const trimmed = header.trim();
      if (trimmed.length > 0 && trimmed.length <= REQUEST_ID_MAX_LENGTH) {
        return trimmed;
      }
    }
    return randomUUID();
  },
  requestIdHeader: "x-request-id",
  requestIdLogLabel: "reqId",
} as const;
