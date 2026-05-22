import { Prisma } from "@prisma/client";
import type {
  SearchRequest,
  SearchResult,
  SortOptions,
} from "@ecommerce/shared-types";
import { prisma } from "../client.js";
import { getCategoryDescendantIds } from "./categories.js";
import { getCatalogFacets, type CatalogFacetsResult } from "./facets.js";
import {
  buildProductFilterSql,
  buildProductListOrderSql,
  buildProductWhere,
  hasListPriceFilter,
  mapToProductListItem,
  productListItemSelect,
  productSearchMatchSql,
  resolveSort,
  toPrismaOrderBy,
} from "./helpers.js";

function hasCategoryFilter(request: SearchRequest): boolean {
  return request.filters?.categoryId !== undefined;
}

/** Expands a selected branch to all descendant category ids (leaf products included). */
async function expandCategoryFilters(
  request: SearchRequest,
): Promise<SearchRequest> {
  const categoryId = request.filters?.categoryId;
  if (categoryId === undefined) {
    return request;
  }

  const anchors = Array.isArray(categoryId) ? categoryId : [categoryId];
  const anchor = anchors[0];
  if (!anchor || anchors.length !== 1) {
    return request;
  }

  const expanded = await getCategoryDescendantIds(anchor);
  return {
    ...request,
    filters: {
      ...request.filters,
      categoryId: expanded,
    },
  };
}

/**
 * Facet counts must use the same expanded category branch as product listing
 * (leaf products live under descendant categories, not the parent row id).
 */
async function startCatalogFacets(
  request: SearchRequest,
): Promise<CatalogFacetsResult | null> {
  if (request.includeFacets === false) {
    return null;
  }
  const expanded = await expandCategoryFilters(request);
  return getCatalogFacets(expanded.filters, expanded.query, {
    includeAttributes: hasCategoryFilter(request),
  });
}

function mergeCatalogFacets(
  result: SearchResult,
  facetsPromise: Promise<CatalogFacetsResult | null> | null,
): Promise<SearchResult> {
  if (!facetsPromise) {
    return Promise.resolve(result);
  }
  return facetsPromise.then((facetRows) => {
    if (!facetRows) {
      return result;
    }
    const { categories, brands, attributes } = facetRows;
    const facets = {
      ...(categories.length > 0 ? { categories } : {}),
      ...(brands.length > 0 ? { brands } : {}),
      ...(attributes.length > 0 ? { attributes } : {}),
    };
    if (Object.keys(facets).length === 0) {
      return result;
    }
    return {
      ...result,
      facets: {
        ...result.facets,
        ...facets,
      },
    };
  });
}

type PaginationParams = {
  type: "cursor" | "offset";
  limit: number;
  cursor?: string;
  page: number;
  pageSize: number;
};

function resolvePagination(request: SearchRequest): PaginationParams {
  const pagination = request.pagination;

  if (pagination?.type === "cursor") {
    return {
      type: "cursor",
      limit: pagination.limit,
      cursor: pagination.cursor,
      page: 1,
      pageSize: pagination.limit,
    };
  }

  if (pagination?.type === "offset") {
    return {
      type: "offset",
      limit: pagination.pageSize,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  return { type: "offset", limit: 20, page: 1, pageSize: 20 };
}

async function fetchProductsByIds(
  ids: string[],
): Promise<ReturnType<typeof mapToProductListItem>[]> {
  if (ids.length === 0) {
    return [];
  }

  const rows = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: productListItemSelect,
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => row !== undefined)
    .map(mapToProductListItem);
}

/**
 * Lists products ordered by min in-stock offer price (raw SQL — Prisma cannot sort on that).
 */
async function listProductsByListPrice(
  request: SearchRequest,
  pagination: PaginationParams,
  sort: SortOptions,
  facetsPromise: Promise<CatalogFacetsResult | null> | null,
): Promise<SearchResult> {
  const filterSql = buildProductFilterSql(request.filters);
  const orderSql = buildProductListOrderSql(sort);
  const take = pagination.limit + 1;
  const skip =
    pagination.type === "offset"
      ? (pagination.page - 1) * pagination.pageSize
      : 0;

  const cursorSql =
    pagination.type === "cursor" && pagination.cursor
      ? Prisma.sql`AND p.id < ${pagination.cursor}::uuid`
      : Prisma.sql``;

  const [idRows, countRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id
      FROM products p
      WHERE ${filterSql}
        ${cursorSql}
      ORDER BY ${orderSql}
      LIMIT ${take}
      OFFSET ${skip}
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM products p
      WHERE ${filterSql}
    `,
  ]);

  const hasMore = idRows.length > pagination.limit;
  const ids = (hasMore ? idRows.slice(0, pagination.limit) : idRows).map(
    (r) => r.id,
  );
  const items = await fetchProductsByIds(ids);
  const total = Number(countRows[0]?.count ?? 0);

  return mergeCatalogFacets(
    {
      items,
      total,
      pagination: {
        type: pagination.type,
        ...(pagination.type === "offset"
          ? {
              page: pagination.page,
              pageSize: pagination.pageSize,
            }
          : {}),
        nextCursor:
          pagination.type === "cursor" && hasMore
            ? (ids[ids.length - 1] ?? null)
            : null,
        hasMore,
      },
    },
    facetsPromise,
  );
}

async function listProductsPrisma(
  request: SearchRequest,
  pagination: PaginationParams,
): Promise<SearchResult> {
  const expandedRequest = await expandCategoryFilters(request);
  const facetsPromise = startCatalogFacets(request);
  const sort = resolveSort(expandedRequest.sort, Boolean(expandedRequest.query));

  if (sort.field === "basePrice" || hasListPriceFilter(expandedRequest.filters)) {
    return listProductsByListPrice(
      expandedRequest,
      pagination,
      sort,
      facetsPromise,
    );
  }

  const where = buildProductWhere(expandedRequest.filters);
  const orderBy = toPrismaOrderBy(sort);
  const take = pagination.limit + 1;

  if (pagination.type === "cursor") {
    const rows = await prisma.product.findMany({
      where,
      select: productListItemSelect,
      orderBy,
      take,
      ...(pagination.cursor
        ? { cursor: { id: pagination.cursor }, skip: 1 }
        : {}),
    });

    const hasMore = rows.length > pagination.limit;
    const pageRows = hasMore ? rows.slice(0, pagination.limit) : rows;
    const items = pageRows.map(mapToProductListItem);
    const total = await prisma.product.count({ where });

    return mergeCatalogFacets(
      {
        items,
        total,
        pagination: {
          type: "cursor",
          nextCursor: hasMore
            ? (pageRows[pageRows.length - 1]?.id ?? null)
            : null,
          hasMore,
        },
      },
      facetsPromise,
    );
  }

  const skip = (pagination.page - 1) * pagination.pageSize;
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productListItemSelect,
      orderBy,
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  const hasMore = rows.length > pagination.pageSize;
  const pageRows = hasMore ? rows.slice(0, pagination.pageSize) : rows;

  return mergeCatalogFacets(
    {
      items: pageRows.map(mapToProductListItem),
      total,
      pagination: {
        type: "offset",
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasMore,
      },
    },
    facetsPromise,
  );
}

async function searchProductsFts(
  request: SearchRequest,
  pagination: PaginationParams,
): Promise<SearchResult> {
  const expandedRequest = await expandCategoryFilters(request);
  const facetsPromise = startCatalogFacets(request);
  const query = expandedRequest.query!.trim();
  const sort = resolveSort(expandedRequest.sort, true);
  const filterSql = buildProductFilterSql(expandedRequest.filters);
  const skip =
    pagination.type === "offset"
      ? (pagination.page - 1) * pagination.pageSize
      : 0;

  const orderSql = buildProductListOrderSql(sort, { query });

  const cursorSql =
    pagination.type === "cursor" && pagination.cursor
      ? Prisma.sql`AND p.id < ${pagination.cursor}::uuid`
      : Prisma.sql``;

  const [idRows, countRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id
      FROM products p
      WHERE ${filterSql}
        AND ${productSearchMatchSql(query)}
        ${cursorSql}
      ORDER BY ${orderSql}
      LIMIT ${pagination.limit + 1}
      OFFSET ${skip}
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM products p
      WHERE ${filterSql}
        AND ${productSearchMatchSql(query)}
    `,
  ]);

  const hasMore = idRows.length > pagination.limit;
  const ids = (hasMore ? idRows.slice(0, pagination.limit) : idRows).map(
    (r) => r.id,
  );
  const items = await fetchProductsByIds(ids);
  const total = Number(countRows[0]?.count ?? 0);

  return mergeCatalogFacets(
    {
      items,
      total,
      pagination: {
        type: pagination.type,
        ...(pagination.type === "offset"
          ? {
              page: pagination.page,
              pageSize: pagination.pageSize,
            }
          : {}),
        nextCursor:
          pagination.type === "cursor" && hasMore
            ? (ids[ids.length - 1] ?? null)
            : null,
        hasMore,
      },
    },
    facetsPromise,
  );
}

/**
 * Lists products with filters and pagination (no full-text search).
 */
export async function getProducts(
  request: SearchRequest,
): Promise<SearchResult> {
  const pagination = resolvePagination(request);
  return listProductsPrisma(request, pagination);
}

/**
 * Full-text search with `search_vector` + per-word Levenshtein fallback on `name`.
 * Falls back to {@link getProducts} when `query` is omitted.
 */
export async function searchProducts(
  request: SearchRequest,
): Promise<SearchResult> {
  const pagination = resolvePagination(request);

  if (!request.query?.trim()) {
    return getProducts(request);
  }

  return searchProductsFts(request, pagination);
}

const productDetailSelect = {
  id: true,
  sku: true,
  name: true,
  slug: true,
  description: true,
  shortDescription: true,
  categoryId: true,
  brandId: true,
  basePrice: true,
  currency: true,
  attributes: true,
  ratingAvg: true,
  ratingCount: true,
  popularityScore: true,
  viewCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: { position: "asc" as const },
    select: {
      id: true,
      productId: true,
      url: true,
      altText: true,
      position: true,
      isPrimary: true,
      createdAt: true,
    },
  },
  offers: {
    orderBy: { price: "asc" as const },
    select: {
      id: true,
      productId: true,
      sellerId: true,
      sellerName: true,
      price: true,
      compareAtPrice: true,
      currency: true,
      stockQuantity: true,
      isAvailable: true,
      shippingDays: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      isActive: true,
    },
  },
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isActive: true,
    },
  },
} satisfies Prisma.ProductSelect;

export type ProductDetailRow = Prisma.ProductGetPayload<{
  select: typeof productDetailSelect;
}>;

/**
 * Fetches a single product by slug with images, offers, category, and brand.
 */
export async function getProductBySlug(
  slug: string,
): Promise<ProductDetailRow | null> {
  return prisma.product.findUnique({
    where: { slug },
    select: productDetailSelect,
  });
}
