import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME } from "../lib/cookies.js";
import { verifyAuthToken } from "../lib/jwt.js";
import { Errors } from "../lib/errors.js";

/**
 * Garante que a requisição está autenticada e popula req.userId a partir do
 * JWT assinado no cookie httpOnly. O front-end nunca envia um user_id — o
 * servidor é a única fonte de verdade sobre "quem está logado".
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token || typeof token !== "string") {
    next(Errors.unauthorized());
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(Errors.unauthorized("Sessão inválida ou expirada"));
  }
}
