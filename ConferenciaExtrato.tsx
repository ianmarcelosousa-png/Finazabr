import { useState } from "react";
import { AlertTriangle, Check, Sparkles, Trash2 } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { FormError } from "../ui/Feedback";
import { formatarData, formatarMoeda } from "../../lib/finance";
import { cn } from "../../lib/cn";
import {
  useAtualizarLinhaImportacao,
  useConfirmarImportacao,
  useDescartarImportacao,
} from "../../hooks/queries";
import type {
  AcaoDuplicidade,
  Categoria,
  ImportacaoDetalhe,
  LinhaImportacao,
  ResultadoImportacao,
} from "../../types";

interface Props {
  importacao: ImportacaoDetalhe;
  categorias: Categoria[];
  onConcluir: (resultado: ResultadoImportacao) => void;
  onDescartar: () => void;
}

const ACOES_DUPLICIDADE: { valor: AcaoDuplicidade; label: string }[] = [
  { valor: "ignore", label: "Ignorar (já cadastrado)" },
  { valor: "import_anyway", label: "Importar mesmo assim" },
  { valor: "merge", label: "Substituir o existente" },
];

/**
 * Tela de conferência do §14. Cada linha é editável e selecionável, e as
 * possíveis duplicatas ficam destacadas com as três saídas do §16 — ignorar,
 * importar mesmo assim, ou substituir/mesclar.
 */
export function ConferenciaExtrato({
  importacao,
  categorias,
  onConcluir,
  onDescartar,
}: Props) {
  const [aprender, setAprender] = useState(true);
  const [confirmarAberto, setConfirmarAberto] = useState(false);

  const atualizarLinha = useAtualizarLinhaImportacao(importacao.id);
  const confirmar = useConfirmarImportacao(importacao.id);
  const descartar = useDescartarImportacao();

  const linhas = importacao.rows;
  const selecionadas = linhas.filter((l) => l.selected);
  const semCategoria = selecionadas.filter((l) => !l.categoryId);

  const alterar = (rowId: string, campos: Record<string, unknown>) =>
    atualizarLinha.mutate({ rowId, ...campos });

  const alternarTodas = (marcar: boolean) => {
    for (const linha of linhas) {
      if (linha.selected !== marcar) alterar(linha.id, { selected: marcar });
    }
  };

  const executarConfirmacao = async () => {
    const resultado = await confirmar.mutateAsync({ learnCategories: aprender });
    setConfirmarAberto(false);
    onConcluir(resultado);
  };

  const executarDescarte = async () => {
    await descartar.mutateAsync(importacao.id);
    onDescartar();
  };

  const categoriasDe = (linha: LinhaImportacao) =>
    categorias.filter((c) => c.type === (linha.type === "income" ? "income" : "expense"));

  return (
    <>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink-900">
              Confira antes de importar
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              {importacao.filename} · {linhas.length}{" "}
              {linhas.length === 1 ? "movimentação encontrada" : "movimentações encontradas"}
              {importacao.duplicateCount > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-medium text-amber-700">
                    {importacao.duplicateCount}{" "}
                    {importacao.duplicateCount === 1
                      ? "possível duplicata"
                      : "possíveis duplicatas"}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => alternarTodas(false)}>
              Desmarcar todas
            </Button>
            <Button size="sm" variant="ghost" onClick={() => alternarTodas(true)}>
              Marcar todas
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Trash2 size={15} />}
              onClick={executarDescarte}
              disabled={descartar.isPending}
            >
              Descartar
            </Button>
            <Button
              size="sm"
              icon={<Check size={15} />}
              onClick={() => setConfirmarAberto(true)}
              disabled={selecionadas.length === 0}
            >
              Confirmar importação ({selecionadas.length})
            </Button>
          </div>
        </div>

        {importacao.duplicateCount > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            Encontramos movimentações que podem já estar cadastradas. Elas vêm
            desmarcadas — revise cada uma e escolha o que fazer.
          </p>
        )}

        <div className="mt-5 space-y-2">
          {linhas.map((linha) => {
            const duplicada = Boolean(linha.duplicateOfId);
            return (
              <div
                key={linha.id}
                className={cn(
                  "rounded-xl border px-4 py-3 transition-colors",
                  duplicada ? "border-amber-200 bg-amber-50/40" : "border-ink-200",
                  !linha.selected && "opacity-60"
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    checked={linha.selected}
                    onChange={(e) => alterar(linha.id, { selected: e.target.checked })}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
                    aria-label={`Importar ${linha.description}`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-ink-500">
                        {formatarData(linha.date)}
                      </span>
                      <input
                        value={linha.description}
                        onChange={(e) => alterar(linha.id, { description: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-ink-900 hover:border-ink-200 focus:border-brand-500 focus:bg-white focus:outline-none"
                        aria-label="Descrição"
                      />
                    </div>

                    {linha.description !== linha.rawDescription && (
                      <p className="mt-0.5 pl-1.5 text-xs text-ink-400">
                        Original: {linha.rawDescription}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        value={linha.type}
                        onChange={(e) =>
                          // Trocar entre receita e despesa invalida a categoria
                          // sugerida, então ela é limpa junto.
                          alterar(linha.id, {
                            type: e.target.value,
                            categoryId: null,
                          })
                        }
                        className="cursor-pointer rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
                        aria-label="Tipo"
                      >
                        <option value="income">Receita</option>
                        <option value="fixed_expense">Despesa fixa</option>
                        <option value="variable_expense">Despesa variável</option>
                      </select>

                      <select
                        value={linha.categoryId ?? ""}
                        onChange={(e) => alterar(linha.id, { categoryId: e.target.value })}
                        className={cn(
                          "cursor-pointer rounded-lg border bg-white px-2 py-1 text-xs focus:border-brand-500 focus:outline-none",
                          linha.categoryId
                            ? "border-ink-200 text-ink-700"
                            : "border-expense-300 text-expense-600"
                        )}
                        aria-label="Categoria"
                      >
                        <option value="">Escolha uma categoria</option>
                        {categoriasDe(linha).map((categoria) => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.name}
                          </option>
                        ))}
                      </select>

                      {linha.suggestionSource === "user_rule" && (
                        <span
                          title="Sugerido a partir de uma correção sua em importações anteriores"
                          className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
                        >
                          <Sparkles size={11} />
                          Aprendido com você
                        </span>
                      )}
                      {linha.suggestionSource === "fallback" && (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-500">
                          Sugestão fraca — revise
                        </span>
                      )}
                    </div>

                    {duplicada && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800">
                          <AlertTriangle size={13} />
                          Pode já estar cadastrado
                          {linha.duplicateScore !== null &&
                            ` (${Math.round(linha.duplicateScore * 100)}% de semelhança)`}
                        </span>
                        <select
                          value={linha.duplicateAction ?? "ignore"}
                          onChange={(e) =>
                            alterar(linha.id, { duplicateAction: e.target.value })
                          }
                          className="cursor-pointer rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 focus:outline-none"
                          aria-label="O que fazer com esta duplicata"
                        >
                          {ACOES_DUPLICIDADE.map((acao) => (
                            <option key={acao.valor} value={acao.valor}>
                              {acao.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <span
                    className={cn(
                      "shrink-0 font-display font-semibold",
                      linha.direction === "in" ? "text-income-600" : "text-ink-900"
                    )}
                  >
                    {linha.direction === "in" ? "+" : "−"} {formatarMoeda(linha.amountCents)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <FormError error={atualizarLinha.error} />
      </Card>

      <Modal
        open={confirmarAberto}
        onClose={() => setConfirmarAberto(false)}
        title="Confirmar importação"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmarAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={executarConfirmacao}
              disabled={confirmar.isPending || semCategoria.length > 0}
            >
              {confirmar.isPending ? "Importando…" : "Confirmar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            {selecionadas.length}{" "}
            {selecionadas.length === 1
              ? "movimentação será adicionada"
              : "movimentações serão adicionadas"}{" "}
            à sua conta.
          </p>

          {semCategoria.length > 0 && (
            <p className="rounded-xl bg-expense-50 px-3.5 py-2.5 text-sm text-expense-600">
              {semCategoria.length}{" "}
              {semCategoria.length === 1
                ? "movimentação está sem categoria"
                : "movimentações estão sem categoria"}
              . Escolha uma para cada antes de confirmar.
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 px-4 py-3">
            <input
              type="checkbox"
              checked={aprender}
              onChange={(e) => setAprender(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-ink-900">
                Aprender com estas categorias
              </span>
              <span className="block text-sm text-ink-500">
                Nas próximas importações, movimentações parecidas já vêm com a categoria
                que você escolheu aqui.
              </span>
            </span>
          </label>

          <FormError error={confirmar.error} />
        </div>
      </Modal>
    </>
  );
}
