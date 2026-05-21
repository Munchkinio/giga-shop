"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchProductBySlug } from "@/lib/api-client";
import { formatAttributeKey } from "@/lib/attribute-filters";
import type { ProductDetail } from "@/types";

type ProductQuickViewPanelProps = {
  slug: string | null;
  onClose: () => void;
};

function getPrimaryImageUrl(product: ProductDetail): string {
  const primary =
    product.images.find((img) => img.isPrimary) ?? product.images[0];
  return (
    primary?.url ?? `https://picsum.photos/seed/${product.id}/800/800`
  );
}

export function ProductQuickViewPanel({
  slug,
  onClose,
}: ProductQuickViewPanelProps) {
  const open = slug !== null;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !slug) {
      setProduct(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchProductBySlug(slug)
      .then((detail) => {
        if (!cancelled) {
          setProduct(detail);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProduct(null);
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load product details",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug]);

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

  return (
    <>
      <div
        role="presentation"
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="quick-view-title" className="text-sm font-semibold text-slate-900">
            Quick view
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick view"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="aspect-square rounded-xl bg-slate-200" />
              <div className="h-6 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          {product && !loading ? (
            <div className="space-y-5">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                <Image
                  src={getPrimaryImageUrl(product)}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="400px"
                  unoptimized
                />
              </div>

              <div>
                <p className="text-sm font-medium text-indigo-600">
                  {product.brand?.name ?? "Brand"}
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {product.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">SKU: {product.sku}</p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  ${product.basePrice}
                </span>
                <span className="text-sm text-slate-500">{product.currency}</span>
              </div>

              <p className="text-sm text-slate-600">
                ★ {product.ratingAvg} ({product.ratingCount} reviews)
              </p>

              {product.shortDescription ? (
                <p className="text-sm text-slate-700">{product.shortDescription}</p>
              ) : null}

              {Object.keys(product.attributes).length > 0 ? (
                <dl className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm">
                  {Object.entries(product.attributes).map(([key, value]) => (
                    <div key={key}>
                      <dt className="font-medium text-slate-500">
                        {formatAttributeKey(key)}
                      </dt>
                      <dd className="text-slate-900">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {product.offers.length > 0 ? (
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-900">Offers</h4>
                  <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 text-sm">
                    {product.offers.slice(0, 3).map((offer) => (
                      <li
                        key={offer.id}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <span className="font-medium text-slate-800">
                          {offer.sellerName}
                        </span>
                        <span className="font-bold text-slate-900">
                          ${offer.price}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <p className="line-clamp-6 text-sm text-slate-600">
                {product.description}
              </p>
            </div>
          ) : null}
        </div>

        {product && !loading ? (
          <footer className="shrink-0 border-t border-slate-200 p-4">
            <Link
              href={`/products/${product.slug}`}
              className="block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              View full details
            </Link>
          </footer>
        ) : null}
      </aside>
    </>
  );
}
