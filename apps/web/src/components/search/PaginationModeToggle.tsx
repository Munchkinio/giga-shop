"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  applyPaginationModeToggle,
  getPaginationMode,
  type CatalogPaginationMode,
} from "@/lib/pagination-mode";

function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function InfinityIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4m0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4" />
    </svg>
  );
}

const MODE_META: Record<
  CatalogPaginationMode,
  { hint: string; Icon: typeof GridIcon }
> = {
  pages: {
    hint: "Switch to infinite scroll",
    Icon: GridIcon,
  },
  infinite: {
    hint: "Switch to paged catalog",
    Icon: InfinityIcon,
  },
};

/**
 * Toggles between offset pages and cursor-based infinite scroll (URL-driven).
 */
export function PaginationModeToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const mode = getPaginationMode(searchParams);
  const meta = MODE_META[mode];
  const nextMode: CatalogPaginationMode =
    mode === "pages" ? "infinite" : "pages";

  function handleToggle() {
    const params = new URLSearchParams(searchParams.toString());
    applyPaginationModeToggle(params, nextMode);

    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/products?${qs}` : "/products", { scroll: false });
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={meta.hint}
      aria-label={meta.hint}
      className={`btn-icon sm:self-stretch ${
        mode === "infinite" ? "btn-icon-active" : ""
      }`}
    >
      <meta.Icon className="size-5" />
    </button>
  );
}
