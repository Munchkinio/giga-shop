import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductDetail } from "@ecommerce/shared-types";
import { NotFoundError } from "@/errors/http-errors.js";
import { searchRequest, searchResult } from "../test-fixtures.js";
import { getProductDetail, listProducts } from "./products.service.js";

const {
  mockGetProducts,
  mockGetProductBySlug,
  mockGetCategoryBreadcrumb,
  mockBuildCatalogCacheKey,
  mockBuildProductSlugCacheKey,
  mockGetCached,
  mockSetCached,
} = vi.hoisted(() => ({
  mockGetProducts: vi.fn(),
  mockGetProductBySlug: vi.fn(),
  mockGetCategoryBreadcrumb: vi.fn(),
  mockBuildCatalogCacheKey: vi.fn(),
  mockBuildProductSlugCacheKey: vi.fn(),
  mockGetCached: vi.fn(),
  mockSetCached: vi.fn(),
}));

vi.mock("@ecommerce/db", () => ({
  getProducts: mockGetProducts,
  getProductBySlug: mockGetProductBySlug,
  getCategoryBreadcrumb: mockGetCategoryBreadcrumb,
}));

vi.mock("@/lib/cache.js", () => ({
  buildCatalogCacheKey: mockBuildCatalogCacheKey,
  buildProductSlugCacheKey: mockBuildProductSlugCacheKey,
  getCached: mockGetCached,
  setCached: mockSetCached,
}));

describe("products service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildCatalogCacheKey.mockResolvedValue("products:v1:key");
    mockBuildProductSlugCacheKey.mockReturnValue("product:slug:iphone-15");
  });

  it("returns list from cache when available", async () => {
    const request = searchRequest({
      pagination: { type: "offset", page: 1, pageSize: 10 },
    });
    const cached = searchResult({
      pagination: { type: "offset", page: 1, pageSize: 10, hasMore: false },
    });
    mockGetCached.mockResolvedValue(cached);

    const result = await listProducts(null, request);

    expect(result).toEqual(cached);
    expect(mockGetProducts).not.toHaveBeenCalled();
    expect(mockSetCached).not.toHaveBeenCalled();
  });

  it("loads list from DB and caches it on miss", async () => {
    const request = searchRequest({
      pagination: { type: "offset", page: 1, pageSize: 10 },
    });
    const dbResult = searchResult({ total: 1 });
    mockGetCached.mockResolvedValue(null);
    mockGetProducts.mockResolvedValue(dbResult);

    const result = await listProducts(null, request);

    expect(mockGetProducts).toHaveBeenCalledWith(request);
    expect(mockSetCached).toHaveBeenCalledWith(null, "products:v1:key", dbResult);
    expect(result).toEqual(dbResult);
  });

  it("returns product detail from cache when available", async () => {
    const cached = { id: "p1", slug: "iphone-15", name: "iPhone 15" } as ProductDetail;
    mockGetCached.mockResolvedValue(cached);

    const result = await getProductDetail(null, "iphone-15");

    expect(result).toEqual(cached);
    expect(mockGetProductBySlug).not.toHaveBeenCalled();
    expect(mockSetCached).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when product does not exist", async () => {
    mockGetCached.mockResolvedValue(null);
    mockGetProductBySlug.mockResolvedValue(null);

    await expect(getProductDetail(null, "iphone-15")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("maps product and category breadcrumb and caches result", async () => {
    mockGetCached.mockResolvedValue(null);
    mockGetProductBySlug.mockResolvedValue({
      id: "p1",
      sku: "SKU-1",
      name: "iPhone 15",
      slug: "iphone-15",
      description: "Phone",
      shortDescription: "Short",
      categoryId: "c1",
      brandId: "b1",
      basePrice: 999.99,
      currency: "USD",
      attributes: { color: "black" },
      ratingAvg: 4.8,
      ratingCount: 120,
      popularityScore: 10,
      viewCount: 500,
      isActive: true,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      images: [],
      offers: [
        {
          id: "o1",
          productId: "p1",
          sellerId: "s1",
          sellerName: "Shop",
          price: 999.99,
          compareAtPrice: null,
          currency: "USD",
          stockQuantity: 5,
          isAvailable: true,
          shippingDays: 2,
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          updatedAt: new Date("2025-01-01T00:00:00.000Z"),
        },
      ],
      category: {
        id: "c1",
        name: "Phones",
        slug: "phones",
        parentId: null,
        isActive: true,
      },
      brand: {
        id: "b1",
        name: "Apple",
        slug: "apple",
      },
    });
    mockGetCategoryBreadcrumb.mockResolvedValue([
      { id: "root", name: "Catalog", slug: "catalog", parentId: null, path: null, isActive: true },
      { id: "c1", name: "Phones", slug: "phones", parentId: null, path: null, isActive: true },
    ]);

    const result = await getProductDetail(null, "iphone-15");

    expect(result.basePrice).toBe("999.99");
    expect(result.ratingAvg).toBe("4.8");
    expect(result.offers[0]?.price).toBe("999.99");
    expect(result.categoryBreadcrumb?.length).toBe(2);
    expect(mockSetCached).toHaveBeenCalledWith(
      null,
      "product:slug:iphone-15",
      result,
    );
  });

  it("omits category and breadcrumb when product has no category", async () => {
    mockGetCached.mockResolvedValue(null);
    mockGetProductBySlug.mockResolvedValue({
      id: "p2",
      sku: "SKU-2",
      name: "Misc",
      slug: "misc",
      description: null,
      shortDescription: null,
      categoryId: null,
      brandId: null,
      basePrice: 10,
      currency: "USD",
      attributes: {},
      ratingAvg: 0,
      ratingCount: 0,
      popularityScore: 0,
      viewCount: 0,
      isActive: true,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
      images: [],
      offers: [],
      category: null,
      brand: null,
    });

    const result = await getProductDetail(null, "misc");

    expect(result.category).toBeUndefined();
    expect(result.brand).toBeUndefined();
    expect(result.categoryBreadcrumb).toBeUndefined();
    expect(mockGetCategoryBreadcrumb).not.toHaveBeenCalled();
  });
});
