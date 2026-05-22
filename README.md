# Giga Shop — E-commerce Product Catalog

A full-stack product catalog for browsing, searching, and filtering ~10K+ products. Built as a **Turborepo monorepo** with a **Next.js 14** storefront, **Fastify** REST API, **PostgreSQL** (FTS + trigram search), and **Upstash Redis** caching.

For day-to-day coding conventions and performance rules, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

### Production (live)


| Service        | URL                                                                                    |
| -------------- | -------------------------------------------------------------------------------------- |
| **Storefront** | [https://giga-shop-web.vercel.app](https://giga-shop-web.vercel.app)                   |
| **API**        | [https://giga-shop-api.onrender.com](https://giga-shop-api.onrender.com)               |
| **API health** | [https://giga-shop-api.onrender.com/health](https://giga-shop-api.onrender.com/health) |


Stack: **Vercel** (web) · **Render** (API, Docker) · **Supabase** (Postgres) · **Upstash** (Redis cache).

---

## Table of contents

- [Production (live)](#production-live)
- [Features](#features)
- [Architecture](#architecture)
- [Scope: real-time price & inventory](#scope-real-time-price--inventory)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Supabase (cloud Postgres)](#supabase-cloud-postgres)
- [Running the apps](#running-the-apps)
- [API rate limiting](#api-rate-limiting)
- [Building for production](#building-for-production)
- [API reference](#api-reference)
- [Storefront (web)](#storefront-web)
- [Search & filters](#search--filters)
- [Caching](#caching)
- [Deployment](#deployment)
- [Free-tier constraints](#free-tier-constraints)
- [Scripts](#scripts)

---

## Features


| Area               | Capability                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Catalog**        | Product grid, detail pages, category tree, brands                                                          |
| **Search**         | PostgreSQL full-text search + fuzzy name fallback (`pg_trgm`, Levenshtein)                                 |
| **Autocomplete**   | `GET /search/suggest` — products, brands, popular queries (debounced UI)                                   |
| **Filters**        | Category tree (branch scope), multi-brand (OR), price range, min rating, in-stock, sort by min offer price |
| **Pricing**        | Multi-seller offers; list/PDP show lowest in-stock offer price                                             |
| **Attributes**     | JSONB facets (`color`, `size`, `material`, …) — shown **after category** is selected                       |
| **Pagination**     | **Pages** (offset) or **Infinite scroll** (cursor) — toggle via icon next to search                        |
| **Quick view**     | Side panel with product details without leaving the catalog                                                |
| **Saved searches** | Save / apply / delete filter combinations per browser session                                              |
| **Rate limiting**  | Per-IP API throttle; `GET /health` excluded — [API rate limiting](#api-rate-limiting)                      |
| **SEO**            | `generateMetadata` on catalog and product pages                                                            |


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


| Layer    | Location                   | Responsibility                    |
| -------- | -------------------------- | --------------------------------- |
| Routes   | `apps/api/src/routes/`     | Thin HTTP handlers, query parsing |
| Services | `apps/api/src/services/`   | Cache, orchestration              |
| Queries  | `packages/db/src/queries/` | Prisma + `$queryRaw` for FTS      |
| Types    | `packages/shared-types/`   | Zod schemas + TypeScript types    |
| UI       | `apps/web/src/components/` | React components (one per file)   |


---

## Scope: real-time price & inventory

Some marketplace specs include a requirement like **“handle real-time inventory and price updates without impacting search performance.”** That describes a **production-scale pattern**, not a mandate to run **Apache Kafka** (or any message bus) in this repository.

### What the requirement means


| Concern        | Typical production approach                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Writes**     | Price and stock change often (`ProductOffer`), sometimes from many sources (ERP, seller APIs, pricing engines)                                 |
| **Reads**      | Search and listing stay fast: FTS and facets stay on stable **product** fields; list price comes from offers or a **denormalized** column      |
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

Demo data is loaded once via `**pnpm --filter @ecommerce/db db:seed`**. Manual edits (e.g. Prisma Studio) are enough to show that offer changes update the storefront without breaking search.

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


| Layer          | Technology                                              | Notes                                                       |
| -------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| **Monorepo**   | Turborepo 2 + pnpm 9 workspaces                         | `turbo.json` pipelines `dev`, `build`, `lint`               |
| **Language**   | TypeScript 5.8 strict                                   | Shared `tsconfig.base.json`                                 |
| **Frontend**   | Next.js 14 App Router, React 18, Tailwind CSS 3         | SSR catalog; client components where needed                 |
| **Backend**    | Fastify 4, Pino logging                                 | Port **3001** default                                       |
| **ORM**        | Prisma 6                                                | Schema + migrations in `packages/db`                        |
| **Database**   | PostgreSQL 16                                           | Local Docker; production **Supabase**                       |
| **Cache**      | Upstash Redis REST                                      | Optional locally; **5 min** search cache, **2 min** suggest |
| **Search**     | `tsvector` (generated), `pg_trgm`, per-word Levenshtein | Raw SQL in `packages/db`                                    |
| **Validation** | Zod 3                                                   | API query/body + shared request types                       |
| **Deploy**     | Vercel (web), [Render](https://render.com) Docker (API) | See [Deployment](#deployment)                               |


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
│   │   ├── Dockerfile          # Production image (Render / Docker)
│   │   └── src/
│   │       ├── routes/         # HTTP routes
│   │       ├── services/       # Business logic + Redis cache
│   │       ├── lib/            # parse-search-query, cache, session-id
│   │       └── plugins/        # error-handler, redis
│   └── web/                    # Next.js storefront (:3000)
│       ├── vercel.json         # Monorepo install/build on Vercel
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
│   └── shared-types/         # Zod + TS types → dist/ (api + web)
├── .dockerignore               # API image build context excludes
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
- **Docker Desktop** (local Postgres; optional — not used by API cache)
- Accounts (production): [Supabase](https://supabase.com), [Render](https://render.com), [Vercel](https://vercel.com), [Upstash](https://upstash.com) (optional cache)

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
pnpm --filter @ecommerce/db prisma:migrate
pnpm --filter @ecommerce/db db:seed

# Build workspace packages (API resolves @ecommerce/* from dist/)
pnpm build --filter=@ecommerce/api...

# Terminal 1 — API
pnpm --filter @ecommerce/api dev

# Terminal 2 — Web (set API URL)
# Windows PowerShell:
#   $env:NEXT_PUBLIC_API_URL="http://localhost:3001"
# Unix:
#   export NEXT_PUBLIC_API_URL=http://localhost:3001
pnpm --filter @ecommerce/web dev
```

Open **[http://localhost:3000](http://localhost:3000)** (redirects to `/products`).

Or run both via Turborepo (build workspace packages once first if `dist/` is missing):

```bash
pnpm build --filter=@ecommerce/api...
pnpm dev
```

(Ensure `NEXT_PUBLIC_API_URL` is set for the web app.)

---

## Environment variables

### Root `.env` (Docker Compose + Prisma + API)

Copy from `[.env.example](./.env.example)`:


| Variable                                              | Description                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Docker Postgres credentials                                                          |
| `DATABASE_URL`                                        | Prisma connection string (`postgresql://postgres:postgres@localhost:5432/ecommerce`) |
| `REDIS_URL`                                           | Local Redis (`redis://localhost:6379`) — informational; API uses Upstash REST        |
| `UPSTASH_REDIS_REST_URL`                              | Optional; cache disabled if empty                                                    |
| `UPSTASH_REDIS_REST_TOKEN`                            | Upstash token (pair with URL)                                                        |
| `NODE_ENV`                                            | `development` | `production` | `test`                                                |


**Env file precedence (Prisma, seed):** optional `packages/db/.env` is loaded first; **root `.env` overrides** (`prisma.config.ts`, `prisma/seed.ts`). For Supabase deploy/seed, put `DATABASE_URL` in the **root** `.env` and keep `DATABASE_URL` **commented out** in `packages/db/.env` (otherwise localhost wins if set there).

### API `apps/api` (reads root `.env` via `apps/api/src/env.ts`)


| Variable                                              | Default   | Description                                                                |
| ----------------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`                                        | —         | Required                                                                   |
| `PORT`                                                | `3001`    | HTTP port                                                                  |
| `HOST`                                                | `0.0.0.0` | Bind address                                                               |
| `CORS_ORIGIN`                                         | `*`       | Comma-separated origins; default `*` works for demo                        |
| `RATE_LIMIT_MAX`                                      | `100`     | Max requests per IP per window — [API rate limiting](#api-rate-limiting)   |
| `RATE_LIMIT_WINDOW_MS`                                | `60000`   | Window (ms); `/health` excluded — same section                             |
| `OPENAPI_ENABLED`                                     | `true`    | Swagger UI at `/docs`; set `false` to disable                              |
| `API_PUBLIC_URL`                                      | —         | Base URL in OpenAPI **Servers** (e.g. Render API URL)                      |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | —         | **Recommended in production**; API logs a warning and skips cache if unset |


### Web `apps/web`


| Variable              | Default                 | Description                          |
| --------------------- | ----------------------- | ------------------------------------ |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Fastify base URL (no trailing slash) |


---

## Database

### Models (Prisma)


| Model           | Purpose                                                             |
| --------------- | ------------------------------------------------------------------- |
| `Category`      | 3-level tree, `ltree` path (SQL migration)                          |
| `Brand`         | Brand metadata                                                      |
| `Product`       | Core catalog row, **JSONB `attributes`**, generated `search_vector` |
| `ProductImage`  | Gallery + primary image                                             |
| `ProductOffer`  | Seller offers, stock, price                                         |
| `SavedSearch`   | Named filter snapshots per `sessionId`                              |
| `SearchHistory` | Query log (powers autocomplete “Recent”)                            |


### Migrations & search indexes

Prisma migrations live in `packages/db/prisma/migrations/`.  
Postgres-specific features (FTS column, GIN indexes on `search_vector`, `name` trigram, JSONB `attributes`) are in `*_postgres_search_features` migration.

### Seed data

```bash
pnpm --filter @ecommerce/db db:seed
# Reseed from scratch (clears catalog tables first):
pnpm --filter @ecommerce/db db:seed -- --reset
```

Uses the same `DATABASE_URL` as migrations (root `.env` when `packages/db/.env` has no `DATABASE_URL`).

Default seed (~configurable via `SEED_PRODUCT_COUNT`):

- **10,000** products  
- **200** brands  
- Multi-level **categories**  
- Random **attributes**: `color`, `size`, `material`, `weight_kg`, `warranty_months` (2–4 per product)

### Useful DB commands

```bash
pnpm --filter @ecommerce/db prisma:studio   # GUI
pnpm --filter @ecommerce/db prisma:migrate   # dev: apply migrations
pnpm --filter @ecommerce/db prisma:deploy    # production: apply migrations
pnpm --filter @ecommerce/db prisma:reset     # reset DB (destructive)
```

---

## Supabase (cloud Postgres)

Use when hosting the database on [Supabase](https://supabase.com) (not local Docker).

1. Create a project (e.g. **Postgres** default, region near EU). **Data API** optional (this app uses Prisma, not `supabase-js`). **Eviction** on for cache-sized Redis is unrelated — for Upstash see [Caching](#caching).
2. Copy **Session pooler** connection string (port **5432**) if **Direct** (`db.*.supabase.co`) is unreachable from your network (common `P1001` on Windows).
3. Set in **root** `.env`:
  ```env
   DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@....pooler.supabase.com:5432/postgres?sslmode=require"
  ```
4. Apply schema:
  ```bash
   pnpm --filter @ecommerce/db prisma:deploy
  ```
5. Seed (optional, ~10K products):
  ```bash
   pnpm --filter @ecommerce/db db:seed -- --reset
  ```
6. Confirm tables in Supabase **Table Editor** (`products`, `categories`, …).

`packages/db/prisma.config.ts` uses `process.env.DATABASE_URL ?? ""` so `prisma generate` works in Docker/Vercel builds without a live DB.

---

## Running the apps


| App    | Dev command                        | URL                                                          |
| ------ | ---------------------------------- | ------------------------------------------------------------ |
| API    | `pnpm --filter @ecommerce/api dev` | [http://localhost:3001](http://localhost:3001)               |
| Web    | `pnpm --filter @ecommerce/web dev` | [http://localhost:3000](http://localhost:3000)               |
| Health | —                                  | [http://localhost:3001/health](http://localhost:3001/health) |

## API rate limiting

> **Where to find this:** Table of contents → **API rate limiting**, or search the file for `API rate limiting` (Ctrl+F).

The Fastify API limits requests **per IP** on routes registered after the rate-limit plugin. **`GET /health` is registered before the plugin**, so probes stay unlimited.

| Variable | Default | Role |
| -------- | ------- | ---- |
| `RATE_LIMIT_MAX` | `100` | Max requests per IP per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Window length (milliseconds) |

Over limit → **HTTP 429**:

```json
{ "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "..." } }
```

Code: [`apps/api/src/plugins/rate-limit.ts`](./apps/api/src/plugins/rate-limit.ts).

### Verify locally

1. `pnpm --filter @ecommerce/api dev`
2. Optional in root `.env`: `RATE_LIMIT_MAX=5` (restart API after changing).
3. Hit a limited route several times:

```powershell
# Windows
1..8 | ForEach-Object {
  curl.exe -s -w " #$_ HTTP %{http_code}`n" "http://localhost:3001/products?limit=1"
}
```

```bash
# macOS / Linux
for i in $(seq 1 8); do
  curl -s -o /dev/null -w "#$i %{http_code}\n" "http://localhost:3001/products?limit=1"
done
```

Expect **200** for the first `RATE_LIMIT_MAX` calls, then **429**. `/health` should stay **200** under repeated requests.

On Render, set `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` in the service env if needed (see [Deployment](#deployment)).

### Docker infrastructure

```bash
pnpm db:up      # start Postgres + Redis
pnpm db:down    # stop
pnpm db:reset   # stop + delete volumes + restart
pnpm db:logs    # follow logs
```


| Service    | Port | Default                                                    |
| ---------- | ---- | ---------------------------------------------------------- |
| PostgreSQL | 5432 | `postgres` / `postgres`, DB `ecommerce`                    |
| Redis      | 6379 | Compose only; **API uses Upstash REST**, not this instance |


---

## Building for production

Workspace packages `**@ecommerce/shared-types`** and `**@ecommerce/db**` compile to `**dist/**` (Node ESM + declarations). The API imports them at runtime via `package.json` `exports` pointing to JavaScript, not TypeScript sources.


| Package                   | Build                                    | Notes                                                            |
| ------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| `@ecommerce/shared-types` | `prisma generate` (db) + `tsc` → `dist/` | Prisma types required before compile (Vercel runs via db filter) |
| `@ecommerce/db`           | `prisma generate && tsc`                 | FTS queries in `src/queries/`                                    |
| `@ecommerce/api`          | `tsc && tsc-alias`                       | Rewrites `@/*` path aliases in `dist/`                           |


Turbo runs dependents first (`^build`). From the repo root:

```bash
pnpm build
# or API chain only:
pnpm build --filter=@ecommerce/api...
```

Production start (local, after build):

```bash
pnpm --filter @ecommerce/api start
# → node apps/api/dist/index.js
```

**Prisma in CI/Docker:** `packages/db/prisma.config.ts` uses `process.env.DATABASE_URL ?? ""` so `prisma generate` succeeds without a live database (Docker image build). Migrations still require a real `DATABASE_URL` (`prisma:deploy`).

---

## API reference

Base URL: `http://localhost:3001` (local).

### Interactive docs (OpenAPI / Swagger)

When `OPENAPI_ENABLED=true` (default), the API serves:

| URL | Description |
| --- | ----------- |
| [http://localhost:3001/docs](http://localhost:3001/docs) | Swagger UI — try endpoints in the browser |
| [http://localhost:3001/docs/json](http://localhost:3001/docs/json) | OpenAPI 3.0 JSON spec |

Set `API_PUBLIC_URL` (e.g. `https://giga-shop-api.onrender.com`) so the **Servers** dropdown in Swagger matches production. `/docs` is registered before rate limiting (same as `/health`).

Disable docs: `OPENAPI_ENABLED=false`.

### Health


| Method | Path      | Description             |
| ------ | --------- | ----------------------- |
| `GET`  | `/health` | `{ status, timestamp }` — not rate-limited ([details](#api-rate-limiting)) |


### Products & search


| Method | Path                        | Description                                         |
| ------ | --------------------------- | --------------------------------------------------- |
| `GET`  | `/products`                 | List / filter products (same query shape as search) |
| `GET`  | `/products/:slug`           | Product detail (images, offers, category, brand)    |
| `GET`  | `/search`                   | Full-text search when `q` is present                |
| `GET`  | `/search/suggest?q=&limit=` | Autocomplete (min 2 chars)                          |


**Shared query parameters** (flat query string → `SearchRequest` via Zod):


| Param                    | Description                                                                   |
| ------------------------ | ----------------------------------------------------------------------------- |
| `q`                      | Search query                                                                  |
| `categoryId`             | UUID or comma-separated UUIDs                                                 |
| `brandId`                | UUID or comma-separated (OR within brands)                                    |
| `priceMin`, `priceMax`   | Price bounds                                                                  |
| `ratingMin`              | Minimum average rating                                                        |
| `attributes`             | JSON object, e.g. `{"color":["red","blue"],"size":"M"}`                       |
| `sortField`, `sortOrder` | `popularityScore`, `ratingAvg`, `basePrice`, `createdAt`, `name`, `relevance` |
| `paginationType`         | `offset` | `cursor`                                                           |
| `page`, `pageSize`       | Offset mode                                                                   |
| `cursor`, `limit`        | Cursor mode (infinite scroll)                                                 |
| `includeFacets`          | `false` to skip attribute facet aggregation                                   |


**Response** (`SearchResult`): `{ items, total, facets?, pagination }`.

Attribute facets (`facets.attributes`) are computed only when `**categoryId`** is set (disjunctive facet counts per attribute key).

### Categories & brands


| Method | Path                | Description                             |
| ------ | ------------------- | --------------------------------------- |
| `GET`  | `/categories`       | List categories (`?tree=true` for tree) |
| `GET`  | `/categories/:slug` | Single category                         |
| `GET`  | `/brands`           | All brands                              |
| `GET`  | `/brands/:slug`     | Single brand                            |


### Saved searches

Requires header `**X-Session-Id: <uuid>**` (web stores UUID in `localStorage`).


| Method   | Path                  | Body / notes                        |
| -------- | --------------------- | ----------------------------------- |
| `GET`    | `/saved-searches`     | List for session (max 20)           |
| `POST`   | `/saved-searches`     | `{ name, query?, filters?, sort? }` |
| `DELETE` | `/saved-searches/:id` | Remove one                          |


### Errors

JSON shape from error plugin: `{ error: { code, message } }` (e.g. `400`, `404`, `409`).

---

## Storefront (web)

### Routes


| Path               | Description                         |
| ------------------ | ----------------------------------- |
| `/`                | Redirect to `/products`             |
| `/products`        | Catalog + filters + search          |
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


| Key prefix         | TTL   | Content             |
| ------------------ | ----- | ------------------- |
| `products:`*       | 5 min | List/search results |
| `search:*`         | 5 min | FTS search results  |
| `search:suggest:*` | 2 min | Autocomplete        |
| `product:slug:*`   | 5 min | Product detail      |


If Upstash env vars are missing, API runs **without cache** (every request hits Postgres; still functional).

**Setup:** Upstash → **Create Database** → region near API → enable **eviction** (safe for TTL cache) → copy **REST URL** + **token** to Render (and root `.env` for local API).

---

## Deployment

End-to-end checklist:


| Step | Service      | Action                                                                                     |
| ---- | ------------ | ------------------------------------------------------------------------------------------ |
| 1    | **Supabase** | `prisma:deploy` + optional `db:seed -- --reset` (see [Supabase](#supabase-cloud-postgres)) |
| 2    | **Upstash**  | Create Redis → REST URL + token → Render env                                               |
| 3    | **Render**   | Docker API from `apps/api/Dockerfile`                                                      |
| 4    | **Vercel**   | Root `apps/web`, `NEXT_PUBLIC_API_URL` → Render                                            |



| Component    | Target                                  | Notes                                               |
| ------------ | --------------------------------------- | --------------------------------------------------- |
| **Web**      | [Vercel](https://vercel.com)            | `apps/web`; see `apps/web/vercel.json`              |
| **API**      | [Render](https://render.com) **Docker** | Multi-stage image; also Fly.io / Railway compatible |
| **Database** | [Supabase](https://supabase.com)        | Session pooler URL recommended                      |
| **Cache**    | [Upstash](https://upstash.com)          | REST on API; enable **eviction** on free tier       |
| **CDN**      | Cloudflare (optional)                   | Static assets / edge                                |


### Render (API)

**New Web Service** → connect GitHub repo → **Environment: Docker** (not Node).


| Setting                  | Value                       |
| ------------------------ | --------------------------- |
| **Root Directory**       | *(empty — repository root)* |
| **Dockerfile Path**      | `apps/api/Dockerfile`       |
| **Docker Build Context** | `.`                         |
| **Docker Command**       | *(empty — use image `CMD`)* |
| **Health Check Path**    | `/health`                   |


**Environment variables:**


| Variable                   | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`             | Supabase Session pooler URI + `sslmode=require`      |
| `NODE_ENV`                 | `production`                                         |
| `CORS_ORIGIN`              | `https://giga-shop-web.vercel.app` (or `*` for demo) |
| `UPSTASH_REDIS_REST_URL`   | From Upstash **REST API** tab                        |
| `UPSTASH_REDIS_REST_TOKEN` | Pair with URL                                        |
| `RATE_LIMIT_MAX`           | Optional; default `100`                              |
| `RATE_LIMIT_WINDOW_MS`     | Optional; default `60000`                            |
| `API_PUBLIC_URL`           | `https://giga-shop-api.onrender.com` (Swagger Servers) |
| `OPENAPI_ENABLED`          | `true` (docs at `/docs`; set `false` to hide)        |


Migrations are **not** run by the container. Apply once locally or via Render shell:

```bash
pnpm --filter @ecommerce/db prisma:deploy
```

Verify logs: no line `Upstash Redis not configured — caching disabled`.

### Docker API image (local smoke test)

Build from the **repository root** (see `.dockerignore`):

```bash
docker build -t giga-shop-api -f apps/api/Dockerfile .
```

Run (Postgres on the host via Docker Desktop):

```bash
docker run --rm -p 3001:3001 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/ecommerce" \
  -e NODE_ENV=production \
  giga-shop-api
```

Check **[http://localhost:3001/health](http://localhost:3001/health)** → `{"status":"ok","timestamp":"..."}`.

On Linux, add `--add-host=host.docker.internal:host-gateway` if the hostname is not resolved.

**Image build (summary):** `deps` → `pnpm install` + `prisma generate`; `builder` → `pnpm build --filter=@ecommerce/api...`; `runtime` → Alpine + `dumb-init`, compiled `dist/`, workspace `node_modules` (including `packages/shared-types/node_modules` for `zod`). Build from repo root; see `[.dockerignore](./.dockerignore)`.

### Web (Vercel)

Import repo → **Root Directory:** `apps/web` (not `apps/api`).


| Setting               | Value                                                    |
| --------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://giga-shop-api.onrender.com` (no trailing slash) |


`[apps/web/vercel.json](./apps/web/vercel.json)` runs install/build from the monorepo root so `@ecommerce/shared-types` can run `prisma generate` before `tsc`. Defaults: `cd ../.. && pnpm install` and `turbo run build --filter=@ecommerce/web`.

After deploy, optionally tighten Render `CORS_ORIGIN` to your exact Vercel URL.

---

## Free-tier constraints

Designed for hobby / free tiers:


| Service      | Limit                         | Mitigation                                                            |
| ------------ | ----------------------------- | --------------------------------------------------------------------- |
| Supabase     | ~500 MB DB                    | Lean schema, ~100K products max test data                             |
| Upstash      | ~10K commands/day             | Aggressive caching, `includeFacets=false` on pagination-only requests |
| Render (API) | Free tier sleeps / cold start | Health check `/health`; Docker image ~workspace deps                  |
| Vercel       | Serverless cold starts        | Catalog reads hit Render API, not DB from edge                        |


See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for indexing, `select` usage, and N+1 avoidance.

---

## Scripts

### Root


| Script                                            | Description                       |
| ------------------------------------------------- | --------------------------------- |
| `pnpm dev`                                        | Turbo: all `dev` tasks            |
| `pnpm build`                                      | Turbo: build all packages         |
| `pnpm lint`                                       | Typecheck / lint across workspace |
| `pnpm db:up` / `db:down` / `db:reset` / `db:logs` | Docker Compose                    |


### Package filters

```bash
pnpm --filter @ecommerce/api dev
pnpm --filter @ecommerce/web dev
pnpm build --filter=@ecommerce/api...   # workspace dist (required before API dev if dist/ missing)
pnpm --filter @ecommerce/db prisma:migrate
pnpm --filter @ecommerce/db prisma:deploy   # production migrations
pnpm --filter @ecommerce/db db:seed
docker build -t giga-shop-api -f apps/api/Dockerfile .   # API production image
```

---

## License

Private — internal use.