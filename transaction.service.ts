import { Prisma, type Transaction } from "@prisma/client";
import type { Db } from "../lib/prisma.js";
import { Errors } from "../lib/errors.js";
import { formatDateOnly, monthRange, parseDateOnly } from "../lib/dates.js";
import type { TransactionSource, TransactionType } from "../lib/domain.js";
import { assertCategoryMatchesType } from "./category.service.js";
import { ensureMonthMaterialized } from "./recurrence.service.js";
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from "../validators/transaction.validators.js";

/**
 * Status é derivado, não armazenado: um lançamento com data futura ainda é uma
 * previsão; com data até hoje, já aconteceu. Guardar isso numa coluna exigiria
 * um job diário para manter a verdade — derivar na leitura nunca fica velho.
 */
export type TransactionStatus = "previsto" | "realizado";

export interface TransactionDto {
  id: string;
  date: string;
  description: string;
  categoryId: string;
  type: TransactionType;
  amountCents: number;
  source: TransactionSource;
  status: TransactionStatus;
  recurringTransactionId: string | null;
  importFileId: string | null;
}

function statusOf(date: Date): TransactionStatus {
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  return date.getTime() > todayUtc ? "previsto" : "realizado";
}

export function toTransactionDto(transaction: Transaction): TransactionDto {
  return {
    id: transaction.id,
    date: formatDateOnly(transaction.date),
    description: transaction.description,
    categoryId: transaction.categoryId,
    type: transaction.type as TransactionType,
    amountCents: transaction.amountCents,
    source: transaction.source as TransactionSource,
    status: statusOf(transaction.date),
    recurringTransactionId: transaction.recurringTransactionId,
    importFileId: transaction.importFileId,
  };
}

const ORDER_BY: Record<
  ListTransactionsQuery["sort"],
  Prisma.TransactionOrderByWithRelationInput[]
> = {
  date_desc: [{ date: "desc" }, { createdAt: "desc" }],
  date_asc: [{ date: "asc" }, { createdAt: "asc" }],
  amount_desc: [{ amountCents: "desc" }],
  amount_asc: [{ amountCents: "asc" }],
  description_asc: [{ description: "asc" }],
};

function buildWhere(query: ListTransactionsQuery): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { deletedAt: null };

  if (query.from || query.to) {
    where.date = {
      ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
      ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
    };
  } else if (query.month) {
    const { start, endExclusive } = monthRange(query.month);
    where.date = { gte: start, lt: endExclusive };
  }

  if (query.type) where.type = query.type;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.source) where.source = query.source;

  if (query.search) {
    // `mode: insensitive` é do Postgres — busca sem diferenciar maiúsculas,
    // parametrizada pelo Prisma (nada de SQL montado por concatenação).
    where.description = { contains: query.search, mode: "insensitive" };
  }

  return where;
}

export interface TransactionListResult {
  items: TransactionDto[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listTransactions(
  db: Db,
  userId: string,
  query: ListTransactionsQuery
): Promise<TransactionListResult> {
  // Projetar as recorrências antes de ler é o que faz o mês seguinte já vir
  // preenchido sem nenhum cadastro adicional.
  if (query.month) {
    await ensureMonthMaterialized(db, userId, query.month);
  }

  const where = buildWhere(query);
  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: ORDER_BY[query.sort],
      skip,
      take: query.pageSize,
    }),
    db.transaction.count({ where }),
  ]);

  return {
    items: items.map(toTransactionDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getTransaction(db: Db, id: string): Promise<TransactionDto> {
  const transaction = await db.transaction.findFirst({ where: { id, deletedAt: null } });
  if (!transaction) throw Errors.notFound("Lançamento não encontrado");
  return toTransactionDto(transaction);
}

export async function createTransaction(
  db: Db,
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionDto> {
  await assertCategoryMatchesType(db, input.categoryId, input.type);

  const transaction = await db.transaction.create({
    data: {
      userId,
      categoryId: input.categoryId,
      description: input.description,
      amountCents: input.amountCents,
      type: input.type,
      date: parseDateOnly(input.date),
      source: "manual",
    },
  });

  return toTransactionDto(transaction);
}

/**
 * Editar uma ocorrência gerada por recorrência altera **apenas aquele mês**.
 * A regra mensal continua intacta — é o comportamento esperado para "neste mês
 * a conta de luz veio mais cara".
 */
export async function updateTransaction(
  db: Db,
  id: string,
  input: UpdateTransactionInput
): Promise<TransactionDto> {
  const existing = await db.transaction.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Lançamento não encontrado");

  const nextType = (input.type ?? existing.type) as TransactionType;
  const nextCategoryId = input.categoryId ?? existing.categoryId;

  // Revalida sempre que tipo OU categoria mudam: trocar só o tipo pode deixar
  // a categoria antiga incompatível.
  if (input.type !== undefined || input.categoryId !== undefined) {
    await assertCategoryMatchesType(db, nextCategoryId, nextType);
  }

  const transaction = await db.transaction.update({
    where: { id },
    data: {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.date !== undefined ? { date: parseDateOnly(input.date) } : {}),
    },
  });

  return toTransactionDto(transaction);
}

/**
 * Exclusão é lógica (`deletedAt`). Para ocorrências de recorrência isso é
 * obrigatório: a linha precisa continuar ocupando o índice único do mês para
 * que `ensureMonthMaterialized` não a recrie na próxima visita à tela.
 *
 * O `externalId` é liberado no mesmo passo — se o usuário apagou uma
 * movimentação importada, reimportar o extrato deve poder trazê-la de volta.
 */
export async function deleteTransaction(db: Db, id: string): Promise<void> {
  const existing = await db.transaction.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Lançamento não encontrado");

  await db.transaction.update({
    where: { id },
    data: { deletedAt: new Date(), externalId: null },
  });
}
