import { defineConfig } from "vitest/config";

/**
 * Testes de integração: sobem a API de verdade (supertest) contra o Postgres,
 * no schema `finance_test`. Exigem o `.env` configurado — ver
 * docs/supabase-setup.md.
 *
 * Os testes de lógica pura (parsers, classificação, datas, valores) rodam sem
 * banco nenhum, em `vitest.unit.config.ts`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["./tests/globalSetup.ts"],
    setupFiles: ["./tests/env.ts", "./tests/setup.ts"],
    fileParallelism: false,
    // bcrypt (custo 12) roda várias vezes em alguns testes, e cada query agora
    // atravessa a rede até o Supabase — os 5s padrão do Vitest não bastam.
    testTimeout: 40000,
    hookTimeout: 40000,
  },
});
