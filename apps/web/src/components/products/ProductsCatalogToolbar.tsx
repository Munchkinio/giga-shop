"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductFilters } from "@/components/products/ProductFilters";
import { SearchBar } from "@/components/search/SearchBar";
import { SlideOverPanel } from "@/components/ui/SlideOverPanel";
import { collectActiveFilters } from "@/lib/active-filters";
import type {
  AttributeFacet,
  BrandSummary,
  Category,
  FacetBucket,
} from "@/types";

type ProductsCatalogToolbarProps = {
  categories: Category[];
  brands: BrandSummary[];
  categoryFacets: FacetBucket[];
  brandFacets: FacetBucket[];
  attributeFacets?: AttributeFacet[];
};

function FiltersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function ProductsCatalogToolbar({
  categories,
  brands,
  categoryFacets,
  brandFacets,
  attributeFacets,
}: ProductsCatalogToolbarProps) {
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      collectActiveFilters(new URLSearchParams(searchParams.toString()), {
        categories: categories.map((category) => ({
          id: category.id,
          name: category.name,
        })),
        brands: brands.map((brand) => ({
          id: brand.id,
          name: brand.name,
        })),
      }).length,
    [searchParams, categories, brands],
  );

  return (
    <>
      <div className="relative z-30">
        <SearchBar
          trailingActions={
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              title="Open filters"
              aria-label={
                activeFilterCount > 0
                  ? `Open filters, ${activeFilterCount} active`
                  : "Open filters"
              }
              className={`btn-icon relative lg:hidden ${
                activeFilterCount > 0 ? "btn-icon-active" : ""
              }`}
            >
              <FiltersIcon className="size-5" />
              {activeFilterCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {activeFilterCount > 9 ? "9+" : activeFilterCount}
                </span>
              ) : null}
            </button>
          }
        />
      </div>

      <SlideOverPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        titleId="filters-panel-title"
        footer={
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="btn-primary w-full"
          >
            Done
          </button>
        }
      >
        <ProductFilters
          categoryFacets={categoryFacets}
          brandFacets={brandFacets}
          attributeFacets={attributeFacets}
          className="space-y-5 p-0 shadow-none [&>h2]:sr-only"
        />
      </SlideOverPanel>
    </>
  );
}
