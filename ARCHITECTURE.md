# E-commerce Product Catalog

## Stack
- Monorepo: Turborepo + pnpm
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Backend: Fastify + TypeScript
- Database: PostgreSQL (Supabase) with Prisma ORM
- Cache: Redis (Upstash)
- Search: PostgreSQL Full-Text Search (tsvector + pg_trgm)
- Validation: Zod
- Deployment: Vercel (frontend) + Render Docker (API); local Postgres/Redis via Docker Compose

## Code Style
- Use TypeScript strict mode
- Prefer functional components and hooks
- Use Zod for all input validation
- Use Prisma for DB queries (no raw SQL unless necessary for FTS)
- Error handling: throw typed errors, catch in error middleware
- Naming: camelCase for variables, PascalCase for components/types
- Use named exports, avoid default exports (except Next.js pages)

## Architecture Rules
- API routes in apps/api/src/routes/
- Business logic in apps/api/src/services/
- Shared types in packages/shared-types/
- DB schema in packages/db/prisma/schema.prisma
- React components: one component per file, co-locate styles
- Always use absolute imports (@/...)

## Performance Rules
- Cache search results in Redis (5 min TTL)
- Use cursor-based pagination for infinite scroll
- Use offset pagination for page-based UI
- Always add proper indexes for new query patterns
- Use Prisma select to limit fields

## Constraints (Free Tier Limits)
- Supabase: 500MB DB → keep schema lean
- Upstash Redis: 10K commands/day → cache aggressively
- Avoid N+1 queries → use Prisma include/select properly
