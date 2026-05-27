import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchSuggestResponse } from "@ecommerce/shared-types";
import { suggest } from "./search-suggest.service.js";

const {
  mockGetSearchSuggestions,
  mockBuildCatalogCacheKey,
  mockGetCached,
  mockSetCached,
} = vi.hoisted(() => ({
  mockGetSearchSuggestions: vi.fn(),
  mockBuildCatalogCacheKey: vi.fn(),
  mockGetCached: vi.fn(),
  mockSetCached: vi.fn(),
}));

vi.mock("@ecommerce/db", () => ({
  getSearchSuggestions: mockGetSearchSuggestions,
}));

vi.mock("@/lib/cache.js", () => ({
  buildCatalogCacheKey: mockBuildCatalogCacheKey,
  getCached: mockGetCached,
  setCached: mockSetCached,
}));

describe("search-suggest service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildCatalogCacheKey.mockResolvedValue("search:suggest:v1:key");
  });

  it("returns cached suggestions without querying DB", async () => {
    const cached = {
      query: "iph",
      suggestions: ["iphone"],
    } as SearchSuggestResponse;
    mockGetCached.mockResolvedValue(cached);

    const result = await suggest(null, "iph", 5);

    expect(result).toEqual(cached);
    expect(mockGetSearchSuggestions).not.toHaveBeenCalled();
    expect(mockSetCached).not.toHaveBeenCalled();
  });

  it("loads suggestions from DB and caches with short TTL", async () => {
    mockGetCached.mockResolvedValue(null);
    mockGetSearchSuggestions.mockResolvedValue(["iphone", "ipad"]);

    const result = await suggest(null, "ip", 10);

    expect(mockBuildCatalogCacheKey).toHaveBeenCalledWith(
      null,
      "search:suggest",
      { query: "ip", limit: 10 },
    );
    expect(mockGetSearchSuggestions).toHaveBeenCalledWith("ip", 10);
    expect(mockSetCached).toHaveBeenCalledWith(
      null,
      "search:suggest:v1:key",
      { query: "ip", suggestions: ["iphone", "ipad"] },
      120,
    );
    expect(result).toEqual({
      query: "ip",
      suggestions: ["iphone", "ipad"],
    });
  });
});
