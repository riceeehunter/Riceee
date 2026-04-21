import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  // Let Prisma read DATABASE_URL from environment automatically.
  // Do NOT pass datasources manually — passing undefined crashes the build.
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}
