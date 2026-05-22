import {
  createSavedSearchSchema,
  searchSuggestQuerySchema,
  updateOfferSchema,
} from "@ecommerce/shared-types";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  attributeFacetSchema,
  brandResponseSchema,
  brandSummaryResponseSchema,
  categoryResponseSchema,
  categoryTreeSchema,
  facetBucketSchema,
  productDetailSchema,
  productOfferSchema,
  savedSearchResponseSchema,
  searchFacetsSchema,
} from "@/openapi/entity-schemas.js";

/** Flat catalog/search query params (see `parseSearchRequestQuery`). */
export const catalogQueryJsonSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    q: { type: "string", description: "Search query" },
    query: { type: "string", description: "Alias for `q`" },
    categoryId: {
      type: "string",
      description: "Category UUID or comma-separated UUIDs",
    },
    brandId: {
      type: "string",
      description: "Brand UUID or comma-separated UUIDs (OR)",
    },
    priceMin: { type: "number", minimum: 0 },
    priceMax: { type: "number", minimum: 0 },
    ratingMin: { type: "number", minimum: 0, maximum: 5 },
    isActive: { type: "boolean" },
    inStock: {
      type: "boolean",
      description: "Only products with at least one in-stock offer",
    },
    attributes: {
      type: "string",
      description: 'JSON object, e.g. {"color":["red","blue"],"size":"M"}',
    },
    sortField: {
      type: "string",
      enum: [
        "popularityScore",
        "ratingAvg",
        "basePrice",
        "createdAt",
        "name",
        "relevance",
      ],
    },
    sortOrder: { type: "string", enum: ["asc", "desc"] },
    sort: { type: "string", description: "Alias for `sortField`" },
    paginationType: { type: "string", enum: ["offset", "cursor"] },
    pagination: { type: "string", description: "Alias for `paginationType`" },
    page: { type: "integer", minimum: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100 },
    cursor: { type: "string", format: "uuid" },
    limit: { type: "integer", minimum: 1, maximum: 100 },
    includeFacets: {
      type: "boolean",
      default: true,
      description: "When false, skips attribute facet aggregation",
    },
  },
} as const;

function stripJsonSchemaMeta<T extends Record<string, unknown>>(schema: T): T {
  const { $schema: _s, ...rest } = schema;
  return rest as T;
}

function registerZodSchema(
  app: FastifyInstance,
  id: string,
  zodSchema: z.ZodTypeAny,
): void {
  const json = stripJsonSchemaMeta(
    zodToJsonSchema(zodSchema, { $refStrategy: "none" }) as Record<
      string,
      unknown
    >,
  );
  app.addSchema({ $id: id, ...json });
}

const savedSearchBodySchema = stripJsonSchemaMeta(
  zodToJsonSchema(createSavedSearchSchema, {
    $refStrategy: "none",
  }) as Record<string, unknown>,
);

const searchSuggestQueryJsonSchema = stripJsonSchemaMeta(
  zodToJsonSchema(searchSuggestQuerySchema, {
    $refStrategy: "none",
  }) as Record<string, unknown>,
);

/**
 * Registers shared JSON Schemas for OpenAPI `$ref` resolution.
 */
export function registerOpenApiSchemas(app: FastifyInstance): void {
  app.addSchema({
    $id: "ApiErrorBody",
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          requestId: { type: "string", description: "Echo of X-Request-Id" },
          details: { type: "object", additionalProperties: true },
        },
      },
    },
  });

  app.addSchema({
    $id: "HealthResponse",
    type: "object",
    required: ["status", "timestamp"],
    properties: {
      status: { type: "string", enum: ["ok"] },
      timestamp: { type: "string", format: "date-time" },
    },
  });

  app.addSchema({
    $id: "HealthCheckResult",
    type: "object",
    required: ["status"],
    properties: {
      status: { type: "string", enum: ["ok", "error", "skipped"] },
      message: { type: "string" },
    },
  });

  app.addSchema({
    $id: "HealthReadyResponse",
    type: "object",
    required: ["status", "timestamp", "checks"],
    properties: {
      status: { type: "string", enum: ["ok", "fail"] },
      timestamp: { type: "string", format: "date-time" },
      checks: {
        type: "object",
        required: ["database", "redis"],
        properties: {
          database: { $ref: "HealthCheckResult#" },
          redis: { $ref: "HealthCheckResult#" },
        },
      },
    },
  });

  app.addSchema({
    $id: "ProductListItem",
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      sku: { type: "string" },
      name: { type: "string" },
      slug: { type: "string" },
      shortDescription: { type: "string", nullable: true },
      basePrice: { type: "string" },
      currency: { type: "string" },
      ratingAvg: { type: "string" },
      ratingCount: { type: "integer" },
      popularityScore: { type: "integer" },
      isActive: { type: "boolean" },
      categoryId: { type: "string", format: "uuid" },
      brandId: { type: "string", format: "uuid", nullable: true },
      primaryImageUrl: { type: "string", nullable: true },
      brandName: { type: "string" },
      categoryName: { type: "string" },
      minOfferPrice: { type: "string", nullable: true },
      offerCount: { type: "integer" },
    },
  });

  app.addSchema({
    $id: "SearchResult",
    type: "object",
    required: ["items", "total", "pagination"],
    properties: {
      items: { type: "array", items: { $ref: "ProductListItem#" } },
      total: { type: "integer" },
      facets: { $ref: "SearchFacets#" },
      pagination: {
        type: "object",
        required: ["type", "hasMore"],
        properties: {
          type: { type: "string", enum: ["cursor", "offset"] },
          nextCursor: { type: "string", nullable: true },
          page: { type: "integer" },
          pageSize: { type: "integer" },
          hasMore: { type: "boolean" },
        },
      },
    },
  });

  registerZodSchema(app, "ProductDetail", productDetailSchema);
  registerZodSchema(app, "ProductOffer", productOfferSchema);
  registerZodSchema(app, "UpdateOfferBody", updateOfferSchema);
  registerZodSchema(app, "Category", categoryResponseSchema);
  registerZodSchema(app, "CategoryTree", categoryTreeSchema);
  registerZodSchema(app, "BrandSummary", brandSummaryResponseSchema);
  registerZodSchema(app, "Brand", brandResponseSchema);
  registerZodSchema(app, "FacetBucket", facetBucketSchema);
  registerZodSchema(app, "AttributeFacet", attributeFacetSchema);
  registerZodSchema(app, "SearchFacets", searchFacetsSchema);

  app.addSchema({
    $id: "SearchSuggestResponse",
    type: "object",
    required: ["query", "suggestions"],
    properties: {
      query: { type: "string" },
      suggestions: {
        type: "array",
        items: {
          type: "object",
          required: ["type", "label", "value"],
          properties: {
            type: { type: "string", enum: ["query", "product", "brand"] },
            label: { type: "string" },
            value: { type: "string" },
            slug: { type: "string" },
            id: { type: "string", format: "uuid" },
            meta: { type: "string" },
          },
        },
      },
    },
  });

  registerZodSchema(app, "SavedSearch", savedSearchResponseSchema);

  app.addSchema({
    $id: "CreateSavedSearchBody",
    ...savedSearchBodySchema,
  });

  app.addSchema({
    $id: "SearchSuggestQuery",
    type: "object",
    ...searchSuggestQueryJsonSchema,
  });

  app.addSchema({
    $id: "OkResponse",
    type: "object",
    required: ["ok"],
    properties: { ok: { type: "boolean", enum: [true] } },
  });
}

export const apiErrorResponses = {
  400: {
    description: "Validation error",
    content: {
      "application/json": {
        schema: { $ref: "ApiErrorBody#" },
      },
    },
  },
  404: {
    description: "Not found",
    content: {
      "application/json": {
        schema: { $ref: "ApiErrorBody#" },
      },
    },
  },
  429: {
    description: "Rate limit exceeded",
    content: {
      "application/json": {
        schema: { $ref: "ApiErrorBody#" },
      },
    },
  },
  500: {
    description: "Internal server error",
    content: {
      "application/json": {
        schema: { $ref: "ApiErrorBody#" },
      },
    },
  },
} as const;
