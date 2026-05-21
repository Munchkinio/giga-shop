import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_SITE_DESCRIPTION } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "E-commerce Catalog",
    template: "%s | E-commerce Catalog",
  },
  description: DEFAULT_SITE_DESCRIPTION,
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/products" className="text-xl font-bold text-brand-700">
              Catalog
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-slate-600">
              <Link href="/products" className="hover:text-brand-700">
                Products
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          E-commerce Product Catalog
        </footer>
      </body>
    </html>
  );
}
