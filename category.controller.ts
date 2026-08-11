import type { Request, Response } from "express";
import { userScope } from "../middleware/withUserDb.js";
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from "../validators/category.validators.js";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../services/category.service.js";

export async function index(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  const query = listCategoriesQuerySchema.parse(req.query);
  const categories = await runDb((db) => listCategories(db, query));
  res.status(200).json({ categories });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { userId, runDb } = userScope(req);
  const input = createCategorySchema.parse(req.body);
  const category = await runDb((db) => createCategory(db, userId, input));
  res.status(201).json({ category });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  const input = updateCategorySchema.parse(req.body);
  const category = await runDb((db) => updateCategory(db, req.params.id, input));
  res.status(200).json({ category });
}

export async function destroy(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  await runDb((db) => deleteCategory(db, req.params.id));
  res.status(204).send();
}
