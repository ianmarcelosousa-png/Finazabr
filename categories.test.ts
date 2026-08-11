import { beforeEach, describe, expect, it } from "vitest";
import { asUser, categoryId, createUser, type TestUser } from "../helpers/api.js";

let user: TestUser;

beforeEach(async () => {
  user = await createUser();
});

describe("GET /api/categories", () => {
  it("traz as categorias padrão criadas no registro", async () => {
    const res = await asUser(user).get("/api/categories");

    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(21);

    const nomes = res.body.categories.map((c: { name: string }) => c.name);
    for (const esperada of ["Salário", "Moradia", "Alimentação", "Supermercado", "Combustível", "Impostos"]) {
      expect(nomes).toContain(esperada);
    }
  });

  it("filtra por grupo", async () => {
    const receitas = await asUser(user).get("/api/categories?type=income");
    const despesas = await asUser(user).get("/api/categories?type=expense");

    expect(receitas.body.categories).toHaveLength(5);
    expect(despesas.body.categories).toHaveLength(16);
  });
});

describe("POST /api/categories", () => {
  it("cria categoria personalizada", async () => {
    const res = await asUser(user)
      .post("/api/categories")
      .send({ name: "Pets", type: "expense", color: "#ff8800", icon: "Dog" });

    expect(res.status).toBe(201);
    expect(res.body.category).toMatchObject({ name: "Pets", type: "expense", isDefault: false });
  });

  it("recusa nome repetido dentro do mesmo grupo", async () => {
    const res = await asUser(user)
      .post("/api/categories")
      .send({ name: "Moradia", type: "expense" });

    expect(res.status).toBe(409);
  });

  it("aceita o mesmo nome em grupos diferentes", async () => {
    // "Outros" existe nos dois grupos por padrão — a unicidade é por grupo.
    const res = await asUser(user).post("/api/categories").send({ name: "Moradia", type: "income" });
    expect(res.status).toBe(201);
  });

  it("recusa cor e ícone fora do formato esperado", async () => {
    expect(
      (await asUser(user).post("/api/categories").send({ name: "X", type: "expense", color: "javascript:alert(1)" })).status
    ).toBe(422);
    expect(
      (await asUser(user).post("/api/categories").send({ name: "Y", type: "expense", icon: "<script>" })).status
    ).toBe(422);
  });
});

describe("PATCH /api/categories/:id", () => {
  it("renomea e troca a cor", async () => {
    const id = await categoryId(user, "Lazer", "expense");
    const res = await asUser(user).patch(`/api/categories/${id}`).send({ name: "Diversão", color: "#123456" });

    expect(res.status).toBe(200);
    expect(res.body.category).toMatchObject({ name: "Diversão", color: "#123456" });
  });

  it("não deixa editar categoria de outro usuário", async () => {
    const id = await categoryId(user, "Lazer", "expense");
    const outro = await createUser({ email: "cat-alheia@exemplo.com" });

    const res = await asUser(outro).patch(`/api/categories/${id}`).send({ name: "Invadida" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/categories/:id", () => {
  it("recusa excluir categoria em uso, explicando o motivo", async () => {
    const id = await categoryId(user, "Alimentação", "expense");
    await asUser(user).post("/api/transactions").send({
      type: "variable_expense",
      description: "Lanche",
      amountCents: 3500,
      categoryId: id,
      date: "2026-08-08",
    });

    const res = await asUser(user).delete(`/api/categories/${id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/lançamentos/i);
  });

  it("recusa excluir categoria padrão mesmo sem uso", async () => {
    const id = await categoryId(user, "Impostos", "expense");
    const res = await asUser(user).delete(`/api/categories/${id}`);
    expect(res.status).toBe(409);
  });

  it("exclui categoria personalizada sem uso", async () => {
    const criada = await asUser(user).post("/api/categories").send({ name: "Temporária", type: "expense" });

    const res = await asUser(user).delete(`/api/categories/${criada.body.category.id}`);
    expect(res.status).toBe(204);
  });
});
