import type { ProductListItem, ProductOffer } from "@/types";

export type ListPriceDisplay = {
  amount: string;
  showFrom: boolean;
};

type OfferPriceInput = Pick<
  ProductOffer,
  "price" | "isAvailable" | "stockQuantity"
>;

/**
 * Lowest in-stock offer price; “From” when more than one seller has stock.
 */
export function getOfferPriceDisplay(
  basePrice: string,
  offers: OfferPriceInput[],
): ListPriceDisplay {
  const inStock = offers.filter(
    (offer) => offer.isAvailable && offer.stockQuantity > 0,
  );

  if (inStock.length === 0) {
    return { amount: basePrice, showFrom: false };
  }

  const sorted = [...inStock].sort(
    (a, b) => Number(a.price) - Number(b.price),
  );
  const cheapest = sorted[0];
  if (!cheapest) {
    return { amount: basePrice, showFrom: false };
  }

  return {
    amount: cheapest.price,
    showFrom: sorted.length > 1,
  };
}

/** Catalog list row (pre-aggregated on the API). */
/** e.g. "3 sellers" when multiple in-stock offers; null for 0–1. */
export function formatSellerCount(offerCount: number | undefined): string | null {
  if (!offerCount || offerCount <= 1) {
    return null;
  }
  return `${offerCount} sellers`;
}

export function getListPriceDisplay(product: ProductListItem): ListPriceDisplay {
  if (product.minOfferPrice && (product.offerCount ?? 0) > 0) {
    return {
      amount: product.minOfferPrice,
      showFrom: (product.offerCount ?? 0) > 1,
    };
  }

  return { amount: product.basePrice, showFrom: false };
}
