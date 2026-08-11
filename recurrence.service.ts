import type { RecurringTransaction } from "@prisma/client";
import type { Db } from "../lib/prisma.js";
import { Errors } from "../lib/errors.js";
import { currentMonth, occurrenceDate } from "../lib/dates.js";
import type { RecurringType } from "../lib/domain.js";
import { assertCategoryMatchesType } from "./category.service.js";
import type {
  CreateRecurringInput,
  ListRecurringQuery,
  UpdateRecurringInput,
} from "../validators/recurring.validators.js";

export interface RecurringDto {
  id: string;
  type: RecurringType;
  description: string;
  amountCents: number;
  categoryId: string;
  dayOfMonth: number;
  startMonth: string;
  endMonth: string | null;
  active: boolean;
}

export function toRecurringDto(item: RecurringTransaction): RecurringDto {
  return {
    id: item.id,
    type: item.type as RecurringType,
    description: item.description,
    amountCents: item.amountCents,
    categoryId: item.categoryId,
    dayOfMonth: item.dayOfMonth,
    startMonth: item.startMonth,
    endMonth: item.endMonth,
    active: item.active,
  };
}

/**
 * Materializa as ocorrências das recorrências ativas para um mês.
 *
 * Chamada antes de qualquer leitura de lançamentos daquele mês, o que faz a
 * projeção acontecer sozinha ao navegar para setembro sem o usuário cadastrar
 * nada de novo (§5 e §6).
 *
 * É idempotente: o índice único `(recurring_transaction_id, occurrence_month)`
 * combinado com `skipDuplicates` garante que rodar mil vezes produz o mesmo
 * resultado de rodar uma. E como a exclusão de uma ocorrência é *soft delete*,
 * a linha continua ocupando o slot do índice — apagar "Aluguel de agosto" é
 * definitivo, o sistema não a recria no próximo carregamento.
 */
export async function ensureMonthMaterialized(
  db: Db,
  userId: string,
  month: string
): Promise<void> {
  const recurrences = await db.recurringTransaction.findMany({
    where: {
      active: true,
      startMonth: { lte: month },
      OR: [{ endMonth: null }, { endMonth: { gte: month } }],
    },
  });

  if (recurrences.length === 0) return;

  await db.transaction.createMany({
    data: recurrences.map((r) => ({
      userId,
      categoryId: r.categoryId,
      description: r.description,
      amountCents: r.amountCents,
      type: r.type,
      date: occurrenceDate(month, r.dayOfMonth),
      source: "recurring",
      recurringTransactionId: r.id,
      occurrenceMonth: month,
    })),
    skipDuplicates: true,
  });
}

export async function listRecurring(
  db: Db,
  query: ListRecurringQuery
): Promise<RecurringDto[]> {
  const items = await db.recurringTransaction.findMany({
    where: {
      ...(query.type ? { type: query.type } : {}),
      ...(query.active === undefined ? {} : { active: query.active }),
    },
    orderBy: [{ type: "asc" }, { dayOfMonth: "asc" }],
  });
  return items.map(toRecurringDto);
}

export async function createRecurring(
  db: Db,
  userId: string,
  input: CreateRecurringInput
): Promise<RecurringDto> {
  await assertCategoryMatchesType(db, input.categoryId, input.type);

  const created = await db.recurringTransaction.create({
    data: {
      userId,
      type: input.type,
      description: input.description,
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      dayOfMonth: input.dayOfMonth,
      startMonth: input.startMonth,
      endMonth: input.endMonth ?? null,
      active: input.active,
    },
  });

  // Materializa já o mês corrente (se estiver dentro da vigência), para que a
  // despesa apareça no dashboard imediatamente após o cadastro.
  const now = currentMonth();
  if (created.active && created.startMonth <= now && (!created.endMonth || created.endMonth >= now)) {
    await ensureMonthMaterialized(db, userId, now);
  }

  return toRecurringDto(created);
}

async function requireRecurring(db: Db, id: string): Promise<RecurringTransaction> {
  const item = await db.recurringTransaction.findUnique({ where: { id } });
  if (!item) throw Errors.notFound("Recorrência não encontrada");
  return item;
}

/**
 * Alterar a recorrência propaga para as ocorrências **deste mês em diante** —
 * é o que o usuário espera ao corrigir o valor do aluguel: os meses fechados
 * ficam como estavam (histórico), o mês corrente e os futuros acompanham.
 */
export async function updateRecurring(
  db: Db,
  id: string,
  input: UpdateRecurringInput
): Promise<RecurringDto> {
  const existing = await requireRecurring(db, id);

  if (input.categoryId) {
    await assertCategoryMatchesType(db, input.categoryId, existing.type as RecurringType);
  }

  const updated = await db.recurringTransaction.update({
    where: { id },
    data: {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.dayOfMonth !== undefined ? { dayOfMonth: input.dayOfMonth } : {}),
      ...(input.endMonth !== undefined ? { endMonth: input.endMonth } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });

  const from = currentMonth();

  if (updated.active) {
    const futureOccurrences = await db.transaction.findMany({
      where: {
        recurringTransactionId: id,
        occurrenceMonth: { gte: from },
        deletedAt: null,
      },
      select: { id: true, occurrenceMonth: true },
    });

    for (const occurrence of futureOccurrences) {
      await db.transaction.update({
        where: { id: occurrence.id },
        data: {
          description: updated.description,
          amountCents: updated.amountCents,
          categoryId: updated.categoryId,
          date: occurrenceDate(occurrence.occurrenceMonth!, updated.dayOfMonth),
        },
      });
    }
  } else {
    // Desativar remove as projeções futuras, mas nunca o que já foi realizado.
    await db.transaction.updateMany({
      where: {
        recurringTransactionId: id,
        occurrenceMonth: { gte: from },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }

  return toRecurringDto(updated);
}

/**
 * Excluir a recorrência apaga as projeções deste mês em diante e preserva o
 * histórico dos meses anteriores — o aluguel que você pagou em julho continua
 * no relatório de julho.
 */
export async function deleteRecurring(db: Db, id: string): Promise<void> {
  await requireRecurring(db, id);
  const from = currentMonth();

  await db.transaction.updateMany({
    where: { recurringTransactionId: id, occurrenceMonth: { gte: from }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  // As ocorrências passadas ficam, com `recurringTransactionId` virando null
  // (onDelete: SetNull no schema) — viram lançamentos históricos comuns.
  await db.recurringTransaction.delete({ where: { id } });
}
