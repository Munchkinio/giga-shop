import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateOfferInput } from "@ecommerce/shared-types";
import { NotFoundError } from "@/errors/http-errors.js";
import { patchProductOffer } from "./offers.service.js";

const { mockUpdateProductOffer, mockInvalidateProductCatalog } = vi.hoisted(
  () => ({
    mockUpdateProductOffer: vi.fn(),
    mockInvalidateProductCatalog: vi.fn(),
  }),
);

vi.mock("@ecommerce/db", () => ({
  updateProductOffer: mockUpdateProductOffer,
}));

vi.mock("@/lib/cache-invalidation.js", () => ({
  invalidateProductCatalog: mockInvalidateProductCatalog,
}));

describe("offers service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidateProductCatalog.mockResolvedValue({
      catalogVersion: 2,
      deletedProductKey: true,
    });
  });

  it("throws NotFoundError when offer does not exist", async () => {
    mockUpdateProductOffer.mockResolvedValue(null);

    await expect(
      patchProductOffer(null, "missing", { price: "10" } as UpdateOfferInput),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mockInvalidateProductCatalog).not.toHaveBeenCalled();
  });

  it("updates offer, invalidates cache, and maps decimals to strings", async () => {
    const updatedAt = new Date("2025-01-02T00:00:00.000Z");
    const createdAt = new Date("2025-01-01T00:00:00.000Z");
    mockUpdateProductOffer.mockResolvedValue({
      productSlug: "iphone-15",
      offer: {
        id: "o1",
        productId: "p1",
        sellerId: "s1",
        sellerName: "Shop",
        price: 899.5,
        compareAtPrice: 999,
        currency: "USD",
        stockQuantity: 3,
        isAvailable: true,
        shippingDays: 1,
        createdAt,
        updatedAt,
      },
    });

    const result = await patchProductOffer(null, "o1", {
      price: "899.5",
      stockQuantity: 3,
    } as UpdateOfferInput);

    expect(mockUpdateProductOffer).toHaveBeenCalledWith("o1", {
      price: "899.5",
      stockQuantity: 3,
    });
    expect(mockInvalidateProductCatalog).toHaveBeenCalledWith(null, {
      productSlug: "iphone-15",
    });
    expect(result).toMatchObject({
      id: "o1",
      price: "899.5",
      compareAtPrice: "999",
      stockQuantity: 3,
    });
  });

  it("maps null compareAtPrice to null", async () => {
    mockUpdateProductOffer.mockResolvedValue({
      productSlug: "misc",
      offer: {
        id: "o2",
        productId: "p2",
        sellerId: "s1",
        sellerName: "Shop",
        price: 10,
        compareAtPrice: null,
        currency: "USD",
        stockQuantity: 1,
        isAvailable: true,
        shippingDays: 3,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-01T00:00:00.000Z"),
      },
    });

    const result = await patchProductOffer(null, "o2", {} as UpdateOfferInput);

    expect(result.compareAtPrice).toBeNull();
  });
});
