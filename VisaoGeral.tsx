import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { MonthSelector } from "../components/ui/MonthSelector";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/Feedback";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { DespesasPorCategoriaChart } from "../components/dashboard/DespesasPorCategoriaChart";
import { LancamentosTable } from "../components/lancamentos/LancamentosTable";
import { NovoLancamentoModal } from "../components/lancamentos/NovoLancamentoModal";
import { useMonth } from "../context/MonthContext";
import { useCategorias, useLancamentos, useResumoMensal } from "../hooks/queries";
import { formatarMesLabel } from "../lib/finance";
import type { Lancamento } from "../types";

export function VisaoGeral() {
  const { mes } = useMonth();
  const [modalOpen, setModalOpen] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Lancamento | null>(null);

  const resumo = useResumoMensal(mes);
  const { data: categorias = [] } = useCategorias();
  const lancamentos = useLancamentos({ month: mes, sort: "date_desc", pageSize: 8 });

  const abrirEdicao = (lancamento: Lancamento) => {
    setEmEdicao(lancamento);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEmEdicao(null);
  };

  return (
    <div>
      <PageHeader
        title={`Visão Geral — ${formatarMesLabel(mes)}`}
        description="Quanto entrou, quanto saiu e para onde o dinheiro foi"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <MonthSelector />
            <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              Novo lançamento
            </Button>
          </div>
        }
      />

      {resumo.isError ? (
        <Card className="p-5">
          <ErrorState error={resumo.error} onRetry={() => resumo.refetch()} />
        </Card>
      ) : (
        <SummaryCards resumo={resumo.data} carregando={resumo.isLoading} />
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-ink-900">
              Lançamentos do mês
            </h2>
            <Link
              to="/lancamentos"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Ver todos
              <ArrowRight size={15} />
            </Link>
          </div>

          {lancamentos.isLoading ? (
            <LoadingState />
          ) : lancamentos.isError ? (
            <ErrorState error={lancamentos.error} onRetry={() => lancamentos.refetch()} />
          ) : lancamentos.data && lancamentos.data.items.length > 0 ? (
            <>
              <LancamentosTable
                itens={lancamentos.data.items}
                categorias={categorias}
                onEditar={abrirEdicao}
              />
              {lancamentos.data.total > lancamentos.data.items.length && (
                <p className="mt-4 text-center text-sm text-ink-500">
                  Mostrando {lancamentos.data.items.length} de {lancamentos.data.total}{" "}
                  lançamentos.
                </p>
              )}
            </>
          ) : (
            <EmptyState
              title="Nenhum lançamento neste mês"
              description="Registre uma receita ou despesa para começar a acompanhar."
              action={
                <Button size="sm" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                  Novo lançamento
                </Button>
              }
            />
          )}
        </Card>

        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-4 font-display text-base font-semibold text-ink-900">
            Despesas por categoria
          </h2>
          <DespesasPorCategoriaChart
            fatias={resumo.data?.expensesByCategory ?? []}
            totalCents={resumo.data?.expenseCents ?? 0}
            carregando={resumo.isLoading}
          />
        </Card>
      </div>

      <NovoLancamentoModal open={modalOpen} onClose={fecharModal} lancamento={emEdicao} />
    </div>
  );
}
