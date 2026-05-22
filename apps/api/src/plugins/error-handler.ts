import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";
import { HttpError } from "@/errors/http-errors.js";

function getErrorStatusCode(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return undefined;
}

function errorBody(
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): { error: Record<string, unknown> } {
  return {
    error: {
      code,
      message,
      requestId,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (error instanceof ZodError) {
      return reply.status(400).send(
        errorBody(
          "VALIDATION_ERROR",
          "Invalid request parameters",
          requestId,
          error.flatten(),
        ),
      );
    }

    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send(
        errorBody(error.code, error.message, requestId),
      );
    }

    const statusCode = getErrorStatusCode(error);
    if (statusCode === 400) {
      return reply.status(400).send(
        errorBody(
          "BAD_REQUEST",
          error instanceof Error ? error.message : "Bad request",
          requestId,
        ),
      );
    }

    if (statusCode === 429) {
      return reply.status(429).send(
        errorBody(
          "RATE_LIMIT_EXCEEDED",
          error instanceof Error ? error.message : "Too many requests",
          requestId,
        ),
      );
    }

    request.log.error({ err: error, requestId }, "Unhandled error");
    return reply.status(500).send(
      errorBody("INTERNAL_SERVER_ERROR", "Internal server error", requestId),
    );
  });
};

export default fp(errorHandlerPlugin, { name: "error-handler" });
