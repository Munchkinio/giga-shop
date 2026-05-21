"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

type PriceRangeSliderProps = {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  disabled?: boolean;
};

type DragHandle = "min" | "max";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function clamp(value: number, lower: number, upper: number): number {
  return Math.min(Math.max(value, lower), upper);
}

const THUMB_CLASS =
  "absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-600 shadow-glow outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed";

export function PriceRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  disabled = false,
}: PriceRangeSliderProps) {
  const [localMin, setLocalMin] = useState(valueMin);
  const [localMax, setLocalMax] = useState(valueMax);
  const [dragging, setDragging] = useState<DragHandle | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const localMinRef = useRef(localMin);
  const localMaxRef = useRef(localMax);
  const onChangeRef = useRef(onChange);

  const debouncedMin = useDebounce(localMin, 400);
  const debouncedMax = useDebounce(localMax, 400);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setLocalMin(valueMin);
    setLocalMax(valueMax);
  }, [valueMin, valueMax]);

  useEffect(() => {
    localMinRef.current = localMin;
    localMaxRef.current = localMax;
  }, [localMin, localMax]);

  useEffect(() => {
    if (debouncedMin === valueMin && debouncedMax === valueMax) {
      return;
    }
    onChangeRef.current(debouncedMin, debouncedMax);
  }, [debouncedMin, debouncedMax, valueMin, valueMax]);

  const span = max - min;
  const minPercent = span > 0 ? ((localMin - min) / span) * 100 : 0;
  const maxPercent = span > 0 ? ((localMax - min) / span) * 100 : 100;

  const valueFromClientX = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track || span <= 0) {
        return min;
      }
      const rect = track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return Math.round(min + ratio * span);
    },
    [min, span],
  );

  const applyValue = useCallback(
    (handle: DragHandle, rawValue: number) => {
      if (handle === "min") {
        const next = clamp(rawValue, min, localMaxRef.current);
        localMinRef.current = next;
        setLocalMin(next);
        return;
      }
      const next = clamp(rawValue, localMinRef.current, max);
      localMaxRef.current = next;
      setLocalMax(next);
    },
    [min, max],
  );

  const startDrag = useCallback(
    (handle: DragHandle, event: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }

      event.preventDefault();
      const thumb = event.currentTarget;
      thumb.setPointerCapture(event.pointerId);
      setDragging(handle);

      const handleMove = (moveEvent: PointerEvent) => {
        applyValue(handle, valueFromClientX(moveEvent.clientX));
      };

      const handleUp = (upEvent: PointerEvent) => {
        thumb.releasePointerCapture(upEvent.pointerId);
        thumb.removeEventListener("pointermove", handleMove);
        thumb.removeEventListener("pointerup", handleUp);
        thumb.removeEventListener("pointercancel", handleUp);
        setDragging(null);
      };

      applyValue(handle, valueFromClientX(event.clientX));
      thumb.addEventListener("pointermove", handleMove);
      thumb.addEventListener("pointerup", handleUp);
      thumb.addEventListener("pointercancel", handleUp);
    },
    [applyValue, disabled, valueFromClientX],
  );

  const handleTrackPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || (event.target as HTMLElement).closest("[data-thumb]")) {
        return;
      }

      const value = valueFromClientX(event.clientX);
      const handle: DragHandle =
        Math.abs(value - localMinRef.current) <=
        Math.abs(value - localMaxRef.current)
          ? "min"
          : "max";
      applyValue(handle, value);
    },
    [applyValue, disabled, valueFromClientX],
  );

  const handleKeyDown = useCallback(
    (handle: DragHandle, event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }

      const step = event.shiftKey ? 100 : 10;
      let next = handle === "min" ? localMinRef.current : localMaxRef.current;

      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        next -= step;
      } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        next += step;
      } else {
        return;
      }

      event.preventDefault();
      applyValue(handle, next);
    },
    [applyValue, disabled],
  );

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-ink-700">
        <span>{formatUsd(localMin)}</span>
        <span>{formatUsd(localMax)}</span>
      </div>

      <div
        ref={trackRef}
        className="relative mx-2 h-8 touch-none select-none"
        onPointerDown={handleTrackPointerDown}
      >
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink-200">
          <div
            className="absolute h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(maxPercent - minPercent, 0)}%`,
            }}
          />
        </div>

        <button
          type="button"
          data-thumb="min"
          role="slider"
          aria-label="Minimum price"
          aria-valuemin={min}
          aria-valuemax={localMax}
          aria-valuenow={localMin}
          disabled={disabled}
          className={`${THUMB_CLASS} ${dragging === "min" ? "z-20 scale-110" : "z-10"}`}
          style={{ left: `${minPercent}%` }}
          onPointerDown={(event) => {
            event.stopPropagation();
            startDrag("min", event);
          }}
          onKeyDown={(event) => handleKeyDown("min", event)}
        />

        <button
          type="button"
          data-thumb="max"
          role="slider"
          aria-label="Maximum price"
          aria-valuemin={localMin}
          aria-valuemax={max}
          aria-valuenow={localMax}
          disabled={disabled}
          className={`${THUMB_CLASS} ${dragging === "max" ? "z-20 scale-110" : "z-10"}`}
          style={{ left: `${maxPercent}%` }}
          onPointerDown={(event) => {
            event.stopPropagation();
            startDrag("max", event);
          }}
          onKeyDown={(event) => handleKeyDown("max", event)}
        />
      </div>
    </div>
  );
}
