import { defineConfig } from "vitest/config";

/**
 * Testes de lógica pura: parsers de extrato, classificação, normalização,
 * datas e conversão de valores. Nenhum banco, nenhuma rede — rodam em
 * milissegundos e não dependem do Supabase estar configurado.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
