import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, asUser, categoryId, createUser, type TestUser } from "../helpers/api.js";

let user: TestUser;
let alimentacao: string;
let moradia: string;
let salario: string;

beforeEach(async () => {
  user = await createUser();
  alimentacao = await categoryId(user, "Alimentação", "expense");
  moradia = await categoryId(user, "Moradia", "expense");
  salario = await categoryId(user, "Salário", "income");
});

async function criar(overrides: Record<string, unknown> = {}) {
  return asUser(user)
    .post("/api/transactions")
    .send({
      type: "variable_expense",
      description: "Lanche",
      amountCents: 3500,
      categoryId: alimentacao,
      date: "2026-08-08",
      ...overrides,
    });
}

describe("POST /api/transactions", () => {
  it("cria receita, despesa fixa e despesa variável", async () => {
    const receita = await criar({
      type: "income",
      description: "Salário",
      amountCents: 500000,
      categoryId: salario,
      date: "2026-08-05",
    });
    const fixa = await criar({
      type: "fixed_expense",
      description: "Aluguel",
      amountCents: 150000,
      categoryId: moradia,
      date: "2026-08-10",
    });
    const variavel = await criar();

    expect(receita.status).toBe(201);
    expect(fixa.status).toBe(201);
    expect(variavel.status).toBe(201);
    expect(receita.body.transaction).toMatchObject({
      type: "income",
      amountCents: 500000,
      date: "2026-08-05",
      source: "manual",
    });
  });

  it("guarda a data sem deslocamento de fuso horário", async () => {
    // O servidor pode estar em qualquer fuso; dia 5 tem que continuar dia 5.
    const res = await criar({ date: "2026-08-01" });
    expect(res.body.transaction.date).toBe("2026-08-01");
  });

  it("recusa categoria de despesa em uma receita", async () => {
    const res = await criar({ type: "income", categoryId: alimentacao });
    expect(res.status).toBe(400);
  });

  it("recusa categoria de outro usuário com 404", async () => {
    const outro = await createUser({ email: "outro-cat@exemplo.com" });
    const categoriaDoOutro = await categoryId(outro, "Alimentação", "expense");

    const res = await criar({ categoryId: categoriaDoOutro });
    expect(res.status).toBe(404);
  });

  it("recusa valor negativo, zero e não-inteiro", async () => {
    expect((await criar({ amountCents: -100 })).status).toBe(422);
    expect((await criar({ amountCents: 0 })).status).toBe(422);
    expect((await criar({ amountCents: 35.5 })).status).toBe(422);
  });

  it("recusa data em formato inválido", async () => {
    expect((await criar({ date: "08/08/2026" })).status).toBe(422);
  });

  it("exige autenticação", async () => {
    const res = await request(app).post("/api/transactions").send({});
    expect(res.status).toBe(401);
  });
});

describe("GET /api/transactions", () => {
  beforeEach(async () => {
    await criar({ type: "income", description: "Salário", amountCents: 500000, categoryId: salario, date: "2026-08-05" });
    await criar({ type: "fixed_expense", description: "Aluguel", amountCents: 150000, categoryId: moradia, date: "2026-08-10" });
    await criar({ description: "Uber para o aeroporto", amountCents: 3500, date: "2026-08-12" });
    await criar({ description: "Cinema", amountCents: 4000, date: "2026-07-20" });
  });

  it("filtra pelo mês selecionado", async () => {
    const agosto = await asUser(user).get("/api/transactions?month=2026-08");
    const julho = await asUser(user).get("/api/transactions?month=2026-07");

    expect(agosto.body.total).toBe(3);
    expect(julho.body.total).toBe(1);
    expect(julho.body.items[0].description).toBe("Cinema");
  });

  it("inclui os limites do mês (dia 1 e último dia)", async () => {
    await criar({ description: "Primeiro dia", date: "2026-08-01" });
    await criar({ description: "Último dia", date: "2026-08-31" });

    const res = await asUser(user).get("/api/transactions?month=2026-08");
    const descricoes = res.body.items.map((i: { description: string }) => i.description);

    expect(descricoes).toContain("Primeiro dia");
    expect(descricoes).toContain("Último dia");
  });

  it("filtra por tipo e por categoria", async () => {
    const porTipo = await asUser(user).get("/api/transactions?month=2026-08&type=fixed_expense");
    expect(porTipo.body.total).toBe(1);
    expect(porTipo.body.items[0].description).toBe("Aluguel");

    const porCategoria = await asUser(user).get(`/api/transactions?month=2026-08&categoryId=${salario}`);
    expect(porCategoria.body.total).toBe(1);
  });

  it("pesquisa por descrição sem diferenciar maiúsculas", async () => {
    const res = await asUser(user).get("/api/transactions?month=2026-08&search=uber");
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].description).toBe("Uber para o aeroporto");
  });

  it("filtra por período livre", async () => {
    const res = await asUser(user).get("/api/transactions?from=2026-07-01&to=2026-08-10");
    expect(res.body.total).toBe(3);
  });

  it("ordena por data e por valor", async () => {
    const porValor = await asUser(user).get("/api/transactions?month=2026-08&sort=amount_desc");
    expect(porValor.body.items[0].amountCents).toBe(500000);

    const porData = await asUser(user).get("/api/transactions?month=2026-08&sort=date_asc");
    expect(porData.body.items[0].date).toBe("2026-08-05");
  });

  it("pagina os resultados", async () => {
    const res = await asUser(user).get("/api/transactions?month=2026-08&pageSize=2&page=1");
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(3);
  });

  it("marca lançamento futuro como previsto", async () => {
    const futuro = new Date();
    futuro.setUTCFullYear(futuro.getUTCFullYear() + 1);
    const iso = futuro.toISOString().slice(0, 10);

    const criado = await criar({ description: "Conta futura", date: iso });
    expect(criado.body.transaction.status).toBe("previsto");
  });

  it("não devolve nada de outro usuário", async () => {
    const outro = await createUser({ email: "isolamento-lanc@exemplo.com" });
    const res = await asUser(outro).get("/api/transactions?month=2026-08");
    expect(res.body.total).toBe(0);
  });
});

describe("PATCH /api/transactions/:id", () => {
  it("atualiza descrição, valor, data e categoria", async () => {
    const criado = await criar();
    const res = await asUser(user)
      .patch(`/api/transactions/${criado.body.transaction.id}`)
      .send({ description: "Jantar", amountCents: 9900, date: "2026-08-09", categoryId: moradia });

    expect(res.status).toBe(200);
    expect(res.body.transaction).toMatchObject({
      description: "Jantar",
      amountCents: 9900,
      date: "2026-08-09",
      categoryId: moradia,
    });
  });

  it("revalida a categoria ao trocar só o tipo", async () => {
    const criado = await criar();
    const res = await asUser(user)
      .patch(`/api/transactions/${criado.body.transaction.id}`)
      .send({ type: "income" });

    // A categoria continuava sendo de despesa — a troca precisa ser recusada.
    expect(res.status).toBe(400);
  });

  it("não deixa editar lançamento de outro usuário", async () => {
    const criado = await criar();
    const outro = await createUser({ email: "editar-alheio@exemplo.com" });

    const res = await asUser(outro)
      .patch(`/api/transactions/${criado.body.transaction.id}`)
      .send({ description: "Invadido" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/transactions/:id", () => {
  it("remove o lançamento da listagem", async () => {
    const criado = await criar();
    const res = await asUser(user).delete(`/api/transactions/${criado.body.transaction.id}`);
    expect(res.status).toBe(204);

    const lista = await asUser(user).get("/api/transactions?month=2026-08");
    expect(lista.body.total).toBe(0);
  });

  it("não deixa excluir lançamento de outro usuário", async () => {
    const criado = await criar();
    const outro = await createUser({ email: "excluir-alheio@exemplo.com" });

    const res = await asUser(outro).delete(`/api/transactions/${criado.body.transaction.id}`);
    expect(res.status).toBe(404);

    const aindaExiste = await asUser(user).get(`/api/transactions/${criado.body.transaction.id}`);
    expect(aindaExiste.status).toBe(200);
  });
});
