import type { Config } from "drizzle-kit";
export default {
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_nZLQkjIPMB32@ep-proud-tooth-b33m8r6k-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
} satisfies Config;