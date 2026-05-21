import {
  searchRequestSchema,
  type SearchRequest,
} from "@ecommerce/shared-types";
import { BadRequestError } from "@/errors/http-errors.js";

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (value === true || value === "true" || value === "1") {
    return true;
  }
  if (value === false || value === "false" || value === "0") {
    return false;
  }
  return undefined;
}

function parseUuidList(value: unknown): string | string[] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  const str = String(value);
  if (str.includes(",")) {
    return str.split(",").map((s) => s.trim());
  }
  return str;
}

function parseAttributes(
  value: unknown,
): Record<string, string | number | boolean> | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string | number | boolean>;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, string | number | boolean>;
      }
    } catch {
      throw new BadRequestError("Invalid JSON for attributes filter");
    }
  }
  throw new BadRequestError("Invalid attributes filter");
}

/**
 * Maps flat HTTP query parameters to {@link SearchRequest} and validates with Zod.
 */
export function parseSearchRequestQuery(
  query: Record<string, unknown>,
): SearchRequest {
  const paginationType = query.paginationType ?? query.pagination;

  const raw: Record<string, unknown> = {
    query: query.q ?? query.query,
    includeFacets: query.includeFacets,
    filters: {
      categoryId: parseUuidList(query.categoryId),
      brandId: parseUuidList(query.brandId),
      priceMin: query.priceMin,
      priceMax: query.priceMax,
      ratingMin: query.ratingMin,
      isActive: parseBoolean(query.isActive),
      attributes: parseAttributes(query.attributes),
    },
  };

  const sortField = query.sortField ?? query.sort;
  if (sortField !== undefined) {
    raw.sort = { field: sortField, order: query.sortOrder ?? "desc" };
  }

  if (paginationType === "cursor") {
    raw.pagination = {
      type: "cursor",
      cursor: query.cursor,
      limit: query.limit,
    };
  } else if (paginationType === "offset") {
    raw.pagination = {
      type: "offset",
      page: query.page,
      pageSize: query.pageSize ?? query.limit,
    };
  } else if (query.cursor !== undefined) {
    raw.pagination = {
      type: "cursor",
      cursor: query.cursor,
      limit: query.limit,
    };
  } else if (query.page !== undefined || query.pageSize !== undefined) {
    raw.pagination = {
      type: "offset",
      page: query.page,
      pageSize: query.pageSize ?? query.limit,
    };
  }

  const filters = raw.filters as Record<string, unknown>;
  const hasFilters = Object.values(filters).some((v) => v !== undefined);
  if (!hasFilters) {
    raw.filters = undefined;
  }

  return searchRequestSchema.parse(raw);
}
