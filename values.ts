import { ParseError } from "./types.js";

/**
 * Converte um valor monetário de extrato brasileiro para centavos inteiros.
 *
 * Precisa aguentar as variações que os bancos realmente emitem:
 *   "1.234,56"  "1234.56"  "R$ 1.234,56"  "-45,90"  "45,90-"  "(45,90)"
 *
 * A conversão é feita por manipulação de string e `Math.round` sobre o total em
 * centavos — nunca acumulando float, que é o que faz 0,1 + 0,2 virar 0,30000004.
 */
export function parseAmountToCents(raw: string): number {
  let value = raw.trim();
  if (!value) throw new ParseError("Valor vazio");

  let negative = false;

  // Contabilidade escreve negativo entre parênteses; alguns bancos põem o
  // sinal no fim da string.
  if (value.startsWith("(") && value.endsWith(")")) {
    negative = true;
    value = value.slice(1, -1);
  }
  if (value.endsWith("-")) {
    negative = true;
    value = value.slice(0, -1);
  }
  if (value.startsWith("-")) {
    negative = true;
    value = value.slice(1);
  }
  if (value.startsWith("+")) {
    value = value.slice(1);
  }

  value = value.replace(/R\$/gi, "").replace(/\s/g, "").trim();

  if (!/^[\d.,]+$/.test(value)) {
    throw new ParseError(`Valor não reconhecido: "${raw}"`);
  }

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  // O separador decimal é o último que aparece: em "1.234,56" é a vírgula,
  // em "1,234.56" é o ponto. O outro é separador de milhar e some.
  let integerPart: string;
  let decimalPart: string;

  if (lastComma === -1 && lastDot === -1) {
    integerPart = value;
    decimalPart = "";
  } else {
    const separatorIndex = Math.max(lastComma, lastDot);
    const afterSeparator = value.slice(separatorIndex + 1);
    const separatorChar = value[separatorIndex];
    const otherChar = separatorChar === "," ? "." : ",";

    // Três dígitos depois do separador, sem nenhum separador do outro tipo
    // antes dele, significa milhar: "1.500" é mil e quinhentos, não 1,5.
    const isThousandsSeparator =
      afterSeparator.length === 3 && !value.slice(0, separatorIndex).includes(otherChar);

    if (isThousandsSeparator) {
      integerPart = value.replace(/[.,]/g, "");
      decimalPart = "";
    } else {
      integerPart = value.slice(0, separatorIndex).replace(/[.,]/g, "");
      decimalPart = afterSeparator.replace(/[.,]/g, "");
    }
  }

  if (decimalPart.length > 2) decimalPart = decimalPart.slice(0, 2);
  const cents = Number(integerPart || "0") * 100 + Number(decimalPart.padEnd(2, "0") || "0");

  if (!Number.isFinite(cents)) {
    throw new ParseError(`Valor não reconhecido: "${raw}"`);
  }

  return negative ? -cents : cents;
}

/**
 * Converte data de extrato para "AAAA-MM-DD".
 *
 * Aceita dd/mm/aaaa, dd-mm-aaaa, dd.mm.aa, aaaa-mm-dd e o AAAAMMDD do OFX.
 * Datas com ano de dois dígitos assumem 20xx — extrato de conta corrente não
 * retroage ao século passado.
 */
export function parseStatementDate(raw: string): string {
  const value = raw.trim();

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const compact = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  const br = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (br) {
    const day = br[1].padStart(2, "0");
    const month = br[2].padStart(2, "0");
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${month}-${day}`;
  }

  throw new ParseError(`Data não reconhecida: "${raw}"`);
}

/** Rejeita datas sintaticamente válidas mas impossíveis (31/02, mês 13). */
export function isRealDate(isoDate: string): boolean {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (month < 1 || month > 12) return false;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= lastDay;
}
