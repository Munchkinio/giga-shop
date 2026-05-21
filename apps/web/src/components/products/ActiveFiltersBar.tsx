"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import {
  clearAllCatalogFilters,
  collectActiveFilters,
  removeActiveFilter,
} from "@/lib/active-filters";
import { resetPaginationPosition } from "@/lib/pagination-mode";

type ActiveFiltersBarProps = {
  categories: { id: string; name: string; parentId: string | null }[];
  brands: { id: string; name: string }[];
};

export function ActiveFiltersBar({
  categories,
  brands,
}: ActiveFiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const chips = useMemo(
    () =>
      collectActiveFilters(
        new URLSearchParams(searchParams.toString()),
        { categories, brands },
      ),
    [searchParams, categories, brands],
  );

  function pushParams(params: URLSearchParams) {
    resetPaginationPosition(params);
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/products?${qs}` : "/products", { scroll: false });
    });
  }

  function handleRemove(chipId: string) {
    const params = new URLSearchParams(searchParams.toString());
    removeActiveFilter(chipId, params);
    pushParams(params);
  }

  function handleClearAll() {
    const params = new URLSearchParams(searchParams.toString());
    clearAllCatalogFilters(params);
    pushParams(params);
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className="card-surface flex flex-wrap items-center gap-2 p-4"
      aria-label="Active filters"
    >
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-ink-500">
        Active filters
      </span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => handleRemove(chip.id)}
          disabled={isPending}
          className="group inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-2 text-xs font-semibold text-brand-800 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Remove filter ${chip.label}`}
        >
          <span className="truncate leading-none">{chip.label}</span>
          <span className="inline-flex size-4 shrink-0 items-center justify-center text-brand-600 transition-colors group-hover:text-brand-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-3"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={handleClearAll}
        disabled={isPending}
        className="ml-auto shrink-0 cursor-pointer self-center py-1 text-xs font-semibold leading-none text-brand-700 transition-colors hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Clear all
      </button>
    </div>
  );
}
