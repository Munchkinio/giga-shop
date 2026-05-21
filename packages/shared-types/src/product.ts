import type {
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  ProductOffer as PrismaProductOffer,
} from "@prisma/client";
import type { BrandSummary } from "./brand";
import type { CategorySummary } from "./category";

/** JSONB `attributes` on `Product` (flexible facets). */
export type ProductAttributes = Record<string, string | number | boolean>;

/** Mirrors Prisma `ProductImage` model (`product_images` table). */
export type ProductImage = PrismaProductImage;

/**
 * Mirrors Prisma `ProductOffer` model (`product_offers` table).
 * Decimal columns are represented as strings for API/JSON safety.
 */
export type ProductOffer = Omit<
  PrismaProductOffer,
  "price" | "compareAtPrice"
> & {
  price: string;
  compareAtPrice: string | null;
};

/**
 * Mirrors Prisma `Product` model (`products` table).
 * Omits DB-only `searchVector`; decimals are strings in API responses.
 */
export type Product = Omit<
  PrismaProduct,
  "searchVector" | "basePrice" | "ratingAvg" | "attributes"
> & {
  basePrice: string;
  ratingAvg: string;
  attributes: ProductAttributes;
};

export type ProductWithImages = Product & {
  images: ProductImage[];
};

export type ProductWithOffers = Product & {
  offers: ProductOffer[];
};

export type ProductDetail = Product & {
  images: ProductImage[];
  offers: ProductOffer[];
  category?: CategorySummary;
  /** Root → leaf category path for breadcrumbs. */
  categoryBreadcrumb?: CategorySummary[];
  brand?: BrandSummary;
};

/** Compact product row for search/list endpoints. */
export type ProductListItem = Pick<
  Product,
  | "id"
  | "sku"
  | "name"
  | "slug"
  | "shortDescription"
  | "basePrice"
  | "currency"
  | "ratingAvg"
  | "ratingCount"
  | "popularityScore"
  | "isActive"
  | "categoryId"
  | "brandId"
> & {
  primaryImageUrl?: string | null;
  brandName?: string;
  categoryName?: string;
};
