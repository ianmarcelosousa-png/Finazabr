/**
 * Tipos espelhando os DTOs da API. Valores monetários chegam SEMPRE em
 * centavos inteiros (`amountCents`) — nunca em reais como float. A conversão
 * para exibição acontece só na formatação (lib/finance.ts).
 */

export interface Usuario {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type TipoLancamento = "income" | "fixed_expense" | "variable_expense";
export type TipoRecorrencia = "income" | "fixed_expense";
export type GrupoCategoria = "income" | "expense";
export type OrigemLancamento = "manual" | "recurring" | "import";
export type StatusLancamento = "previsto" | "realizado";

export interface Categoria {
  id: string;
  name: string;
  type: GrupoCategoria;
  color: string;
  icon: string;
  isDefault: boolean;
}

export interface Lancamento {
  id: string;
  date: string; // "AAAA-MM-DD"
  description: string;
  categoryId: string;
  type: TipoLancamento;
  amountCents: number;
  source: OrigemLancamento;
  status: StatusLancamento;
  recurringTransactionId: string | null;
  importFileId: string | null;
}

export interface ListaLancamentos {
  items: Lancamento[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Recorrencia {
  id: string;
  type: TipoRecorrencia;
  description: string;
  amountCents: number;
  categoryId: string;
  dayOfMonth: number;
  startMonth: string; // "AAAA-MM"
  endMonth: string | null;
  active: boolean;
}

export interface FatiaCategoria {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amountCents: number;
  percentage: number;
}

export interface ResumoMensal {
  month: string;
  incomeCents: number;
  expenseCents: number;
  fixedExpenseCents: number;
  variableExpenseCents: number;
  balanceCents: number;
  investmentPercentage: number;
  investmentCents: number;
  availableCents: number;
  expensesByCategory: FatiaCategoria[];
  transactionCount: number;
}

export interface Configuracoes {
  investmentPercentage: number;
}

export type FormatoImportacao = "csv" | "ofx" | "pdf";
export type AcaoDuplicidade = "ignore" | "import_anyway" | "merge";
export type OrigemSugestao = "user_rule" | "merchant" | "fallback";

export interface LinhaImportacao {
  id: string;
  date: string;
  rawDescription: string;
  description: string;
  amountCents: number;
  direction: "in" | "out";
  type: TipoLancamento;
  categoryId: string | null;
  selected: boolean;
  status: "pending" | "imported" | "ignored";
  suggestionSource: OrigemSugestao | null;
  duplicateOfId: string | null;
  duplicateScore: number | null;
  duplicateAction: AcaoDuplicidade | null;
}

export interface ArquivoImportacao {
  id: string;
  filename: string;
  format: FormatoImportacao;
  status: "pending" | "confirmed" | "discarded";
  totalRows: number;
  importedCount: number;
  createdAt: string;
}

export interface ImportacaoDetalhe extends ArquivoImportacao {
  rows: LinhaImportacao[];
  duplicateCount: number;
}

export interface ResultadoImportacao {
  imported: number;
  merged: number;
  ignored: number;
  rulesLearned: number;
}

export interface RegraCategorizacao {
  id: string;
  pattern: string;
  categoryId: string;
  categoryName: string;
  hitCount: number;
  createdAt: string;
}

/** Filtros da tela de lançamentos (§18). */
export interface FiltrosLancamentos {
  month?: string;
  from?: string;
  to?: string;
  type?: TipoLancamento;
  categoryId?: string;
  source?: OrigemLancamento;
  search?: string;
  sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "description_asc";
  page?: number;
  pageSize?: number;
}
