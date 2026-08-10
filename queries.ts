import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { api, toQuery } from "../lib/api";
import type {
  ArquivoImportacao,
  Categoria,
  Configuracoes,
  FiltrosLancamentos,
  ImportacaoDetalhe,
  Lancamento,
  ListaLancamentos,
  Recorrencia,
  RegraCategorizacao,
  ResultadoImportacao,
  ResumoMensal,
} from "../types";

/**
 * Camada de dados do front-end.
 *
 * Tudo é estado de servidor, então o React Query cuida de cache e
 * revalidação. As mutações invalidam as chaves afetadas — é isso que faz os
 * cards, a tabela e o gráfico se atualizarem juntos a cada lançamento criado,
 * editado, excluído ou importado (§22), sem nenhum "refresh" manual.
 */

export const queryKeys = {
  categorias: ["categorias"] as const,
  lancamentos: (filtros: FiltrosLancamentos) => ["lancamentos", filtros] as const,
  recorrencias: ["recorrencias"] as const,
  resumo: (mes: string) => ["resumo", mes] as const,
  configuracoes: ["configuracoes"] as const,
  importacoes: ["importacoes"] as const,
  importacao: (id: string) => ["importacao", id] as const,
  regras: ["regras"] as const,
};

/** Chaves que dependem dos lançamentos — invalidadas juntas em toda escrita. */
function invalidarDadosFinanceiros(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
  queryClient.invalidateQueries({ queryKey: ["resumo"] });
  queryClient.invalidateQueries({ queryKey: ["recorrencias"] });
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export function useCategorias() {
  return useQuery({
    queryKey: queryKeys.categorias,
    queryFn: () => api.get<{ categories: Categoria[] }>("/api/categories"),
    select: (data) => data.categories,
    // Categorias mudam raramente e são lidas por quase toda tela.
    staleTime: 5 * 60 * 1000,
  });
}

export function useCriarCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Pick<Categoria, "name" | "type" | "color" | "icon">) =>
      api.post<{ category: Categoria }>("/api/categories", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categorias }),
  });
}

export function useAtualizarCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<Pick<Categoria, "name" | "color" | "icon">>) =>
      api.patch<{ category: Categoria }>(`/api/categories/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
      invalidarDadosFinanceiros(queryClient);
    },
  });
}

export function useExcluirCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categorias }),
  });
}

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------

export function useLancamentos(filtros: FiltrosLancamentos) {
  return useQuery({
    queryKey: queryKeys.lancamentos(filtros),
    queryFn: () => api.get<ListaLancamentos>(`/api/transactions${toQuery(filtros)}`),
    // Mantém a página anterior visível enquanto a nova carrega, para a tabela
    // não piscar a cada troca de filtro.
    placeholderData: (anterior) => anterior,
  });
}

export interface NovoLancamento {
  type: Lancamento["type"];
  description: string;
  amountCents: number;
  categoryId: string;
  date: string;
}

export function useCriarLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NovoLancamento) =>
      api.post<{ transaction: Lancamento }>("/api/transactions", input),
    onSuccess: () => invalidarDadosFinanceiros(queryClient),
  });
}

export function useAtualizarLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<NovoLancamento>) =>
      api.patch<{ transaction: Lancamento }>(`/api/transactions/${id}`, input),
    onSuccess: () => invalidarDadosFinanceiros(queryClient),
  });
}

export function useExcluirLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/transactions/${id}`),
    onSuccess: () => invalidarDadosFinanceiros(queryClient),
  });
}

// ---------------------------------------------------------------------------
// Recorrências
// ---------------------------------------------------------------------------

export function useRecorrencias(type?: Recorrencia["type"]) {
  return useQuery({
    queryKey: [...queryKeys.recorrencias, type ?? "todas"],
    queryFn: () =>
      api.get<{ recurrences: Recorrencia[] }>(`/api/recurring${toQuery({ type })}`),
    select: (data) => data.recurrences,
  });
}

export type NovaRecorrencia = Omit<Recorrencia, "id">;

export function useCriarRecorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NovaRecorrencia) =>
      api.post<{ recurrence: Recorrencia }>("/api/recurring", input),
    onSuccess: () => invalidarDadosFinanceiros(queryClient),
  });
}

export function useAtualizarRecorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<NovaRecorrencia>) =>
      api.patch<{ recurrence: Recorrencia }>(`/api/recurring/${id}`, input),
    onSuccess: () => invalidarDadosFinanceiros(queryClient),
  });
}

export function useExcluirRecorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/recurring/${id}`),
    onSuccess: () => invalidarDadosFinanceiros(queryClient),
  });
}

// ---------------------------------------------------------------------------
// Dashboard e configurações
// ---------------------------------------------------------------------------

export function useResumoMensal(mes: string) {
  return useQuery({
    queryKey: queryKeys.resumo(mes),
    queryFn: () => api.get<ResumoMensal>(`/api/dashboard/summary${toQuery({ month: mes })}`),
  });
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: queryKeys.configuracoes,
    queryFn: () => api.get<{ settings: Configuracoes }>("/api/settings"),
    select: (data) => data.settings,
  });
}

export function useAtualizarConfiguracoes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Configuracoes) =>
      api.patch<{ settings: Configuracoes }>("/api/settings", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configuracoes });
      // O valor a investir é calculado no servidor a partir do percentual.
      queryClient.invalidateQueries({ queryKey: ["resumo"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Importação de extrato
// ---------------------------------------------------------------------------

export function useImportacoes() {
  return useQuery({
    queryKey: queryKeys.importacoes,
    queryFn: () => api.get<{ imports: ArquivoImportacao[] }>("/api/imports"),
    select: (data) => data.imports,
  });
}

export function useImportacao(id: string | null) {
  return useQuery({
    queryKey: queryKeys.importacao(id ?? ""),
    queryFn: () => api.get<ImportacaoDetalhe>(`/api/imports/${id}`),
    enabled: Boolean(id),
  });
}

export function useEnviarExtrato(
  options?: UseMutationOptions<ImportacaoDetalhe, Error, File>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.upload<ImportacaoDetalhe>("/api/imports", file),
    ...options,
    onSuccess: (data, ...rest) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoes });
      queryClient.setQueryData(queryKeys.importacao(data.id), data);
      options?.onSuccess?.(data, ...rest);
    },
  });
}

export function useAtualizarLinhaImportacao(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, ...input }: { rowId: string } & Record<string, unknown>) =>
      api.patch(`/api/imports/${importId}/rows/${rowId}`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.importacao(importId) }),
  });
}

export function useConfirmarImportacao(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { learnCategories: boolean }) =>
      api.post<ResultadoImportacao>(`/api/imports/${importId}/confirm`, input),
    onSuccess: () => {
      invalidarDadosFinanceiros(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.importacao(importId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.importacoes });
      queryClient.invalidateQueries({ queryKey: queryKeys.regras });
    },
  });
}

export function useDescartarImportacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/imports/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.importacoes }),
  });
}

// ---------------------------------------------------------------------------
// Regras aprendidas
// ---------------------------------------------------------------------------

export function useRegras() {
  return useQuery({
    queryKey: queryKeys.regras,
    queryFn: () => api.get<{ rules: RegraCategorizacao[] }>("/api/rules"),
    select: (data) => data.rules,
  });
}

export function useExcluirRegra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/rules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.regras }),
  });
}
