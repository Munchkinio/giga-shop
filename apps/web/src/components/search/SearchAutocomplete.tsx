"use client";

import type { SearchSuggestion } from "@/types";

type SearchAutocompleteProps = {
  suggestions: SearchSuggestion[];
  activeIndex: number;
  isOpen: boolean;
  isLoading: boolean;
  query: string;
  listboxId: string;
  onSelect: (suggestion: SearchSuggestion) => void;
  onHighlight: (index: number) => void;
};

function suggestionKey(suggestion: SearchSuggestion, index: number): string {
  return `${suggestion.type}-${suggestion.id ?? suggestion.value}-${index}`;
}

function typeLabel(type: SearchSuggestion["type"]): string {
  switch (type) {
    case "query":
      return "Recent";
    case "product":
      return "Product";
    case "brand":
      return "Brand";
  }
}

export function SearchAutocomplete({
  suggestions,
  activeIndex,
  isOpen,
  isLoading,
  query,
  listboxId,
  onSelect,
  onHighlight,
}: SearchAutocompleteProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-card-hover"
      role="presentation"
    >
      {isLoading ? (
        <p className="px-4 py-3 text-sm text-ink-500">Searching…</p>
      ) : suggestions.length === 0 ? (
        <p className="px-4 py-3 text-sm text-ink-500">
          No suggestions for &ldquo;{query}&rdquo;
        </p>
      ) : (
        <ul id={listboxId} role="listbox" className="max-h-72 overflow-y-auto py-1">
          {suggestions.map((suggestion, index) => {
            const active = index === activeIndex;
            return (
              <li key={suggestionKey(suggestion, index)} role="option" aria-selected={active}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(suggestion)}
                  onMouseEnter={() => onHighlight(index)}
                  className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? "bg-brand-50 text-brand-900"
                      : "text-ink-800 hover:bg-ink-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      active
                        ? "bg-brand-200 text-brand-800"
                        : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {typeLabel(suggestion.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{suggestion.label}</span>
                    {suggestion.meta ? (
                      <span className="block truncate text-xs text-ink-500">
                        {suggestion.meta}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
