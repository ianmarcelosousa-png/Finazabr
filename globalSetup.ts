import "dotenv/config";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { TEST_SCHEMA, withSchema } from "./helpers/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, "..");

/**
 * Roda uma vez antes de toda a suíte: recria o schema de teste do zero e
 * aplica as migrations reais (`migrate deploy`, não `db push`), para que os
 * testes validem exatamente o SQL que roda em produção — inclusive as
 * políticas de Row Level Security, que vivem numa migration.
 */
export default async function globalSetup() {
  const ownerUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!ownerUrl) {
    throw new Error(
      "DIRECT_URL (ou DATABASE_URL) não definido. Ver server/docs/supabase-setup.md."
    );
  }

  // O DDL precisa do owner: `app_user` não tem permissão para criar schema.
  const admin = new PrismaClient({ datasources: { db: { url: ownerUrl } } });

  try {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${TEST_SCHEMA}"`);
  } finally {
    await admin.$disconnect();
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: serverDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: withSchema(ownerUrl),
      DIRECT_URL: withSchema(ownerUrl),
    },
    shell: process.platform === "win32",
  });
}
