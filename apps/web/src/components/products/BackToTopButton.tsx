"use client";

import { useEffect, useState } from "react";

const SCROLL_THRESHOLD_PX = 400;

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      title="Back to top"
      className="fixed bottom-6 right-4 z-30 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 sm:right-8 lg:right-10"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="size-4 shrink-0"
        aria-hidden
      >
        <path d="M12 19V5" strokeLinecap="round" />
        <path d="M7 10l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Top
    </button>
  );
}
