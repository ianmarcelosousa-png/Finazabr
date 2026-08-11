import type { Transaction } from "@prisma/client";
import type { Db } from "../lib/prisma.js";
import { daysBetween, parseDateOnly } from "../lib/dates.js";
import { normalizeDescription, similarity } from "../lib/classification/normalize.js";
import type { ParsedTransaction } from "../lib/parsers/index.js";

/** Janela de tolerância: o extrato costuma registrar o pagamento com atraso. */
const DATE_TOLERANCE_DAYS = 3;

/** Abaixo disso a semelhança é fraca demais para incomodar o usuário. */
const MIN_REPORTABLE_SCORE = 0.55;

export interface DuplicateMatch {
  transactionId: string;
  score: number;
}

/**
 * Procura, entre os lançamentos que o usuário já tem, um que provavelmente é a
 * mesma movimentação que veio no extrato (§16).
 *
 * A busca roda com a RLS ativa e sem nenhum filtro por usuário no código — o
 * banco já restringe as linhas visíveis ao dono da sessão. Comparar dados de
 * usuários diferentes é impossível aqui por construção, não por disciplina.
 *
 * Pontuação:
 *   - `externalId` (FITID do banco) igual        → 1.0, certeza
 *   - mesmo valor, mesma direção, data próxima   → 0.6 a 0.95 conforme a
 *     semelhança da descrição e a distância entre as datas
 *
 * O caso do §17 (salário projetado por recorrência vs. salário real do
 * extrato) cai naturalmente na segunda regra: a projeção é uma transação como
 * qualquer outra, então entra na comparação.
 */
export async function findDuplicate(
  db: Db,
  incoming: ParsedTransaction
): Promise<DuplicateMatch | null> {
  if (incoming.externalId) {
    const byExternalId = await db.transaction.findFirst({
      where: { externalId: incoming.externalId, deletedAt: null },
    });
    if (byExternalId) {
      return { transactionId: byExternalId.id, score: 1 };
    }
  }

  const incomingDate = parseDateOnly(incoming.date);
  const windowStart = new Date(incomingDate);
  windowStart.setUTCDate(windowStart.getUTCDate() - DATE_TOLERANCE_DAYS);
  const windowEnd = new Date(incomingDate);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + DATE_TOLERANCE_DAYS);

  const expectedTypes =
    incoming.direction === "in" ? ["income"] : ["fixed_expense", "variable_expense"];

  const candidates = await db.transaction.findMany({
    where: {
      deletedAt: null,
      amountCents: incoming.amountCents,
      type: { in: expectedTypes },
      date: { gte: windowStart, lte: windowEnd },
    },
    take: 20,
  });

  if (candidates.length === 0) return null;

  const incomingPattern = normalizeDescription(incoming.description);

  let best: { transaction: Transaction; score: number } | null = null;

  for (const candidate of candidates) {
    const descriptionScore = similarity(
      incomingPattern,
      normalizeDescription(candidate.description)
    );

    // Valor idêntico e data próxima já são um sinal forte por si sós: é raro
    // pagar exatamente o mesmo centavo duas vezes na mesma semana. A descrição
    // refina, mas não é o único voto — o extrato costuma escrever o nome do
    // estabelecimento de forma bem diferente do que o usuário digitou.
    const dayGap = daysBetween(incomingDate, candidate.date);
    const dateScore = 1 - dayGap / (DATE_TOLERANCE_DAYS + 1);
    const score = 0.55 + descriptionScore * 0.35 + dateScore * 0.1;

    if (!best || score > best.score) {
      best = { transaction: candidate, score };
    }
  }

  if (!best || best.score < MIN_REPORTABLE_SCORE) return null;

  return {
    transactionId: best.transaction.id,
    score: Math.round(Math.min(best.score, 0.99) * 100) / 100,
  };
}
