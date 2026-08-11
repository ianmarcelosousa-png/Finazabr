import type { Request, Response } from "express";
import { userScope } from "../middleware/withUserDb.js";
import { deleteRule, listRules } from "../services/import.service.js";

export async function index(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  const rules = await runDb((db) => listRules(db));
  res.status(200).json({ rules });
}

export async function destroy(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  await runDb((db) => deleteRule(db, req.params.id));
  res.status(204).send();
}
