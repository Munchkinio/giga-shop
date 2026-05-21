import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductBreadcrumbs } from "@/components/products/ProductBreadcrumbs";
import { ApiError, fetchProductBySlug } from "@/lib/api-client";

type ProductPageProps = {
  params: { slug: string };
};

const getProductBySlug = cache(fetchProductBySlug);

function getPrimaryImageUrl(
  product: Awaited<ReturnType<typeof getProductBySlug>>,
): string {
  const primaryImage =
    product.images.find((img) => img.isPrimary) ?? product.images[0];
  return (
    primaryImage?.url ?? `https://picsum.photos/seed/${product.id}/800/800`
  );
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  try {
    const product = await getProductBySlug(params.slug);
    const brandName = product.brand?.name ?? "Brand";
    const title = `${product.name} - ${brandName}`;
    const description =
      product.shortDescription ??
      product.description.slice(0, 160).trim();
    const imageUrl = getPrimaryImageUrl(product);

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: imageUrl }],
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { title: "Product Not Found" };
    }
    throw error;
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  let product;
  try {
    product = await getProductBySlug(params.slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const primaryImage =
    product.images.find((img) => img.isPrimary) ?? product.images[0];
  const primaryImageUrl = getPrimaryImageUrl(product);

  return (
    <div className="space-y-8">
      <ProductBreadcrumbs
        productName={product.name}
        categoryBreadcrumb={
          product.categoryBreadcrumb ??
          (product.category ? [product.category] : undefined)
        }
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="card-surface relative aspect-square overflow-hidden p-0">
          <Image
            src={primaryImageUrl}
            alt={primaryImage?.altText ?? product.name}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        <div className="space-y-6">
          <div>
            <p className="badge w-fit">{product.brand?.name ?? "Brand"}</p>
            <h1 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink-900">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-ink-500">SKU: {product.sku}</p>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-ink-900">
              ${product.basePrice}
            </span>
            <span className="text-sm text-ink-500">{product.currency}</span>
          </div>

          <p className="text-sm text-ink-600">
            ★ {product.ratingAvg} ({product.ratingCount} reviews) ·{" "}
            {product.popularityScore} popularity score
          </p>

          {product.shortDescription ? (
            <p className="text-ink-700">{product.shortDescription}</p>
          ) : null}

          {Object.keys(product.attributes).length > 0 ? (
            <dl className="card-surface grid grid-cols-2 gap-2 p-4 text-sm">
              {Object.entries(product.attributes).map(([key, value]) => (
                <div key={key}>
                  <dt className="font-medium capitalize text-ink-500">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="text-ink-900">{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {product.offers.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink-900">
                Offers
              </h2>
              <ul className="card-surface divide-y divide-ink-100 p-0">
                {product.offers.map((offer) => (
                  <li
                    key={offer.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-ink-900">
                        {offer.sellerName}
                      </p>
                      <p className="text-ink-500">
                        {offer.isAvailable
                          ? `${offer.stockQuantity} in stock`
                          : "Out of stock"}
                        {offer.shippingDays
                          ? ` · ships in ${offer.shippingDays} days`
                          : null}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-800">${offer.price}</p>
                      {offer.compareAtPrice ? (
                        <p className="text-xs text-ink-400 line-through">
                          ${offer.compareAtPrice}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <section className="card-surface max-w-none p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">
          Description
        </h2>
        <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
          {product.description}
        </div>
      </section>
    </div>
  );
}
