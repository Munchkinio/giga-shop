import type { Prisma } from "@prisma/client";
import type {
  CreateSavedSearchInput,
  Filters,
  SavedSearch,
  SortOptions,
} from "@ecommerce/shared-types";
import {
  filtersSchema,
  sortOptionsSchema,
} from "@ecommerce/shared-types";
import { prisma } from "../client.js";

const MAX_SAVED_SEARCHES_PER_SESSION = 20;

type SavedSearchRow = {
  id: string;
  sessionId: string;
  name: string;
  query: string | null;
  filters: Prisma.JsonValue;
  sort: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function parseStoredFilters(value: Prisma.JsonValue): Filters | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const parsed = filtersSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseStoredSort(value: string | null): SortOptions | null {
  if (!value) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    const result = sortOptionsSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function mapSavedSearch(row: SavedSearchRow): SavedSearch {
  return {
    id: row.id,
    sessionId: row.sessionId,
    name: row.name,
    query: row.query,
    filters: parseStoredFilters(row.filters),
    sort: parseStoredSort(row.sort),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Lists saved searches for a browser session, newest first. */
export async function listSavedSearches(
  sessionId: string,
): Promise<SavedSearch[]> {
  const rows = await prisma.savedSearch.findMany({
    where: { sessionId },
    orderBy: { updatedAt: "desc" },
    take: MAX_SAVED_SEARCHES_PER_SESSION,
  });

  return rows.map(mapSavedSearch);
}

/** Persists the current search + filter combination. */
export async function createSavedSearch(
  sessionId: string,
  input: CreateSavedSearchInput,
): Promise<SavedSearch> {
  const count = await prisma.savedSearch.count({ where: { sessionId } });
  if (count >= MAX_SAVED_SEARCHES_PER_SESSION) {
    throw new SavedSearchLimitError();
  }

  const row = await prisma.savedSearch.create({
    data: {
      sessionId,
      name: input.name,
      query: input.query ?? null,
      filters: (input.filters ?? {}) as Prisma.InputJsonValue,
      sort: input.sort ? JSON.stringify(input.sort) : null,
    },
  });

  return mapSavedSearch(row);
}

/** Deletes a saved search owned by the session. */
export async function deleteSavedSearch(
  sessionId: string,
  id: string,
): Promise<boolean> {
  const result = await prisma.savedSearch.deleteMany({
    where: { id, sessionId },
  });
  return result.count > 0;
}

export class SavedSearchLimitError extends Error {
  constructor() {
    super(`Maximum ${MAX_SAVED_SEARCHES_PER_SESSION} saved searches per session`);
    this.name = "SavedSearchLimitError";
  }
}

export { MAX_SAVED_SEARCHES_PER_SESSION };
