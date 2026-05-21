"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ApiError } from "@/lib/api-client";
import {
  createSavedSearch,
  deleteSavedSearch,
  fetchSavedSearches,
} from "@/lib/api-client";
import {
  buildProductsUrlFromSavedSearch,
  createSavedSearchInputFromParams,
  describeSavedSearch,
} from "@/lib/saved-search";
import { getOrCreateSessionId } from "@/lib/session-id";
import type { SavedSearch } from "@/types";

export function SavedSearches() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = getOrCreateSessionId();

  const loadSaved = useCallback(async () => {
    if (!sessionId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchSavedSearches(sessionId);
      setItems(list);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load saved searches",
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !sessionId) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const payload = createSavedSearchInputFromParams(
          trimmed,
          searchParams,
        );
        const created = await createSavedSearch(sessionId, payload);
        setItems((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
        setName("");
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Failed to save search",
        );
      }
    });
  }

  function handleDelete(id: string) {
    if (!sessionId) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await deleteSavedSearch(sessionId, id);
        setItems((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Failed to delete saved search",
        );
      }
    });
  }

  function handleApply(saved: SavedSearch) {
    startTransition(() => {
      router.push(buildProductsUrlFromSavedSearch(saved), { scroll: false });
    });
  }

  return (
    <div className="space-y-3 border-t border-ink-200/80 pt-4">
      <h3 className="filter-label">Saved searches</h3>

      <form onSubmit={handleSave} className="space-y-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink-600">Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Red cotton under $50"
            maxLength={100}
            disabled={isPending}
            className="input-field"
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="btn-primary w-full disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save current filters"}
        </button>
      </form>

      {error ? (
        <p className="text-xs text-accent-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs text-ink-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-ink-500">
          Save your search query and filters to reopen them later.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((saved) => (
            <li
              key={saved.id}
              className="rounded-xl border border-ink-100 bg-canvas/60 p-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {saved.name}
                  </p>
                  <p className="text-xs text-ink-500">
                    {describeSavedSearch(saved)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(saved.id)}
                  disabled={isPending}
                  aria-label={`Delete ${saved.name}`}
                  className="shrink-0 rounded p-1 text-ink-400 transition hover:bg-surface hover:text-accent-600 disabled:opacity-60"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleApply(saved)}
                  disabled={isPending}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
                >
                  Apply
                </button>
                <Link
                  href={buildProductsUrlFromSavedSearch(saved)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-ink-600 transition hover:bg-surface"
                  scroll={false}
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
