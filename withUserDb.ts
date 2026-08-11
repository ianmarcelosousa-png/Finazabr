import type { NextFunction, Request, Response } from "express";
import { runAsUser, type Db } from "../lib/prisma.js";
import { Errors } from "../lib/errors.js";

/**
 * Entrega a `req.runDb` um acesso ao banco já amarrado ao usuário da sessão.
 *
 * Roda sempre depois de `requireAuth`, então `req.userId` veio de um JWT
 * verificado no servidor. Como este é o único caminho pelo qual os controllers
 * chegam ao banco, não existe lugar no código onde um `user_id` vindo do
 * cliente possa escapar para uma query.
 */
export function withUserDb(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.userId;

  if (!userId) {
    next(Errors.unauthorized());
    return;
  }

  req.runDb = <T>(fn: (db: Db) => Promise<T>) => runAsUser(userId, fn);
  next();
}

/**
 * Estreita o tipo de `req.runDb` dentro dos controllers, que sempre rodam
 * depois de `withUserDb`.
 */
export function userScope(req: Request): {
  userId: string;
  runDb: <T>(fn: (db: Db) => Promise<T>) => Promise<T>;
} {
  if (!req.userId || !req.runDb) {
    throw Errors.unauthorized();
  }
  return { userId: req.userId, runDb: req.runDb };
}
