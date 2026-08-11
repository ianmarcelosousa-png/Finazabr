import { describe, expect, it } from "vitest";
import { parseCsv } from "../../src/lib/parsers/csv.js";
import { parseOfx } from "../../src/lib/parsers/ofx.js";
import { detectFormat, parseStatement } from "../../src/lib/parsers/index.js";
import { ParseError } from "../../src/lib/parsers/types.js";

const CSV_BRADESCO = `Data;Histórico;Valor;Saldo
05/08/2026;SALARIO EMPRESA X;5.000,00;5.000,00
06/08/2026;IFOOD *IFD;-45,00;4.955,00
07/08/2026;UBER *TRIP;-22,50;4.932,50
`;

const CSV_COM_PREAMBULO = `Extrato de conta corrente
Periodo: 01/08/2026 a 31/08/2026

Data,Descricao,Valor
05/08/2026,SALARIO,5000.00
06/08/2026,NETFLIX.COM,-39.90
`;

const CSV_CREDITO_DEBITO = `Data;Descricao;Credito;Debito
05/08/2026;SALARIO;5.000,00;
10/08/2026;ALUGUEL;;1.500,00
`;

const OFX_ITAU = `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260805120000[-3:BRT]
<TRNAMT>5000.00
<FITID>202608050001
<MEMO>SALARIO EMPRESA X
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260806
<TRNAMT>-45.00
<FITID>202608060002
<MEMO>IFOOD *IFD SAO PAULO
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>
`;

describe("parseCsv", () => {
  it("lê um CSV com ponto e vírgula e valores em formato brasileiro", () => {
    const { transactions } = parseCsv(CSV_BRADESCO);

    expect(transactions).toHaveLength(3);
    expect(transactions[0]).toMatchObject({
      date: "2026-08-05",
      description: "SALARIO EMPRESA X",
      amountCents: 500000,
      direction: "in",
    });
    expect(transactions[1]).toMatchObject({
      date: "2026-08-06",
      amountCents: 4500,
      direction: "out",
    });
  });

  it("ignora o cabeçalho de relatório antes da tabela", () => {
    const { transactions } = parseCsv(CSV_COM_PREAMBULO);

    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toBe("SALARIO");
    expect(transactions[1].amountCents).toBe(3990);
  });

  it("entende layout com colunas separadas de crédito e débito", () => {
    const { transactions } = parseCsv(CSV_CREDITO_DEBITO);

    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({ direction: "in", amountCents: 500000 });
    expect(transactions[1]).toMatchObject({ direction: "out", amountCents: 150000 });
  });

  it("explica o problema quando falta a coluna de valor", () => {
    expect(() => parseCsv("Data;Historico\n05/08/2026;ALGO\n")).toThrow(ParseError);
  });
});

describe("parseOfx", () => {
  it("lê os blocos STMTTRN incluindo o FITID", () => {
    const { transactions } = parseOfx(OFX_ITAU);

    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      date: "2026-08-05",
      description: "SALARIO EMPRESA X",
      amountCents: 500000,
      direction: "in",
      externalId: "ofx:202608050001",
    });
    expect(transactions[1]).toMatchObject({
      direction: "out",
      amountCents: 4500,
      externalId: "ofx:202608060002",
    });
  });

  it("recusa um arquivo sem movimentações com mensagem clara", () => {
    expect(() => parseOfx("<OFX></OFX>")).toThrow(ParseError);
  });
});

describe("detectFormat", () => {
  it("identifica o formato pelo conteúdo, não pela extensão", () => {
    // Extrato OFX salvo como .txt continua sendo OFX.
    expect(detectFormat("extrato.txt", Buffer.from(OFX_ITAU))).toBe("ofx");
    expect(detectFormat("extrato.csv", Buffer.from(CSV_BRADESCO))).toBe("csv");
    expect(detectFormat("x.pdf", Buffer.from("%PDF-1.4\n..."))).toBe("pdf");
  });

  it("recusa arquivo que mente sobre a extensão", () => {
    expect(() => detectFormat("falso.pdf", Buffer.from("nao sou um pdf"))).toThrow(
      ParseError
    );
  });
});

describe("parseStatement", () => {
  it("recupera acentos de arquivos em latin1", async () => {
    const latin1 = Buffer.from(
      "Data;Descricao;Valor\n05/08/2026;PADARIA PÃO QUENTE;-12,00\n",
      "latin1"
    );

    const { transactions } = await parseStatement("csv", latin1);
    expect(transactions[0].description).toContain("PÃO");
  });
});
