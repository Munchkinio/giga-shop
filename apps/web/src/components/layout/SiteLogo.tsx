import Link from "next/link";

type SiteLogoProps = {
  compact?: boolean;
};

export function SiteLogo({ compact = false }: SiteLogoProps) {
  return (
    <Link href="/products" className="group flex items-center gap-2.5">
      <span
        className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-sm font-bold text-white shadow-glow transition group-hover:scale-105"
        aria-hidden
      >
        G
      </span>
      {!compact ? (
        <span className="font-display text-xl font-bold tracking-tight text-ink-900">
          Giga<span className="text-brand-600">Shop</span>
        </span>
      ) : null}
    </Link>
  );
}
