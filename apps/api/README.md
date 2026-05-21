# @ecommerce/api

Fastify REST API for the product catalog.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/products` | Product list (filters, pagination) |
| GET | `/products/:slug` | Product detail |
| GET | `/search` | Full-text search (`q` or `query`) |
| GET | `/categories` | Categories (`?tree=true` for hierarchy) |
| GET | `/categories/:slug` | Category by slug |
| GET | `/brands` | Active brands |
| GET | `/brands/:slug` | Brand by slug |

## Query params (products / search)

Uses `searchRequestSchema` from `@ecommerce/shared-types`:

- `q` or `query` — search text
- `categoryId`, `brandId` — UUID or comma-separated
- `priceMin`, `priceMax`, `ratingMin`, `isActive`
- `attributes` — JSON object string
- `sortField`, `sortOrder`
- Pagination: `paginationType=cursor|offset`, `cursor`, `limit`, `page`, `pageSize`

## Dev

```bash
pnpm db:up
pnpm --filter @ecommerce/db prisma:generate
pnpm install
pnpm --filter @ecommerce/api dev
```

## Redis cache

Search and product list/detail responses are cached for **300s** when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Without Upstash credentials, the API runs without cache.
