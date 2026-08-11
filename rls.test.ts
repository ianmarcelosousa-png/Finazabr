import { describe, expect, it } from "vitest";
import { _unsafeAppClient, runAsUser } from "../../src/lib/prisma.js";
import { createUser, asUser, categoryId } from "../helpers/api.js";

/**
 * Prova que o isolamento entre usuários é garantido pelo BANCO, não só pela
 * aplicação.
 *
 * Estes testes falam SQL cru pela conexão da aplicação (role `app_user`), sem
 * passar por nenhum service. Se as políticas de Row Level Security não
 * estiverem valendo, eles passam a enxergar dados alheios e falham — que é
 * exatamente o alarme que se quer ter.
 */
describe("Row Level Security", () => {
  it("sem app.current_user_id definido, nenhuma linha é visível", async () => {
    const user = await createUser();
    const catId = await categoryId(user, "Alimentação", "expense");

    await asUser(user)
      .post("/api/transactions")
      .send({
        type: "variable_expense",
        description: "Lanche",
        amountCents: 3500,
        categoryId: catId,
        date: "2026-08-08",
      });

    // Consulta fora de qualquer escopo de usuário: a política compara
    // user_id com NULL, o que nunca é verdadeiro. Falha fechado.
    const rows = await _unsafeAppClient.$queryRawUnsafe<unknown[]>(
      `SELECT id FROM transactions`
    );

    expect(rows).toHaveLength(0);
  });

  it("o usuário A não enxerga nenhuma linha do usuário B", async () => {
    const a = await createUser({ email: "rls-a@exemplo.com" });
    const b = await createUser({ email: "rls-b@exemplo.com" });

    const catA = await categoryId(a, "Alimentação", "expense");
    const catB = await categoryId(b, "Transporte", "expense");

    await asUser(a).post("/api/transactions").send({
      type: "variable_expense",
      description: "Almoço do A",
      amountCents: 4000,
      categoryId: catA,
      date: "2026-08-08",
    });

    await asUser(b).post("/api/transactions").send({
      type: "variable_expense",
      description: "Uber do B",
      amountCents: 2200,
      categoryId: catB,
      date: "2026-08-08",
    });

    const seenByA = await runAsUser(a.id, (db) =>
      db.$queryRawUnsafe<{ description: string }[]>(`SELECT description FROM transactions`)
    );

    expect(seenByA).toHaveLength(1);
    expect(seenByA[0].description).toBe("Almoço do A");
  });

  it("o usuário A não consegue INSERIR uma linha carimbada com o id do B", async () => {
    const a = await createUser({ email: "rls-insert-a@exemplo.com" });
    const b = await createUser({ email: "rls-insert-b@exemplo.com" });
    const catB = await categoryId(b, "Alimentação", "expense");

    // É o que o `WITH CHECK` da política existe para impedir: sem ele, uma
    // falha de validação na aplicação viraria escrita no dado de outra pessoa.
    await expect(
      runAsUser(a.id, (db) =>
        db.$executeRawUnsafe(
          `INSERT INTO transactions
             (id, user_id, category_id, description, amount_cents, type, date, source, created_at, updated_at)
           VALUES ('forjada-1', $1, $2, 'Injetada', 100, 'variable_expense', DATE '2026-08-08', 'manual', NOW(), NOW())`,
          b.id,
          catB
        )
      )
    ).rejects.toThrow();
  });

  it("o usuário A não consegue ATUALIZAR nem APAGAR uma linha do B", async () => {
    const a = await createUser({ email: "rls-update-a@exemplo.com" });
    const b = await createUser({ email: "rls-update-b@exemplo.com" });
    const catB = await categoryId(b, "Alimentação", "expense");

    const created = await asUser(b).post("/api/transactions").send({
      type: "variable_expense",
      description: "Jantar do B",
      amountCents: 8000,
      categoryId: catB,
      date: "2026-08-08",
    });
    const targetId = created.body.transaction.id as string;

    const updated = await runAsUser(a.id, (db) =>
      db.$executeRawUnsafe(
        `UPDATE transactions SET description = 'sequestrada' WHERE id = $1`,
        targetId
      )
    );
    const deleted = await runAsUser(a.id, (db) =>
      db.$executeRawUnsafe(`DELETE FROM transactions WHERE id = $1`, targetId)
    );

    // A política não deixa a linha nem ser vista, então nada é afetado.
    expect(updated).toBe(0);
    expect(deleted).toBe(0);

    const stillThere = await asUser(b).get(`/api/transactions/${targetId}`);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.transaction.description).toBe("Jantar do B");
  });

  it("a RLS cobre todas as tabelas com user_id", async () => {
    const tables = [
      "categories",
      "transactions",
      "recurring_transactions",
      "user_settings",
      "import_files",
      "imported_transactions",
      "categorization_rules",
    ];

    const rows = await _unsafeAppClient.$queryRawUnsafe<
      { tablename: string; rowsecurity: boolean; relforcerowsecurity: boolean }[]
    >(
      `SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity, c.relforcerowsecurity
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = current_schema()
          AND c.relname = ANY($1::text[])`,
      tables
    );

    expect(rows).toHaveLength(tables.length);
    for (const row of rows) {
      expect(row.rowsecurity, `${row.tablename} sem RLS habilitada`).toBe(true);
      expect(row.relforcerowsecurity, `${row.tablename} sem FORCE RLS`).toBe(true);
    }
  });
});
