import { PrismaClient } from "@prisma/client";
import { withSchema } from "./schema.js";

/**
 * Cliente com o role owner, usado só para limpar as tabelas entre testes.
 *
 * A limpeza não pode usar o cliente da aplicação: ele roda sob RLS e, sem um
 * `app.current_user_id` definido, não enxerga linha nenhuma para apagar — que
 * é exatamente o comportamento que os testes querem provar.
 */
const ownerUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

export const ownerDb = new PrismaClient({
  datasources: { db: { url: withSchema(ownerUrl) } },
});

/**
 * A ordem respeita as chaves estrangeiras. `users` por último derruba o resto
 * em cascata, mas apagar explicitamente deixa a intenção visível e falha alto
 * se alguma tabela nova esquecer o `onDelete`.
 */
export async function resetDatabase(): Promise<void> {
  await ownerDb.importedTransaction.deleteMany();
  await ownerDb.importFile.deleteMany();
  await ownerDb.categorizationRule.deleteMany();
  await ownerDb.transaction.deleteMany();
  await ownerDb.recurringTransaction.deleteMany();
  await ownerDb.userSettings.deleteMany();
  await ownerDb.category.deleteMany();
  await ownerDb.passwordResetToken.deleteMany();
  await ownerDb.user.deleteMany();
}
