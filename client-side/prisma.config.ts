// Prisma 7 configuration
import "dotenv/config";
// import { defineConfig } from "prisma/config";
// Prisma does not provide a defineConfig function for TypeScript config files.
// If you want to use a TypeScript config, you can export a plain object instead.

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use direct connection for migrations (not pooler)
    url: process.env.DIRECT_URL,
  },
};
