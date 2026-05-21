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
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-600 hover:shadow-md">
      <div className="relative aspect-square">
        <Link href={`/products/${product.slug}`} className="absolute inset-0">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            unoptimized
          />
        </Link>
        {onQuickView ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onQuickView(product.slug);
            }}
            className="absolute bottom-2 left-2 right-2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            Quick view
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {product.brandName ?? "Brand"}
        </p>
        <Link href={`/products/${product.slug}`}>
          <h2 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-brand-700">
            {product.name}
          </h2>
        </Link>
        {product.shortDescription ? (
          <p className="line-clamp-2 text-xs text-slate-600">
            {product.shortDescription}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-slate-900">
            ${product.basePrice}
          </span>
          <span className="text-xs text-slate-500">
            ★ {product.ratingAvg} ({product.ratingCount})
          </span>
        </div>
      </div>
    </article>
  );
}
