import { updateProductOffer, type ProductOfferRow } from "@ecommerce/db";
import type { ProductOffer, UpdateOfferInput } from "@ecommerce/shared-types";
import type { Redis } from "@upstash/redis";
import { NotFoundError } from "@/errors/http-errors.js";
import { invalidateProductCatalog } from "@/lib/cache-invalidation.js";

function mapOffer(row: ProductOfferRow): ProductOffer {
  return {
    id: row.id,
    productId: row.productId,
    sellerId: row.sellerId,
    sellerName: row.sellerName,
    price: row.price.toString(),
    compareAtPrice: row.compareAtPrice?.toString() ?? null,
    currency: row.currency,
    stockQuantity: row.stockQuantity,
    isAvailable: row.isAvailable,
    shippingDays: row.shippingDays,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Updates offer fields in Postgres and invalidates related Redis cache entries.
 */
export async function patchProductOffer(
  redis: Redis | null,
  offerId: string,
  input: UpdateOfferInput,
): Promise<ProductOffer> {
  const result = await updateProductOffer(offerId, input);
  if (!result) {
    throw new NotFoundError(`Offer not found: ${offerId}`);
  }

  await invalidateProductCatalog(redis, {
    productSlug: result.productSlug,
  });

  return mapOffer(result.offer);
}
