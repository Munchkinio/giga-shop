import type { SearchRequest } from "@/types";

export type CatalogPaginationMode = "pages" | "infinite";

const PAGE_SIZE_DEFAULT = 24;

export function getPaginationMode(
  searchParams: URLSearchParams,
): CatalogPaginationMode {
  return searchParams.get("paginationType") === "cursor" ? "infinite" : "pages";
}

export function isInfiniteScrollRequest(request: SearchRequest): boolean {
  return request.pagination?.type === "cursor";
}

/** Applies mode toggle and resets list position. */
export function applyPaginationModeToggle(
  params: URLSearchParams,
  targetMode: CatalogPaginationMode,
): void {
  const pageSize = params.get("pageSize") ?? params.get("limit") ?? String(PAGE_SIZE_DEFAULT);

  if (targetMode === "infinite") {
    params.set("paginationType", "cursor");
    params.set("limit", pageSize);
    params.delete("page");
    params.delete("cursor");
    params.delete("pageSize");
  } else {
    params.set("paginationType", "offset");
    params.set("pageSize", pageSize);
    params.set("page", "1");
    params.delete("cursor");
    params.delete("limit");
  }
}

export function resetPaginationPosition(params: URLSearchParams): void {
  const mode = getPaginationMode(params);
  if (mode === "infinite") {
    params.delete("cursor");
  } else {
    params.delete("page");
    params.set("page", "1");
  }
}
