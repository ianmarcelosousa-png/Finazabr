import { z } from "zod";
import { RECURRING_TYPES } from "../lib/domain.js";
import {
  amountCentsSchema,
  cuidSchema,
  dayOfMonthSchema,
  descriptionSchema,
  monthSchema,
} from "./common.validators.js";

const baseRecurringShape = {
  type: z.enum(RECURRING_TYPES, {
    errorMap: () => ({ message: "Recorrência só existe para receita ou despesa fixa" }),
  }),
  description: descriptionSchema,
  amountCents: amountCentsSchema,
  categoryId: cuidSchema,
  dayOfMonth: dayOfMonthSchema,
  startMonth: monthSchema,
  endMonth: monthSchema.nullable().optional(),
  active: z.boolean().default(true),
};

export const createRecurringSchema = z
  .object(baseRecurringShape)
  .refine((data) => !data.endMonth || data.endMonth >= data.startMonth, {
    message: "O mês final deve ser igual ou posterior ao inicial",
    path: ["endMonth"],
  });
export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;

export const updateRecurringSchema = z
  .object({
    description: descriptionSchema.optional(),
    amountCents: amountCentsSchema.optional(),
    categoryId: cuidSchema.optional(),
    dayOfMonth: dayOfMonthSchema.optional(),
    endMonth: monthSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;

export const listRecurringQuerySchema = z.object({
  type: z.enum(RECURRING_TYPES).optional(),
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
export type ListRecurringQuery = z.infer<typeof listRecurringQuerySchema>;
