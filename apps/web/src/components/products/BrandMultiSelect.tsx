"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import type { BrandSummary } from "@/types";

type BrandMultiSelectProps = {
  brands: BrandSummary[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function BrandMultiSelect({
  brands,
  selectedIds,
  onChange,
  disabled = false,
}: BrandMultiSelectProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const brandById = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand])),
    [brands],
  );

  const filteredBrands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return brands;
    }
    return brands.filter((brand) =>
      brand.name.toLowerCase().includes(normalized),
    );
  }, [brands, query]);

  const selectedBrands = useMemo(
    () =>
      selectedIds
        .map((id) => brandById.get(id))
        .filter((brand): brand is BrandSummary => brand !== undefined),
    [brandById, selectedIds],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function toggleBrand(brandId: string) {
    startTransition(() => {
      if (selectedSet.has(brandId)) {
        onChange(selectedIds.filter((id) => id !== brandId));
        return;
      }
      onChange([...selectedIds, brandId]);
    });
  }

  function removeBrand(brandId: string) {
    startTransition(() => {
      onChange(selectedIds.filter((id) => id !== brandId));
    });
  }

  function clearAll() {
    startTransition(() => {
      onChange([]);
    });
  }

  const triggerLabel =
    selectedIds.length === 0
      ? "All brands"
      : `${selectedIds.length} brand${selectedIds.length === 1 ? "" : "s"} selected`;

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={selectedIds.length === 0 ? "text-slate-500" : undefined}>
            {triggerLabel}
          </span>
          <span className="text-slate-400" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
        </button>

        {open ? (
          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable
            className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            <div className="border-b border-slate-100 p-2">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search brands…"
                aria-label="Search brands"
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none ring-indigo-500 focus:border-indigo-500 focus:ring-1"
                autoFocus
              />
            </div>

            <ul className="max-h-52 overflow-y-auto py-1">
              {filteredBrands.length === 0 ? (
                <li className="px-3 py-2 text-sm text-slate-500">No brands found</li>
              ) : (
                filteredBrands.map((brand) => {
                  const checked = selectedSet.has(brand.id);
                  return (
                    <li key={brand.id}>
                      <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBrand(brand.id)}
                          disabled={disabled}
                          className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="min-w-0 flex-1 leading-snug text-slate-800">
                          {brand.name}
                        </span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>

            {selectedIds.length > 0 ? (
              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={disabled}
                  className="w-full rounded-md px-2 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
                >
                  Clear all brands
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {selectedBrands.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedBrands.map((brand) => (
            <span
              key={brand.id}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800"
            >
              {brand.name}
              <button
                type="button"
                onClick={() => removeBrand(brand.id)}
                disabled={disabled}
                aria-label={`Remove ${brand.name}`}
                className="rounded-full leading-none text-indigo-600 hover:bg-indigo-100 disabled:opacity-60"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
