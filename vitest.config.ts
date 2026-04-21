import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";

// Load .env.test BEFORE any imports that might read process.env.
// This ensures the test DB URL is active when Prisma Client is instantiated.
loadEnv({ path: path.resolve(__dirname, ".env.test"), override: true });

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes("postgres")) {
  throw new Error(".env.test DATABASE_URL not loaded — refusing to run tests.");
}

// Stub out third-party credentials that route modules read at import time.
// These are never called during tests (we mock auth, never exercise email/S3
// happy paths), but their clients throw in constructors if given undefined.
process.env.RESEND_API_KEY ??= "re_test_placeholder";
process.env.AWS_REGION ??= "us-east-1";
process.env.AWS_ACCESS_KEY_ID ??= "test";
process.env.AWS_SECRET_ACCESS_KEY ??= "test";
process.env.S3_BUCKET_NAME ??= "test-bucket";
process.env.CRON_SECRET ??= "test-cron-secret";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Run tests serially — they share one DB and truncate between.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
