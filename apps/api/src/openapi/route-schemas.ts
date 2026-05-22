import type { FastifySchema } from "fastify";
import { apiErrorResponses, catalogQueryJsonSchema } from "@/openapi/schemas.js";

const slugParam = {
  type: "object",
  required: ["slug"],
  properties: {
    slug: { type: "string", minLength: 1 },
  },
} as const;

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", format: "uuid" },
  },
} as const;

const sessionIdHeader = {
  type: "object",
  required: ["x-session-id"],
  properties: {
    "x-session-id": {
      type: "string",
      format: "uuid",
      description: "Anonymous browser session (required for saved searches)",
    },
  },
} as const;

export const healthSchema: FastifySchema = {
  tags: ["Health"],
  summary: "Liveness probe",
  description: "Not rate-limited. Returns process status and server time.",
  response: {
    200: {
      description: "API is up",
      content: {
        "application/json": {
          schema: { $ref: "HealthResponse#" },
        },
      },
    },
  },
};

export const listProductsSchema: FastifySchema = {
  tags: ["Products"],
  summary: "List and filter products",
  description:
    "Catalog listing with filters, facets, and offset or cursor pagination. Same query shape as GET /search when `q` is set.",
  querystring: catalogQueryJsonSchema,
  response: {
    200: {
      description: "Search result page",
      content: {
        "application/json": {
          schema: { $ref: "SearchResult#" },
        },
      },
    },
    ...apiErrorResponses,
  },
};

export const getProductBySlugSchema: FastifySchema = {
  tags: ["Products"],
  summary: "Product detail by slug",
  params: slugParam,
  response: {
    200: {
      description: "Product with images, offers, category, brand",
      content: {
        "application/json": {
          schema: { $ref: "ProductDetail#" },
        },
      },
    },
    ...apiErrorResponses,
  },
};

export const searchSchema: FastifySchema = {
  tags: ["Search"],
  summary: "Full-text search",
  description: "Same parameters as GET /products; intended for use with `q`.",
  querystring: catalogQueryJsonSchema,
  response: {
    200: {
      description: "Search result page",
      content: {
        "application/json": {
          schema: { $ref: "SearchResult#" },
        },
      },
    },
    ...apiErrorResponses,
  },
};

export const searchSuggestSchema: FastifySchema = {
  tags: ["Search"],
  summary: "Search autocomplete",
  querystring: { $ref: "SearchSuggestQuery#" },
  response: {
    200: {
      description: "Suggestions for products, brands, and popular queries",
      content: {
        "application/json": {
          schema: { $ref: "SearchSuggestResponse#" },
        },
      },
    },
    ...apiErrorResponses,
  },
};

export const listCategoriesSchema: FastifySchema = {
  tags: ["Categories"],
  summary: "List categories or tree",
  querystring: {
    type: "object",
    properties: {
      tree: {
        type: "string",
        enum: ["true", "1"],
        description: "When `true` or `1`, returns nested CategoryTree",
      },
    },
  },
  response: {
    200: {
      description: "Flat category list or tree",
      content: {
        "application/json": {
          schema: {
            oneOf: [
              { type: "array", items: { $ref: "Category#" } },
              { $ref: "CategoryTree#" },
            ],
          },
        },
      },
    },
    ...apiErrorResponses,
  },
};

export const getCategoryBySlugSchema: FastifySchema = {
  tags: ["Categories"],
  summary: "Category by slug",
  params: slugParam,
  response: {
    200: {
      content: {
        "application/json": {
          schema: { $ref: "Category#" },
        },
      },
    },
    ...apiErrorResponses,
  },
};

export const listBrandsSchema: FastifySchema = {
  tags: ["Brands"],
  summary: "List brands",
  response: {
    200: {
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: { $ref: "BrandSummary#" },
          },
        },
      },
    },
    ...apiErrorResponses,
  },
};

export const getBrandBySlugSchema: FastifySchema = {
  tags: ["Brands"],
  summary: "Brand by slug",
  params: slugParam,
  response: {
    200: {
      content: {
        "application/json": {
          schema: { $ref: "Brand#" },
        },
      },
    },
    ...apiErrorResponses,
  },
};

export const listSavedSearchesSchema: FastifySchema = {
  tags: ["Saved searches"],
  summary: "List saved searches for session",
  headers: sessionIdHeader,
  security: [{ SessionId: [] }],
  response: {
    200: {
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: { $ref: "SavedSearch#" },
          },
        },
      },
    },
    ...apiErrorResponses,
  },
};

export const createSavedSearchSchema: FastifySchema = {
  tags: ["Saved searches"],
  summary: "Save a search",
  headers: sessionIdHeader,
  security: [{ SessionId: [] }],
  body: { $ref: "CreateSavedSearchBody#" },
  response: {
    201: {
      content: {
        "application/json": {
          schema: { $ref: "SavedSearch#" },
        },
      },
    },
    ...apiErrorResponses,
  },
};

export const deleteSavedSearchSchema: FastifySchema = {
  tags: ["Saved searches"],
  summary: "Delete a saved search",
  headers: sessionIdHeader,
  security: [{ SessionId: [] }],
  params: idParam,
  response: {
    200: {
      content: {
        "application/json": {
          schema: { $ref: "OkResponse#" },
        },
      },
    },
    ...apiErrorResponses,
  },
};
