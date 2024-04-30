import { prismaClient } from "@prisma/client";

declare global {
  var prisma: prismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
