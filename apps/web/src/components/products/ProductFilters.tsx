"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { AttributeFilters } from "@/components/products/AttributeFilters";
import { BrandMultiSelect } from "@/components/products/BrandMultiSelect";
import { CategoryTreePicker } from "@/components/products/CategoryTreePicker";
import { FilterSelect } from "@/components/products/FilterSelect";
import { PriceRangeSlider } from "@/components/products/PriceRangeSlider";
import { SavedSearches } from "@/components/products/SavedSearches";
import {
  hasAttributeFacets,
  parseSelectedAttributes,
  serializeSelectedAttributes,
  type SelectedAttributes,
} from "@/lib/attribute-filters";
import { resetPaginationPosition } from "@/lib/pagination-mode";
import { facetBucketsToBrandSummaries } from "@/lib/filter-facets";
import type { AttributeFacet, CategoryTree, FacetBucket } from "@/types";

const PRICE_RANGE_MIN = 0;
const PRICE_RANGE_MAX = 5000;

type ProductFiltersProps = {
  categoryTree: CategoryTree;
  categoryFacets: FacetBucket[];
  brandFacets: FacetBucket[];
  attributeFacets?: AttributeFacet[];
  className?: string;
};

export function ProductFilters({
  categoryTree,
  categoryFacets,
  brandFacets,
  attributeFacets,
  className,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const pushSearchParams = useCallback(
    (params: URLSearchParams) => {
      resetPaginationPosition(params);
      startTransition(() => {
        const qs = params.toString();
        router.push(qs ? `/products?${qs}` : "/products", { scroll: false });
      });
    },
    [router],
  );

  function getSelectedBrandIds(): string[] {
    const raw = searchParams.get("brandId");
    if (!raw) {
      return [];
    }
    return raw.split(",").map((id) => id.trim()).filter(Boolean);
  }

  const updateBrandIds = useCallback(
    (ids: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (ids.length === 0) {
        params.delete("brandId");
      } else {
        params.set("brandId", ids.join(","));
      }
      pushSearchParams(params);
    },
    [pushSearchParams, searchParams],
  );

  const updateAttributes = useCallback(
    (next: SelectedAttributes) => {
      const params = new URLSearchParams(searchParams.toString());
      const serialized = serializeSelectedAttributes(next);
      if (serialized) {
        params.set("attributes", serialized);
      } else {
        params.delete("attributes");
      }
      pushSearchParams(params);
    },
    [pushSearchParams, searchParams],
  );

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    pushSearchParams(params);
  }

  const categoryId = searchParams.get("categoryId");

  const updateCategory = useCallback(
    (nextCategoryId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextCategoryId) {
        params.set("categoryId", nextCategoryId);
      } else {
        params.delete("categoryId");
      }
      params.delete("attributes");
      pushSearchParams(params);
    },
    [pushSearchParams, searchParams],
  );

  const priceMin = Number(
    searchParams.get("priceMin") ?? String(PRICE_RANGE_MIN),
  );
  const priceMax = Number(
    searchParams.get("priceMax") ?? String(PRICE_RANGE_MAX),
  );

  const updatePriceRange = useCallback(
    (nextMin: number, nextMax: number) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextMin <= PRICE_RANGE_MIN) {
        params.delete("priceMin");
      } else {
        params.set("priceMin", String(nextMin));
      }

      if (nextMax >= PRICE_RANGE_MAX) {
        params.delete("priceMax");
      } else {
        params.set("priceMax", String(nextMax));
      }

      pushSearchParams(params);
    },
    [pushSearchParams, searchParams],
  );

  const selectedAttributes = parseSelectedAttributes(
    searchParams.get("attributes"),
  );

  const brandsForSelect = facetBucketsToBrandSummaries(brandFacets);

  const ratingOptions = [
    { value: "", label: "Any" },
    { value: "3", label: "3+ stars" },
    { value: "4", label: "4+ stars" },
    { value: "4.5", label: "4.5+ stars" },
  ];

  const sortOptions = [
    { value: "popularityScore", label: "Popularity" },
    { value: "ratingAvg", label: "Rating" },
    { value: "basePrice", label: "Price" },
    { value: "createdAt", label: "Newest" },
    { value: "name", label: "Name" },
    ...(searchParams.get("q")
      ? [{ value: "relevance", label: "Relevance" }]
      : []),
  ];

  return (
    <aside
      className={
        className ?? "card-surface space-y-5 p-5"
      }
    >
      <h2 className="font-display text-base font-bold text-ink-900">Filters</h2>

      <div className="block space-y-1.5">
        <span className="filter-label">Category</span>
        <CategoryTreePicker
          categoryTree={categoryTree}
          categoryFacets={categoryFacets}
          selectedCategoryId={categoryId}
          onChange={updateCategory}
          disabled={isPending}
        />
      </div>

      <div className="block space-y-1.5">
        <span className="filter-label">Brands</span>
        <BrandMultiSelect
          brands={brandsForSelect}
          selectedIds={getSelectedBrandIds()}
          onChange={updateBrandIds}
          disabled={isPending}
        />
      </div>

      {categoryId ? (
        hasAttributeFacets(attributeFacets) ? (
          <AttributeFilters
            facets={attributeFacets}
            selected={selectedAttributes}
            onChange={updateAttributes}
            disabled={isPending}
          />
        ) : (
          <p className="text-xs text-ink-500">
            No attribute filters for this category.
          </p>
        )
      ) : (
        <p className="text-xs leading-relaxed text-ink-500">
          Select a category to filter by color, size, material, and other
          attributes.
        </p>
      )}

      <div className="flex items-center gap-2.5 rounded-xl border border-ink-100 bg-canvas/50 px-3 py-2.5">
        <input
          id="filter-in-stock"
          type="checkbox"
          checked={searchParams.get("inStock") === "true"}
          onChange={() => {
            const params = new URLSearchParams(searchParams.toString());
            if (params.get("inStock") === "true") {
              params.delete("inStock");
            } else {
              params.set("inStock", "true");
            }
            pushSearchParams(params);
          }}
          disabled={isPending}
          className="size-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
        />
        <label
          htmlFor="filter-in-stock"
          className="cursor-pointer text-sm font-medium text-ink-800"
        >
          In stock only
        </label>
      </div>

      <div className="block space-y-2">
        <span className="filter-label">Price range</span>
        <PriceRangeSlider
          min={PRICE_RANGE_MIN}
          max={PRICE_RANGE_MAX}
          valueMin={priceMin}
          valueMax={priceMax}
          onChange={updatePriceRange}
          disabled={isPending}
        />
      </div>

      <div className="block space-y-1.5">
        <span className="filter-label">Min rating</span>
        <FilterSelect
          options={ratingOptions}
          value={searchParams.get("ratingMin") ?? ""}
          onChange={(next) => updateParam("ratingMin", next)}
          placeholder="Any"
          disabled={isPending}
          aria-label="Minimum rating"
        />
      </div>

      <div className="block space-y-1.5">
        <span className="filter-label">Sort by</span>
        <FilterSelect
          options={sortOptions}
          value={searchParams.get("sortField") ?? "popularityScore"}
          onChange={(next) => updateParam("sortField", next)}
          placeholder="Popularity"
          disabled={isPending}
          aria-label="Sort by"
        />
      </div>

      <SavedSearches />
    </aside>
  );
}
