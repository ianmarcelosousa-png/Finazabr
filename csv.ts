import Papa from "papaparse";
import { stripAccents } from "../classification/normalize.js";
import { ParseError, type ParseResult, type ParsedTransaction } from "./types.js";
import { isRealDate, parseAmountToCents, parseStatementDate } from "./values.js";

/**
 * Parser de CSV de extrato. Não existe padrão: cada banco escolhe o
 * delimitador, o nome das colunas e se o valor vem numa coluna só (com sinal)
 * ou separado em crédito/débito. O parser descobre isso a partir do cabeçalho
 * em vez de exigir um layout fixo do usuário.
 */

/** Nomes de coluna já normalizados (sem acento, minúsculos). */
const HEADER_ALIASES = {
  date: ["data", "data lancamento", "data do lancamento", "data movimento", "dt", "date", "data compra", "data da compra"],
  description: [
    "descricao",
    "historico",
    "detalhes",
    "lancamento",
    "descricao lancamento",
    "estabelecimento",
    "memo",
    "description",
    "titulo",
  ],
  amount: ["valor", "valor r", "montante", "amount", "valor da transacao", "valor lancamento"],
  credit: ["credito", "entrada", "credit", "receitas"],
  debit: ["debito", "saida", "debit", "despesas"],
  type: ["tipo", "tipo lancamento", "d c", "dc", "natureza"],
} as const;

function normalizeHeader(header: string): string {
  return stripAccents(header)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findColumn(headers: string[], aliases: readonly string[]): number {
  const normalized = headers.map(normalizeHeader);

  const exact = normalized.findIndex((header) => aliases.includes(header));
  if (exact !== -1) return exact;

  // Fallback por prefixo: "data lancamento origem" ainda é a coluna de data.
  return normalized.findIndex((header) =>
    aliases.some((alias) => header.startsWith(alias) || alias.startsWith(header))
  );
}

/**
 * Descobre o delimitador contando ocorrências fora de aspas na primeira linha
 * não vazia. Ponto e vírgula é o padrão do Excel em português, então precisa
 * ser tratado como cidadão de primeira classe.
 */
function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  const candidates = [";", ",", "\t", "|"];

  let best = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

/**
 * Alguns bancos põem um cabeçalho de relatório antes da tabela ("Extrato de
 * conta corrente", "Período: ..."). Procura a primeira linha que realmente
 * parece o cabeçalho da tabela.
 */
function dropPreamble(rows: string[][]): string[][] {
  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map(normalizeHeader);
    const hasDate = normalized.some((cell) => HEADER_ALIASES.date.includes(cell as never));
    const hasMoney =
      normalized.some((cell) => HEADER_ALIASES.amount.includes(cell as never)) ||
      normalized.some((cell) => HEADER_ALIASES.credit.includes(cell as never)) ||
      normalized.some((cell) => HEADER_ALIASES.debit.includes(cell as never));
    return hasDate && hasMoney;
  });

  return headerIndex <= 0 ? rows : rows.slice(headerIndex);
}

export function parseCsv(content: string): ParseResult {
  const delimiter = detectDelimiter(content);
  const parsed = Papa.parse<string[]>(content.trim(), {
    delimiter,
    skipEmptyLines: "greedy",
  });

  const rows = dropPreamble((parsed.data ?? []).filter((row) => Array.isArray(row)));
  if (rows.length < 2) {
    throw new ParseError(
      "O arquivo CSV não tem linhas de movimentação além do cabeçalho."
    );
  }

  const headers = rows[0].map((cell) => String(cell ?? ""));
  const dateIndex = findColumn(headers, HEADER_ALIASES.date);
  const descriptionIndex = findColumn(headers, HEADER_ALIASES.description);
  const amountIndex = findColumn(headers, HEADER_ALIASES.amount);
  const creditIndex = findColumn(headers, HEADER_ALIASES.credit);
  const debitIndex = findColumn(headers, HEADER_ALIASES.debit);
  const typeIndex = findColumn(headers, HEADER_ALIASES.type);

  if (dateIndex === -1) {
    throw new ParseError(
      "Não encontramos a coluna de data no CSV. Renomeie-a para \"Data\" e tente de novo."
    );
  }
  if (amountIndex === -1 && creditIndex === -1 && debitIndex === -1) {
    throw new ParseError(
      "Não encontramos a coluna de valor no CSV. Renomeie-a para \"Valor\" e tente de novo."
    );
  }

  const transactions: ParsedTransaction[] = [];
  let skippedLines = 0;

  for (const row of rows.slice(1)) {
    try {
      const cell = (index: number): string =>
        index >= 0 && index < row.length ? String(row[index] ?? "").trim() : "";

      const rawDate = cell(dateIndex);
      if (!rawDate) {
        skippedLines += 1;
        continue;
      }

      const date = parseStatementDate(rawDate);
      if (!isRealDate(date)) {
        skippedLines += 1;
        continue;
      }

      let cents: number;
      if (amountIndex !== -1 && cell(amountIndex)) {
        cents = parseAmountToCents(cell(amountIndex));

        // Layout com coluna separada de D/C: o sinal vem de lá, não do número.
        const typeCell = stripAccents(cell(typeIndex)).toUpperCase();
        if (typeCell) {
          if (/^(D|DEBITO|SAIDA|DEB)$/.test(typeCell)) cents = -Math.abs(cents);
          if (/^(C|CREDITO|ENTRADA|CRED)$/.test(typeCell)) cents = Math.abs(cents);
        }
      } else {
        const credit = cell(creditIndex) ? parseAmountToCents(cell(creditIndex)) : 0;
        const debit = cell(debitIndex) ? parseAmountToCents(cell(debitIndex)) : 0;
        cents = Math.abs(credit) - Math.abs(debit);
      }

      // Linha de saldo, total ou separador — não é movimentação.
      if (cents === 0) {
        skippedLines += 1;
        continue;
      }

      const description = cell(descriptionIndex) || "Movimentação sem descrição";

      transactions.push({
        date,
        description: description.slice(0, 200),
        amountCents: Math.abs(cents),
        direction: cents > 0 ? "in" : "out",
      });
    } catch {
      skippedLines += 1;
    }
  }

  if (transactions.length === 0) {
    throw new ParseError(
      "Nenhuma movimentação pôde ser lida deste CSV. Confira o formato das colunas de data e valor."
    );
  }

  return { transactions, skippedLines };
}
