import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CreateSavedSearchInput,
  SavedSearch,
} from "@ecommerce/shared-types";
import { ConflictError, NotFoundError } from "@/errors/http-errors.js";
import {
  getSavedSearchesForSession,
  removeSavedSearchForSession,
  saveSearchForSession,
} from "./saved-searches.service.js";

const {
  mockListSavedSearches,
  mockCreateSavedSearch,
  mockDeleteSavedSearch,
  MockSavedSearchLimitError,
} = vi.hoisted(() => {
  class SavedSearchLimitError extends Error {
    constructor() {
      super("limit");
      this.name = "SavedSearchLimitError";
    }
  }
  return {
    mockListSavedSearches: vi.fn(),
    mockCreateSavedSearch: vi.fn(),
    mockDeleteSavedSearch: vi.fn(),
    MockSavedSearchLimitError: SavedSearchLimitError,
  };
});

vi.mock("@ecommerce/db", () => ({
  listSavedSearches: mockListSavedSearches,
  createSavedSearch: mockCreateSavedSearch,
  deleteSavedSearch: mockDeleteSavedSearch,
  MAX_SAVED_SEARCHES_PER_SESSION: 20,
  SavedSearchLimitError: MockSavedSearchLimitError,
}));

describe("saved-searches service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns saved searches for session", async () => {
    const rows = [{ id: "ss1", name: "Phones" }] as SavedSearch[];
    mockListSavedSearches.mockResolvedValue(rows);

    const result = await getSavedSearchesForSession("session-1");

    expect(mockListSavedSearches).toHaveBeenCalledWith("session-1");
    expect(result).toEqual(rows);
  });

  it("creates saved search", async () => {
    const input = { name: "Laptops", query: "macbook" } as CreateSavedSearchInput;
    const created = { id: "ss2", ...input } as SavedSearch;
    mockCreateSavedSearch.mockResolvedValue(created);

    const result = await saveSearchForSession("session-1", input);

    expect(mockCreateSavedSearch).toHaveBeenCalledWith("session-1", input);
    expect(result).toEqual(created);
  });

  it("maps SavedSearchLimitError to ConflictError", async () => {
    mockCreateSavedSearch.mockRejectedValue(new MockSavedSearchLimitError());

    await expect(
      saveSearchForSession("session-1", { name: "x" } as CreateSavedSearchInput),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rethrows unexpected errors from create", async () => {
    const err = new Error("db down");
    mockCreateSavedSearch.mockRejectedValue(err);

    await expect(
      saveSearchForSession("session-1", { name: "x" } as CreateSavedSearchInput),
    ).rejects.toBe(err);
  });

  it("deletes saved search when it exists", async () => {
    mockDeleteSavedSearch.mockResolvedValue(true);

    await removeSavedSearchForSession("session-1", "ss1");

    expect(mockDeleteSavedSearch).toHaveBeenCalledWith("session-1", "ss1");
  });

  it("throws NotFoundError when delete returns false", async () => {
    mockDeleteSavedSearch.mockResolvedValue(false);

    await expect(
      removeSavedSearchForSession("session-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
