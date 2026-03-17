import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";

  // Prisma 7 uses driver adapters. For Phase 1 (SQLite dev), we keep it simple:
  // DATABASE_URL="file:./dev.db" -> better-sqlite3 adapter.
  if (!url.startsWith("file:")) {
    throw new Error('Only SQLite is supported in Phase 1. Use DATABASE_URL="file:./dev.db".');
  }

  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
