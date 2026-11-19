import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 20_000,
    env: {
      // Integration tests need a Postgres: `docker compose up -d db` (see README).
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgres://ajaia:ajaia_dev_password@localhost:5432/ajaia",
      JWT_SECRET: process.env.JWT_SECRET ?? "test-secret-test-secret-test-secret",
    },
  },
});
