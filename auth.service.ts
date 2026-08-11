import { Prisma, type User } from "@prisma/client";
import { prismaSystem, runAsUser } from "../lib/prisma.js";
import { hashPassword, comparePassword } from "../lib/password.js";
import { Errors } from "../lib/errors.js";
import { DEFAULT_CATEGORIES, DEFAULT_INVESTMENT_PERCENTAGE } from "../lib/defaultCategories.js";
import { generateRawToken, hashToken } from "../lib/tokens.js";
import { env } from "../lib/env.js";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "../validators/auth.validators.js";

const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

/** Nunca retorne o objeto User cru para o cliente — isso vazaria passwordHash. */
export function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const existing = await prismaSystem.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Errors.conflict("Este e-mail já está cadastrado");
  }

  const passwordHash = await hashPassword(input.password);

  let user: User;
  try {
    user = await prismaSystem.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw Errors.conflict("Este e-mail já está cadastrado");
    }
    throw err;
  }

  // Categorias e configurações vivem sob RLS, então precisam ser criadas já no
  // escopo do novo usuário — o role de autenticação não tem acesso a elas.
  // Isso obriga uma segunda transação; se ela falhar, a conta ficaria
  // inutilizável (sem categorias), então desfazemos a criação do usuário.
  try {
    await runAsUser(user.id, async (db) => {
      await db.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({
          userId: user.id,
          name: c.name,
          type: c.type,
          color: c.color,
          icon: c.icon,
          isDefault: true,
        })),
      });

      await db.userSettings.create({
        data: { userId: user.id, investmentPercentage: DEFAULT_INVESTMENT_PERCENTAGE },
      });
    });
  } catch (err) {
    await prismaSystem.user.delete({ where: { id: user.id } }).catch(() => {});
    throw err;
  }

  return toPublicUser(user);
}

export async function loginUser(input: LoginInput): Promise<PublicUser> {
  const user = await prismaSystem.user.findUnique({ where: { email: input.email } });

  // Mensagem idêntica para "e-mail não existe" e "senha errada": evita
  // enumeração de usuários cadastrados.
  const invalidCredentials = Errors.unauthorized("E-mail ou senha inválidos");
  if (!user) throw invalidCredentials;

  const passwordMatches = await comparePassword(input.password, user.passwordHash);
  if (!passwordMatches) throw invalidCredentials;

  return toPublicUser(user);
}

export async function getUserById(userId: string): Promise<PublicUser> {
  const user = await prismaSystem.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.unauthorized("Sessão inválida");
  return toPublicUser(user);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<PublicUser> {
  const emailOwner = await prismaSystem.user.findUnique({ where: { email: input.email } });
  if (emailOwner && emailOwner.id !== userId) {
    throw Errors.conflict("Este e-mail já está em uso por outra conta");
  }

  const user = await prismaSystem.user.update({
    where: { id: userId },
    data: { name: input.name, email: input.email },
  });

  return toPublicUser(user);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
): Promise<void> {
  const user = await prismaSystem.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.unauthorized("Sessão inválida");

  const currentMatches = await comparePassword(input.currentPassword, user.passwordHash);
  if (!currentMatches) {
    throw Errors.badRequest("Senha atual incorreta");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prismaSystem.user.update({ where: { id: userId }, data: { passwordHash } });
}

/**
 * Gera um token de recuperação de senha de uso único. Sempre retorna
 * sucesso ao chamador (mesma mensagem exista ou não a conta), para não
 * permitir enumeração de e-mails cadastrados — quem descobre se o e-mail
 * existe é apenas quem recebe a mensagem (aqui, o log do servidor, já que
 * não há um provedor de SMTP configurado nesta etapa).
 */
export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const user = await prismaSystem.user.findUnique({ where: { email: input.email } });
  if (!user) return;

  const rawToken = generateRawToken();
  await prismaSystem.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });

  const resetLink = `${env.CLIENT_ORIGIN}/redefinir-senha?token=${rawToken}`;
  // TODO(fase futura): plugar um provedor de e-mail real (ex: SMTP/Resend).
  // Por ora, o "envio" é este log — suficiente para desenvolvimento local.
  console.info(`[password-reset] Link para ${user.email}: ${resetLink}`);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashToken(input.token);
  const record = await prismaSystem.passwordResetToken.findUnique({ where: { tokenHash } });

  const invalidToken = Errors.badRequest("Token inválido ou expirado");
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw invalidToken;
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prismaSystem.$transaction([
    prismaSystem.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prismaSystem.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
}
