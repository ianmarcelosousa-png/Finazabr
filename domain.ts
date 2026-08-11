/**
 * Conjuntos fechados do domínio. Ficam como String no banco (ver comentário no
 * schema.prisma) e são validados por Zod na borda da API — estes arrays são a
 * única fonte de verdade dos valores aceitos.
 */

export const TRANSACTION_TYPES = ["income", "fixed_expense", "variable_expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Recorrência existe para receita principal e despesa fixa (§5 e §6). */
export const RECURRING_TYPES = ["income", "fixed_expense"] as const;
export type RecurringType = (typeof RECURRING_TYPES)[number];

export const CATEGORY_TYPES = ["income", "expense"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const TRANSACTION_SOURCES = ["manual", "recurring", "import"] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const IMPORT_FORMATS = ["csv", "ofx", "pdf"] as const;
export type ImportFormat = (typeof IMPORT_FORMATS)[number];

export const DUPLICATE_ACTIONS = ["ignore", "import_anyway", "merge"] as const;
export type DuplicateAction = (typeof DUPLICATE_ACTIONS)[number];

/** De onde veio a sugestão de categoria, para explicar a escolha na tela. */
export const SUGGESTION_SOURCES = ["user_rule", "merchant", "fallback"] as const;
export type SuggestionSource = (typeof SUGGESTION_SOURCES)[number];

export function isExpenseType(type: string): boolean {
  return type === "fixed_expense" || type === "variable_expense";
}

/** Qual grupo de categorias pode ser usado por um tipo de lançamento. */
export function categoryTypeForTransaction(type: TransactionType): CategoryType {
  return type === "income" ? "income" : "expense";
}
