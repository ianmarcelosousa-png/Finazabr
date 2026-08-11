import { ParseError, type ParseResult, type ParsedTransaction } from "./types.js";
import { isRealDate, parseAmountToCents, parseStatementDate } from "./values.js";

/**
 * Parser de extrato em PDF — best-effort, como o próprio requisito admite
 * ("PDF, quando o arquivo possuir informações legíveis").
 *
 * Funciona com PDFs de texto (os que os bancos geram). PDFs que são apenas uma
 * imagem escaneada não têm texto para extrair e falham com uma mensagem clara
 * em vez de importar lixo — importar dado errado é pior do que não importar.
 *
 * A heurística é: em cada linha, achar uma data no início, um valor monetário
 * no fim, e tratar o miolo como descrição. É o layout de praticamente todo
 * extrato impresso.
 */

const LINE_PATTERN =
  /^\s*(\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\s+(.+?)\s+(-?R?\$?\s*[\d.]+,\d{2}-?|\(\s*R?\$?\s*[\d.]+,\d{2}\s*\))\s*$/;

/** Termos que marcam linhas de totalização, não de movimentação. */
const IGNORED_LINE = /^(SALDO|TOTAL|SUBTOTAL|EXTRATO|PERIODO|AGENCIA|CONTA|CLIENTE|PAGINA)/i;

async function extractText(buffer: Buffer): Promise<string> {
  // Import dinâmico: a lib só é carregada quando alguém realmente envia um PDF,
  // e o servidor sobe mesmo que ela não esteja instalada.
  const { default: pdfParse } = (await import("pdf-parse")) as unknown as {
    default: (data: Buffer) => Promise<{ text: string }>;
  };

  const result = await pdfParse(buffer);
  return result.text ?? "";
}

/**
 * O ano pode não aparecer na linha (extratos costumam imprimir só "05/08").
 * Nesse caso usamos o ano de referência do arquivo, extraído do cabeçalho, e
 * caímos no ano corrente se nem isso existir.
 */
function inferYear(text: string): number {
  const match = text.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : new Date().getUTCFullYear();
}

export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  let text: string;
  try {
    text = await extractText(buffer);
  } catch {
    throw new ParseError(
      "Não conseguimos ler este PDF. Se ele for um documento escaneado, exporte o extrato em CSV ou OFX."
    );
  }

  if (text.trim().length < 20) {
    throw new ParseError(
      "Este PDF não contém texto legível (provavelmente é uma imagem escaneada). Exporte o extrato em CSV ou OFX."
    );
  }

  const fallbackYear = inferYear(text);
  const transactions: ParsedTransaction[] = [];
  let skippedLines = 0;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || IGNORED_LINE.test(trimmed)) continue;

    const match = trimmed.match(LINE_PATTERN);
    if (!match) continue;

    try {
      const [, rawDate, rawDescription, rawAmount] = match;

      const hasYear = /[/.-]\d{2,4}$/.test(rawDate) && rawDate.split(/[/.-]/).length === 3;
      const date = parseStatementDate(hasYear ? rawDate : `${rawDate}/${fallbackYear}`);
      if (!isRealDate(date)) {
        skippedLines += 1;
        continue;
      }

      const cents = parseAmountToCents(rawAmount);
      if (cents === 0) {
        skippedLines += 1;
        continue;
      }

      const description = rawDescription.replace(/\s+/g, " ").trim();

      transactions.push({
        date,
        description: (description || "Movimentação sem descrição").slice(0, 200),
        amountCents: Math.abs(cents),
        direction: cents > 0 ? "in" : "out",
      });
    } catch {
      skippedLines += 1;
    }
  }

  if (transactions.length === 0) {
    throw new ParseError(
      "Não identificamos movimentações neste PDF. O layout pode não ser reconhecido — tente exportar em CSV ou OFX."
    );
  }

  return { transactions, skippedLines };
}
