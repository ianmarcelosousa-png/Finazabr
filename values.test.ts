import { describe, expect, it } from "vitest";
import {
  isRealDate,
  parseAmountToCents,
  parseStatementDate,
} from "../../src/lib/parsers/values.js";
import { ParseError } from "../../src/lib/parsers/types.js";

describe("parseAmountToCents", () => {
  it("entende o formato brasileiro com separador de milhar", () => {
    expect(parseAmountToCents("1.234,56")).toBe(123456);
    expect(parseAmountToCents("1.234.567,89")).toBe(123456789);
  });

  it("entende o formato americano", () => {
    expect(parseAmountToCents("1,234.56")).toBe(123456);
    expect(parseAmountToCents("1234.56")).toBe(123456);
  });

  it("trata três dígitos após o separador como milhar, não decimal", () => {
    // "1.500" em extrato brasileiro é mil e quinhentos, não um e meio.
    expect(parseAmountToCents("1.500")).toBe(150000);
    expect(parseAmountToCents("12.345.678")).toBe(1234567800);
  });

  it("reconhece as três formas de escrever negativo", () => {
    expect(parseAmountToCents("-45,90")).toBe(-4590);
    expect(parseAmountToCents("45,90-")).toBe(-4590);
    expect(parseAmountToCents("(45,90)")).toBe(-4590);
  });

  it("ignora símbolo de moeda e espaços", () => {
    expect(parseAmountToCents("R$ 1.500,00")).toBe(150000);
    expect(parseAmountToCents(" -R$ 35,00 ")).toBe(-3500);
  });

  it("não acumula erro de ponto flutuante", () => {
    // 0,1 + 0,2 em float dá 0.30000000000000004. Em centavos inteiros, não.
    expect(parseAmountToCents("0,10") + parseAmountToCents("0,20")).toBe(30);
  });

  it("rejeita o que não é valor", () => {
    expect(() => parseAmountToCents("abc")).toThrow(ParseError);
    expect(() => parseAmountToCents("")).toThrow(ParseError);
  });
});

describe("parseStatementDate", () => {
  it("aceita os formatos que os bancos realmente emitem", () => {
    expect(parseStatementDate("05/08/2026")).toBe("2026-08-05");
    expect(parseStatementDate("5/8/2026")).toBe("2026-08-05");
    expect(parseStatementDate("05-08-2026")).toBe("2026-08-05");
    expect(parseStatementDate("05.08.26")).toBe("2026-08-05");
    expect(parseStatementDate("2026-08-05")).toBe("2026-08-05");
    expect(parseStatementDate("20260805")).toBe("2026-08-05"); // OFX
  });

  it("ignora o horário que o OFX costuma anexar", () => {
    expect(parseStatementDate("20260805120000[-3:BRT]")).toBe("2026-08-05");
  });

  it("rejeita o que não é data", () => {
    expect(() => parseStatementDate("SALDO")).toThrow(ParseError);
  });
});

describe("isRealDate", () => {
  it("rejeita datas que o calendário não tem", () => {
    expect(isRealDate("2026-02-31")).toBe(false);
    expect(isRealDate("2026-13-01")).toBe(false);
    expect(isRealDate("2026-02-28")).toBe(true);
    // 2028 é bissexto, 2026 não.
    expect(isRealDate("2028-02-29")).toBe(true);
    expect(isRealDate("2026-02-29")).toBe(false);
  });
});
