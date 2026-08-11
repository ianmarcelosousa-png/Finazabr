import "dotenv/config";
import { withSchema } from "./helpers/schema.js";

/**
 * Roda ANTES de qualquer import de `src/` (é o primeiro `setupFile`), porque
 * `src/lib/env.ts` valida e congela as variáveis no momento em que é
 * carregado. Redirecionar aqui garante que nenhum teste toque no banco de
 * desenvolvimento por acidente.
 */
const appUrl = process.env.DATABASE_URL;

if (!appUrl) {
  throw new Error(
    "DATABASE_URL não definido. Copie server/.env.example para server/.env e configure o Supabase (ver docs/supabase-setup.md)."
  );
}

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = withSchema(appUrl);

if (process.env.SYSTEM_DATABASE_URL) {
  process.env.SYSTEM_DATABASE_URL = withSchema(process.env.SYSTEM_DATABASE_URL);
}
if (process.env.DIRECT_URL) {
  process.env.DIRECT_URL = withSchema(process.env.DIRECT_URL);
}

process.env.JWT_SECRET ??= "test-secret-value-with-at-least-32-characters";
process.env.JWT_EXPIRES_IN ??= "7d";
process.env.CLIENT_ORIGIN ??= "http://localhost:5173";
process.env.PORT ??= "4000";
