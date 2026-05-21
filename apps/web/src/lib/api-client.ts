import type {
  Brand,
  BrandSummary,
  Category,
  CategoryTree,
  CreateSavedSearchInput,
  ProductDetail,
  SavedSearch,
  SearchRequest,
  SearchResult,
  SearchSuggestResponse,
} from "@/types";
import { searchRequestToQueryRecord } from "@/lib/search-params-url";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiFetchOptions = RequestInit & {
  sessionId?: string;
  cache?: RequestCache;
};

async function apiFetch<T>(
  path: string,
  query?: Record<string, string>,
  init?: ApiFetchOptions,
): Promise<T> {
  const url = new URL(path, `${API_URL}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  const { sessionId, cache, ...requestInit } = init ?? {};

  const response = await fetch(url.toString(), {
    ...requestInit,
    headers: {
      Accept: "application/json",
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
      ...requestInit.headers,
    },
    cache: cache ?? (requestInit.method ? "no-store" : undefined),
    next: requestInit.method ? undefined : { revalidate: 60 },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as {
        error?: { message?: string };
      };
      message = body.error?.message ?? message;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export async function fetchProducts(
  request: SearchRequest,
): Promise<SearchResult> {
  return apiFetch<SearchResult>("/products", searchRequestToQueryRecord(request));
}

export async function fetchSearch(
  request: SearchRequest,
): Promise<SearchResult> {
  return apiFetch<SearchResult>("/search", searchRequestToQueryRecord(request));
}

export async function fetchSearchSuggestions(
  query: string,
  limit = 8,
): Promise<SearchSuggestResponse> {
  return apiFetch<SearchSuggestResponse>("/search/suggest", {
    q: query,
    limit: String(limit),
  });
}

export async function fetchProductBySlug(
  slug: string,
): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
}

export async function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/categories");
}

export async function fetchCategoryTree(): Promise<CategoryTree> {
  return apiFetch<CategoryTree>("/categories", { tree: "true" });
}

export async function fetchBrands(): Promise<BrandSummary[]> {
  return apiFetch<BrandSummary[]>("/brands");
}

export async function fetchBrandBySlug(slug: string): Promise<Brand> {
  return apiFetch<Brand>(`/brands/${encodeURIComponent(slug)}`);
}

export async function fetchSavedSearches(
  sessionId: string,
): Promise<SavedSearch[]> {
  return apiFetch<SavedSearch[]>("/saved-searches", undefined, {
    sessionId,
    cache: "no-store",
  });
}

export async function createSavedSearch(
  sessionId: string,
  body: CreateSavedSearchInput,
): Promise<SavedSearch> {
  return apiFetch<SavedSearch>("/saved-searches", undefined, {
    method: "POST",
    sessionId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function deleteSavedSearch(
  sessionId: string,
  id: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/saved-searches/${encodeURIComponent(id)}`,
    undefined,
    {
      method: "DELETE",
      sessionId,
      cache: "no-store",
    },
  );
}
