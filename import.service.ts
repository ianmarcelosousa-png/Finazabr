import type { Category, ImportFile, ImportedTransaction } from "@prisma/client";
import type { Db } from "../lib/prisma.js";
import { Errors } from "../lib/errors.js";
import { formatDateOnly, parseDateOnly } from "../lib/dates.js";
import type { ImportFormat, SuggestionSource, TransactionType } from "../lib/domain.js";
import { classify } from "../lib/classification/classify.js";
import { normalizeDescription } from "../lib/classification/normalize.js";
import {
  FALLBACK_EXPENSE_CATEGORY,
  FALLBACK_INCOME_CATEGORY,
} from "../lib/defaultCategories.js";
import { detectFormat, parseStatement, ParseError } from "../lib/parsers/index.js";
import { findDuplicate } from "./duplicate.service.js";
import type {
  ConfirmImportInput,
  UpdateImportRowInput,
} from "../validators/import.validators.js";

export interface ImportRowDto {
  id: string;
  date: string;
  rawDescription: string;
  description: string;
  amountCents: number;
  direction: "in" | "out";
  type: TransactionType;
  categoryId: string | null;
  selected: boolean;
  status: string;
  suggestionSource: SuggestionSource | null;
  duplicateOfId: string | null;
  duplicateScore: number | null;
  duplicateAction: string | null;
}

export interface ImportFileDto {
  id: string;
  filename: string;
  format: ImportFormat;
  status: string;
  totalRows: number;
  importedCount: number;
  createdAt: string;
}

export interface ImportDetailDto extends ImportFileDto {
  rows: ImportRowDto[];
  duplicateCount: number;
}

function toRowDto(row: ImportedTransaction): ImportRowDto {
  return {
    id: row.id,
    date: formatDateOnly(row.date),
    rawDescription: row.rawDescription,
    description: row.description,
    amountCents: row.amountCents,
    direction: row.direction as "in" | "out",
    type: row.type as TransactionType,
    categoryId: row.categoryId,
    selected: row.selected,
    status: row.status,
    suggestionSource: row.suggestionSource as SuggestionSource | null,
    duplicateOfId: row.duplicateOfId,
    duplicateScore: row.duplicateScore,
    duplicateAction: row.duplicateAction,
  };
}

function toFileDto(file: ImportFile): ImportFileDto {
  return {
    id: file.id,
    filename: file.filename,
    format: file.format as ImportFormat,
    status: file.status,
    totalRows: file.totalRows,
    importedCount: file.importedCount,
    createdAt: file.createdAt.toISOString(),
  };
}

/**
 * Lê o extrato, classifica cada movimentação e grava tudo na área de staging.
 *
 * Nada aqui vira lançamento do usuário: `imported_transactions` é uma tabela
 * separada justamente para que a conferência (§14) seja obrigatória. Só o
 * `confirmImport` promove linhas para `transactions`.
 */
export async function createImport(
  db: Db,
  userId: string,
  file: { originalname: string; buffer: Buffer; size: number }
): Promise<ImportDetailDto> {
  let format: ImportFormat;
  let parsed;

  try {
    format = detectFormat(file.originalname, file.buffer);
    parsed = await parseStatement(format, file.buffer);
  } catch (err) {
    if (err instanceof ParseError) throw Errors.badRequest(err.message);
    throw err;
  }

  const categories = await db.category.findMany();
  const rules = await db.categorizationRule.findMany({ include: { category: true } });

  const fallback = {
    income:
      categories.find((c) => c.type === "income" && c.name === FALLBACK_INCOME_CATEGORY) ??
      categories.find((c) => c.type === "income") ??
      null,
    expense:
      categories.find((c) => c.type === "expense" && c.name === FALLBACK_EXPENSE_CATEGORY) ??
      categories.find((c) => c.type === "expense") ??
      null,
  };

  const importFile = await db.importFile.create({
    data: {
      userId,
      filename: file.originalname.slice(0, 255),
      format,
      sizeBytes: file.size,
      totalRows: parsed.transactions.length,
      status: "pending",
    },
  });

  for (const item of parsed.transactions) {
    const suggestion = classify(
      { description: item.description, direction: item.direction },
      rules,
      categories,
      fallback
    );

    const duplicate = await findDuplicate(db, item);

    await db.importedTransaction.create({
      data: {
        userId,
        importFileId: importFile.id,
        date: parseDateOnly(item.date),
        rawDescription: item.description,
        description: item.description,
        amountCents: item.amountCents,
        direction: item.direction,
        // Despesa vinda de extrato entra como variável: o usuário promove a
        // fixa manualmente se for o caso, e é mais seguro errar para o lado
        // que não cria uma recorrência indevida.
        type: item.direction === "in" ? "income" : "variable_expense",
        categoryId: suggestion.categoryId,
        externalId: item.externalId ?? null,
        suggestionSource: suggestion.source,
        // Linha já existente vem desmarcada por padrão — o caminho de menor
        // esforço tem que ser o que não duplica o lançamento.
        selected: !duplicate,
        duplicateOfId: duplicate?.transactionId ?? null,
        duplicateScore: duplicate?.score ?? null,
        duplicateAction: duplicate ? "ignore" : null,
      },
    });
  }

  return getImport(db, importFile.id);
}

export async function listImports(db: Db): Promise<ImportFileDto[]> {
  const files = await db.importFile.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return files.map(toFileDto);
}

export async function getImport(db: Db, id: string): Promise<ImportDetailDto> {
  const file = await db.importFile.findUnique({ where: { id } });
  if (!file) throw Errors.notFound("Importação não encontrada");

  const rows = await db.importedTransaction.findMany({
    where: { importFileId: id },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return {
    ...toFileDto(file),
    rows: rows.map(toRowDto),
    duplicateCount: rows.filter((row) => row.duplicateOfId).length,
  };
}

export async function updateImportRow(
  db: Db,
  importId: string,
  rowId: string,
  input: UpdateImportRowInput
): Promise<ImportRowDto> {
  const row = await db.importedTransaction.findFirst({
    where: { id: rowId, importFileId: importId },
  });
  if (!row) throw Errors.notFound("Movimentação não encontrada nesta importação");
  if (row.status !== "pending") {
    throw Errors.conflict("Esta movimentação já foi processada.");
  }

  if (input.categoryId) {
    const category = await db.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw Errors.notFound("Categoria não encontrada");

    const nextType = input.type ?? (row.type as TransactionType);
    const expected = nextType === "income" ? "income" : "expense";
    if (category.type !== expected) {
      throw Errors.badRequest(
        expected === "income"
          ? "Escolha uma categoria de receita para esta movimentação."
          : "Escolha uma categoria de despesa para esta movimentação."
      );
    }
  }

  // Escolher "importar mesmo assim" ou "substituir" implica que a linha entra;
  // "ignorar" implica que não. Manter os dois campos coerentes evita o estado
  // confuso de uma linha marcada como ignorada mas ainda selecionada.
  const selectedFromAction =
    input.duplicateAction === undefined || input.duplicateAction === null
      ? undefined
      : input.duplicateAction === "ignore"
        ? false
        : true;

  const updated = await db.importedTransaction.update({
    where: { id: rowId },
    data: {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.date !== undefined ? { date: parseDateOnly(input.date) } : {}),
      ...(input.duplicateAction !== undefined
        ? { duplicateAction: input.duplicateAction }
        : {}),
      ...(input.selected !== undefined
        ? { selected: input.selected }
        : selectedFromAction !== undefined
          ? { selected: selectedFromAction }
          : {}),
    },
  });

  return toRowDto(updated);
}

export interface ConfirmImportResult {
  imported: number;
  merged: number;
  ignored: number;
  rulesLearned: number;
}

/**
 * Promove as linhas selecionadas para lançamentos reais e aprende com as
 * correções de categoria (§15).
 *
 * Roda inteira dentro da transação do request: ou todas as linhas entram, ou
 * nenhuma entra — nunca metade de um extrato importado.
 */
export async function confirmImport(
  db: Db,
  userId: string,
  importId: string,
  input: ConfirmImportInput
): Promise<ConfirmImportResult> {
  const file = await db.importFile.findUnique({ where: { id: importId } });
  if (!file) throw Errors.notFound("Importação não encontrada");
  if (file.status === "confirmed") {
    throw Errors.conflict("Esta importação já foi confirmada.");
  }

  const rows = await db.importedTransaction.findMany({
    where: { importFileId: importId, status: "pending" },
  });

  let imported = 0;
  let merged = 0;
  let ignored = 0;
  const learnedPatterns = new Map<string, string>();

  for (const row of rows) {
    if (!row.selected || row.duplicateAction === "ignore") {
      await db.importedTransaction.update({
        where: { id: row.id },
        data: { status: "ignored" },
      });
      ignored += 1;
      continue;
    }

    if (!row.categoryId) {
      throw Errors.badRequest(
        `Escolha uma categoria para "${row.description}" antes de confirmar.`
      );
    }

    if (row.duplicateAction === "merge" && row.duplicateOfId) {
      // Substituir/mesclar: o lançamento que já existia passa a refletir o que
      // o banco registrou de fato, e fica marcado como vindo do extrato.
      const target = await db.transaction.findFirst({
        where: { id: row.duplicateOfId, deletedAt: null },
      });

      if (target) {
        await db.transaction.update({
          where: { id: target.id },
          data: {
            description: row.description,
            amountCents: row.amountCents,
            date: row.date,
            categoryId: row.categoryId,
            type: row.type,
            source: "import",
            importFileId: importId,
            externalId: row.externalId,
          },
        });

        await db.importedTransaction.update({
          where: { id: row.id },
          data: { status: "imported" },
        });

        merged += 1;
        if (input.learnCategories) {
          learnedPatterns.set(normalizeDescription(row.rawDescription), row.categoryId);
        }
        continue;
      }
    }

    await db.transaction.create({
      data: {
        userId,
        categoryId: row.categoryId,
        description: row.description,
        amountCents: row.amountCents,
        type: row.type,
        date: row.date,
        source: "import",
        importFileId: importId,
        externalId: row.externalId,
      },
    });

    await db.importedTransaction.update({
      where: { id: row.id },
      data: { status: "imported" },
    });

    imported += 1;
    if (input.learnCategories) {
      learnedPatterns.set(normalizeDescription(row.rawDescription), row.categoryId);
    }
  }

  let rulesLearned = 0;
  for (const [pattern, categoryId] of learnedPatterns) {
    if (!pattern) continue;

    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) continue;

    await db.categorizationRule.upsert({
      where: { userId_pattern: { userId, pattern } },
      update: { categoryId, type: category.type, hitCount: { increment: 1 }, source: "user" },
      create: { userId, pattern, categoryId, type: category.type, source: "user" },
    });
    rulesLearned += 1;
  }

  await db.importFile.update({
    where: { id: importId },
    data: { status: "confirmed", importedCount: imported + merged },
  });

  return { imported, merged, ignored, rulesLearned };
}

export async function discardImport(db: Db, id: string): Promise<void> {
  const file = await db.importFile.findUnique({ where: { id } });
  if (!file) throw Errors.notFound("Importação não encontrada");

  if (file.status === "confirmed") {
    throw Errors.conflict(
      "Esta importação já foi confirmada. Exclua os lançamentos individualmente se necessário."
    );
  }

  // As linhas de staging caem junto (onDelete: Cascade no schema).
  await db.importFile.delete({ where: { id } });
}

export interface RuleDto {
  id: string;
  pattern: string;
  categoryId: string;
  categoryName: string;
  hitCount: number;
  createdAt: string;
}

export async function listRules(db: Db): Promise<RuleDto[]> {
  const rules = await db.categorizationRule.findMany({
    include: { category: true },
    orderBy: [{ hitCount: "desc" }, { pattern: "asc" }],
  });

  return rules.map((rule) => ({
    id: rule.id,
    pattern: rule.pattern,
    categoryId: rule.categoryId,
    categoryName: (rule as typeof rule & { category: Category }).category.name,
    hitCount: rule.hitCount,
    createdAt: rule.createdAt.toISOString(),
  }));
}

export async function deleteRule(db: Db, id: string): Promise<void> {
  const rule = await db.categorizationRule.findUnique({ where: { id } });
  if (!rule) throw Errors.notFound("Regra não encontrada");
  await db.categorizationRule.delete({ where: { id } });
}
