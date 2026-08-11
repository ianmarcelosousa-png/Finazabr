import type { ImportFormat } from "../domain.js";
import { parseCsv } from "./csv.js";
import { parseOfx } from "./ofx.js";
import { parsePdf } from "./pdf.js";
import { ParseError, type ParseResult } from "./types.js";

export { ParseError };
export type { ParseResult, ParsedTransaction } from "./types.js";

/**
 * Detecta o formato pelo **conteúdo**, não pela extensão nem pelo mimetype que
 * o navegador declarou — os dois são controlados pelo cliente e não merecem
 * confiança (§21). A extensão só serve como desempate quando o conteúdo é
 * ambíguo.
 */
export function detectFormat(filename: string, buffer: Buffer): ImportFormat {
  const head = buffer.subarray(0, 2048).toString("latin1");

  if (head.startsWith("%PDF-")) return "pdf";
  if (/OFXHEADER|<OFX>|<STMTTRN>/i.test(head)) return "ofx";

  const extension = filename.toLowerCase().split(".").pop() ?? "";
  if (extension === "pdf") {
    throw new ParseError("O arquivo tem extensão .pdf mas não é um PDF válido.");
  }
  if (extension === "ofx" || extension === "qfx") {
    throw new ParseError("O arquivo tem extensão .ofx mas não contém movimentações OFX.");
  }

  return "csv";
}

export async function parseStatement(
  format: ImportFormat,
  buffer: Buffer
): Promise<ParseResult> {
  if (format === "pdf") return parsePdf(buffer);

  // Extratos brasileiros ainda saem em latin1 com frequência. Detectamos o
  // caractere de substituição (U+FFFD) que o decodificador UTF-8 produz em
  // bytes inválidos e refazemos a leitura — sem isso, "Alimentação" chega
  // como "Alimenta��o" e envenena a chave de classificação.
  const utf8 = buffer.toString("utf8");
  const content = utf8.includes("�") ? buffer.toString("latin1") : utf8;

  return format === "ofx" ? parseOfx(content) : parseCsv(content);
}
