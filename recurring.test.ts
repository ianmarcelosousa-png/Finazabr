import { beforeEach, describe, expect, it } from "vitest";
import { asUser, categoryId, createUser, type TestUser } from "../helpers/api.js";
import { addMonths, currentMonth } from "../../src/lib/dates.js";

let user: TestUser;
let moradia: string;
let salario: string;

const HOJE = currentMonth();
const PROXIMO = addMonths(HOJE, 1);
const DAQUI_TRES = addMonths(HOJE, 3);

beforeEach(async () => {
  user = await createUser();
  moradia = await categoryId(user, "Moradia", "expense");
  salario = await categoryId(user, "Salário", "income");
});

async function criarRecorrencia(overrides: Record<string, unknown> = {}) {
  return asUser(user)
    .post("/api/recurring")
    .send({
      type: "fixed_expense",
      description: "Aluguel",
      amountCents: 150000,
      categoryId: moradia,
      dayOfMonth: 10,
      startMonth: HOJE,
      ...overrides,
    });
}

describe("POST /api/recurring", () => {
  it("cadastra a despesa fixa e já materializa o mês corrente", async () => {
    const res = await criarRecorrencia();
    expect(res.status).toBe(201);

    const lista = await asUser(user).get(`/api/transactions?month=${HOJE}`);
    expect(lista.body.total).toBe(1);
    expect(lista.body.items[0]).toMatchObject({
      description: "Aluguel",
      amountCents: 150000,
      source: "recurring",
    });
  });

  it("projeta a receita recorrente nos meses seguintes sem novo cadastro", async () => {
    // É o cenário do §5: cadastrar "Salário, R$ 5.000, dia 5" uma vez.
    await criarRecorrencia({
      type: "income",
      description: "Salário",
      amountCents: 500000,
      categoryId: salario,
      dayOfMonth: 5,
    });

    const proximo = await asUser(user).get(`/api/transactions?month=${PROXIMO}`);
    const daquiTres = await asUser(user).get(`/api/transactions?month=${DAQUI_TRES}`);

    expect(proximo.body.total).toBe(1);
    expect(proximo.body.items[0].description).toBe("Salário");
    expect(daquiTres.body.total).toBe(1);
  });

  it("não retroage para antes do mês inicial", async () => {
    await criarRecorrencia({ startMonth: PROXIMO });

    const agora = await asUser(user).get(`/api/transactions?month=${HOJE}`);
    expect(agora.body.total).toBe(0);
  });

  it("respeita o mês final", async () => {
    await criarRecorrencia({ endMonth: HOJE });

    const proximo = await asUser(user).get(`/api/transactions?month=${PROXIMO}`);
    expect(proximo.body.total).toBe(0);
  });

  it("limita o dia 31 ao último dia do mês", async () => {
    await criarRecorrencia({ dayOfMonth: 31, startMonth: "2026-01" });

    const fevereiro = await asUser(user).get("/api/transactions?month=2026-02");
    expect(fevereiro.body.items[0].date).toBe("2026-02-28");

    const abril = await asUser(user).get("/api/transactions?month=2026-04");
    expect(abril.body.items[0].date).toBe("2026-04-30");
  });

  it("é idempotente: carregar o mesmo mês várias vezes não duplica", async () => {
    await criarRecorrencia();

    await asUser(user).get(`/api/transactions?month=${PROXIMO}`);
    await asUser(user).get(`/api/transactions?month=${PROXIMO}`);
    const terceira = await asUser(user).get(`/api/transactions?month=${PROXIMO}`);

    expect(terceira.body.total).toBe(1);
  });

  it("recusa recorrência de despesa variável", async () => {
    const res = await criarRecorrencia({ type: "variable_expense" });
    expect(res.status).toBe(422);
  });

  it("recusa mês final anterior ao inicial", async () => {
    const res = await criarRecorrencia({ startMonth: PROXIMO, endMonth: HOJE });
    expect(res.status).toBe(422);
  });
});

describe("Editar ocorrência vs editar recorrência", () => {
  it("editar a ocorrência afeta só aquele mês", async () => {
    await criarRecorrencia();

    const mesAtual = await asUser(user).get(`/api/transactions?month=${HOJE}`);
    const ocorrencia = mesAtual.body.items[0];

    await asUser(user)
      .patch(`/api/transactions/${ocorrencia.id}`)
      .send({ amountCents: 160000, description: "Aluguel (reajuste pontual)" });

    const proximo = await asUser(user).get(`/api/transactions?month=${PROXIMO}`);
    expect(proximo.body.items[0].amountCents).toBe(150000);
    expect(proximo.body.items[0].description).toBe("Aluguel");
  });

  it("editar a recorrência propaga do mês corrente em diante", async () => {
    const criada = await criarRecorrencia();

    await asUser(user)
      .patch(`/api/recurring/${criada.body.recurrence.id}`)
      .send({ amountCents: 160000 });

    const atual = await asUser(user).get(`/api/transactions?month=${HOJE}`);
    const proximo = await asUser(user).get(`/api/transactions?month=${PROXIMO}`);

    expect(atual.body.items[0].amountCents).toBe(160000);
    expect(proximo.body.items[0].amountCents).toBe(160000);
  });

  it("desativar a recorrência remove as projeções futuras", async () => {
    const criada = await criarRecorrencia();
    await asUser(user).get(`/api/transactions?month=${PROXIMO}`);

    await asUser(user).patch(`/api/recurring/${criada.body.recurrence.id}`).send({ active: false });

    const proximo = await asUser(user).get(`/api/transactions?month=${PROXIMO}`);
    expect(proximo.body.total).toBe(0);
  });
});

describe("Excluir ocorrência", () => {
  it("apagar a ocorrência de um mês é definitivo — ela não volta", async () => {
    // Sem o soft delete, `ensureMonthMaterialized` recriaria a linha na
    // próxima visita à tela.
    await criarRecorrencia();

    const lista = await asUser(user).get(`/api/transactions?month=${HOJE}`);
    await asUser(user).delete(`/api/transactions/${lista.body.items[0].id}`);

    const depois = await asUser(user).get(`/api/transactions?month=${HOJE}`);
    expect(depois.body.total).toBe(0);

    const maisUmaVez = await asUser(user).get(`/api/transactions?month=${HOJE}`);
    expect(maisUmaVez.body.total).toBe(0);
  });
});

describe("DELETE /api/recurring/:id", () => {
  it("remove as projeções futuras e preserva o histórico", async () => {
    const criada = await criarRecorrencia({ startMonth: "2026-01" });

    await asUser(user).get("/api/transactions?month=2026-01");
    await asUser(user).get(`/api/transactions?month=${PROXIMO}`);

    await asUser(user).delete(`/api/recurring/${criada.body.recurrence.id}`);

    const passado = await asUser(user).get("/api/transactions?month=2026-01");
    const futuro = await asUser(user).get(`/api/transactions?month=${PROXIMO}`);

    expect(passado.body.total).toBe(1);
    expect(futuro.body.total).toBe(0);
  });

  it("não deixa mexer na recorrência de outro usuário", async () => {
    const criada = await criarRecorrencia();
    const outro = await createUser({ email: "recorrencia-alheia@exemplo.com" });

    const res = await asUser(outro).delete(`/api/recurring/${criada.body.recurrence.id}`);
    expect(res.status).toBe(404);
  });
});
