import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank, Settings, Wallet } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { FormError } from "../ui/Feedback";
import { formatarMoeda } from "../../lib/finance";
import { useAtualizarConfiguracoes } from "../../hooks/queries";
import type { ResumoMensal } from "../../types";
import { cn } from "../../lib/cn";

interface SummaryCardsProps {
  resumo: ResumoMensal | undefined;
  carregando: boolean;
}

const ATALHOS_PERCENTUAL = [10, 15, 20, 30];

function ValorCard({
  titulo,
  valor,
  carregando,
  icone,
  corIcone,
  children,
  acao,
}: {
  titulo: string;
  valor: number | undefined;
  carregando: boolean;
  icone: React.ReactNode;
  corIcone: string;
  children?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-500">{titulo}</p>
          {carregando ? (
            <div className="mt-3 h-7 w-32 animate-pulse rounded-lg bg-ink-100" />
          ) : (
            <p className="mt-2 font-display text-2xl font-semibold text-ink-900">
              {formatarMoeda(valor ?? 0)}
            </p>
          )}
          {children}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              corIcone
            )}
          >
            {icone}
          </span>
          {acao}
        </div>
      </div>
    </Card>
  );
}

/**
 * Os três cartões do §9. Nenhum número é calculado aqui: todos vêm prontos do
 * `/api/dashboard/summary`, então a tela e os relatórios nunca discordam.
 */
export function SummaryCards({ resumo, carregando }: SummaryCardsProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [percentual, setPercentual] = useState(20);
  const atualizar = useAtualizarConfiguracoes();

  useEffect(() => {
    if (resumo) setPercentual(resumo.investmentPercentage);
  }, [resumo]);

  const salvar = async () => {
    await atualizar.mutateAsync({ investmentPercentage: percentual });
    setConfigOpen(false);
  };

  const saldo = resumo?.balanceCents ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ValorCard
          titulo="Receitas do mês"
          valor={resumo?.incomeCents}
          carregando={carregando}
          icone={<ArrowUpCircle size={20} />}
          corIcone="bg-income-50 text-income-500"
        />

        <ValorCard
          titulo="Despesas do mês"
          valor={resumo?.expenseCents}
          carregando={carregando}
          icone={<ArrowDownCircle size={20} />}
          corIcone="bg-expense-50 text-expense-500"
        >
          {!carregando && resumo && resumo.expenseCents > 0 && (
            <p className="mt-2 text-xs text-ink-500">
              {formatarMoeda(resumo.fixedExpenseCents)} fixas ·{" "}
              {formatarMoeda(resumo.variableExpenseCents)} variáveis
            </p>
          )}
        </ValorCard>

        <ValorCard
          titulo="Saldo do mês"
          valor={saldo}
          carregando={carregando}
          icone={<Wallet size={20} />}
          corIcone={saldo < 0 ? "bg-expense-50 text-expense-500" : "bg-brand-50 text-brand-600"}
        >
          {!carregando && (
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                saldo < 0 ? "text-expense-600" : "text-ink-500"
              )}
            >
              {saldo < 0 ? "Você gastou mais do que recebeu" : "Receitas menos despesas"}
            </p>
          )}
        </ValorCard>

        <ValorCard
          titulo="Quanto posso investir"
          valor={resumo?.investmentCents}
          carregando={carregando}
          icone={<PiggyBank size={20} />}
          corIcone="bg-invest-50 text-invest-500"
          acao={
            <button
              onClick={() => setConfigOpen(true)}
              className="cursor-pointer rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-900"
              aria-label="Configurar percentual de investimento"
              title="Configurar percentual"
            >
              <Settings size={16} />
            </button>
          }
        >
          {!carregando && resumo && (
            <span className="mt-2 inline-flex items-center rounded-full bg-invest-50 px-2.5 py-1 text-xs font-semibold text-invest-600">
              {resumo.investmentPercentage}% da receita
            </span>
          )}
        </ValorCard>
      </div>

      <Modal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Percentual de investimento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfigOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={atualizar.isPending}>
              {atualizar.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-ink-500">
            Quanto da sua receita mensal você quer reservar para investir. Fica salvo
            na sua conta e continua valendo nos próximos meses.
          </p>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={50}
              value={percentual}
              onChange={(e) => setPercentual(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer accent-invest-500"
              aria-label="Percentual de investimento"
            />
            <span className="w-14 text-right font-display text-xl font-semibold text-ink-900">
              {percentual}%
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {ATALHOS_PERCENTUAL.map((valor) => (
              <button
                key={valor}
                onClick={() => setPercentual(valor)}
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  percentual === valor
                    ? "border-invest-500 bg-invest-50 text-invest-600"
                    : "border-ink-200 text-ink-600 hover:bg-ink-50"
                )}
              >
                {valor}%
              </button>
            ))}
          </div>

          {resumo && (
            <div className="rounded-xl bg-ink-50 px-4 py-3">
              <p className="text-sm text-ink-500">
                Sobre a receita de {formatarMoeda(resumo.incomeCents)} deste mês:
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-ink-900">
                {formatarMoeda(Math.floor((resumo.incomeCents * percentual) / 100))}
              </p>
            </div>
          )}

          <FormError error={atualizar.error} />
        </div>
      </Modal>
    </>
  );
}
