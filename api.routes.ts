import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { withUserDb } from "../middleware/withUserDb.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import * as categories from "../controllers/category.controller.js";
import * as transactions from "../controllers/transaction.controller.js";
import * as recurring from "../controllers/recurring.controller.js";
import * as dashboard from "../controllers/dashboard.controller.js";
import * as imports from "../controllers/import.controller.js";
import * as rules from "../controllers/rule.controller.js";
import { uploadStatement } from "../middleware/upload.js";

/**
 * Todas as rotas de dados passam por `requireAuth` (identidade vinda do JWT) e
 * `withUserDb` (banco escopado com RLS ativa). Não existe rota de dados fora
 * deste par — é o que garante, estruturalmente, que nenhum handler consiga
 * consultar o banco sem um usuário autenticado no escopo.
 */
export const apiRouter = Router();

apiRouter.use(requireAuth, withUserDb);

apiRouter.get("/categories", asyncHandler(categories.index));
apiRouter.post("/categories", asyncHandler(categories.create));
apiRouter.patch("/categories/:id", asyncHandler(categories.update));
apiRouter.delete("/categories/:id", asyncHandler(categories.destroy));

apiRouter.get("/transactions", asyncHandler(transactions.index));
apiRouter.get("/transactions/:id", asyncHandler(transactions.show));
apiRouter.post("/transactions", asyncHandler(transactions.create));
apiRouter.patch("/transactions/:id", asyncHandler(transactions.update));
apiRouter.delete("/transactions/:id", asyncHandler(transactions.destroy));

apiRouter.get("/recurring", asyncHandler(recurring.index));
apiRouter.post("/recurring", asyncHandler(recurring.create));
apiRouter.patch("/recurring/:id", asyncHandler(recurring.update));
apiRouter.delete("/recurring/:id", asyncHandler(recurring.destroy));

apiRouter.get("/dashboard/summary", asyncHandler(dashboard.summary));

apiRouter.get("/settings", asyncHandler(dashboard.showSettings));
apiRouter.patch("/settings", asyncHandler(dashboard.patchSettings));

apiRouter.get("/imports", asyncHandler(imports.index));
apiRouter.post("/imports", uploadStatement, asyncHandler(imports.create));
apiRouter.get("/imports/:id", asyncHandler(imports.show));
apiRouter.patch("/imports/:id/rows/:rowId", asyncHandler(imports.updateRow));
apiRouter.post("/imports/:id/confirm", asyncHandler(imports.confirm));
apiRouter.delete("/imports/:id", asyncHandler(imports.destroy));

apiRouter.get("/rules", asyncHandler(rules.index));
apiRouter.delete("/rules/:id", asyncHandler(rules.destroy));
