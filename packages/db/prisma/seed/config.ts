/** Seed configuration (env overrides where noted). */
export const seedConfig = {
  PRODUCT_COUNT:
    Number.parseInt(process.env.SEED_PRODUCT_COUNT ?? "", 10) || 10_000,
  BRAND_COUNT: 200,
  BATCH_SIZE: 1000,
  IMAGES_PER_PRODUCT_MIN: 2,
  IMAGES_PER_PRODUCT_MAX: 4,
  OFFERS_PER_PRODUCT_MIN: 1,
  OFFERS_PER_PRODUCT_MAX: 3,
} as const;
