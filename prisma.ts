import { PrismaClient, type Prisma } from "@prisma/client";
import { env, systemDatabaseUrl } from "./env.js";

const logLevels: Prisma.LogLevel[] =
  env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

/**
 * Cliente da aplicação. Conecta com o role `app_user`, que não tem BYPASSRLS:
 * sem `app.current_user_id` definido na transação, as políticas de RLS fazem
 * toda query retornar zero linhas. É proposital — falhar fechado.
 *
 * Não exportado: acesso a dados de usuário só através de `runAsUser`.
 */
const prismaApp = new PrismaClient({ log: logLevels });

/**
 * Cliente de autenticação (role `app_system`). Enxerga apenas `users` e
 * `password_reset_tokens`. Usado exclusivamente por `auth.service.ts`, onde
 * ainda não existe um usuário autenticado para escopar.
 */
export const prismaSystem = new PrismaClient({
  log: logLevels,
  datasources: { db: { url: systemDatabaseUrl } },
});

/**
 * Handle de banco já escopado a um usuário. É um cliente de transação do
 * Prisma — todos os services de dados financeiros recebem isto e nunca
 * importam um cliente global.
 */
export type Db = Prisma.TransactionClient;

/**
 * Executa `fn` dentro de uma transação onde `app.current_user_id` está
 * definido, ativando as políticas de RLS para este usuário e apenas ele.
 *
 * `set_config(..., true)` é *local à transação*: quando ela termina, a conexão
 * volta ao pool sem o valor, então uma requisição nunca herda o usuário de
 * outra. O `userId` entra como parâmetro vinculado (nunca interpolado na
 * string SQL), o que também elimina a possibilidade de injeção aqui.
 *
 * Usar transação para toda operação, inclusive leitura, é o que torna o
 * `SET LOCAL` confiável com pool de conexões — e de quebra deixa qualquer
 * operação de múltiplos passos atômica por construção.
 */
export async function runAsUser<T>(
  userId: string,
  fn: (db: Db) => Promise<T>
): Promise<T> {
  return prismaApp.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    return fn(tx);
  });
}

/**
 * Só para testes e para o encerramento gracioso do processo — o código de
 * aplicação nunca deve tocar no cliente cru.
 */
export const _unsafeAppClient = prismaApp;

export async function disconnectPrisma(): Promise<void> {
  await Promise.all([prismaApp.$disconnect(), prismaSystem.$disconnect()]);
}
