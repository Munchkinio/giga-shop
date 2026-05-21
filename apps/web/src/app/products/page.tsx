import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductGrid } from "@/components/products/ProductGrid";
import { SearchBar } from "@/components/search/SearchBar";
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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Products
        </h1>
        <p className="text-slate-600">
          {searchRequest.query
            ? `Results for "${searchRequest.query}"`
            : "Browse our catalog"}
          {" · "}
          <span className="font-medium">{result.total}</span> items
        </p>
      </div>

      <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-slate-200" />}>
        <SearchBar />
      </Suspense>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-200" />}>
          <ProductFilters
            categories={categories}
            brands={brands}
            attributeFacets={result.facets?.attributes}
          />
        </Suspense>

        <div className="space-y-8">
          <ProductGrid
            products={result.items}
            searchRequest={searchRequest}
            pagination={result.pagination}
            total={result.total}
          />
          <Suspense
            fallback={
              <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
            }
          >
            <Pagination result={result} searchRequest={searchRequest} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
