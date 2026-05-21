import {
  createSavedSearch as createSavedSearchDb,
  deleteSavedSearch as deleteSavedSearchDb,
  listSavedSearches,
  MAX_SAVED_SEARCHES_PER_SESSION,
  SavedSearchLimitError,
} from "@ecommerce/db";
import type {
  CreateSavedSearchInput,
  SavedSearch,
} from "@ecommerce/shared-types";
import { ConflictError, NotFoundError } from "@/errors/http-errors.js";

export async function getSavedSearchesForSession(
  sessionId: string,
): Promise<SavedSearch[]> {
  return listSavedSearches(sessionId);
}

export async function saveSearchForSession(
  sessionId: string,
  input: CreateSavedSearchInput,
): Promise<SavedSearch> {
  try {
    return await createSavedSearchDb(sessionId, input);
  } catch (error) {
    if (error instanceof SavedSearchLimitError) {
      throw new ConflictError(
        `You can save up to ${MAX_SAVED_SEARCHES_PER_SESSION} searches`,
      );
    }
    throw error;
  }
}

export async function removeSavedSearchForSession(
  sessionId: string,
  id: string,
): Promise<void> {
  const deleted = await deleteSavedSearchDb(sessionId, id);
  if (!deleted) {
    throw new NotFoundError("Saved search not found");
  }
}
