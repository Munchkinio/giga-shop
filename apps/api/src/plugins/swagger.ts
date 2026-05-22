import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { env } from "@/env.js";
import { registerOpenApiSchemas } from "@/openapi/schemas.js";

/**
 * OpenAPI 3 spec and Swagger UI (`/docs`). Registered before rate limiting.
 */
const swaggerPlugin: FastifyPluginAsync = async (app) => {
  registerOpenApiSchemas(app);

  const serverUrl =
    env.API_PUBLIC_URL ?? `http://localhost:${String(env.PORT)}`;

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Giga Shop API",
        description:
          "REST API for the Giga Shop product catalog: search, filters, categories, brands, and saved searches.",
        version: "1.0.0",
      },
      servers: [{ url: serverUrl, description: "API base URL" }],
      tags: [
        { name: "Health", description: "Probes (not rate-limited)" },
        { name: "Products", description: "Catalog listing and detail" },
        { name: "Search", description: "FTS search and autocomplete" },
        { name: "Categories", description: "Category tree" },
        { name: "Brands", description: "Brands" },
        {
          name: "Saved searches",
          description: "Per-session saved filter sets (header `X-Session-Id`)",
        },
      ],
      components: {
        securitySchemes: {
          SessionId: {
            type: "apiKey",
            in: "header",
            name: "X-Session-Id",
            description: "UUID v4 session id from the storefront",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    staticCSP: true,
  });
};

export default fp(swaggerPlugin, { name: "swagger" });
