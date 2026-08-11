import request from "supertest";
import { createApp } from "../../src/app.js";

export const app = createApp();

export function rawAuthCookie(res: request.Response): string {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const authCookie = cookies.find((c: string) => c.startsWith("auth_token="));
  if (!authCookie) throw new Error("auth_token cookie não encontrado na resposta");
  return authCookie;
}

/** name=value pronto para reenviar em `.set("Cookie", ...)`. */
export function extractCookie(res: request.Response): string {
  return rawAuthCookie(res).split(";")[0];
}

export interface TestUser {
  id: string;
  email: string;
  cookie: string;
}

let sequence = 0;

/**
 * Cria um usuário pela API real (não por insert direto), para que os testes
 * exercitem o mesmo caminho do usuário de verdade — inclusive a criação das
 * categorias padrão sob RLS.
 */
export async function createUser(overrides: Partial<{ name: string; email: string; password: string }> = {}): Promise<TestUser> {
  sequence += 1;
  const email = overrides.email ?? `usuario${sequence}@exemplo.com`;

  const res = await request(app)
    .post("/auth/register")
    .send({
      name: overrides.name ?? `Usuário ${sequence}`,
      email,
      password: overrides.password ?? "senhaForte123",
    });

  if (res.status !== 201) {
    throw new Error(`Falha ao criar usuário de teste: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { id: res.body.user.id, email, cookie: extractCookie(res) };
}

/** Cliente autenticado, para não repetir `.set("Cookie", ...)` em todo teste. */
export function asUser(user: TestUser) {
  return {
    get: (path: string) => request(app).get(path).set("Cookie", user.cookie),
    post: (path: string) => request(app).post(path).set("Cookie", user.cookie),
    patch: (path: string) => request(app).patch(path).set("Cookie", user.cookie),
    delete: (path: string) => request(app).delete(path).set("Cookie", user.cookie),
  };
}

/** Busca uma categoria do usuário pelo nome — atalho usado em quase todo teste. */
export async function categoryId(
  user: TestUser,
  name: string,
  type: "income" | "expense"
): Promise<string> {
  const res = await asUser(user).get(`/api/categories?type=${type}`);
  const found = res.body.categories.find((c: { name: string }) => c.name === name);
  if (!found) throw new Error(`Categoria "${name}" (${type}) não encontrada`);
  return found.id;
}
