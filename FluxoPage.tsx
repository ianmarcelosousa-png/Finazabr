import { useState } from "react";
import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { MonthSelector } from "../ui/MonthSelector";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { CategoriaBadge } from "../ui/Badge";
import { DynamicIcon } from "../ui/DynamicIcon";
import { EmptyState, ErrorState, FormError, LoadingState } from "../ui/Feedback";
import { LancamentosTable } from "../lancamentos/LancamentosTable";
import { NovoLancamentoModal } from "../lancamentos/NovoLancamentoModal";
import { RecorrenciaModal } from "./RecorrenciaModal";
import { useMonth } from "../../context/MonthContext";
import {
  useCategorias,
  useExcluirRecorrencia,
  useLancamentos,
  useRecorrencias,
} from "../../hooks/queries";
import { formatarMoeda } from "../../lib/finance";
import { cn } from "../../lib/cn";
import type {
  Lancamento,
  Recorrencia,
  TipoLancamento,
  TipoRecorrencia,
} from "../../types";

interface Props {
  titulo: string;
  descricao: string;
  tipoRecorrencia: TipoRecorrencia;
  /** Tipos de lançamento exibidos na listagem do mês. */
  tiposLancamento: TipoLancamento[];
  rotuloRecorrencias: string;
  rotuloAvulsos: string;
  rotuloNovoAvulso: string;
  tipoAvulso: TipoLancamento;
}

/**
 * Estrutura comum das telas de Receitas e Despesas: em cima o que se repete
 * todo mês (as recorrências cadastradas), embaixo o que aconteceu no mês
 * selecionado. Responde diretamente a "quais receitas recorrentes tenho?" e
 * "quais despesas fixas tenho?" do §24.
 */
export function FluxoPage({
  titulo,
  descricao,
  tipoRecorrencia,
  tiposLancamento,
  rotuloRecorrencias,
  rotuloAvulsos,
  rotuloNovoAvulso,
  tipoAvulso,
}: Props) {
  const { mes } = useMonth();

  const [recorrenciaModal, setRecorrenciaModal] = useState(false);
  const [recorrenciaEmEdicao, setRecorrenciaEmEdicao] = useState<Recorrencia | null>(null);
  const [recorrenciaParaExcluir, setRecorrenciaParaExcluir] = useState<Recorrencia | null>(null);

  const [lancamentoModal, setLancamentoModal] = useState(false);
  const [lancamentoEmEdicao, setLancamentoEmEdicao] = useState<Lancamento | null>(null);

  const { data: categorias = [] } = useCategorias();
  const recorrencias = useRecorrencias(tipoRecorrencia);
  const excluirRecorrencia = useExcluirRecorrencia();

  // O backend filtra por um tipo só, então telas com dois tipos (Despesas)
  // pedem o mês inteiro e filtram aqui.
  const lancamentos = useLancamentos({ month: mes, sort: "date_asc", pageSize: 200 });

  const itensDoMes = (lancamentos.data?.items ?? []).filter((item) =>
    tiposLancamento.includes(item.type)
  );

  const totalRecorrente = (recorrencias.data ?? [])
    .filter((r) => r.active)
    .reduce((acc, r) => acc + r.amountCents, 0);

  const abrirNovaRecorrencia = () => {
    setRecorrenciaEmEdicao(null);
    setRecorrenciaModal(true);
  };

  const abrirEdicaoRecorrencia = (recorrencia: Recorrencia) => {
    setRecorrenciaEmEdicao(recorrencia);
    setRecorrenciaModal(true);
  };

  const confirmarExclusaoRecorrencia = async () => {
    if (!recorrenciaParaExcluir) return;
    await excluirRecorrencia.mutateAsync(recorrenciaParaExcluir.id);
    setRecorrenciaParaExcluir(null);
  };

  const abrirEdicaoLancamento = (lancamento: Lancamento) => {
    setLancamentoEmEdicao(lancamento);
    setLancamentoModal(true);
  };

  return (
    <div>
      <PageHeader
        title={titulo}
        description={descricao}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <MonthSelector />
            <Button icon={<Plus size={16} />} onClick={abrirNovaRecorrencia}>
              {rotuloRecorrencias}
            </Button>
          </div>
        }
      />

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Repeat size={17} className="text-ink-400" />
            <h2 className="font-display text-base font-semibold text-ink-900">
              Todo mês
            </h2>
          </div>
          {totalRecorrente > 0 && (
            <span className="text-sm text-ink-500">
              Total mensal:{" "}
              <strong className="font-display text-ink-900">
                {formatarMoeda(totalRecorrente)}
              </strong>
            </span>
          )}
        </div>

        {recorrencias.isLoading ? (
          <LoadingState />
        ) : recorrencias.isError ? (
          <ErrorState error={recorrencias.error} onRetry={() => recorrencias.refetch()} />
        ) : (recorrencias.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Repeat size={20} />}
            title="Nenhuma recorrência cadastrada"
            description="Cadastre uma vez e o sistema considera automaticamente em todos os meses seguintes."
            action={
              <Button size="sm" icon={<Plus size={16} />} onClick={abrirNovaRecorrencia}>
                {rotuloRecorrencias}
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {recorrencias.data!.map((recorrencia) => {
              const categoria = categorias.find((c) => c.id === recorrencia.categoryId);
              return (
                <li
                  key={recorrencia.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 py-3",
                    !recorrencia.active && "opacity-55"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink-900">
                        {recorrencia.description}
                      </span>
                      {!recorrencia.active && (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-500">
                          Inativa
                        </span>
                      )}
                      {recorrencia.endMonth && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          até {recorrencia.endMonth}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {tipoRecorrencia === "income" ? "Recebimento" : "Vencimento"} no dia{" "}
                      {recorrencia.dayOfMonth}
                    </p>
                  </div>

                  {categoria && (
                    <CategoriaBadge
                      nome={categoria.name}
                      cor={categoria.color}
                      icon={<DynamicIcon name={categoria.icon} size={12} />}
                    />
                  )}

                  <span className="font-display font-semibold text-ink-900">
                    {formatarMoeda(recorrencia.amountCents)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirEdicaoRecorrencia(recorrencia)}
                      className="cursor-pointer rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-900"
                      aria-label={`Editar ${recorrencia.description}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setRecorrenciaParaExcluir(recorrencia)}
                      className="cursor-pointer rounded-lg p-1.5 text-ink-400 hover:bg-expense-50 hover:text-expense-600"
                      aria-label={`Excluir ${recorrencia.description}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-ink-900">
            {rotuloAvulsos}
          </h2>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={16} />}
            onClick={() => {
              setLancamentoEmEdicao(null);
              setLancamentoModal(true);
            }}
          >
            {rotuloNovoAvulso}
          </Button>
        </div>

        {lancamentos.isLoading ? (
          <LoadingState />
        ) : lancamentos.isError ? (
          <ErrorState error={lancamentos.error} onRetry={() => lancamentos.refetch()} />
        ) : itensDoMes.length === 0 ? (
          <EmptyState
            title="Nada registrado neste mês"
            description="As recorrências ativas aparecem aqui automaticamente."
          />
        ) : (
          <LancamentosTable
            itens={itensDoMes}
            categorias={categorias}
            onEditar={abrirEdicaoLancamento}
          />
        )}
      </Card>

      <RecorrenciaModal
        open={recorrenciaModal}
        onClose={() => setRecorrenciaModal(false)}
        tipo={tipoRecorrencia}
        recorrencia={recorrenciaEmEdicao}
      />

      <NovoLancamentoModal
        open={lancamentoModal}
        onClose={() => {
          setLancamentoModal(false);
          setLancamentoEmEdicao(null);
        }}
        lancamento={lancamentoEmEdicao}
        tipoFixo={lancamentoEmEdicao ? undefined : tipoAvulso}
      />

      <Modal
        open={Boolean(recorrenciaParaExcluir)}
        onClose={() => setRecorrenciaParaExcluir(null)}
        title="Excluir recorrência"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecorrenciaParaExcluir(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={confirmarExclusaoRecorrencia}
              disabled={excluirRecorrencia.isPending}
            >
              {excluirRecorrencia.isPending ? "Excluindo…" : "Excluir"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            Excluir{" "}
            <strong className="text-ink-900">{recorrenciaParaExcluir?.description}</strong>?
          </p>
          <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            As projeções deste mês em diante são removidas. Os lançamentos dos meses
            anteriores continuam no seu histórico.
          </p>
          <FormError error={excluirRecorrencia.error} />
        </div>
      </Modal>
    </div>
  );
}
