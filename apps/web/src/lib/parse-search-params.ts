import {
  searchRequestSchema,
  type SearchRequest,
} from "@ecommerce/shared-types";

type SearchParamValue = string | string[] | undefined;

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  return undefined;
}

/** Single UUID or comma-separated / array → UUID list for Zod. */
function parseUuidList(value: unknown): string | string[] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (Array.isArray(value)) {
    const ids = value.map(String).filter(Boolean);
    return ids.length === 1 ? ids[0] : ids;
  }
  const str = String(value).trim();
  if (str.includes(",")) {
    const ids = str.split(",").map((id) => id.trim()).filter(Boolean);
    return ids.length === 1 ? ids[0] : ids;
  }
  return str;
}

/**
 * Converts Next.js `searchParams` into a validated {@link SearchRequest}.
 */
export function parseSearchParams(
  searchParams: Record<string, SearchParamValue>,
): SearchRequest {
  const flat: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) {
      continue;
    }
    flat[key] = Array.isArray(value) ? value.join(",") : value;
  }

  const raw: Record<string, unknown> = {
    query: flat.q ?? flat.query,
    includeFacets: flat.includeFacets,
    filters: {
      categoryId: parseUuidList(flat.categoryId),
      brandId: parseUuidList(flat.brandId),
      priceMin: flat.priceMin,
      priceMax: flat.priceMax,
      ratingMin: flat.ratingMin,
      isActive: parseBoolean(flat.isActive),
      inStock:
        parseBoolean(flat.inStock) === true ? true : undefined,
      attributes:
        typeof flat.attributes === "string"
          ? (() => {
              try {
                return JSON.parse(flat.attributes) as Record<string, unknown>;
              } catch {
                return undefined;
              }
            })()
          : flat.attributes,
    },
  };

  const sortField = flat.sortField ?? flat.sort;
  if (sortField !== undefined) {
    raw.sort = { field: sortField, order: flat.sortOrder ?? "desc" };
  }

  const paginationType = flat.paginationType ?? flat.pagination;
  if (paginationType === "cursor") {
    raw.pagination = {
      type: "cursor",
      cursor: flat.cursor,
      limit: flat.limit,
    };
  } else if (paginationType === "offset") {
    raw.pagination = {
      type: "offset",
      page: flat.page,
      pageSize: flat.pageSize ?? flat.limit,
    };
  } else if (flat.cursor !== undefined) {
    raw.pagination = {
      type: "cursor",
      cursor: flat.cursor,
      limit: flat.limit,
    };
  } else if (flat.page !== undefined || flat.pageSize !== undefined) {
    raw.pagination = {
      type: "offset",
      page: flat.page,
      pageSize: flat.pageSize ?? flat.limit,
    };
  }

  const filters = raw.filters as Record<string, unknown>;
  if (!filters.categoryId) {
    delete filters.attributes;
  }
  const hasFilters = Object.values(filters).some((v) => v !== undefined);
  if (!hasFilters) {
    raw.filters = undefined;
  }

  const parsed = searchRequestSchema.parse(raw);

  if (!parsed.pagination) {
    return {
      ...parsed,
      pagination: { type: "offset", page: 1, pageSize: 24 },
    };
  }

  if (parsed.pagination.type === "cursor") {
    const limit = parsed.pagination.limit || 24;
    return {
      ...parsed,
      pagination: {
        type: "cursor",
        limit,
        cursor: parsed.pagination.cursor,
      },
    };
  }

  return parsed;
}
