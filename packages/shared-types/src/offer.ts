import { z } from "zod";

/** Partial update for PATCH /offers/:id (price, stock, availability). */
export const updateOfferSchema = z
  .object({
    price: z.coerce.number().positive().max(999_999).optional(),
    compareAtPrice: z.coerce
      .number()
      .positive()
      .max(999_999)
      .nullable()
      .optional(),
    stockQuantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
    isAvailable: z.boolean().optional(),
    shippingDays: z.coerce.number().int().min(0).max(365).nullable().optional(),
    sellerName: z.string().trim().min(1).max(200).optional(),
    currency: z.string().trim().length(3).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
