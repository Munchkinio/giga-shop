export { prisma, default } from "./client";
export * from "@prisma/client";

export {
  getBrandBySlug,
  getBrands,
} from "./queries/brands";
export {
  getCategories,
  getCategoryBreadcrumb,
  getCategoryBySlug,
  getCategoryDescendantIds,
  getCategoryTree,
} from "./queries/categories";
export {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  MAX_SAVED_SEARCHES_PER_SESSION,
  SavedSearchLimitError,
} from "./queries/saved-searches";
export {
  getProductBySlug,
  getProducts,
  searchProducts,
} from "./queries/products";
export type { ProductDetailRow } from "./queries/products";
export {
  getAttributeFacets,
  getBrandFacets,
  getCatalogFacets,
  getCategoryFacets,
} from "./queries/facets";
export type { CatalogFacetsResult } from "./queries/facets";
export { getSearchSuggestions } from "./queries/search-suggest";
export {
  buildProductFilterSql,
  buildProductWhere,
  mapToProductListItem,
  productListItemSelect,
} from "./queries/helpers";
