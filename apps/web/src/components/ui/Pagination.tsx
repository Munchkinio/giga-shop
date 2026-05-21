"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { getPaginationMode } from "@/lib/pagination-mode";
import { buildProductsUrl } from "@/lib/search-params-url";
import type { SearchRequest, SearchResult } from "@/types";

const PAGE_SIZE_OPTIONS = [24, 48, 96] as const;

type PaginationProps = {
  result: SearchResult;
  searchRequest: SearchRequest;
};

function PageSizeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const mode = getPaginationMode(searchParams);
  const rawPageSize = Number(
    searchParams.get(mode === "infinite" ? "limit" : "pageSize") ?? "24",
  );
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 24;

  function handlePageSizeChange(nextSize: string) {
    const params = new URLSearchParams(searchParams.toString());
    const mode = getPaginationMode(params);

    if (mode === "infinite") {
      params.set("paginationType", "cursor");
      params.set("limit", nextSize);
      params.delete("page");
      params.delete("pageSize");
      params.delete("cursor");
    } else {
      params.set("paginationType", "offset");
      params.set("pageSize", nextSize);
      params.set("page", "1");
      params.delete("cursor");
      params.delete("limit");
    }

    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/products?${qs}` : "/products");
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-ink-600">
      <span className="font-medium">Per page</span>
      <select
        value={String(pageSize)}
        onChange={(event) => handlePageSizeChange(event.target.value)}
        disabled={isPending}
        aria-label="Products per page"
        className="select-field w-auto py-1.5 disabled:opacity-60"
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Pagination({ result, searchRequest }: PaginationProps) {
  const { pagination, total } = result;

  if (pagination.type === "cursor") {
    return (
      <div className="card-surface flex flex-col items-center gap-3 px-6 py-4">
        <PageSizeSelector />
        <p className="text-sm text-ink-500">
          Scroll down to load more · batch size above
        </p>
      </div>
    );
  }

  const page = pagination.page ?? 1;
  const pageSize = pagination.pageSize ?? 24;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const prevRequest: SearchRequest = {
    ...searchRequest,
    pagination: { type: "offset", page: page - 1, pageSize },
  };
  const nextRequest: SearchRequest = {
    ...searchRequest,
    pagination: { type: "offset", page: page + 1, pageSize },
  };

  return (
    <div className="card-surface flex flex-col items-center gap-4 px-6 py-5">
      <PageSizeSelector />
      <p className="text-sm text-ink-600">
        <span className="font-semibold text-ink-900">
          {total.toLocaleString()}
        </span>{" "}
        product{total === 1 ? "" : "s"}
        {totalPages > 1 ? (
          <span className="text-ink-500">
            {" "}
            · Page {page} of {totalPages}
          </span>
        ) : null}
      </p>
      {totalPages > 1 ? (
        <nav
          className="flex items-center justify-center gap-3"
          aria-label="Pagination"
        >
          {page > 1 ? (
            <Link href={buildProductsUrl("/products", prevRequest)} className="btn-secondary">
              Previous
            </Link>
          ) : (
            <span className="btn-secondary pointer-events-none opacity-40">Previous</span>
          )}
          {pagination.hasMore ? (
            <Link href={buildProductsUrl("/products", nextRequest)} className="btn-primary">
              Next
            </Link>
          ) : (
            <span className="btn-primary pointer-events-none opacity-40">Next</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
