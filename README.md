# E-commerce Product Catalog

A full-stack product catalog for browsing, searching, and filtering ~10K+ products. Built as a **Turborepo monorepo** with a **Next.js 14** storefront, **Fastify** REST API, **PostgreSQL** (FTS + trigram search), and **Redis** caching.

For day-to-day coding conventions and performance rules, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Scope: real-time price & inventory](#scope-real-time-price--inventory)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Running the apps](#running-the-apps)
- [API reference](#api-reference)
- [Storefront (web)](#storefront-web)
- [Search & filters](#search--filters)
- [Caching](#caching)
- [Deployment](#deployment)
- [Free-tier constraints](#free-tier-constraints)
- [Scripts](#scripts)

---

## Features

| Area | Capability |
|------|------------|
| **Catalog** | Product grid, detail pages, category tree, brands |
| **Search** | PostgreSQL full-text search + fuzzy name fallback (`pg_trgm`, Levenshtein) |
| **Autocomplete** | `GET /search/suggest` — products, brands, popular queries (debounced UI) |
| **Filters** | Category, multi-brand (OR), price range, min rating, sort |
| **Attributes** | JSONB facets (`color`, `size`, `material`, …) — shown **after category** is selected |
| **Pagination** | **Pages** (offset) or **Infinite scroll** (cursor) — toggle via icon next to search |
| **Quick view** | Side panel with product details without leaving the catalog |
| **Saved searches** | Save / apply / delete filter combinations per browser session |
| **SEO** | `generateMetadata` on catalog and product pages |

---

## Architecture

```mermaid
flowchart LR
  subgraph client [Browser]
    Web["apps/web\nNext.js 14"]
  end

  subgraph api_layer [API]
    API["apps/api\nFastify"]
  end

  subgraph data [Data]
    PG[(PostgreSQL)]
    Redis[(Redis / Upstash)]
  end

  subgraph packages [Shared packages]
    ST["shared-types\nZod + TS types"]
    DB["db\nPrisma + queries"]
  end

  Web -->|REST JSON| API
  API --> DB
  DB --> PG
  API --> Redis
  Web --> ST
  API --> ST
  DB --> ST
```

**Request flow (catalog page)**

1. Next.js Server Component reads URL `searchParams`.
2. `parseSearchParams()` validates via Zod (`@ecommerce/shared-types`).
3. `fetchProducts()` / `fetchSearch()` calls Fastify (`NEXT_PUBLIC_API_URL`).
4. API service checks Redis → runs Prisma / raw SQL in `@ecommerce/db` → returns `SearchResult`.
5. Client islands (`ProductGrid`, filters, search bar) hydrate for interactions (infinite scroll, quick view, saved searches).

**Layering rules**

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Routes | `apps/api/src/routes/` | Thin HTTP handlers, query parsing |
| Services | `apps/api/src/services/` | Cache, orchestration |
| Queries | `packages/db/src/queries/` | Prisma + `$queryRaw` for FTS |
| Types | `packages/shared-types/` | Zod schemas + TypeScript types |
| UI | `apps/web/src/components/` | React components (one per file) |

---

## Scope: real-time price & inventory

Some marketplace specs include a requirement like **“handle real-time inventory and price updates without impacting search performance.”** That describes a **production-scale pattern**, not a mandate to run **Apache Kafka** (or any message bus) in this repository.

### What the requirement means

| Concern | Typical production approach |
|---------|----------------------------|
| **Writes** | Price and stock change often (`ProductOffer`), sometimes from many sources (ERP, seller APIs, pricing engines) |
| **Reads** | Search and listing stay fast: FTS and facets stay on stable **product** fields; list price comes from offers or a **denormalized** column |
| **Decoupling** | An event bus (e.g. Kafka) lets many consumers react to one `offer.price_changed` event without the catalog API calling every downstream system |

Kafka is a common way to implement that decoupling at high volume. It is **not** implied for a ~10K seeded demo on free-tier infrastructure.

### What this MVP implements

- **Data model**: `Product` (catalog, FTS, category, attributes) vs `ProductOffer` (seller price, `stockQuantity`, `isAvailable`).
- **Storefront**: list and PDP use **in-stock offers** (min price, seller count); `inStock` filter; sort by min offer price where applicable.
- **Search**: PostgreSQL FTS on product text fields — **not** rebuilt on every offer price change.
- **Cache**: Redis for search/list/suggest (see [Caching](#caching)); optional locally if Upstash is unset.

### What is out of scope (by design)

- Kafka / streaming pipelines, consumer groups, replay-at-scale
- Continuous ingestion (1M+ offer updates per day)
- Live UI updates without refresh (WebSockets / SSE)
- Automatic cache invalidation on offer write (planned; today TTL-based cache only)
- Denormalized `min_list_price` on `products` maintained by a background worker

Demo data is loaded once via **`pnpm --filter @ecommerce/db db:seed`**. Manual edits (e.g. Prisma Studio) are enough to show that offer changes update the storefront without breaking search.

### Planned evolution (no Kafka required initially)

```mermaid
flowchart LR
  subgraph mvp [MVP — current]
    W1[Offer UPDATE\nAPI or script]
    PG1[(PostgreSQL)]
    W1 --> PG1
    R1[Redis TTL cache]
  end

  subgraph scale [Scale — roadmap]
    E[Events\nKafka or lighter queue]
    W2[Workers]
    PG2[(PostgreSQL)]
    INV[Cache invalidation\nper productId]
    DEN[Denormalized list price]
    E --> W2
    W2 --> PG2
    W2 --> INV
    W2 --> DEN
  end

  mvp -.->|when update volume\nand sources grow| scale
```

1. **Write path**: update `ProductOffer` only; do **not** touch `search_vector` for price/stock-only changes.
2. **Read path**: keep serving search from `Product`; refresh list price from offers or a denormalized column.
3. **Cache**: invalidate keys scoped by `productId` (or shorten TTL for price-sensitive keys).
4. **At scale**: publish offer change events to Kafka (or Redis Streams / a job queue) so workers update Postgres, Redis, and denormalized fields in batches — search stays on its own read model.

**Summary:** the spec points at **separating volatile offer data from search**, not at adding Kafka to Giga Shop for the demo. Documenting that here avoids expecting a live price feed or a message bus in local development.

---

## Tech stack

| Layer | Technology | Notes |
|-------|------------|--------|
| **Monorepo** | Turborepo 2 + pnpm 9 workspaces | `turbo.json` pipelines `dev`, `build`, `lint` |
| **Language** | TypeScript 5.8 strict | Shared `tsconfig.base.json` |
| **Frontend** | Next.js 14 App Router, React 18, Tailwind CSS 3 | SSR catalog; client components where needed |
| **Backend** | Fastify 4, Pino logging | Port **3001** default |
| **ORM** | Prisma 6 | Schema + migrations in `packages/db` |
| **Database** | PostgreSQL 16 | Local Docker; production **Supabase** |
| **Cache** | Upstash Redis REST | Optional locally; **5 min** search cache, **2 min** suggest |
| **Search** | `tsvector` (generated), `pg_trgm`, per-word Levenshtein | Raw SQL in `packages/db` |
| **Validation** | Zod 3 | API query/body + shared request types |
| **Deploy** | Vercel (web), Fly.io (API) | See [Deployment](#deployment) |

**PostgreSQL extensions** (via `docker/postgres/init.sql` + migrations)

- `pg_trgm` — fuzzy / autocomplete on names  
- `ltree` — category hierarchy paths  
- `unaccent`, `fuzzystrmatch` — search helpers  

---

## Repository layout

```
ecommerce-catalog/
├── apps/
│   ├── api/                    # Fastify REST API (:3001)
│   │   └── src/
│   │       ├── routes/         # HTTP routes
│   │       ├── services/       # Business logic + Redis cache
│   │       ├── lib/            # parse-search-query, cache, session-id
│   │       └── plugins/        # error-handler, redis
│   └── web/                    # Next.js storefront (:3000)
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # UI (products, search, ui)
│           ├── lib/            # api-client, parse-search-params, …
│           └── hooks/          # useDebounce
├── packages/
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Data models
│   │   │   ├── migrations/   # SQL (FTS, GIN indexes, …)
│   │   │   └── seed/         # ~10K products, 200 brands, categories
│   │   └── src/queries/      # products, facets, search-suggest, …
│   └── shared-types/         # Zod + TS types (api + web)
├── docker/
│   └── postgres/init.sql
├── docker-compose.yml          # Postgres 16 + Redis 7
├── ARCHITECTURE.md
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Prerequisites

- **Node.js** 20+ (see `.nvmrc`)
- **pnpm** 9+ (`corepack enable pnpm`)
- **Docker Desktop** (local Postgres + Redis)

---

## Quick start

```bash
# Clone and enter the repo
cd ecommerce-catalog

nvm use   # or fnm / volta

pnpm install

# Environment (root — used by Docker, Prisma, API)
cp .env.example .env

# Start Postgres + Redis
pnpm db:up

# Wait until healthy, then database setup
pnpm --filter @ecommerce/db prisma:generate
pnpm --filter @ecommerce/db prisma:migrate
pnpm --filter @ecommerce/db db:seed

# Terminal 1 — API
pnpm --filter @ecommerce/api dev

# Terminal 2 — Web (set API URL)
# Windows PowerShell:
#   $env:NEXT_PUBLIC_API_URL="http://localhost:3001"
# Unix:
#   export NEXT_PUBLIC_API_URL=http://localhost:3001
pnpm --filter @ecommerce/web dev
```

Open **http://localhost:3000** (redirects to `/products`).

Or run both via Turborepo:

```bash
pnpm dev
```

(Ensure `NEXT_PUBLIC_API_URL` is set for the web app.)

---

## Environment variables

### Root `.env` (Docker Compose + Prisma + API)

Copy from [`.env.example`](./.env.example):

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Docker Postgres credentials |
| `DATABASE_URL` | Prisma connection string (`postgresql://postgres:postgres@localhost:5432/ecommerce`) |
| `REDIS_URL` | Local Redis (`redis://localhost:6379`) — informational; API uses Upstash REST |
| `UPSTASH_REDIS_REST_URL` | Optional; cache disabled if empty |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token (pair with URL) |
| `NODE_ENV` | `development` \| `production` \| `test` |

`packages/db` loads `packages/db/.env` or root `.env` via `prisma.config.ts` (Prisma 6).

### API `apps/api` (also reads root `.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | Required |
| `PORT` | `3001` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `CORS_ORIGIN` | `*` | Comma-separated origins or `*` |
| `UPSTASH_REDIS_REST_*` | — | Optional Redis cache |

### Web `apps/web`

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Fastify base URL (no trailing slash) |

---

## Database

### Models (Prisma)

| Model | Purpose |
|-------|---------|
| `Category` | 3-level tree, `ltree` path (SQL migration) |
| `Brand` | Brand metadata |
| `Product` | Core catalog row, **JSONB `attributes`**, generated `search_vector` |
| `ProductImage` | Gallery + primary image |
| `ProductOffer` | Seller offers, stock, price |
| `SavedSearch` | Named filter snapshots per `sessionId` |
| `SearchHistory` | Query log (powers autocomplete “Recent”) |

### Migrations & search indexes

Prisma migrations live in `packages/db/prisma/migrations/`.  
Postgres-specific features (FTS column, GIN indexes on `search_vector`, `name` trigram, JSONB `attributes`) are in `*_postgres_search_features` migration.

### Seed data

```bash
pnpm --filter @ecommerce/db db:seed
# Reseed from scratch:
pnpm --filter @ecommerce/db exec tsx prisma/seed.ts -- --reset
```

Default seed (~configurable via `SEED_PRODUCT_COUNT`):

- **10,000** products  
- **200** brands  
- Multi-level **categories**  
- Random **attributes**: `color`, `size`, `material`, `weight_kg`, `warranty_months` (2–4 per product)  

### Useful DB commands

```bash
pnpm --filter @ecommerce/db prisma:studio   # GUI
pnpm --filter @ecommerce/db prisma:migrate   # apply migrations
pnpm --filter @ecommerce/db prisma:reset     # reset DB (destructive)
```

---

## Running the apps

| App | Dev command | URL |
|-----|-------------|-----|
| API | `pnpm --filter @ecommerce/api dev` | http://localhost:3001 |
| Web | `pnpm --filter @ecommerce/web dev` | http://localhost:3000 |
| Health | — | http://localhost:3001/health |

### Docker infrastructure

```bash
pnpm db:up      # start Postgres + Redis
pnpm db:down    # stop
pnpm db:reset   # stop + delete volumes + restart
pnpm db:logs    # follow logs
```

| Service | Port | Default |
|---------|------|---------|
| PostgreSQL | 5432 | `postgres` / `postgres`, DB `ecommerce` |
| Redis | 6379 | no password |

---

## API reference

Base URL: `http://localhost:3001` (local).

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | `{ status, timestamp }` |

### Products & search

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/products` | List / filter products (same query shape as search) |
| `GET` | `/products/:slug` | Product detail (images, offers, category, brand) |
| `GET` | `/search` | Full-text search when `q` is present |
| `GET` | `/search/suggest?q=&limit=` | Autocomplete (min 2 chars) |

**Shared query parameters** (flat query string → `SearchRequest` via Zod):

| Param | Description |
|-------|-------------|
| `q` | Search query |
| `categoryId` | UUID or comma-separated UUIDs |
| `brandId` | UUID or comma-separated (OR within brands) |
| `priceMin`, `priceMax` | Price bounds |
| `ratingMin` | Minimum average rating |
| `attributes` | JSON object, e.g. `{"color":["red","blue"],"size":"M"}` |
| `sortField`, `sortOrder` | `popularityScore`, `ratingAvg`, `basePrice`, `createdAt`, `name`, `relevance` |
| `paginationType` | `offset` \| `cursor` |
| `page`, `pageSize` | Offset mode |
| `cursor`, `limit` | Cursor mode (infinite scroll) |
| `includeFacets` | `false` to skip attribute facet aggregation |

**Response** (`SearchResult`): `{ items, total, facets?, pagination }`.

Attribute facets (`facets.attributes`) are computed only when **`categoryId`** is set (disjunctive facet counts per attribute key).

### Categories & brands

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/categories` | List categories (`?tree=true` for tree) |
| `GET` | `/categories/:slug` | Single category |
| `GET` | `/brands` | All brands |
| `GET` | `/brands/:slug` | Single brand |

### Saved searches

Requires header **`X-Session-Id: <uuid>`** (web stores UUID in `localStorage`).

| Method | Path | Body / notes |
|--------|------|----------------|
| `GET` | `/saved-searches` | List for session (max 20) |
| `POST` | `/saved-searches` | `{ name, query?, filters?, sort? }` |
| `DELETE` | `/saved-searches/:id` | Remove one |

### Errors

JSON shape from error plugin: `{ error: { code, message } }` (e.g. `400`, `404`, `409`).

---

## Storefront (web)

### Routes

| Path | Description |
|------|-------------|
| `/` | Redirect to `/products` |
| `/products` | Catalog + filters + search |
| `/products/[slug]` | Product detail (ISR-friendly fetch) |

### Catalog UI

- **Search bar** — autocomplete, clears URL `q` when emptied, **Search** submits  
- **Pagination mode toggle** (right of search) — grid icon = pages, **∞** = infinite scroll  
- **Filters sidebar** — category, brands, attributes (if category selected), price, rating, sort, saved searches  
- **Product grid** — quick view, infinite scroll + **Back to top** (∞ mode)  
- **Pagination footer** — per-page size + prev/next (pages mode only)  

### URL examples

```
/products
/products?q=laptop&sortField=basePrice&sortOrder=asc
/products?categoryId=<uuid>&brandId=<uuid1>,<uuid2>
/products?categoryId=<uuid>&attributes={"color":["red","blue"]}
/products?paginationType=cursor&limit=48
/products?page=2&pageSize=24&paginationType=offset
```

---

## Search & filters

### Full-text search

- Indexed fields: name (A), SKU (A), short description (B), description (C).  
- Query: `plainto_tsquery` on `search_vector`.  
- Fallback: per-word **Levenshtein** distance on product name tokens.  

### Attribute filters

- Stored in `products.attributes` (JSONB, GIN index).  
- Filters use **AND** across keys, **OR** within a key (array values).  
- Facets exclude the current attribute key when counting (disjunctive UX).  

### Autocomplete

- Products & brands: `%` + `similarity()` via `pg_trgm`.  
- Recent queries: aggregated from `search_history` (populated when history is written).  

---

## Caching

| Key prefix | TTL | Content |
|------------|-----|---------|
| `products:*` | 5 min | List/search results |
| `search:*` | 5 min | FTS search results |
| `search:suggest:*` | 2 min | Autocomplete |
| `product:slug:*` | 5 min | Product detail |

If Upstash env vars are missing, API runs **without cache** (still functional).

---

## Deployment

| Component | Target | Notes |
|-----------|--------|--------|
| **Web** | [Vercel](https://vercel.com) | Set `NEXT_PUBLIC_API_URL` to production API |
| **API** | [Fly.io](https://fly.io) | `DATABASE_URL`, Upstash, `CORS_ORIGIN` |
| **Database** | [Supabase](https://supabase.com) | Postgres 15+, run Prisma migrations |
| **Redis** | [Upstash](https://upstash.com) | REST API from Fly (not local `REDIS_URL`) |
| **CDN** | Cloudflare (optional) | Static assets / edge |

Build:

```bash
pnpm build
pnpm --filter @ecommerce/api start
pnpm --filter @ecommerce/web start
```

---

## Free-tier constraints

Designed for hobby / free tiers:

| Service | Limit | Mitigation |
|---------|-------|------------|
| Supabase | ~500 MB DB | Lean schema, ~100K products max test data |
| Upstash | ~10K commands/day | Aggressive caching, `includeFacets=false` on pagination-only requests |
| Fly.io | 256 MB RAM | Small Node footprint, efficient queries |
| Vercel | Serverless cold starts | Heavy reads on Fly API, not DB from edge |

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for indexing, `select` usage, and N+1 avoidance.

---

## Scripts

### Root

| Script | Description |
|--------|-------------|
| `pnpm dev` | Turbo: all `dev` tasks |
| `pnpm build` | Turbo: build all packages |
| `pnpm lint` | Typecheck / lint across workspace |
| `pnpm db:up` / `db:down` / `db:reset` / `db:logs` | Docker Compose |

### Package filters

```bash
pnpm --filter @ecommerce/api dev
pnpm --filter @ecommerce/web dev
pnpm --filter @ecommerce/db prisma:migrate
pnpm --filter @ecommerce/db db:seed
```

---

## License

Private — internal use.
