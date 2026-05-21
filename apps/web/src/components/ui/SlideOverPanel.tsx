"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type SlideOverPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Full-height panel sliding in from the right (quick view, mobile filters, etc.).
 */
export function SlideOverPanel({
  open,
  onClose,
  title,
  titleId,
  children,
  footer,
}: SlideOverPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, handleKeyDown]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <div
        role="presentation"
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-[100] bg-ink-950/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-[101] flex h-dvh max-h-dvh w-full max-w-md flex-col overflow-y-auto border-l border-ink-100 bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-ink-100 bg-surface px-4 py-3">
          <h2
            id={titleId}
            className="font-display text-sm font-semibold text-ink-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-lg p-2 text-ink-500 transition hover:bg-canvas hover:text-ink-900"
          >
            ×
          </button>
        </header>

        <div className="flex-1 p-4">{children}</div>

        {footer ? (
          <footer className="sticky bottom-0 z-10 shrink-0 border-t border-ink-100 bg-surface p-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    </>,
    document.body,
  );
}
