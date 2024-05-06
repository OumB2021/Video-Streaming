import { PrismaClient } from "@prisma/client";
import { env } from "./env";

// Ensure TypeScript recognizes the custom global variable
declare global {
  var prisma: PrismaClient | undefined;
}

// Singleton pattern for PrismaClient
export const db = global.prisma || new PrismaClient();

// In non-production environments, reuse the same Prisma client
if (env.NODE_ENV !== "production") {
  global.prisma = db;
}
