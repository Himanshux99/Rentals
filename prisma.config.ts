import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // migrations take an advisory lock, which Neon's pooled (-pooler) host can't hold: set DIRECT_URL there
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
