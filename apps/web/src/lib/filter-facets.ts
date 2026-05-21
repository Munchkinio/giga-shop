import type { BrandSummary, Category, FacetBucket } from "@/types";

/** Category/brand option label with optional product count from facets. */
export function formatFacetCountLabel(name: string, count: number): string {
  return count > 0 ? `${name} (${count.toLocaleString()})` : name;
}

export function facetBucketsToBrandSummaries(
  facets: FacetBucket[],
): BrandSummary[] {
  return facets.map((facet) => ({
    id: facet.id,
    name: formatFacetCountLabel(facet.name, facet.count),
    slug: facet.slug,
    logoUrl: null,
    isActive: true,
  }));
}

/**
 * Keeps contextual facet buckets and injects the selected category at count 0
 * when it is no longer in the facet list (so the user can clear it).
 */
export function mergeCategoryFacetBuckets(
  facets: FacetBucket[] | undefined,
  selectedId: string | null | undefined,
  fallback: Category[],
): FacetBucket[] {
  const map = new Map((facets ?? []).map((facet) => [facet.id, facet]));
  const selected = selectedId?.trim() || null;
  if (selected && !map.has(selected)) {
    const category = fallback.find((item) => item.id === selected);
    if (category) {
      map.set(selected, {
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: 0,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Same as {@link mergeCategoryFacetBuckets} for multi-select brands.
 */
export function mergeBrandFacetBuckets(
  facets: FacetBucket[] | undefined,
  selectedIds: string[],
  fallback: BrandSummary[],
): FacetBucket[] {
  const map = new Map((facets ?? []).map((facet) => [facet.id, facet]));
  for (const id of selectedIds) {
    if (!map.has(id)) {
      const brand = fallback.find((item) => item.id === id);
      if (brand) {
        map.set(id, {
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          count: 0,
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function categoryIdFromFilters(
  categoryId: string | string[] | undefined,
): string | null {
  if (categoryId === undefined) {
    return null;
  }
  if (Array.isArray(categoryId)) {
    return categoryId[0] ?? null;
  }
  return categoryId;
}

export function brandIdsFromFilters(
  brandId: string | string[] | undefined,
): string[] {
  if (brandId === undefined) {
    return [];
  }
  return Array.isArray(brandId) ? brandId : [brandId];
}
