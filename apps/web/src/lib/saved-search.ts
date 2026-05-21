import { parseSearchParams } from "@/lib/parse-search-params";
import { buildProductsUrl } from "@/lib/search-params-url";
import type { CreateSavedSearchInput, SavedSearch, SearchRequest } from "@/types";

/** Builds API payload from the current catalog URL state. */
export function createSavedSearchInputFromParams(
  name: string,
  searchParams: URLSearchParams,
): CreateSavedSearchInput {
  const record: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    record[key] = value;
  });

  const request = parseSearchParams(record);

  return {
    name,
    query: request.query,
    filters: request.filters,
    sort: request.sort,
  };
}

function savedSearchToRequest(saved: SavedSearch): SearchRequest {
  return {
    query: saved.query ?? undefined,
    filters: saved.filters ?? undefined,
    sort: saved.sort ?? undefined,
    includeFacets: true,
    pagination: { type: "offset", page: 1, pageSize: 24 },
  };
}

/** Navigates to `/products` with the saved search applied. */
export function buildProductsUrlFromSavedSearch(saved: SavedSearch): string {
  return buildProductsUrl("/products", savedSearchToRequest(saved));
}

/** Short summary for the saved search list. */
export function describeSavedSearch(saved: SavedSearch): string {
  const parts: string[] = [];
  if (saved.query) {
    parts.push(`"${saved.query}"`);
  }
  if (saved.filters?.categoryId) {
    parts.push("category");
  }
  if (saved.filters?.brandId) {
    parts.push("brands");
  }
  if (saved.filters?.attributes) {
    parts.push("attributes");
  }
  if (
    saved.filters?.priceMin !== undefined ||
    saved.filters?.priceMax !== undefined
  ) {
    parts.push("price");
  }
  if (saved.filters?.ratingMin !== undefined) {
    parts.push("rating");
  }
  if (saved.sort) {
    parts.push(`sort: ${saved.sort.field}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "All products";
}
