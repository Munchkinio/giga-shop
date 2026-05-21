import { z } from "zod";

export const searchSuggestQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(15).default(8),
});

export type SearchSuggestQuery = z.infer<typeof searchSuggestQuerySchema>;

export const searchSuggestionTypeSchema = z.enum([
  "query",
  "product",
  "brand",
]);

export type SearchSuggestionType = z.infer<typeof searchSuggestionTypeSchema>;

/** Single autocomplete row. */
export type SearchSuggestion = {
  type: SearchSuggestionType;
  label: string;
  /** Text applied to the search box / `q` param. */
  value: string;
  slug?: string;
  id?: string;
  meta?: string;
};

export type SearchSuggestResponse = {
  query: string;
  suggestions: SearchSuggestion[];
};
