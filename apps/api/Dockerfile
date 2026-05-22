# Production API image for Render / Fly / Railway (Turborepo + pnpm monorepo).
# Build from repository root: docker build -t giga-shop-api -f apps/api/Dockerfile .

# -----------------------------------------------------------------------------
# Stage 1: deps — install workspace dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@9.15.6 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/db/prisma/schema.prisma packages/db/prisma/

RUN pnpm install --frozen-lockfile && \
    pnpm --filter @ecommerce/db prisma:generate

# -----------------------------------------------------------------------------
# Stage 2: builder — compile shared-types, db (Prisma), and api
# -----------------------------------------------------------------------------
FROM deps AS builder

COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm build --filter=@ecommerce/api...

# -----------------------------------------------------------------------------
# Stage 3: runtime — minimal image with compiled JS + Prisma client
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime

RUN apk add --no-cache dumb-init openssl

ENV NODE_ENV=production

WORKDIR /app

# Option A: node_modules + workspace package node_modules (pnpm symlinks → root .pnpm)
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=node:node /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=builder --chown=node:node /app/packages/db/node_modules ./packages/db/node_modules

COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/package.json

COPY --from=builder --chown=node:node /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder --chown=node:node /app/packages/shared-types/package.json ./packages/shared-types/package.json

COPY --from=builder --chown=node:node /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=node:node /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder --chown=node:node /app/packages/db/prisma ./packages/db/prisma

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/index.js"]
