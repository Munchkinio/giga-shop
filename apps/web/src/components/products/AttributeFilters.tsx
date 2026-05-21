"use client";

import type { AttributeFacet } from "@/types";
import {
  attributeValueKey,
  formatAttributeKey,
  formatAttributeValue,
  hasSelectedAttributes,
  isAttributeValueSelected,
  type SelectedAttributes,
  toggleAttributeValue,
} from "@/lib/attribute-filters";

type AttributeFiltersProps = {
  facets: AttributeFacet[];
  selected: SelectedAttributes;
  onChange: (next: SelectedAttributes) => void;
  disabled?: boolean;
};

export function AttributeFilters({
  facets,
  selected,
  onChange,
  disabled = false,
}: AttributeFiltersProps) {
  function handleToggle(
    key: string,
    value: string | number | boolean,
  ): void {
    onChange(toggleAttributeValue(selected, key, value));
  }

  const showClearAll = hasSelectedAttributes(selected);

  return (
    <div className="space-y-4">
      {facets.map((facet) => (
        <fieldset key={facet.key} className="space-y-2">
          <legend className="text-xs font-medium text-ink-600">
            {formatAttributeKey(facet.key)}
          </legend>
          <ul className="max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-ink-100 bg-canvas/80 py-1">
            {facet.values.map((entry) => {
              const checked = isAttributeValueSelected(
                selected,
                facet.key,
                entry.value,
              );
              const id = `${facet.key}-${attributeValueKey(entry.value)}`;

              return (
                <li key={id}>
                  <label
                    htmlFor={id}
                    className="flex cursor-pointer items-start gap-2 px-2.5 py-1.5 text-sm hover:bg-white"
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => handleToggle(facet.key, entry.value)}
                      className="mt-0.5 size-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
                    />
                    <span className="min-w-0 flex-1 leading-snug text-ink-800">
                      {formatAttributeValue(facet.key, entry.value)}
                    </span>
                    <span className="shrink-0 tabular-nums text-xs text-ink-400">
                      {entry.count}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}

      {showClearAll ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({})}
          className="w-full rounded-md px-2 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
        >
          Clear all attributes
        </button>
      ) : null}
    </div>
  );
}
