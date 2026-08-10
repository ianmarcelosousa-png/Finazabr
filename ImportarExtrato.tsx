import { useState } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState, LoadingState } from "../components/ui/Feedback";
import { UploadExtrato } from "../components/importar/UploadExtrato";
import { ConferenciaExtrato } from "../components/importar/ConferenciaExtrato";
import { useCategorias, useEnviarExtrato, useImportacao, useImportacoes } from "../hooks/queries";
import { formatarData } from "../lib/finance";
import type { ResultadoImportacao } from "../types";

type Etapa = "upload" | "conferencia" | "concluido";

export function ImportarExtrato() {
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [importacaoId, setImportacaoId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  const { data: categorias = [] } = useCategorias();
  const historico = useImportacoes();
  const importacao = useImportacao(etapa === "conferencia" ? importacaoId : null);

  const enviar = useEnviarExtrato({
    onSuccess: (data) => {
      setImportacaoId(data.id);
      setEtapa("conferencia");
    },
  });

  const recomecar = () => {
    setEtapa("upload");
    setImportacaoId(null);
    setResultado(null);
    enviar.reset();
  };

  return (
    <div>
      <PageHeader
        title="Importar Extrato"
        description="Envie o extrato do banco e o sistema organiza os lançamentos para você conferir"
        actions={
          etapa !== "upload" ? (
            <Button variant="secondary" onClick={recomecar}>
              Importar outro arquivo
            </Button>
          ) : undefined
        }
      />

      {etapa === "upload" && (
        <UploadExtrato
          onEnviar={(file) => enviar.mutate(file)}
          enviando={enviar.isPending}
          erro={enviar.error}
        />
      )}

      {etapa === "conferencia" &&
        (importacao.isLoading ? (
          <Card className="p-5">
            <LoadingState label="Preparando a conferência…" />
          </Card>
        ) : importacao.data ? (
          <ConferenciaExtrato
            importacao={importacao.data}
            categorias={categorias}
            onConcluir={(resultadoFinal) => {
              setResultado(resultadoFinal);
              setEtapa("concluido");
            }}
            onDescartar={recomecar}
          />
        ) : null)}

      {etapa === "concluido" && (
        <Card className="p-5">
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-income-50 text-income-600">
              <CheckCircle2 size={26} />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-ink-900">
                Importação concluída
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Seus lançamentos já aparecem no mês correspondente.
              </p>
            </div>

            {resultado && (
              <ul className="text-sm text-ink-600">
                <li>{resultado.imported} adicionados</li>
                {resultado.merged > 0 && <li>{resultado.merged} substituídos</li>}
                {resultado.ignored > 0 && <li>{resultado.ignored} ignorados</li>}
                {resultado.rulesLearned > 0 && (
                  <li>{resultado.rulesLearned} categorias aprendidas</li>
                )}
              </ul>
            )}

            <Button onClick={recomecar}>Importar outro extrato</Button>
          </div>
        </Card>
      )}

      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-display text-base font-semibold text-ink-900">
          Importações anteriores
        </h2>

        {historico.isLoading ? (
          <LoadingState />
        ) : (historico.data ?? []).length === 0 ? (
          <EmptyState
            icon={<FileText size={20} />}
            title="Nenhum extrato importado ainda"
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {historico.data!.map((arquivo) => (
              <li key={arquivo.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                  <FileText size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {arquivo.filename}
                  </p>
                  <p className="text-xs text-ink-500">
                    {formatarData(arquivo.createdAt.slice(0, 10))} ·{" "}
                    {arquivo.format.toUpperCase()} · {arquivo.totalRows} movimentações
                  </p>
                </div>
                <span
                  className={
                    arquivo.status === "confirmed"
                      ? "rounded-full bg-income-50 px-2.5 py-1 text-xs font-semibold text-income-600"
                      : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                  }
                >
                  {arquivo.status === "confirmed"
                    ? `${arquivo.importedCount} importados`
                    : "Pendente"}
                </span>
                {arquivo.status === "pending" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setImportacaoId(arquivo.id);
                      setResultado(null);
                      setEtapa("conferencia");
                    }}
                  >
                    Retomar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
