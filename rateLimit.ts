import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { env } from "../lib/env.js";

/**
 * Em teste, a suíte inteira roda no mesmo "IP" (127.0.0.1 via supertest) e
 * dispara muito mais requisições de auth do que qualquer usuário real faria
 * em minutos — então o limitador é desativado nesse ambiente. Continua
 * ativo em development/production, que é onde ele protege de verdade.
 */
const passthrough = (_req: Request, _res: Response, next: NextFunction) => next();

/**
 * Limite apertado para login/registro/reset de senha — mitiga brute force e
 * credential stuffing. Conta por IP; a resposta 429 não revela se o e-mail
 * existe ou não (isso já é responsabilidade dos handlers).
 */
export const authRateLimiter =
  env.NODE_ENV === "test"
    ? passthrough
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
          },
        },
      });

/** Limite geral, mais permissivo, para o restante da API autenticada. */
export const apiRateLimiter =
  env.NODE_ENV === "test"
    ? passthrough
    : rateLimit({
        windowMs: 60 * 1000,
        limit: 120,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: { code: "TOO_MANY_REQUESTS", message: "Muitas requisições. Tente novamente em instantes." },
        },
      });
