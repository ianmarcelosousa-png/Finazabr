import type { Db } from "../lib/prisma.js";

export {};

declare global {
  namespace Express {
    interface Request {
      /** ID do usuário autenticado, extraído do JWT — nunca do body/params/query. */
      userId?: string;

      /**
       * Executa uma operação de banco no escopo do usuário autenticado, com as
       * políticas de RLS ativas. Populado por `withUserDb`, que roda sempre
       * depois de `requireAuth`.
       */
      runDb?: <T>(fn: (db: Db) => Promise<T>) => Promise<T>;
    }
  }
}
