import { describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

import { ownerDb } from "../helpers/db.js";
import { env } from "../../src/lib/env.js";

import { app } from "../helpers/api.js";

function rawAuthCookie(res: request.Response): string {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const authCookie = cookies.find((c: string) => c.startsWith("auth_token="));
  if (!authCookie) throw new Error("auth_token cookie não encontrado na resposta");
  return authCookie;
}

/** name=value pronto para reenviar em `.set("Cookie", ...)`. */
function extractCookie(res: request.Response): string {
  return rawAuthCookie(res).split(";")[0];
}

async function registerUser(overrides: Partial<{ name: string; email: string; password: string }> = {}) {
  const res = await request(app)
    .post("/auth/register")
    .send({
      name: overrides.name ?? "Usuário Teste",
      email: overrides.email ?? "teste@exemplo.com",
      password: overrides.password ?? "senhaForte123",
    });
  return { res, cookie: res.status === 201 ? extractCookie(res) : null };
}

describe("POST /auth/register", () => {
  it("cria o usuário, categorias padrão e configurações em uma transação", async () => {
    const { res } = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Usuário Teste", email: "teste@exemplo.com" });
    expect(res.body.user.passwordHash).toBeUndefined();

    const dbUser = await ownerDb.user.findUniqueOrThrow({ where: { email: "teste@exemplo.com" } });
    expect(dbUser.passwordHash).not.toBe("senhaForte123");

    const categorias = await ownerDb.category.findMany({ where: { userId: dbUser.id } });
    expect(categorias).toHaveLength(21);
    expect(categorias.filter((c) => c.type === "income")).toHaveLength(5);
    expect(categorias.filter((c) => c.type === "expense")).toHaveLength(16);

    const settings = await ownerDb.userSettings.findUnique({ where: { userId: dbUser.id } });
    expect(settings?.investmentPercentage).toBe(20);
  });

  it("rejeita e-mail duplicado com 409", async () => {
    await registerUser({ email: "duplicado@exemplo.com" });
    const { res } = await registerUser({ email: "duplicado@exemplo.com" });
    expect(res.status).toBe(409);
  });

  it("rejeita senha fraca com 422", async () => {
    const { res } = await registerUser({ password: "123" });
    expect(res.status).toBe(422);
  });

  it("rejeita e-mail inválido com 422", async () => {
    const { res } = await registerUser({ email: "não-é-um-email" });
    expect(res.status).toBe(422);
  });
});

describe("POST /auth/login", () => {
  it("autentica com credenciais corretas e retorna cookie httpOnly", async () => {
    await registerUser({ email: "login@exemplo.com", password: "senhaForte123" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@exemplo.com", password: "senhaForte123" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("login@exemplo.com");
    expect(rawAuthCookie(res)).toMatch(/HttpOnly/i);
  });

  it("rejeita senha inválida com 401", async () => {
    await registerUser({ email: "senhaerrada@exemplo.com" });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "senhaerrada@exemplo.com", password: "senhaTotalmenteErrada1" });
    expect(res.status).toBe(401);
  });

  it("retorna a mesma mensagem para e-mail inexistente (evita enumeração)", async () => {
    await registerUser({ email: "existe@exemplo.com" });

    const semUsuario = await request(app)
      .post("/auth/login")
      .send({ email: "naoexiste@exemplo.com", password: "qualquerSenha1" });
    const senhaErrada = await request(app)
      .post("/auth/login")
      .send({ email: "existe@exemplo.com", password: "senhaErrada1" });

    expect(semUsuario.status).toBe(401);
    expect(senhaErrada.status).toBe(401);
    expect(semUsuario.body.error.message).toBe(senhaErrada.body.error.message);
  });
});

describe("Sessão (GET /auth/me)", () => {
  it("retorna 401 sem cookie", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("retorna o usuário autenticado com cookie válido", async () => {
    const { cookie } = await registerUser({ email: "sessao@exemplo.com" });
    const res = await request(app).get("/auth/me").set("Cookie", cookie!);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("sessao@exemplo.com");
  });

  it("rejeita um token assinado com segredo diferente", async () => {
    const forged = jwt.sign({ sub: "qualquer-id" }, "segredo-errado-completamente-diferente");
    const res = await request(app).get("/auth/me").set("Cookie", `auth_token=${forged}`);
    expect(res.status).toBe(401);
  });

  it("rejeita um token válido para um usuário que não existe mais", async () => {
    const forged = jwt.sign({ sub: "usuario-inexistente" }, env.JWT_SECRET);
    const res = await request(app).get("/auth/me").set("Cookie", `auth_token=${forged}`);
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("limpa o cookie de sessão", async () => {
    const { cookie } = await registerUser({ email: "logout@exemplo.com" });
    const res = await request(app).post("/auth/logout").set("Cookie", cookie!);
    expect(res.status).toBe(204);
    const clearHeader = res.headers["set-cookie"]?.[0] ?? "";
    expect(clearHeader).toMatch(/auth_token=;/);
  });
});

describe("Isolamento entre usuários", () => {
  it("o cookie de um usuário nunca revela dados de outro usuário", async () => {
    const a = await registerUser({ name: "Usuário A", email: "a@isolamento.com" });
    const b = await registerUser({ name: "Usuário B", email: "b@isolamento.com" });

    const meA = await request(app).get("/auth/me").set("Cookie", a.cookie!);
    const meB = await request(app).get("/auth/me").set("Cookie", b.cookie!);

    expect(meA.body.user.email).toBe("a@isolamento.com");
    expect(meB.body.user.email).toBe("b@isolamento.com");
    expect(meA.body.user.id).not.toBe(meB.body.user.id);

    // Cada usuário tem seu próprio conjunto de categorias — nunca compartilhado.
    const catsA = await ownerDb.category.findMany({ where: { userId: meA.body.user.id } });
    const catsB = await ownerDb.category.findMany({ where: { userId: meB.body.user.id } });
    expect(catsA.every((c) => c.userId === meA.body.user.id)).toBe(true);
    expect(catsB.every((c) => c.userId === meB.body.user.id)).toBe(true);
  });

  it("um token forjado para o id de outro usuário não passa a autenticação após ele ser removido", async () => {
    const { res } = await registerUser({ email: "removido@exemplo.com" });
    const userId = res.body.user.id as string;
    const forged = jwt.sign({ sub: userId }, env.JWT_SECRET);

    await ownerDb.user.delete({ where: { id: userId } });

    const meRes = await request(app).get("/auth/me").set("Cookie", `auth_token=${forged}`);
    expect(meRes.status).toBe(401);
  });
});

describe("PATCH /auth/me", () => {
  it("atualiza nome e e-mail do usuário autenticado", async () => {
    const { cookie } = await registerUser({ email: "perfil@exemplo.com" });
    const res = await request(app)
      .patch("/auth/me")
      .set("Cookie", cookie!)
      .send({ name: "Nome Atualizado", email: "novoemail@exemplo.com" });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: "Nome Atualizado", email: "novoemail@exemplo.com" });
  });

  it("rejeita e-mail já usado por outra conta com 409", async () => {
    await registerUser({ email: "ocupado@exemplo.com" });
    const { cookie } = await registerUser({ email: "outro@exemplo.com" });

    const res = await request(app)
      .patch("/auth/me")
      .set("Cookie", cookie!)
      .send({ name: "Outro", email: "ocupado@exemplo.com" });

    expect(res.status).toBe(409);
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).patch("/auth/me").send({ name: "X", email: "x@x.com" });
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/change-password", () => {
  it("rejeita senha atual incorreta com 400", async () => {
    const { cookie } = await registerUser({ email: "trocasenha@exemplo.com" });
    const res = await request(app)
      .post("/auth/change-password")
      .set("Cookie", cookie!)
      .send({ currentPassword: "senhaErrada1", newPassword: "senhaNova123" });
    expect(res.status).toBe(400);
  });

  it("troca a senha e permite login apenas com a nova senha", async () => {
    const { cookie } = await registerUser({
      email: "trocasenha2@exemplo.com",
      password: "senhaAntiga123",
    });

    const change = await request(app)
      .post("/auth/change-password")
      .set("Cookie", cookie!)
      .send({ currentPassword: "senhaAntiga123", newPassword: "senhaNova456" });
    expect(change.status).toBe(204);

    const loginAntiga = await request(app)
      .post("/auth/login")
      .send({ email: "trocasenha2@exemplo.com", password: "senhaAntiga123" });
    expect(loginAntiga.status).toBe(401);

    const loginNova = await request(app)
      .post("/auth/login")
      .send({ email: "trocasenha2@exemplo.com", password: "senhaNova456" });
    expect(loginNova.status).toBe(200);
  });
});
