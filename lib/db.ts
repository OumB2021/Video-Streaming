import { PrismaClient } from "@prisma/client";

// Ensure TypeScript recognizes the custom global variable
declare global {
  var prisma: PrismaClient | undefined;
}

// Singleton pattern for PrismaClient
export const db = global.prisma || new PrismaClient();

// In non-production environments, reuse the same Prisma client
if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}
