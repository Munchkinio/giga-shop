import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchRequest, SearchResult } from "@ecommerce/shared-types";
import { search } from "./search.service.js";

const {
  mockSearchProducts,
  mockBuildCatalogCacheKey,
  mockGetCached,
  mockSetCached,
} = vi.hoisted(() => ({
  mockSearchProducts: vi.fn(),
  mockBuildCatalogCacheKey: vi.fn(),
  mockGetCached: vi.fn(),
  mockSetCached: vi.fn(),
}));

vi.mock("@ecommerce/db", () => ({
  searchProducts: mockSearchProducts,
}));

vi.mock("@/lib/cache.js", () => ({
  buildCatalogCacheKey: mockBuildCatalogCacheKey,
  getCached: mockGetCached,
  setCached: mockSetCached,
}));

describe("search service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildCatalogCacheKey.mockResolvedValue("search:v1:key");
  });

  it("returns cached value without querying DB", async () => {
    const request = { q: "iphone" } as SearchRequest;
    const cached = { items: [], total: 0 } as SearchResult;
    mockGetCached.mockResolvedValue(cached);

    const result = await search(null, request);

    expect(result).toEqual(cached);
    expect(mockSearchProducts).not.toHaveBeenCalled();
    expect(mockSetCached).not.toHaveBeenCalled();
  });

  it("queries DB and writes cache on miss", async () => {
    const request = { q: "macbook", page: 1, pageSize: 20 } as SearchRequest;
    const dbResult = { items: [{ id: "p1" }], total: 1 } as SearchResult;
    mockGetCached.mockResolvedValue(null);
    mockSearchProducts.mockResolvedValue(dbResult);

    const result = await search(null, request);

    expect(mockBuildCatalogCacheKey).toHaveBeenCalledWith(
      null,
      "search",
      request,
    );
    expect(mockSearchProducts).toHaveBeenCalledWith(request);
    expect(mockSetCached).toHaveBeenCalledWith(null, "search:v1:key", dbResult);
    expect(result).toEqual(dbResult);
  });
});
