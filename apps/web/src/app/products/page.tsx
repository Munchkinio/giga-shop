import type { Metadata } from "next";
import { Suspense } from "react";
import { ActiveFiltersBar } from "@/components/products/ActiveFiltersBar";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductsCatalogToolbar } from "@/components/products/ProductsCatalogToolbar";
import { Pagination } from "@/components/ui/Pagination";
import {
  fetchBrands,
  fetchCategories,
  fetchProducts,
  fetchSearch,
} from "@/lib/api-client";
import { parseSearchParams } from "@/lib/parse-search-params";
import { DEFAULT_SITE_DESCRIPTION } from "@/lib/seo";

type ProductsPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const searchRequest = {
    ...parseSearchParams(searchParams),
    includeFacets: false,
  };
  const result = searchRequest.query
    ? await fetchSearch(searchRequest)
    : await fetchProducts(searchRequest);

  const query = searchRequest.query?.trim();

  if (query) {
    return {
      title: `Search results for ${query}`,
      description: `${result.total} products found`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: "Product Catalog",
    description:
      result.total > 0
        ? `${result.total} products found`
        : DEFAULT_SITE_DESCRIPTION,
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const searchRequest = {
    ...parseSearchParams(searchParams),
    includeFacets: true,
  };

  const [result, categories, brands] = await Promise.all([
    searchRequest.query
      ? fetchSearch(searchRequest)
      : fetchProducts(searchRequest),
    fetchCategories(),
    fetchBrands(),
  ]);

  return (
    <div className="space-y-8">
      <section className="card-surface relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-300/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-accent-400/20 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-3">
          <p className="badge w-fit">Curated marketplace</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            {searchRequest.query
              ? `Results for “${searchRequest.query}”`
              : "Discover products"}
          </h1>
          <p className="max-w-2xl text-sm text-ink-600 sm:text-base">
            {searchRequest.query
              ? "Refine with filters or open quick view on any card."
              : "Search thousands of items, filter by brand and attributes, save your favorite combinations."}
            {" "}
            <span className="font-semibold text-brand-700">
              {result.total.toLocaleString()} items
            </span>
          </p>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="h-12 animate-pulse rounded-2xl bg-ink-100/80" />
        }
      >
        <ProductsCatalogToolbar
          categories={categories}
          brands={brands}
          attributeFacets={result.facets?.attributes}
        />
      </Suspense>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="space-y-6 lg:col-start-2">
          <Suspense fallback={null}>
            <ActiveFiltersBar
              categories={categories.map((category) => ({
                id: category.id,
                name: category.name,
              }))}
              brands={brands.map((brand) => ({
                id: brand.id,
                name: brand.name,
              }))}
            />
          </Suspense>
          <ProductGrid
            products={result.items}
            searchRequest={searchRequest}
            pagination={result.pagination}
            total={result.total}
          />
          <Suspense
            fallback={
              <div className="h-10 animate-pulse rounded-2xl bg-ink-100/80" />
            }
          >
            <Pagination result={result} searchRequest={searchRequest} />
          </Suspense>
        </div>

        <Suspense
          fallback={
            <div className="hidden h-64 animate-pulse rounded-2xl bg-ink-100/80 lg:block" />
          }
        >
          <div className="hidden lg:block lg:col-start-1 lg:row-start-1">
            <ProductFilters
              categories={categories}
              brands={brands}
              attributeFacets={result.facets?.attributes}
            />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
