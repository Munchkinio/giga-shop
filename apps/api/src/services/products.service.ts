import {
  getCategoryBreadcrumb,
  getProductBySlug,
  getProducts,
  type ProductDetailRow,
} from "@ecommerce/db";
import type {
  Product,
  ProductAttributes,
  ProductDetail,
  ProductOffer,
  SearchRequest,
  SearchResult,
} from "@ecommerce/shared-types";
import type { Redis } from "@upstash/redis";
import { buildCacheKey, getCached, setCached } from "@/lib/cache.js";
import { NotFoundError } from "@/errors/http-errors.js";

function mapOffer(
  offer: ProductDetailRow["offers"][number],
): ProductOffer {
  return {
    id: offer.id,
    productId: offer.productId,
    sellerId: offer.sellerId,
    sellerName: offer.sellerName,
    price: offer.price.toString(),
    compareAtPrice: offer.compareAtPrice?.toString() ?? null,
    currency: offer.currency,
    stockQuantity: offer.stockQuantity,
    isAvailable: offer.isAvailable,
    shippingDays: offer.shippingDays,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

function mapProductDetail(row: ProductDetailRow): ProductDetail {
  const base: Product = {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    description: row.description,
    shortDescription: row.shortDescription,
    categoryId: row.categoryId,
    brandId: row.brandId,
    basePrice: row.basePrice.toString(),
    currency: row.currency,
    attributes: row.attributes as ProductAttributes,
    ratingAvg: row.ratingAvg.toString(),
    ratingCount: row.ratingCount,
    popularityScore: row.popularityScore,
    viewCount: row.viewCount,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return {
    ...base,
    images: row.images,
    offers: row.offers.map(mapOffer),
    category: row.category
      ? {
          id: row.category.id,
          name: row.category.name,
          slug: row.category.slug,
          parentId: row.category.parentId,
          path: null,
          isActive: row.category.isActive,
        }
      : undefined,
    brand: row.brand ?? undefined,
  };
}

/**
 * Lists products with optional filters and pagination (cached).
 */
export async function listProducts(
  redis: Redis | null,
  request: SearchRequest,
): Promise<SearchResult> {
  const cacheKey = buildCacheKey("products", request);
  const cached = await getCached<SearchResult>(redis, cacheKey);
  if (cached) {
    return cached;
  }

  const result = await getProducts(request);
  await setCached(redis, cacheKey, result);
  return result;
}

/**
 * Returns a single product by slug (cached).
 */
export async function getProductDetail(
  redis: Redis | null,
  slug: string,
): Promise<ProductDetail> {
  const cacheKey = `product:slug:${slug}`;
  const cached = await getCached<ProductDetail>(redis, cacheKey);
  if (cached) {
    return cached;
  }

  const row = await getProductBySlug(slug);
  if (!row) {
    throw new NotFoundError(`Product not found: ${slug}`);
  }

  const detail = mapProductDetail(row);
  if (row.category) {
    detail.categoryBreadcrumb = await getCategoryBreadcrumb(row.category.id);
  }
  await setCached(redis, cacheKey, detail);
  return detail;
}
