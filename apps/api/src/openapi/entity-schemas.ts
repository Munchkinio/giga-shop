import { filtersSchema, sortOptionsSchema } from "@ecommerce/shared-types";
import { z } from "zod";

/** ISO-8601 timestamps in JSON responses. */
const dateTimeString = z.string();

export const savedSearchResponseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  name: z.string(),
  query: z.string().nullable(),
  filters: filtersSchema.nullable(),
  sort: sortOptionsSchema.nullable(),
  createdAt: dateTimeString,
  updatedAt: dateTimeString,
});

export const brandSummaryResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  isActive: z.boolean(),
});

export const brandResponseSchema = brandSummaryResponseSchema.extend({
  description: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  createdAt: dateTimeString,
  updatedAt: dateTimeString,
});

export const categorySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  parentId: z.string().uuid().nullable(),
  path: z.string().nullable(),
  isActive: z.boolean(),
});

export const categoryResponseSchema = categorySummarySchema.extend({
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  displayOrder: z.number().int(),
  createdAt: dateTimeString,
  updatedAt: dateTimeString,
});

export const categoryWithChildrenSchema: z.ZodType<
  z.infer<typeof categoryResponseSchema> & {
    children: z.infer<typeof categoryWithChildrenSchema>[];
  }
> = z.lazy(() =>
  categoryResponseSchema.extend({
    children: z.array(categoryWithChildrenSchema),
  }),
);

export const categoryTreeSchema = z.array(categoryWithChildrenSchema);

export const productImageSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  url: z.string(),
  altText: z.string().nullable(),
  position: z.number().int(),
  isPrimary: z.boolean(),
  createdAt: dateTimeString,
});

export const productOfferSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  sellerId: z.string().uuid(),
  sellerName: z.string(),
  price: z.string(),
  compareAtPrice: z.string().nullable(),
  currency: z.string(),
  stockQuantity: z.number().int(),
  isAvailable: z.boolean(),
  shippingDays: z.number().int().nullable(),
  createdAt: dateTimeString,
  updatedAt: dateTimeString,
});

export const productAttributesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
);

export const productDetailSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  shortDescription: z.string().nullable(),
  categoryId: z.string().uuid(),
  brandId: z.string().uuid().nullable(),
  basePrice: z.string(),
  currency: z.string(),
  attributes: productAttributesSchema,
  ratingAvg: z.string(),
  ratingCount: z.number().int(),
  popularityScore: z.number().int(),
  viewCount: z.number().int(),
  isActive: z.boolean(),
  createdAt: dateTimeString,
  updatedAt: dateTimeString,
  images: z.array(productImageSchema),
  offers: z.array(productOfferSchema),
  category: categorySummarySchema.optional(),
  categoryBreadcrumb: z.array(categorySummarySchema).optional(),
  brand: brandSummaryResponseSchema.optional(),
});

export const facetBucketSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  count: z.number().int(),
});

export const attributeFacetValueSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
  count: z.number().int(),
});

export const attributeFacetSchema = z.object({
  key: z.string(),
  values: z.array(attributeFacetValueSchema),
});

export const searchFacetsSchema = z.object({
  categories: z.array(facetBucketSchema).optional(),
  brands: z.array(facetBucketSchema).optional(),
  priceRange: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  attributes: z.array(attributeFacetSchema).optional(),
});
