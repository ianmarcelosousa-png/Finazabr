/**
 * Formato único que todos os parsers produzem. O resto do fluxo (classificação,
 * duplicidade, staging) não sabe se o dado veio de CSV, OFX ou PDF.
 */
export interface ParsedTransaction {
  /** "AAAA-MM-DD". */
  date: string;
  /** Descrição crua, exatamente como o banco escreveu. */
  description: string;
  /** Sempre positivo — o sinal vira `direction`. */
  amountCents: number;
  direction: "in" | "out";
  /** Identificador do banco (FITID no OFX). Ausente em CSV/PDF. */
  externalId?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  /** Linhas que o parser reconheceu como dados mas não conseguiu interpretar. */
  skippedLines: number;
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}
