import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { env } from "../lib/env.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `Rota não encontrada: ${req.method} ${req.path}` } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "UNPROCESSABLE_ENTITY",
        message: "Erro de validação",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // Erro não tratado: nunca vazar stack trace, mensagem interna ou detalhes do banco.
  if (env.NODE_ENV !== "production") {
    console.error(err);
  }
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
}
