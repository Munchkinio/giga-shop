import type {
  SearchRequest,
  SearchResult,
  SearchSuggestion,
  SearchSuggestResponse,
} from "@ecommerce/shared-types";

export function searchRequest(
  overrides: Partial<SearchRequest> = {},
): SearchRequest {
  return { includeFacets: true, ...overrides };
}

export function searchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    items: [],
    total: 0,
    pagination: { type: "offset", page: 1, pageSize: 20, hasMore: false },
    ...overrides,
  };
}

export function searchSuggestion(
  label: string,
  type: SearchSuggestion["type"] = "query",
): SearchSuggestion {
  return { type, label, value: label };
}

export function searchSuggestResponse(
  query: string,
  labels: string[],
): SearchSuggestResponse {
  return {
    query,
    suggestions: labels.map((label) => searchSuggestion(label)),
  };
}
