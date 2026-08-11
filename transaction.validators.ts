import { z } from "zod";
import { TRANSACTION_SOURCES, TRANSACTION_TYPES } from "../lib/domain.js";
import {
  amountCentsSchema,
  cuidSchema,
  dateOnlySchema,
  descriptionSchema,
  monthSchema,
} from "./common.validators.js";

export const createTransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES, { errorMap: () => ({ message: "Tipo inválido" }) }),
  description: descriptionSchema,
  amountCents: amountCentsSchema,
  categoryId: cuidSchema,
  date: dateOnlySchema,
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES).optional(),
    description: descriptionSchema.optional(),
    amountCents: amountCentsSchema.optional(),
    categoryId: cuidSchema.optional(),
    date: dateOnlySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const SORT_OPTIONS = [
  "date_desc",
  "date_asc",
  "amount_desc",
  "amount_asc",
  "description_asc",
] as const;

/**
 * Filtros do §18. `month` é atalho para o intervalo do mês; `from`/`to`
 * permitem um período livre. Quando ambos vêm, o período livre vence.
 */
export const listTransactionsQuerySchema = z
  .object({
    month: monthSchema.optional(),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    type: z.enum(TRANSACTION_TYPES).optional(),
    categoryId: cuidSchema.optional(),
    source: z.enum(TRANSACTION_SOURCES).optional(),
    search: z.string().trim().max(200).optional(),
    sort: z.enum(SORT_OPTIONS).default("date_desc"),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(200).default(50),
  })
  .refine((q) => !(q.from && q.to) || q.from <= q.to, {
    message: "A data inicial deve ser anterior à data final",
    path: ["from"],
  });
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
