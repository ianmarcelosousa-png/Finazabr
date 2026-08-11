import { beforeEach, describe, expect, it } from "vitest";
import { asUser, categoryId, createUser, type TestUser } from "../helpers/api.js";

let user: TestUser;
let salario: string;

const OFX_SALARIO = `OFXHEADER:100
<OFX><BANKTRANLIST>
<STMTTRN><DTPOSTED>20260805<TRNAMT>5000.00<FITID>FIT-SALARIO-1<MEMO>SALARIO EMPRESA X</STMTTRN>
</BANKTRANLIST></OFX>
`;

beforeEach(async () => {
  user = await createUser();
  salario = await categoryId(user, "Salário", "income");
});

function enviar(conteudo: string, nome: string) {
  return asUser(user).post("/api/imports").attach("file", Buffer.from(conteudo, "utf8"), nome);
}

async function lancarSalarioManual(date = "2026-08-05", amountCents = 500000) {
  return asUser(user).post("/api/transactions").send({
    type: "income",
    description: "Salário",
    amountCents,
    categoryId: salario,
    date,
  });
}

describe("Detecção de duplicidade", () => {
  it("aponta o lançamento manual que já existe (cenário do §16)", async () => {
    await lancarSalarioManual();

    const importacao = await enviar(
      "Data;Histórico;Valor\n05/08/2026;SALARIO EMPRESA X;5.000,00\n",
      "extrato.csv"
    );

    const linha = importacao.body.rows[0];
    expect(linha.duplicateOfId).not.toBeNull();
    expect(linha.duplicateScore).toBeGreaterThan(0.5);
    // Vem desmarcada: o caminho de menor esforço não pode ser o que duplica.
    expect(linha.selected).toBe(false);
    expect(linha.duplicateAction).toBe("ignore");
  });

  it("tolera diferença de alguns dias entre o lançamento e o extrato", async () => {
    await lancarSalarioManual("2026-08-05");

    const importacao = await enviar(
      "Data;Histórico;Valor\n07/08/2026;SALARIO EMPRESA X;5.000,00\n",
      "extrato.csv"
    );

    expect(importacao.body.rows[0].duplicateOfId).not.toBeNull();
  });

  it("não acusa duplicidade quando o valor é diferente", async () => {
    await lancarSalarioManual("2026-08-05", 500000);

    const importacao = await enviar(
      "Data;Histórico;Valor\n05/08/2026;SALARIO EMPRESA X;4.500,00\n",
      "extrato.csv"
    );

    expect(importacao.body.rows[0].duplicateOfId).toBeNull();
  });

  it("não acusa duplicidade quando a data está muito distante", async () => {
    await lancarSalarioManual("2026-08-05");

    const importacao = await enviar(
      "Data;Histórico;Valor\n20/08/2026;SALARIO EMPRESA X;5.000,00\n",
      "extrato.csv"
    );

    expect(importacao.body.rows[0].duplicateOfId).toBeNull();
  });

  it("não confunde entrada com saída de mesmo valor", async () => {
    await lancarSalarioManual("2026-08-05", 15000);

    const importacao = await enviar(
      "Data;Histórico;Valor\n05/08/2026;ALGUMA DESPESA;-150,00\n",
      "extrato.csv"
    );

    expect(importacao.body.rows[0].duplicateOfId).toBeNull();
  });

  it("usa o FITID para reconhecer o mesmo lançamento em duas importações", async () => {
    const primeira = await enviar(OFX_SALARIO, "extrato.ofx");
    await asUser(user).post(`/api/imports/${primeira.body.id}/confirm`).send({});

    const segunda = await enviar(OFX_SALARIO, "extrato.ofx");

    expect(segunda.body.rows[0].duplicateScore).toBe(1);
    expect(segunda.body.rows[0].selected).toBe(false);
  });

  it('"ignorar" não cria lançamento', async () => {
    await lancarSalarioManual();
    const importacao = await enviar(
      "Data;Histórico;Valor\n05/08/2026;SALARIO EMPRESA X;5.000,00\n",
      "extrato.csv"
    );

    const res = await asUser(user).post(`/api/imports/${importacao.body.id}/confirm`).send({});

    expect(res.body.ignored).toBe(1);
    expect(res.body.imported).toBe(0);

    const lista = await asUser(user).get("/api/transactions?month=2026-08");
    expect(lista.body.total).toBe(1);
  });

  it('"importar mesmo assim" cria o segundo lançamento', async () => {
    await lancarSalarioManual();
    const importacao = await enviar(
      "Data;Histórico;Valor\n05/08/2026;SALARIO EMPRESA X;5.000,00\n",
      "extrato.csv"
    );

    await asUser(user)
      .patch(`/api/imports/${importacao.body.id}/rows/${importacao.body.rows[0].id}`)
      .send({ duplicateAction: "import_anyway" });

    const res = await asUser(user).post(`/api/imports/${importacao.body.id}/confirm`).send({});
    expect(res.body.imported).toBe(1);

    const lista = await asUser(user).get("/api/transactions?month=2026-08");
    expect(lista.body.total).toBe(2);
  });

  it('"substituir" atualiza o lançamento existente em vez de criar outro', async () => {
    const manual = await lancarSalarioManual();
    const importacao = await enviar(
      "Data;Histórico;Valor\n05/08/2026;SALARIO EMPRESA X;5.000,00\n",
      "extrato.csv"
    );

    await asUser(user)
      .patch(`/api/imports/${importacao.body.id}/rows/${importacao.body.rows[0].id}`)
      .send({ duplicateAction: "merge" });

    const res = await asUser(user).post(`/api/imports/${importacao.body.id}/confirm`).send({});
    expect(res.body.merged).toBe(1);
    expect(res.body.imported).toBe(0);

    const lista = await asUser(user).get("/api/transactions?month=2026-08");
    expect(lista.body.total).toBe(1);

    const atualizado = lista.body.items[0];
    expect(atualizado.id).toBe(manual.body.transaction.id);
    expect(atualizado.description).toBe("SALARIO EMPRESA X");
    expect(atualizado.source).toBe("import");
  });

  it("nunca compara movimentações entre usuários diferentes", async () => {
    // O usuário A tem o salário; o extrato do B com o mesmo valor e data não
    // pode ser acusado de duplicata.
    await lancarSalarioManual();

    const outro = await createUser({ email: "dup-isolado@exemplo.com" });
    const importacaoDoOutro = await asUser(outro)
      .post("/api/imports")
      .attach(
        "file",
        Buffer.from("Data;Histórico;Valor\n05/08/2026;SALARIO EMPRESA X;5.000,00\n", "utf8"),
        "extrato.csv"
      );

    expect(importacaoDoOutro.body.rows[0].duplicateOfId).toBeNull();
    expect(importacaoDoOutro.body.rows[0].selected).toBe(true);
  });

  it("permite reimportar uma movimentação que foi excluída", async () => {
    const primeira = await enviar(OFX_SALARIO, "extrato.ofx");
    await asUser(user).post(`/api/imports/${primeira.body.id}/confirm`).send({});

    const lista = await asUser(user).get("/api/transactions?month=2026-08");
    await asUser(user).delete(`/api/transactions/${lista.body.items[0].id}`);

    const segunda = await enviar(OFX_SALARIO, "extrato.ofx");
    expect(segunda.body.rows[0].duplicateOfId).toBeNull();

    const confirmacao = await asUser(user).post(`/api/imports/${segunda.body.id}/confirm`).send({});
    expect(confirmacao.body.imported).toBe(1);
  });
});
