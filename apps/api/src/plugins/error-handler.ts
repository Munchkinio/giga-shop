import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";
import { HttpError } from "@/errors/http-errors.js";

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request parameters",
          details: error.flatten(),
        },
      });
    }

    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  });
};

export default fp(errorHandlerPlugin, { name: "error-handler" });
