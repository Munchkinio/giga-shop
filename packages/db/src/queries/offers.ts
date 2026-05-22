import type { UpdateOfferInput } from "@ecommerce/shared-types";
import { Prisma } from "@prisma/client";
import { prisma } from "../client.js";

export type ProductOfferRow = Prisma.ProductOfferGetPayload<object>;

export type UpdateProductOfferResult = {
  offer: ProductOfferRow;
  productSlug: string;
};

/**
 * Updates a product offer and returns the row plus parent product slug for cache invalidation.
 */
export async function updateProductOffer(
  offerId: string,
  input: UpdateOfferInput,
): Promise<UpdateProductOfferResult | null> {
  const existing = await prisma.productOffer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      product: { select: { slug: true } },
    },
  });

  if (!existing) {
    return null;
  }

  const data: Prisma.ProductOfferUpdateInput = {};

  if (input.price !== undefined) {
    data.price = new Prisma.Decimal(input.price);
  }
  if (input.compareAtPrice !== undefined) {
    data.compareAtPrice =
      input.compareAtPrice === null
        ? null
        : new Prisma.Decimal(input.compareAtPrice);
  }
  if (input.stockQuantity !== undefined) {
    data.stockQuantity = input.stockQuantity;
  }
  if (input.isAvailable !== undefined) {
    data.isAvailable = input.isAvailable;
  }
  if (input.shippingDays !== undefined) {
    data.shippingDays = input.shippingDays;
  }
  if (input.sellerName !== undefined) {
    data.sellerName = input.sellerName;
  }
  if (input.currency !== undefined) {
    data.currency = input.currency;
  }

  const offer = await prisma.productOffer.update({
    where: { id: offerId },
    data,
  });

  return {
    offer,
    productSlug: existing.product.slug,
  };
}
