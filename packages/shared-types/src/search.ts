import { z } from "zod";
import { paginationSchema } from "./pagination";
import type { ProductListItem } from "./product";

const uuidSchema = z.string().uuid();

const attributeScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

/** Single value or OR list within one attribute key (e.g. color: ["red", "blue"]). */
export const productAttributesFilterSchema = z.record(
  z.string().min(1),
  z.union([attributeScalarSchema, z.array(attributeScalarSchema).min(1)]),
);

export const filtersSchema = z
  .object({
    categoryId: z.union([uuidSchema, z.array(uuidSchema).min(1)]).optional(),
    brandId: z.union([uuidSchema, z.array(uuidSchema).min(1)]).optional(),
    priceMin: z.coerce.number().nonnegative().optional(),
    priceMax: z.coerce.number().nonnegative().optional(),
    ratingMin: z.coerce.number().min(0).max(5).optional(),
    isActive: z.boolean().optional(),
    attributes: productAttributesFilterSchema.optional(),
  })
  .refine(
    (data) =>
      data.priceMin === undefined ||
      data.priceMax === undefined ||
      data.priceMin <= data.priceMax,
    { message: "priceMin must be less than or equal to priceMax" },
  );

export const sortFieldSchema = z.enum([
  "popularityScore",
  "ratingAvg",
  "basePrice",
  "createdAt",
  "name",
  "relevance",
]);

export const sortOrderSchema = z.enum(["asc", "desc"]);

export const sortOptionsSchema = z.object({
  field: sortFieldSchema,
  order: sortOrderSchema.default("desc"),
});

export const searchParamsSchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
  filters: filtersSchema.optional(),
  sort: sortOptionsSchema.optional(),
});

/** Search + pagination for catalog API query validation. */
export const searchRequestSchema = searchParamsSchema.extend({
  pagination: paginationSchema.optional(),
  /** When false, skips attribute facet aggregation (saves DB work on pagination-only requests). */
  includeFacets: z.coerce.boolean().default(true),
});

export type Filters = z.infer<typeof filtersSchema>;
export type SortField = z.infer<typeof sortFieldSchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;
export type SortOptions = z.infer<typeof sortOptionsSchema>;
export type SearchParams = z.infer<typeof searchParamsSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;

export type FacetBucket = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

export type AttributeFacetValue = {
  value: string | number | boolean;
  count: number;
};

/** Contextual facet group for one JSONB attribute key (e.g. color, size). */
export type AttributeFacet = {
  key: string;
  values: AttributeFacetValue[];
};

export type SearchFacets = {
  categories?: FacetBucket[];
  brands?: FacetBucket[];
  priceRange?: { min: number; max: number };
  attributes?: AttributeFacet[];
};

/** Search/list API response. */
export type SearchResult = {
  items: ProductListItem[];
  total: number;
  facets?: SearchFacets;
  pagination: {
    type: "cursor" | "offset";
    nextCursor?: string | null;
    page?: number;
    pageSize?: number;
    hasMore: boolean;
  };
};
