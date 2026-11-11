import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

// The only Neon-specific line in the app: DB_DRIVER picks the driver, DATABASE_URL picks the host.
function create() {
  const connectionString = env.DATABASE_URL;
  const adapter = env.DB_DRIVER === "neon" ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Reuse one client across dev hot reloads.
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? create();
if (env.NODE_ENV !== "production") g.prisma = db;
