import type { SearchRequest } from "@/types";

/**
 * Serializes {@link SearchRequest} fields to flat query params for the API / URL.
 */
export function searchRequestToQueryRecord(
  request: SearchRequest,
): Record<string, string> {
  const params: Record<string, string> = {};

  if (request.query) {
    params.q = request.query;
  }

  if (request.includeFacets === false) {
    params.includeFacets = "false";
  }

  const filters = request.filters;
  if (filters?.categoryId) {
    params.categoryId = Array.isArray(filters.categoryId)
      ? filters.categoryId.join(",")
      : filters.categoryId;
  }
  if (filters?.brandId) {
    params.brandId = Array.isArray(filters.brandId)
      ? filters.brandId.join(",")
      : filters.brandId;
  }
  if (filters?.priceMin !== undefined) {
    params.priceMin = String(filters.priceMin);
  }
  if (filters?.priceMax !== undefined) {
    params.priceMax = String(filters.priceMax);
  }
  if (filters?.ratingMin !== undefined) {
    params.ratingMin = String(filters.ratingMin);
  }
  if (filters?.isActive !== undefined) {
    params.isActive = String(filters.isActive);
  }
  if (filters?.inStock === true) {
    params.inStock = "true";
  }
  if (filters?.attributes) {
    params.attributes = JSON.stringify(filters.attributes);
  }

  if (request.sort) {
    params.sortField = request.sort.field;
    params.sortOrder = request.sort.order;
  }

  if (request.pagination?.type === "cursor") {
    params.paginationType = "cursor";
    if (request.pagination.cursor) {
      params.cursor = request.pagination.cursor;
    }
    params.limit = String(request.pagination.limit);
  } else if (request.pagination?.type === "offset") {
    params.paginationType = "offset";
    params.page = String(request.pagination.page);
    params.pageSize = String(request.pagination.pageSize);
  }

  return params;
}

export function buildProductsUrl(
  basePath: string,
  request: SearchRequest,
): string {
  const params = new URLSearchParams(searchRequestToQueryRecord(request));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
