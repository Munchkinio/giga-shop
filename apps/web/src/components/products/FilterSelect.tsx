"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  options: FilterSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  "aria-label": string;
};

export function FilterSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  "aria-label": ariaLabel,
}: FilterSelectProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const displayLabel = selectedOption?.label ?? placeholder;
  const isPlaceholder = !selectedOption;

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
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={`select-field flex w-full items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "border-brand-400 ring-2 ring-brand-200/80" : ""
        }`}
      >
        <span className={isPlaceholder ? "text-ink-500" : "text-ink-900"}>
          {displayLabel}
        </span>
        <span className="text-ink-400" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-2xl border border-ink-100 bg-surface py-1 shadow-card-hover"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value || "__empty"} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectOption(option.value)}
                  className={`flex w-full px-3 py-2 text-left text-sm transition hover:bg-ink-50 ${
                    selected
                      ? "bg-brand-50 font-semibold text-brand-800"
                      : "text-ink-800"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
