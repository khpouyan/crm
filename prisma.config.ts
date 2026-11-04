import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer auto-loads .env files; Node loads it natively.
process.loadEnvFile?.(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
