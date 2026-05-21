import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { DEFAULT_SITE_DESCRIPTION } from "@/lib/seo";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Giga Shop",
    template: "%s | Giga Shop",
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
    <html lang="en" className={`${outfit.variable} ${jakarta.variable}`}>
      <body>
        <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-surface/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
            <SiteLogo />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="mt-16 border-t border-ink-100/80 bg-surface/60 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
            <SiteLogo compact />
            <p className="text-xs text-ink-500">
              Curated catalog · Search · Filters ·{" "}
              <span className="text-brand-600">Giga Shop</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
