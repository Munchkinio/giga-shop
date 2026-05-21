import Image from "next/image";
import Link from "next/link";
import { ListPrice } from "@/components/products/ListPrice";
import { getListPriceDisplay } from "@/lib/list-price";
import type { ProductListItem } from "@/types";

type ProductCardProps = {
  product: ProductListItem;
  onQuickView?: (slug: string) => void;
};

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const listPrice = getListPriceDisplay(product);
  const imageUrl =
    product.primaryImageUrl ??
    `https://picsum.photos/seed/${product.id}/400/400`;

  return (
    <article className="group flex min-h-0 flex-col overflow-hidden rounded-2xl border border-ink-100/90 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-brand-300/60 hover:shadow-card-hover max-sm:hover:translate-y-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-50 sm:aspect-square">
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
            className="absolute right-2 top-2 rounded-lg bg-surface/95 px-2.5 py-1.5 text-[11px] font-semibold text-ink-900 shadow-card backdrop-blur-sm transition hover:bg-white sm:bottom-3 sm:left-3 sm:right-3 sm:top-auto sm:px-3 sm:py-2 sm:text-xs sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
          >
            Quick view
          </button>
        ) : null}
      </div>
      <div className="relative z-[1] flex flex-1 flex-col gap-2 bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700/90">
          {product.brandName ?? "Brand"}
        </p>
        <Link href={`/products/${product.slug}`}>
          <h2 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-ink-900 transition group-hover:text-brand-700">
            {product.name}
          </h2>
        </Link>
        {product.shortDescription ? (
          <p className="line-clamp-3 text-xs leading-relaxed text-ink-500 sm:line-clamp-2">
            {product.shortDescription}
          </p>
        ) : null}
        <div className="mt-auto space-y-1.5 border-t border-ink-100/80 pt-3">
          <ListPrice
            amount={listPrice.amount}
            showFrom={listPrice.showFrom}
            size="card"
            className="w-full min-w-0"
          />
          <p className="w-fit rounded-lg bg-ink-50 px-2 py-0.5 text-xs font-medium tabular-nums text-ink-600">
            ★ {product.ratingAvg}
            <span className="text-ink-400">
              {" "}
              ({product.ratingCount.toLocaleString()})
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}
