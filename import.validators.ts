import { z } from "zod";
import { DUPLICATE_ACTIONS, TRANSACTION_TYPES } from "../lib/domain.js";
import {
  amountCentsSchema,
  cuidSchema,
  dateOnlySchema,
  descriptionSchema,
} from "./common.validators.js";

/**
 * Edições permitidas na tela de conferência (§14): categoria, descrição, tipo,
 * valor, além de marcar/desmarcar a linha e decidir o que fazer com uma
 * possível duplicata.
 */
export const updateImportRowSchema = z
  .object({
    description: descriptionSchema.optional(),
    amountCents: amountCentsSchema.optional(),
    type: z.enum(TRANSACTION_TYPES).optional(),
    categoryId: cuidSchema.nullable().optional(),
    date: dateOnlySchema.optional(),
    selected: z.boolean().optional(),
    duplicateAction: z.enum(DUPLICATE_ACTIONS).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });
export type UpdateImportRowInput = z.infer<typeof updateImportRowSchema>;

export const confirmImportSchema = z.object({
  /**
   * Quando o usuário corrige uma categoria, o sistema guarda a associação para
   * as próximas importações (§15). Fica opcional para permitir uma importação
   * pontual sem "ensinar" nada.
   */
  learnCategories: z.boolean().default(true),
});
export type ConfirmImportInput = z.infer<typeof confirmImportSchema>;
