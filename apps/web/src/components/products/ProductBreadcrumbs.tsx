import Link from "next/link";
import type { CategorySummary } from "@/types";

type ProductBreadcrumbsProps = {
  productName: string;
  categoryBreadcrumb?: CategorySummary[];
};

function categoryHref(categoryId: string): string {
  return `/products?categoryId=${encodeURIComponent(categoryId)}`;
}

export function ProductBreadcrumbs({
  productName,
  categoryBreadcrumb = [],
}: ProductBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link
            href="/products"
            className="font-medium text-brand-700 transition hover:text-brand-800"
          >
            Products
          </Link>
        </li>

        {categoryBreadcrumb.map((category) => (
          <li key={category.id} className="flex items-center gap-2">
            <span className="text-ink-300" aria-hidden>
              /
            </span>
            <Link
              href={categoryHref(category.id)}
              className="font-medium text-brand-700 transition hover:text-brand-800"
            >
              {category.name}
            </Link>
          </li>
        ))}

        <li className="flex min-w-0 items-center gap-2">
          <span className="text-ink-300" aria-hidden>
            /
          </span>
          <span className="truncate text-ink-900" aria-current="page">
            {productName}
          </span>
        </li>
      </ol>
    </nav>
  );
}
