import { z } from "zod";

export const cursorPaginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const offsetPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;
export type OffsetPagination = z.infer<typeof offsetPaginationSchema>;

/** Discriminated union for cursor vs offset pagination in API requests. */
export const paginationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cursor") }).merge(cursorPaginationSchema),
  z.object({ type: z.literal("offset") }).merge(offsetPaginationSchema),
]);

export type Pagination = z.infer<typeof paginationSchema>;
