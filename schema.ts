/**
 * Os testes rodam contra um SCHEMA separado do mesmo banco (`finance_test`),
 * nunca contra os dados de desenvolvimento. Em vez de pedir mais quatro
 * variáveis de ambiente, derivamos as URLs de teste das de produção trocando
 * só o parâmetro `schema`.
 *
 * Cada role continua sendo o mesmo de verdade — `app_user` nos testes é o
 * `app_user` de produção, com as mesmas restrições de RLS. É isso que faz
 * `rls.test.ts` provar algo: se ele passasse conectado como owner, não estaria
 * testando a trava, estaria testando nada.
 */
export const TEST_SCHEMA = "finance_test";

export function withSchema(url: string, schema = TEST_SCHEMA): string {
  const [base, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("schema", schema);
  return `${base}?${params.toString()}`;
}
