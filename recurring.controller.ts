import type { Request, Response } from "express";
import { userScope } from "../middleware/withUserDb.js";
import {
  createRecurringSchema,
  listRecurringQuerySchema,
  updateRecurringSchema,
} from "../validators/recurring.validators.js";
import {
  createRecurring,
  deleteRecurring,
  listRecurring,
  updateRecurring,
} from "../services/recurrence.service.js";

export async function index(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  const query = listRecurringQuerySchema.parse(req.query);
  const recurrences = await runDb((db) => listRecurring(db, query));
  res.status(200).json({ recurrences });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { userId, runDb } = userScope(req);
  const input = createRecurringSchema.parse(req.body);
  const recurrence = await runDb((db) => createRecurring(db, userId, input));
  res.status(201).json({ recurrence });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  const input = updateRecurringSchema.parse(req.body);
  const recurrence = await runDb((db) => updateRecurring(db, req.params.id, input));
  res.status(200).json({ recurrence });
}

export async function destroy(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  await runDb((db) => deleteRecurring(db, req.params.id));
  res.status(204).send();
}
