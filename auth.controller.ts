import type { Request, Response } from "express";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validators/auth.validators.js";
import {
  changePassword,
  getUserById,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  updateProfile,
} from "../services/auth.service.js";
import { setAuthCookie, clearAuthCookie } from "../lib/cookies.js";
import { signAuthToken } from "../lib/jwt.js";
import { Errors } from "../lib/errors.js";

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const user = await registerUser(input);
  setAuthCookie(res, signAuthToken(user.id));
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const user = await loginUser(input);
  setAuthCookie(res, signAuthToken(user.id));
  res.status(200).json({ user });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  clearAuthCookie(res);
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw Errors.unauthorized();
  const user = await getUserById(req.userId);
  res.status(200).json({ user });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw Errors.unauthorized();
  const input = updateProfileSchema.parse(req.body);
  const user = await updateProfile(req.userId, input);
  res.status(200).json({ user });
}

export async function changeMyPassword(req: Request, res: Response): Promise<void> {
  if (!req.userId) throw Errors.unauthorized();
  const input = changePasswordSchema.parse(req.body);
  await changePassword(req.userId, input);
  res.status(204).send();
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const input = forgotPasswordSchema.parse(req.body);
  await requestPasswordReset(input);
  // Mensagem genérica sempre — não revela se o e-mail existe na base.
  res.status(200).json({
    message: "Se este e-mail estiver cadastrado, enviaremos um link de redefinição.",
  });
}

export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
  const input = resetPasswordSchema.parse(req.body);
  await resetPassword(input);
  res.status(200).json({ message: "Senha redefinida com sucesso." });
}
