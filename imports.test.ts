import { beforeEach, describe, expect, it } from "vitest";
import { asUser, categoryId, createUser, type TestUser } from "../helpers/api.js";
import { currentMonth } from "../../src/lib/dates.js";

let user: TestUser;

const CSV = `Data;Histórico;Valor
05/08/2026;SALARIO EMPRESA X;5.000,00
06/08/2026;IFOOD *IFD SAO PAULO;-45,00
07/08/2026;UBER *TRIP;-22,00
08/08/2026;POSTO CENTRAL 55;-180,00
`;

const OFX = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><DTPOSTED>20260805<TRNAMT>5000.00<FITID>FIT-001<MEMO>SALARIO EMPRESA X</STMTTRN>
<STMTTRN><DTPOSTED>20260806<TRNAMT>-45.00<FITID>FIT-002<MEMO>IFOOD *IFD</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>
`;

function enviarCsv(conteudo = CSV, nome = "extrato.csv") {
  return asUser(user).post("/api/imports").attach("file", Buffer.from(conteudo, "utf8"), nome);
}

beforeEach(async () => {
  user = await createUser();
});

describe("POST /api/imports", () => {
  it("lê o CSV e classifica automaticamente cada movimentação", async () => {
    const res = await enviarCsv();

    expect(res.status).toBe(201);
    expect(res.body.totalRows).toBe(4);

    const porDescricao = new Map<string, { categoryId: string; direction: string; type: string }>(
      res.body.rows.map((r: { rawDescription: string }) => [r.rawDescription, r as never])
    );

    const salarioId = await categoryId(user, "Salário", "income");
    const alimentacaoId = await categoryId(user, "Alimentação", "expense");
    const transporteId = await categoryId(user, "Transporte", "expense");
    const combustivelId = await categoryId(user, "Combustível", "expense");

    expect(porDescricao.get("SALARIO EMPRESA X")).toMatchObject({
      direction: "in",
      type: "income",
      categoryId: salarioId,
    });
    expect(porDescricao.get("IFOOD *IFD SAO PAULO")?.categoryId).toBe(alimentacaoId);
    expect(porDescricao.get("UBER *TRIP")?.categoryId).toBe(transporteId);
    expect(porDescricao.get("POSTO CENTRAL 55")?.categoryId).toBe(combustivelId);
  });

  it("NÃO cria nenhum lançamento antes da confirmação", async () => {
    // A regra central do §14: staging é staging.
    await enviarCsv();

    const lancamentos = await asUser(user).get("/api/transactions?month=2026-08");
    expect(lancamentos.body.total).toBe(0);
  });

  it("lê OFX e guarda o FITID", async () => {
    const res = await asUser(user)
      .post("/api/imports")
      .attach("file", Buffer.from(OFX, "utf8"), "extrato.ofx");

    expect(res.status).toBe(201);
    expect(res.body.format).toBe("ofx");
    expect(res.body.rows).toHaveLength(2);
  });

  it("recusa arquivo de formato não suportado", async () => {
    const res = await asUser(user)
      .post("/api/imports")
      .attach("file", Buffer.from("qualquer coisa"), "extrato.docx");

    expect(res.status).toBe(400);
  });

  it("explica o erro quando o CSV não tem colunas reconhecíveis", async () => {
    const res = await enviarCsv("coluna1;coluna2\nvalor1;valor2\n");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/coluna/i);
  });

  it("recusa arquivo acima do limite de tamanho", async () => {
    const gigante = "a".repeat(6 * 1024 * 1024);
    const res = await enviarCsv(gigante, "grande.csv");
    expect(res.status).toBe(400);
  });

  it("exige autenticação", async () => {
    const res = await asUser({ ...user, cookie: "auth_token=invalido" })
      .post("/api/imports")
      .attach("file", Buffer.from(CSV), "extrato.csv");
    expect(res.status).toBe(401);
  });
});

describe("Tela de conferência", () => {
  it("permite alterar categoria, descrição, tipo e valor antes de confirmar", async () => {
    const importacao = await enviarCsv();
    const linha = importacao.body.rows.find(
      (r: { rawDescription: string }) => r.rawDescription === "UBER *TRIP"
    );

    const lazer = await categoryId(user, "Lazer", "expense");
    const res = await asUser(user)
      .patch(`/api/imports/${importacao.body.id}/rows/${linha.id}`)
      .send({
        description: "Corrida para o show",
        categoryId: lazer,
        amountCents: 2500,
        type: "fixed_expense",
      });

    expect(res.status).toBe(200);
    expect(res.body.row).toMatchObject({
      description: "Corrida para o show",
      categoryId: lazer,
      amountCents: 2500,
      type: "fixed_expense",
    });
  });

  it("recusa categoria incompatível com o tipo da linha", async () => {
    const importacao = await enviarCsv();
    const linha = importacao.body.rows[0]; // o salário, receita
    const alimentacao = await categoryId(user, "Alimentação", "expense");

    const res = await asUser(user)
      .patch(`/api/imports/${importacao.body.id}/rows/${linha.id}`)
      .send({ categoryId: alimentacao });

    expect(res.status).toBe(400);
  });

  it("permite desmarcar uma movimentação para não importá-la", async () => {
    const importacao = await enviarCsv();
    const linha = importacao.body.rows[0];

    await asUser(user)
      .patch(`/api/imports/${importacao.body.id}/rows/${linha.id}`)
      .send({ selected: false });

    const confirmacao = await asUser(user).post(`/api/imports/${importacao.body.id}/confirm`).send({});

    expect(confirmacao.body.imported).toBe(3);
    expect(confirmacao.body.ignored).toBe(1);
  });

  it("descarta a importação inteira sem deixar rastro", async () => {
    const importacao = await enviarCsv();

    const res = await asUser(user).delete(`/api/imports/${importacao.body.id}`);
    expect(res.status).toBe(204);

    const depois = await asUser(user).get(`/api/imports/${importacao.body.id}`);
    expect(depois.status).toBe(404);
  });
});

describe("POST /api/imports/:id/confirm", () => {
  it("só então cria os lançamentos, marcados como vindos do extrato", async () => {
    const importacao = await enviarCsv();
    const res = await asUser(user).post(`/api/imports/${importacao.body.id}/confirm`).send({});

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(4);

    const lancamentos = await asUser(user).get("/api/transactions?month=2026-08");
    expect(lancamentos.body.total).toBe(4);
    expect(lancamentos.body.items.every((i: { source: string }) => i.source === "import")).toBe(true);
  });

  it("permite filtrar depois pelo que veio do extrato", async () => {
    const importacao = await enviarCsv();
    await asUser(user).post(`/api/imports/${importacao.body.id}/confirm`).send({});

    const alimentacao = await categoryId(user, "Alimentação", "expense");
    await asUser(user).post("/api/transactions").send({
      type: "variable_expense",
      description: "Manual",
      amountCents: 1000,
      categoryId: alimentacao,
      date: "2026-08-20",
    });

    const importados = await asUser(user).get("/api/transactions?month=2026-08&source=import");
    const manuais = await asUser(user).get("/api/transactions?month=2026-08&source=manual");

    expect(importados.body.total).toBe(4);
    expect(manuais.body.total).toBe(1);
  });

  it("recusa confirmar duas vezes", async () => {
    const importacao = await enviarCsv();
    await asUser(user).post(`/api/imports/${importacao.body.id}/confirm`).send({});

    const segunda = await asUser(user).post(`/api/imports/${importacao.body.id}/confirm`).send({});
    expect(segunda.status).toBe(409);
  });

  it("não deixa confirmar a importação de outro usuário", async () => {
    const importacao = await enviarCsv();
    const outro = await createUser({ email: "import-alheio@exemplo.com" });

    const res = await asUser(outro).post(`/api/imports/${importacao.body.id}/confirm`).send({});
    expect(res.status).toBe(404);
  });
});

describe("Aprendizado de categorias", () => {
  it("aprende com a correção e acerta na importação seguinte", async () => {
    // O caso exato do §15: "POSTO CENTRAL" classificado errado, corrigido
    // pelo usuário, e reconhecido sozinho da próxima vez.
    const primeira = await enviarCsv();
    const linha = primeira.body.rows.find(
      (r: { rawDescription: string }) => r.rawDescription === "POSTO CENTRAL 55"
    );

    const transporte = await categoryId(user, "Transporte", "expense");
    await asUser(user)
      .patch(`/api/imports/${primeira.body.id}/rows/${linha.id}`)
      .send({ categoryId: transporte });

    const confirmacao = await asUser(user).post(`/api/imports/${primeira.body.id}/confirm`).send({});
    expect(confirmacao.body.rulesLearned).toBeGreaterThan(0);

    const regras = await asUser(user).get("/api/rules");
    expect(regras.body.rules.some((r: { pattern: string }) => r.pattern.includes("POSTO"))).toBe(true);

    // Segunda importação: agora a sugestão já sai como Transporte.
    const segunda = await enviarCsv("Data;Histórico;Valor\n08/09/2026;POSTO CENTRAL 55;-200,00\n");
    const novaLinha = segunda.body.rows[0];

    expect(novaLinha.categoryId).toBe(transporte);
    expect(novaLinha.suggestionSource).toBe("user_rule");
  });

  it("permite apagar uma regra aprendida", async () => {
    const importacao = await enviarCsv();
    await asUser(user).post(`/api/imports/${importacao.body.id}/confirm`).send({});

    const regras = await asUser(user).get("/api/rules");
    const alvo = regras.body.rules[0];

    const res = await asUser(user).delete(`/api/rules/${alvo.id}`);
    expect(res.status).toBe(204);

    const depois = await asUser(user).get("/api/rules");
    expect(depois.body.rules.find((r: { id: string }) => r.id === alvo.id)).toBeUndefined();
  });

  it("não aprende quando o usuário pede para não aprender", async () => {
    const importacao = await enviarCsv();
    await asUser(user)
      .post(`/api/imports/${importacao.body.id}/confirm`)
      .send({ learnCategories: false });

    const regras = await asUser(user).get("/api/rules");
    expect(regras.body.rules).toHaveLength(0);
  });

  it("as regras de um usuário não influenciam as de outro", async () => {
    const importacao = await enviarCsv();
    await asUser(user).post(`/api/imports/${importacao.body.id}/confirm`).send({});

    const outro = await createUser({ email: "regras-isoladas@exemplo.com" });
    const regrasDoOutro = await asUser(outro).get("/api/rules");

    expect(regrasDoOutro.body.rules).toHaveLength(0);
  });
});

describe("Extrato e recorrência (§17)", () => {
  it("reconhece o salário projetado quando o extrato real chega", async () => {
    const salario = await categoryId(user, "Salário", "income");
    const mes = currentMonth();

    await asUser(user).post("/api/recurring").send({
      type: "income",
      description: "Salário",
      amountCents: 500000,
      categoryId: salario,
      dayOfMonth: 5,
      startMonth: mes,
    });

    // Materializa a projeção do mês.
    await asUser(user).get(`/api/transactions?month=${mes}`);

    const importacao = await enviarCsv(
      `Data;Histórico;Valor\n05/${mes.slice(5)}/${mes.slice(0, 4)};SALARIO EMPRESA X;5.000,00\n`
    );

    const linha = importacao.body.rows[0];
    expect(linha.duplicateOfId).not.toBeNull();
    expect(linha.selected).toBe(false);
    expect(importacao.body.duplicateCount).toBe(1);
  });
});
