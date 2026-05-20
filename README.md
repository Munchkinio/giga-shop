# E-commerce Product Catalog

Monorepo for an e-commerce product catalog: browse, search, and filter products with PostgreSQL full-text search, Redis caching, and a Next.js storefront backed by a Fastify API.

For architecture decisions and conventions, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Tech stack

| Layer | Technology |
| --- | --- |
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Fastify + TypeScript |
| Database | PostgreSQL (Supabase) + Prisma |
| Cache | Redis (Upstash) |
| Search | PostgreSQL FTS (`tsvector`, `pg_trgm`) |
| Validation | Zod |
| Deploy | Vercel (web), Fly.io (API) |

## Prerequisites

- **Node.js** 20+ (see `.nvmrc`)
- **pnpm** 9+ (`corepack enable` recommended)
- **Docker** (for local PostgreSQL/Redis when apps are wired up)

## Setup

```bash
git clone <repository-url>
cd ecommerce-catalog

# Use Node 20+ (nvm, fnm, etc.)
nvm use

# Install dependencies
pnpm install
```

Apps and packages are placeholders until Next.js, Fastify, and Prisma are scaffolded in follow-up steps.

## Project structure

```
ecommerce-catalog/
├── apps/
│   ├── web/              # Next.js 14 storefront (App Router)
│   └── api/              # Fastify REST API
├── packages/
│   ├── db/               # Prisma schema & client
│   └── shared-types/     # Shared TypeScript types (web + api)
├── ARCHITECTURE.md       # Stack, layout, performance rules
├── package.json          # Root workspace scripts
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Available scripts

Run from the repository root:

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `pnpm dev` | Start dev servers (Turborepo `dev` task) |
| `build` | `pnpm build` | Build all packages/apps (`dependsOn: ^build`) |
| `lint` | `pnpm lint` | Lint across the monorepo |
| `format` | `pnpm format` | Format across the monorepo |
| `clean` | `pnpm clean` | Remove build artifacts |

## License

Private — internal use.
