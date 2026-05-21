# @ecommerce/shared-types

Shared TypeScript types and Zod validation schemas for `apps/web` and `apps/api`.

Types are derived from the Prisma schema in `packages/db` (via `@prisma/client`). Input validation uses Zod (`SearchParams`, `Filters`, pagination).

## Usage

```typescript
import {
  searchRequestSchema,
  type SearchResult,
  type Product,
} from "@ecommerce/shared-types";

const params = searchRequestSchema.parse(req.query);
```

## Scripts

| Script | Description |
| --- | --- |
| `pnpm lint` | Typecheck (`tsc --noEmit`) |

Requires `@ecommerce/db` client to be generated (`pnpm --filter @ecommerce/db prisma:generate`).
