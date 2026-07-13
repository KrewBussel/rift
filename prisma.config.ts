import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

// Match Next.js env loading: .env.local wins, .env is the fallback.
// (dotenv never overrides already-set variables, so load .env.local first.)
dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
