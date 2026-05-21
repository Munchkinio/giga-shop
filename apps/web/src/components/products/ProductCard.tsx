import Image from "next/image";
import Link from "next/link";
import type { ProductListItem } from "@/types";

type ProductCardProps = {
  product: ProductListItem;
  onQuickView?: (slug: string) => void;
};

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const imageUrl =
    product.primaryImageUrl ??
    `https://picsum.photos/seed/${product.id}/400/400`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100/90 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-brand-300/60 hover:shadow-card-hover">
      <div className="relative aspect-square overflow-hidden bg-ink-50">
        <Link href={`/products/${product.slug}`} className="absolute inset-0">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            unoptimized
          />
        </Link>
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100"
          aria-hidden
        />
        {onQuickView ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onQuickView(product.slug);
            }}
            className="absolute bottom-3 left-3 right-3 rounded-xl bg-surface/95 px-3 py-2 text-xs font-semibold text-ink-900 shadow-card backdrop-blur-sm transition hover:bg-white focus:opacity-100 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
          >
            Quick view
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700/90">
          {product.brandName ?? "Brand"}
        </p>
        <Link href={`/products/${product.slug}`}>
          <h2 className="line-clamp-2 font-display text-sm font-semibold text-ink-900 transition group-hover:text-brand-700">
            {product.name}
          </h2>
        </Link>
        {product.shortDescription ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-ink-500">
            {product.shortDescription}
          </p>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-ink-100/80 pt-3">
          <span className="font-display text-lg font-bold text-ink-900">
            ${product.basePrice}
          </span>
          <span className="rounded-lg bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-600">
            ★ {product.ratingAvg}
            <span className="text-ink-400"> ({product.ratingCount})</span>
          </span>
        </div>
      </div>
    </article>
  );
}
