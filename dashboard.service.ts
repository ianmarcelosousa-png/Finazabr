import type { Db } from "../lib/prisma.js";
import { monthRange } from "../lib/dates.js";
import { ensureMonthMaterialized } from "./recurrence.service.js";
import { getSettings } from "./settings.service.js";

export interface CategorySliceDto {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amountCents: number;
  /** Participação no total de despesas do mês, 0–100 com uma casa decimal. */
  percentage: number;
}

export interface DashboardSummaryDto {
  month: string;
  incomeCents: number;
  expenseCents: number;
  fixedExpenseCents: number;
  variableExpenseCents: number;
  balanceCents: number;
  investmentPercentage: number;
  investmentCents: number;
  /** Receita menos despesas menos a reserva de investimento. */
  availableCents: number;
  expensesByCategory: CategorySliceDto[];
  transactionCount: number;
}

/**
 * Todos os números do dashboard são calculados aqui, no servidor, a partir das
 * linhas reais do mês — o front-end só formata. Isso mantém uma única
 * definição de "receita do mês" para a tela, os relatórios e os testes.
 *
 * Somas em centavos (inteiro), então não existe erro de arredondamento de
 * ponto flutuante em dinheiro.
 */
export async function getDashboardSummary(
  db: Db,
  userId: string,
  month: string
): Promise<DashboardSummaryDto> {
  await ensureMonthMaterialized(db, userId, month);

  const { start, endExclusive } = monthRange(month);
  const dateFilter = { gte: start, lt: endExclusive };

  const [totalsByType, settings] = await Promise.all([
    db.transaction.groupBy({
      by: ["type"],
      where: { date: dateFilter, deletedAt: null },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    getSettings(db, userId),
  ]);

  const sumOf = (type: string): number =>
    totalsByType.find((t) => t.type === type)?._sum.amountCents ?? 0;

  const incomeCents = sumOf("income");
  const fixedExpenseCents = sumOf("fixed_expense");
  const variableExpenseCents = sumOf("variable_expense");
  const expenseCents = fixedExpenseCents + variableExpenseCents;
  const transactionCount = totalsByType.reduce((acc, t) => acc + t._count._all, 0);

  // Truncar (não arredondar) o valor a investir evita sugerir guardar um
  // centavo a mais do que a receita comporta.
  const investmentCents = Math.floor((incomeCents * settings.investmentPercentage) / 100);

  const grouped = await db.transaction.groupBy({
    by: ["categoryId"],
    where: {
      date: dateFilter,
      deletedAt: null,
      type: { in: ["fixed_expense", "variable_expense"] },
    },
    _sum: { amountCents: true },
  });

  const categories = await db.category.findMany({
    where: { id: { in: grouped.map((g) => g.categoryId) } },
  });
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const expensesByCategory: CategorySliceDto[] = grouped
    .map((g) => {
      const category = categoryById.get(g.categoryId);
      const amountCents = g._sum.amountCents ?? 0;
      return {
        categoryId: g.categoryId,
        name: category?.name ?? "Outros",
        color: category?.color ?? "#94a3b8",
        icon: category?.icon ?? "Package",
        amountCents,
        percentage:
          expenseCents === 0
            ? 0
            : Math.round((amountCents / expenseCents) * 1000) / 10,
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents);

  return {
    month,
    incomeCents,
    expenseCents,
    fixedExpenseCents,
    variableExpenseCents,
    balanceCents: incomeCents - expenseCents,
    investmentPercentage: settings.investmentPercentage,
    investmentCents,
    availableCents: incomeCents - expenseCents - investmentCents,
    expensesByCategory,
    transactionCount,
  };
}
