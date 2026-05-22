import { z } from "zod";
import { filtersSchema, sortOptionsSchema } from "./search.js";

export const sessionIdSchema = z.string().uuid();

export const createSavedSearchSchema = z.object({
  name: z.string().trim().min(1).max(100),
  query: z.string().trim().min(1).max(200).optional(),
  filters: filtersSchema.optional(),
  sort: sortOptionsSchema.optional(),
});

export type CreateSavedSearchInput = z.infer<typeof createSavedSearchSchema>;

/** Persisted saved search row returned by the API. */
export type SavedSearch = {
  id: string;
  sessionId: string;
  name: string;
  query: string | null;
  filters: z.infer<typeof filtersSchema> | null;
  sort: z.infer<typeof sortOptionsSchema> | null;
  createdAt: string;
  updatedAt: string;
};
