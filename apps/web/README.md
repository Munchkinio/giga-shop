# @ecommerce/web

Next.js 14 storefront (App Router) for the product catalog.

## Setup

```bash
# From repo root
pnpm install
pnpm --filter @ecommerce/db prisma:generate
pnpm db:up
pnpm --filter @ecommerce/api dev   # :3001
pnpm --filter @ecommerce/web dev # :3000
```

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Stack

- Next.js 14 App Router, TypeScript strict
- Tailwind CSS
- Server Components for pages; Client Components for search/filters
- `@ecommerce/shared-types` for `searchRequestSchema` validation
