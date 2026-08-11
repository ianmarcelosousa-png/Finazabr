import { z } from "zod";
import { CATEGORY_TYPES } from "../lib/domain.js";
import { hexColorSchema, iconNameSchema } from "./common.validators.js";

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(50, "Nome deve ter no máximo 50 caracteres"),
  type: z.enum(CATEGORY_TYPES, { errorMap: () => ({ message: "Tipo inválido" }) }),
  color: hexColorSchema.default("#64748b"),
  icon: iconNameSchema.default("Tag"),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/** O `type` não é alterável: mudá-lo invalidaria os lançamentos já vinculados. */
export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(50).optional(),
  color: hexColorSchema.optional(),
  icon: iconNameSchema.optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const listCategoriesQuerySchema = z.object({
  type: z.enum(CATEGORY_TYPES).optional(),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
