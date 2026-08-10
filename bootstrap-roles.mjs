import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Cria (ou atualiza a senha de) os roles `app_user` e `app_system` no Postgres
 * do Supabase — o passo 2 de docs/supabase-setup.md, automatizado.
 *
 * Roda uma única vez por projeto Supabase. Idempotente: pode ser executado de
 * novo sem erro, útil se as senhas em .env forem regeneradas.
 */

const ownerUrl = process.env.DIRECT_URL;
const appUserUrl = process.env.DATABASE_URL;
const appSystemUrl = process.env.SYSTEM_DATABASE_URL;

if (!ownerUrl || !appUserUrl || !appSystemUrl) {
  throw new Error("DIRECT_URL, DATABASE_URL e SYSTEM_DATABASE_URL precisam estar definidos em server/.env");
}

function extractPassword(url) {
  return new URL(url).password;
}

const appUserPassword = extractPassword(appUserUrl);
const appSystemPassword = extractPassword(appSystemUrl);

const admin = new PrismaClient({ datasources: { db: { url: ownerUrl } } });

async function upsertRole(name, password) {
  await admin.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${name}') THEN
        ALTER ROLE ${name} WITH LOGIN PASSWORD '${password}' NOBYPASSRLS;
      ELSE
        CREATE ROLE ${name} LOGIN PASSWORD '${password}' NOBYPASSRLS;
      END IF;
    END
    $$;
  `);
  console.log(`[bootstrap] role ${name} pronto`);
}

try {
  await upsertRole("app_user", appUserPassword);
  await upsertRole("app_system", appSystemPassword);
  await admin.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS finance_test`);
  console.log("[bootstrap] schema finance_test pronto");
} finally {
  await admin.$disconnect();
}
