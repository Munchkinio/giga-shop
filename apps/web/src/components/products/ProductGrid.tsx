"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { fetchProducts, fetchSearch } from "@/lib/api-client";
import { isInfiniteScrollRequest } from "@/lib/pagination-mode";
import type { ProductListItem, SearchRequest, SearchResult } from "@/types";
import { BackToTopButton } from "@/components/products/BackToTopButton";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductQuickViewPanel } from "@/components/products/ProductQuickViewPanel";

type ProductGridProps = {
  products: ProductListItem[];
  searchRequest: SearchRequest;
  pagination: SearchResult["pagination"];
  total: number;
};

function mergeProducts(
  current: ProductListItem[],
  next: ProductListItem[],
): ProductListItem[] {
  const seen = new Set(current.map((item) => item.id));
  const appended = next.filter((item) => !seen.has(item.id));
  return appended.length > 0 ? [...current, ...appended] : current;
}

export function ProductGrid({
  products,
  searchRequest,
  pagination,
  total,
}: ProductGridProps) {
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
  const [items, setItems] = useState(products);
  const [hasMore, setHasMore] = useState(pagination.hasMore);
  const [nextCursor, setNextCursor] = useState(
    pagination.type === "cursor" ? (pagination.nextCursor ?? null) : null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingMore, startLoadMore] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const infiniteMode = isInfiniteScrollRequest(searchRequest);

  useEffect(() => {
    setItems(products);
    setHasMore(pagination.hasMore);
    setNextCursor(
      pagination.type === "cursor" ? (pagination.nextCursor ?? null) : null,
    );
    setLoadError(null);
  }, [products, pagination, searchRequest]);

  const loadMore = useCallback(() => {
    if (!infiniteMode || !hasMore || !nextCursor || isLoadingMore) {
      return;
    }

    const limit =
      searchRequest.pagination?.type === "cursor"
        ? searchRequest.pagination.limit
        : 24;

    const nextRequest: SearchRequest = {
      ...searchRequest,
      includeFacets: false,
      pagination: {
        type: "cursor",
        limit,
        cursor: nextCursor,
      },
    };

    startLoadMore(async () => {
      setLoadError(null);
      try {
        const result = searchRequest.query
          ? await fetchSearch(nextRequest)
          : await fetchProducts(nextRequest);

        setItems((prev) => mergeProducts(prev, result.items));
        setHasMore(result.pagination.hasMore);
        setNextCursor(
          result.pagination.type === "cursor"
            ? (result.pagination.nextCursor ?? null)
            : null,
        );
      } catch {
        setLoadError("Could not load more products");
      }
    });
  }, [
    hasMore,
    infiniteMode,
    isLoadingMore,
    nextCursor,
    searchRequest,
  ]);

  useEffect(() => {
    if (!infiniteMode || !hasMore) {
      return;
    }

    const node = sentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, infiniteMode, loadMore]);

  const openQuickView = useCallback((slug: string) => {
    setQuickViewSlug(slug);
  }, []);

  const closeQuickView = useCallback(() => {
    setQuickViewSlug(null);
  }, []);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-lg font-medium text-slate-700">No products found</p>
        <p className="mt-1 text-sm text-slate-500">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onQuickView={openQuickView}
          />
        ))}
      </div>

      {infiniteMode ? (
        <div className="mt-6 space-y-2 text-center">
          <p className="text-sm text-slate-500">
            Showing {items.length} of {total} products
          </p>
          {loadError ? (
            <p className="text-sm text-red-600" role="alert">
              {loadError}
            </p>
          ) : null}
          {hasMore ? (
            <>
              <div ref={sentinelRef} className="h-1" aria-hidden />
              {isLoadingMore ? (
                <p className="text-sm text-slate-500">Loading more…</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-400">End of results</p>
          )}
        </div>
      ) : null}

      {infiniteMode ? <BackToTopButton /> : null}

      <ProductQuickViewPanel slug={quickViewSlug} onClose={closeQuickView} />
    </>
  );
}
