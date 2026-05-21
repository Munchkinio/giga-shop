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
      className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
      role="presentation"
    >
      {isLoading ? (
        <p className="px-3 py-2 text-sm text-slate-500">Searching…</p>
      ) : suggestions.length === 0 ? (
        <p className="px-3 py-2 text-sm text-slate-500">
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
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                    active ? "bg-indigo-50 text-indigo-900" : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      active
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {typeLabel(suggestion.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{suggestion.label}</span>
                    {suggestion.meta ? (
                      <span className="block truncate text-xs text-slate-500">
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
