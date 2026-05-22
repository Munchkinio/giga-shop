export { prisma, default } from "./client.js";
export * from "@prisma/client";

export {
  getBrandBySlug,
  getBrands,
} from "./queries/brands.js";
export {
  getCategories,
  getCategoryBreadcrumb,
  getCategoryBySlug,
  getCategoryDescendantIds,
  getCategoryTree,
} from "./queries/categories.js";
export {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  MAX_SAVED_SEARCHES_PER_SESSION,
  SavedSearchLimitError,
} from "./queries/saved-searches.js";
export {
  updateProductOffer,
} from "./queries/offers.js";
export type {
  ProductOfferRow,
  UpdateProductOfferResult,
} from "./queries/offers.js";
export {
  getProductBySlug,
  getProducts,
  searchProducts,
} from "./queries/products.js";
export type { ProductDetailRow } from "./queries/products.js";
export {
  getAttributeFacets,
  getBrandFacets,
  getCatalogFacets,
  getCategoryFacets,
} from "./queries/facets.js";
export type { CatalogFacetsResult } from "./queries/facets.js";
export { getSearchSuggestions } from "./queries/search-suggest.js";
export {
  buildProductFilterSql,
  buildProductWhere,
  mapToProductListItem,
  productListItemSelect,
} from "./queries/helpers.js";
