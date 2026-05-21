"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { AttributeFilters } from "@/components/products/AttributeFilters";
import { BrandMultiSelect } from "@/components/products/BrandMultiSelect";
import { PriceRangeSlider } from "@/components/products/PriceRangeSlider";
import { SavedSearches } from "@/components/products/SavedSearches";
import {
  hasAttributeFacets,
  parseSelectedAttributes,
  serializeSelectedAttributes,
  type SelectedAttributes,
} from "@/lib/attribute-filters";
import { resetPaginationPosition } from "@/lib/pagination-mode";
import type { AttributeFacet, BrandSummary, Category } from "@/types";

const PRICE_RANGE_MIN = 0;
const PRICE_RANGE_MAX = 5000;

type ProductFiltersProps = {
  categories: Category[];
  brands: BrandSummary[];
  attributeFacets?: AttributeFacet[];
};

export function ProductFilters({
  categories,
  brands,
  attributeFacets,
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

  return (
    <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Filters</h2>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600">Category</span>
        <select
          value={categoryId ?? ""}
          onChange={(e) => updateCategory(e.target.value)}
          disabled={isPending}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="block space-y-1">
        <span className="text-xs font-medium text-slate-600">Brands</span>
        <BrandMultiSelect
          brands={brands}
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
          <p className="text-xs text-slate-500">
            No attribute filters for this category.
          </p>
        )
      ) : (
        <p className="text-xs text-slate-500">
          Select a category to filter by color, size, material, and other
          attributes.
        </p>
      )}

      <div className="block space-y-2">
        <span className="text-xs font-medium text-slate-600">Price range</span>
        <PriceRangeSlider
          min={PRICE_RANGE_MIN}
          max={PRICE_RANGE_MAX}
          valueMin={priceMin}
          valueMax={priceMax}
          onChange={updatePriceRange}
          disabled={isPending}
        />
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600">Min rating</span>
        <select
          value={searchParams.get("ratingMin") ?? ""}
          onChange={(e) => updateParam("ratingMin", e.target.value)}
          disabled={isPending}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Any</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600">Sort by</span>
        <select
          value={searchParams.get("sortField") ?? "popularityScore"}
          onChange={(e) => updateParam("sortField", e.target.value)}
          disabled={isPending}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="popularityScore">Popularity</option>
          <option value="ratingAvg">Rating</option>
          <option value="basePrice">Price</option>
          <option value="createdAt">Newest</option>
          <option value="name">Name</option>
          {searchParams.get("q") ? (
            <option value="relevance">Relevance</option>
          ) : null}
        </select>
      </label>

      <SavedSearches />
    </aside>
  );
}
