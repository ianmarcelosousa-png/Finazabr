import type { Request, Response } from "express";
import { userScope } from "../middleware/withUserDb.js";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from "../validators/transaction.validators.js";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "../services/transaction.service.js";

export async function index(req: Request, res: Response): Promise<void> {
  const { userId, runDb } = userScope(req);
  const query = listTransactionsQuerySchema.parse(req.query);
  const result = await runDb((db) => listTransactions(db, userId, query));
  res.status(200).json(result);
}

export async function show(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  const transaction = await runDb((db) => getTransaction(db, req.params.id));
  res.status(200).json({ transaction });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { userId, runDb } = userScope(req);
  const input = createTransactionSchema.parse(req.body);
  const transaction = await runDb((db) => createTransaction(db, userId, input));
  res.status(201).json({ transaction });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  const input = updateTransactionSchema.parse(req.body);
  const transaction = await runDb((db) => updateTransaction(db, req.params.id, input));
  res.status(200).json({ transaction });
}

export async function destroy(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  await runDb((db) => deleteTransaction(db, req.params.id));
  res.status(204).send();
}
