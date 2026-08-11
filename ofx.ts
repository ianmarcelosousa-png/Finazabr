import { ParseError, type ParseResult, type ParsedTransaction } from "./types.js";
import { isRealDate, parseAmountToCents, parseStatementDate } from "./values.js";

/**
 * Parser de OFX (Open Financial Exchange), o formato "exportar extrato" de
 * praticamente todo banco brasileiro.
 *
 * OFX 1.x é SGML, não XML: tags podem não ter fechamento e o cabeçalho não é
 * XML válido. Por isso um parser XML genérico quebra, e um extrator por
 * expressão regular sobre os blocos `<STMTTRN>` é mais robusto na prática do
 * que tentar validar o documento inteiro.
 *
 * O `FITID` é o identificador que o banco atribui à movimentação — é o sinal
 * mais forte que existe para não importar a mesma transação duas vezes.
 */

const TRANSACTION_BLOCK = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;

function readTag(block: string, tag: string): string | null {
  // Casa tanto `<MEMO>valor</MEMO>` quanto `<MEMO>valor` seguido de nova tag.
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  return match ? match[1].trim() : null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'");
}

export function parseOfx(content: string): ParseResult {
  if (!/<STMTTRN>/i.test(content)) {
    throw new ParseError(
      "Não encontramos movimentações neste arquivo OFX. Confira se o extrato foi exportado completo."
    );
  }

  const transactions: ParsedTransaction[] = [];
  let skippedLines = 0;

  for (const match of content.matchAll(TRANSACTION_BLOCK)) {
    const block = match[1];

    try {
      const rawDate = readTag(block, "DTPOSTED") ?? readTag(block, "DTUSER");
      const rawAmount = readTag(block, "TRNAMT");
      if (!rawDate || !rawAmount) {
        skippedLines += 1;
        continue;
      }

      const date = parseStatementDate(rawDate);
      if (!isRealDate(date)) {
        skippedLines += 1;
        continue;
      }

      const cents = parseAmountToCents(rawAmount);
      if (cents === 0) {
        skippedLines += 1;
        continue;
      }

      const description =
        decodeEntities(readTag(block, "MEMO") ?? readTag(block, "NAME") ?? "").trim() ||
        "Movimentação sem descrição";

      const fitId = readTag(block, "FITID");

      transactions.push({
        date,
        description: description.slice(0, 200),
        amountCents: Math.abs(cents),
        direction: cents > 0 ? "in" : "out",
        ...(fitId ? { externalId: `ofx:${fitId}` } : {}),
      });
    } catch {
      skippedLines += 1;
    }
  }

  if (transactions.length === 0) {
    throw new ParseError(
      "Nenhuma movimentação pôde ser lida deste arquivo OFX. Verifique se ele não está corrompido."
    );
  }

  return { transactions, skippedLines };
}
