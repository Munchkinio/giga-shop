"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { PaginationModeToggle } from "@/components/search/PaginationModeToggle";
import { fetchSearchSuggestions } from "@/lib/api-client";
import { resetPaginationPosition } from "@/lib/pagination-mode";
import { useDebounce } from "@/hooks/useDebounce";
import type { SearchSuggestion } from "@/types";

const MIN_SUGGEST_LENGTH = 2;
const SUGGEST_DEBOUNCE_MS = 300;

type SearchBarProps = {
  trailingActions?: ReactNode;
};

export function SearchBar({ trailingActions }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listboxId = useId();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedQuery = useDebounce(query, SUGGEST_DEBOUNCE_MS);

  const navigateWithQuery = useCallback(
    (nextQuery: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = nextQuery.trim();

      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      resetPaginationPosition(params);

      startTransition(() => {
        const qs = params.toString();
        router.push(qs ? `/products?${qs}` : "/products");
      });
    },
    [router, searchParams],
  );

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < MIN_SUGGEST_LENGTH) {
      setSuggestions([]);
      setIsSuggestLoading(false);
      return;
    }

    let cancelled = false;
    setIsSuggestLoading(true);

    void fetchSearchSuggestions(trimmed)
      .then((result) => {
        if (!cancelled) {
          setSuggestions(result.suggestions);
          setActiveIndex(-1);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSuggestLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleQueryChange = useCallback(
    (next: string) => {
      setQuery(next);

      if (next.trim() === "") {
        setIsOpen(false);
        setSuggestions([]);
        setActiveIndex(-1);
        if (searchParams.get("q")) {
          navigateWithQuery("");
        }
        return;
      }

      setIsOpen(true);
    },
    [navigateWithQuery, searchParams],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsOpen(false);
    navigateWithQuery(query);
  }

  function applySuggestion(suggestion: SearchSuggestion) {
    setQuery(suggestion.value);
    setIsOpen(false);
    navigateWithQuery(suggestion.value);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "ArrowDown" && query.trim().length >= MIN_SUGGEST_LENGTH) {
        setIsOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const selected = suggestions[activeIndex];
      if (selected) {
        applySuggestion(selected);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const showDropdown =
    isOpen && query.trim().length >= MIN_SUGGEST_LENGTH;

  return (
    <div className="card-surface relative isolate flex w-full flex-col gap-3 p-3 sm:flex-row sm:items-stretch sm:gap-2 sm:p-2">
      <form
        onSubmit={handleSubmit}
        className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-stretch"
      >
        <div className="relative z-10 min-w-0 flex-1">
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setIsOpen(false), 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search products, brands, SKUs…"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            className={`input-field ${query ? "pr-11" : ""}`}
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleQueryChange("")}
              disabled={isPending}
              aria-label="Clear search"
              className="absolute inset-y-0 right-1 flex w-9 cursor-pointer items-center justify-center text-ink-400 transition-colors hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-4 shrink-0"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
          <SearchAutocomplete
            suggestions={suggestions}
            activeIndex={activeIndex}
            isOpen={showDropdown}
            isLoading={isSuggestLoading}
            query={query.trim()}
            listboxId={listboxId}
            onSelect={applySuggestion}
            onHighlight={setActiveIndex}
          />
        </div>
        <button type="submit" disabled={isPending} className="btn-primary shrink-0">
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>
      <div className="flex shrink-0 items-stretch gap-2 self-stretch">
        {trailingActions}
        <PaginationModeToggle />
      </div>
    </div>
  );
}
