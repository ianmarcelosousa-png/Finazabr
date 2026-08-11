import { afterAll, beforeEach } from "vitest";
import { ownerDb, resetDatabase } from "./helpers/db.js";
import { disconnectPrisma } from "../src/lib/prisma.js";

/** Isola cada teste: zera todas as tabelas antes de rodar. */
beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await Promise.all([ownerDb.$disconnect(), disconnectPrisma()]);
});
