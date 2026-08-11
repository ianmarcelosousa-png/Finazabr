import { beforeEach, describe, expect, it } from "vitest";
import { asUser, categoryId, createUser, type TestUser } from "../helpers/api.js";

let user: TestUser;
let salario: string;
let moradia: string;
let alimentacao: string;
let transporte: string;

beforeEach(async () => {
  user = await createUser();
  salario = await categoryId(user, "Salário", "income");
  moradia = await categoryId(user, "Moradia", "expense");
  alimentacao = await categoryId(user, "Alimentação", "expense");
  transporte = await categoryId(user, "Transporte", "expense");
});

async function lancar(data: Record<string, unknown>) {
  return asUser(user).post("/api/transactions").send(data);
}

/** Cenário do prompt: R$ 5.000 de receita, R$ 3.200 de despesa. */
async function cenarioDoPrompt() {
  await lancar({ type: "income", description: "Salário", amountCents: 500000, categoryId: salario, date: "2026-08-05" });
  await lancar({ type: "fixed_expense", description: "Aluguel", amountCents: 150000, categoryId: moradia, date: "2026-08-10" });
  await lancar({ type: "fixed_expense", description: "Energia", amountCents: 25000, categoryId: moradia, date: "2026-08-15" });
  await lancar({ type: "variable_expense", description: "Mercado", amountCents: 141500, categoryId: alimentacao, date: "2026-08-12" });
  await lancar({ type: "variable_expense", description: "Uber", amountCents: 3500, categoryId: transporte, date: "2026-08-12" });
}

describe("GET /api/dashboard/summary", () => {
  it("soma receitas, despesas e saldo do mês", async () => {
    await cenarioDoPrompt();

    const res = await asUser(user).get("/api/dashboard/summary?month=2026-08");

    expect(res.status).toBe(200);
    expect(res.body.incomeCents).toBe(500000);
    expect(res.body.fixedExpenseCents).toBe(175000);
    expect(res.body.variableExpenseCents).toBe(145000);
    expect(res.body.expenseCents).toBe(320000);
    expect(res.body.balanceCents).toBe(180000);
  });

  it("calcula o valor a investir a partir do percentual salvo", async () => {
    await cenarioDoPrompt();

    // Padrão de 20% sobre R$ 5.000 = R$ 1.000, exatamente o exemplo do §9.
    const padrao = await asUser(user).get("/api/dashboard/summary?month=2026-08");
    expect(padrao.body.investmentPercentage).toBe(20);
    expect(padrao.body.investmentCents).toBe(100000);

    for (const [percentual, esperado] of [
      [10, 50000],
      [15, 75000],
      [30, 150000],
    ] as const) {
      await asUser(user).patch("/api/settings").send({ investmentPercentage: percentual });
      const res = await asUser(user).get("/api/dashboard/summary?month=2026-08");
      expect(res.body.investmentCents).toBe(esperado);
    }
  });

  it("mantém o percentual escolhido nos meses seguintes", async () => {
    await asUser(user).patch("/api/settings").send({ investmentPercentage: 35 });

    const outroMes = await asUser(user).get("/api/dashboard/summary?month=2026-11");
    expect(outroMes.body.investmentPercentage).toBe(35);
  });

  it("recusa percentual fora de 0–100", async () => {
    expect((await asUser(user).patch("/api/settings").send({ investmentPercentage: 101 })).status).toBe(422);
    expect((await asUser(user).patch("/api/settings").send({ investmentPercentage: -1 })).status).toBe(422);
  });

  it("monta a distribuição por categoria com percentuais", async () => {
    await cenarioDoPrompt();

    const res = await asUser(user).get("/api/dashboard/summary?month=2026-08");
    const fatias = res.body.expensesByCategory as {
      name: string;
      amountCents: number;
      percentage: number;
    }[];

    // Só despesas entram no gráfico — a receita não é "para onde o dinheiro foi".
    expect(fatias.find((f) => f.name === "Salário")).toBeUndefined();

    const moradiaFatia = fatias.find((f) => f.name === "Moradia");
    expect(moradiaFatia?.amountCents).toBe(175000);
    expect(moradiaFatia?.percentage).toBeCloseTo(54.7, 1);

    // Vem ordenado do maior para o menor, que é como o gráfico exibe.
    expect(fatias[0].name).toBe("Moradia");
    expect(fatias.reduce((acc, f) => acc + f.amountCents, 0)).toBe(320000);
  });

  it("muda os números ao trocar de mês", async () => {
    await cenarioDoPrompt();
    await lancar({ type: "variable_expense", description: "Cinema", amountCents: 6000, categoryId: alimentacao, date: "2026-07-20" });

    const julho = await asUser(user).get("/api/dashboard/summary?month=2026-07");
    expect(julho.body.incomeCents).toBe(0);
    expect(julho.body.expenseCents).toBe(6000);
  });

  it("responde com zeros num mês sem lançamentos", async () => {
    const res = await asUser(user).get("/api/dashboard/summary?month=2026-03");

    expect(res.body.incomeCents).toBe(0);
    expect(res.body.expenseCents).toBe(0);
    expect(res.body.balanceCents).toBe(0);
    expect(res.body.investmentCents).toBe(0);
    expect(res.body.expensesByCategory).toEqual([]);
  });

  it("usa o mês atual quando nenhum é informado", async () => {
    const res = await asUser(user).get("/api/dashboard/summary");
    expect(res.body.month).toBe(new Date().toISOString().slice(0, 7));
  });

  it("não mistura os números de dois usuários", async () => {
    await cenarioDoPrompt();

    const outro = await createUser({ email: "dashboard-isolado@exemplo.com" });
    const res = await asUser(outro).get("/api/dashboard/summary?month=2026-08");

    expect(res.body.incomeCents).toBe(0);
    expect(res.body.expenseCents).toBe(0);
  });
});
