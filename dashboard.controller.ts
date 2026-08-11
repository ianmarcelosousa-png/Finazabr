import type { Request, Response } from "express";
import { z } from "zod";
import { userScope } from "../middleware/withUserDb.js";
import { monthSchema } from "../validators/common.validators.js";
import { currentMonth } from "../lib/dates.js";
import { getDashboardSummary } from "../services/dashboard.service.js";
import { getSettings, updateSettings } from "../services/settings.service.js";
import { updateSettingsSchema } from "../validators/settings.validators.js";

const summaryQuerySchema = z.object({
  /** Sem `month` explícito, o sistema abre no mês atual (§3). */
  month: monthSchema.default(() => currentMonth()),
});

export async function summary(req: Request, res: Response): Promise<void> {
  const { userId, runDb } = userScope(req);
  const { month } = summaryQuerySchema.parse(req.query);
  const result = await runDb((db) => getDashboardSummary(db, userId, month));
  res.status(200).json(result);
}

export async function showSettings(req: Request, res: Response): Promise<void> {
  const { userId, runDb } = userScope(req);
  const settings = await runDb((db) => getSettings(db, userId));
  res.status(200).json({ settings });
}

export async function patchSettings(req: Request, res: Response): Promise<void> {
  const { userId, runDb } = userScope(req);
  const input = updateSettingsSchema.parse(req.body);
  const settings = await runDb((db) => updateSettings(db, userId, input));
  res.status(200).json({ settings });
}
