import { config } from "dotenv";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 6+ does not auto-load .env when prisma.config.ts is present.
// packages/db/.env first (optional local defaults); root .env wins (Supabase, shared DATABASE_URL).
config({ path: path.join(__dirname, ".env") });
config({ path: path.join(__dirname, "..", "..", ".env"), override: true });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Use process.env directly so `prisma generate` doesn't fail when
    // DATABASE_URL is not set (e.g. during Docker builds).
    // Prisma falls back to env("DATABASE_URL") in schema.prisma when needed.
    url: process.env.DATABASE_URL ?? "",
  },
});
