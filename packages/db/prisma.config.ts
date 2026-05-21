import { config } from "dotenv";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 6+ does not auto-load .env when prisma.config.ts is present.
config({ path: path.join(__dirname, ".env") });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
