import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { MonthSelector } from "../components/ui/MonthSelector";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SelectField } from "../components/ui/SelectField";
import { TextField } from "../components/ui/TextField";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/Feedback";
import { LancamentosTable } from "../components/lancamentos/LancamentosTable";
import { NovoLancamentoModal } from "../components/lancamentos/NovoLancamentoModal";
import { useMonth } from "../context/MonthContext";
import { useCategorias, useLancamentos } from "../hooks/queries";
import { useDebounce } from "../hooks/useDebounce";
import type { FiltrosLancamentos, Lancamento } from "../types";

const PAGE_SIZE = 25;

type PeriodoFiltro = "mes" | "livre";

/** Tela dedicada aos lançamentos, com os filtros do §18. */
export function Lancamentos() {
  const { mes } = useMonth();

  const [modalOpen, setModalOpen] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Lancamento | null>(null);

  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [origem, setOrigem] = useState("");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<NonNullable<FiltrosLancamentos["sort"]>>("date_desc");
  const [pagina, setPagina] = useState(1);

  // Sem debounce, cada tecla dispararia uma requisição.
  const buscaDebounced = useDebounce(busca, 350);

  const { data: categorias = [] } = useCategorias();

  const filtros: FiltrosLancamentos = {
    ...(periodo === "mes" ? { month: mes } : { from: de || undefined, to: ate || undefined }),
    type: (tipo || undefined) as FiltrosLancamentos["type"],
    categoryId: categoriaId || undefined,
    source: (origem || undefined) as FiltrosLancamentos["source"],
    search: buscaDebounced || undefined,
    sort: ordem,
    page: pagina,
    pageSize: PAGE_SIZE,
  };

  const lancamentos = useLancamentos(filtros);

  const limparFiltros = () => {
    setPeriodo("mes");
    setDe("");
    setAte("");
    setTipo("");
    setCategoriaId("");
    setOrigem("");
    setBusca("");
    setOrdem("date_desc");
    setPagina(1);
  };

  const temFiltroAtivo =
    periodo === "livre" || tipo || categoriaId || origem || busca || ordem !== "date_desc";

  const total = lancamentos.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /** Qualquer mudança de filtro tem que voltar para a primeira página. */
  const aoFiltrar = <T,>(setter: (valor: T) => void) => (valor: T) => {
    setter(valor);
    setPagina(1);
  };

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
        title="Lançamentos"
        description="Todas as suas receitas e despesas, com filtros e busca"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {periodo === "mes" && <MonthSelector />}
            <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              Novo lançamento
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TextField
            label="Pesquisar"
            value={busca}
            onChange={(e) => aoFiltrar(setBusca)(e.target.value)}
            placeholder="Descrição do lançamento"
            icon={<Search size={16} />}
            trailing={
              busca ? (
                <button
                  onClick={() => aoFiltrar(setBusca)("")}
                  className="cursor-pointer text-ink-400 hover:text-ink-900"
                  aria-label="Limpar busca"
                >
                  <X size={15} />
                </button>
              ) : undefined
            }
          />

          <SelectField
            label="Tipo"
            value={tipo}
            onChange={(e) => aoFiltrar(setTipo)(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="income">Receita</option>
            <option value="fixed_expense">Despesa fixa</option>
            <option value="variable_expense">Despesa variável</option>
          </SelectField>

          <SelectField
            label="Categoria"
            value={categoriaId}
            onChange={(e) => aoFiltrar(setCategoriaId)(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.name} ({categoria.type === "income" ? "receita" : "despesa"})
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Origem"
            value={origem}
            onChange={(e) => aoFiltrar(setOrigem)(e.target.value)}
          >
            <option value="">Todas as origens</option>
            <option value="manual">Cadastrados manualmente</option>
            <option value="import">Importados do extrato</option>
            <option value="recurring">Gerados por recorrência</option>
          </SelectField>

          <SelectField
            label="Período"
            value={periodo}
            onChange={(e) => aoFiltrar(setPeriodo)(e.target.value as PeriodoFiltro)}
          >
            <option value="mes">Mês selecionado</option>
            <option value="livre">Período personalizado</option>
          </SelectField>

          {periodo === "livre" && (
            <>
              <TextField
                label="De"
                type="date"
                value={de}
                onChange={(e) => aoFiltrar(setDe)(e.target.value)}
              />
              <TextField
                label="Até"
                type="date"
                value={ate}
                onChange={(e) => aoFiltrar(setAte)(e.target.value)}
              />
            </>
          )}

          <SelectField
            label="Ordenar por"
            value={ordem}
            onChange={(e) =>
              aoFiltrar(setOrdem)(e.target.value as NonNullable<FiltrosLancamentos["sort"]>)
            }
          >
            <option value="date_desc">Data (mais recente)</option>
            <option value="date_asc">Data (mais antiga)</option>
            <option value="amount_desc">Valor (maior)</option>
            <option value="amount_asc">Valor (menor)</option>
            <option value="description_asc">Descrição (A–Z)</option>
          </SelectField>
        </div>

        {temFiltroAtivo && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={limparFiltros}
              className="cursor-pointer text-sm font-medium text-ink-500 hover:text-ink-900"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </Card>

      <Card className="mt-4 p-5">
        {lancamentos.isLoading ? (
          <LoadingState />
        ) : lancamentos.isError ? (
          <ErrorState error={lancamentos.error} onRetry={() => lancamentos.refetch()} />
        ) : total === 0 ? (
          <EmptyState
            title="Nenhum lançamento encontrado"
            description={
              temFiltroAtivo
                ? "Tente ajustar ou limpar os filtros."
                : "Registre sua primeira receita ou despesa deste mês."
            }
            action={
              temFiltroAtivo ? (
                <Button size="sm" variant="secondary" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
              ) : (
                <Button size="sm" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                  Novo lançamento
                </Button>
              )
            }
          />
        ) : (
          <>
            <LancamentosTable
              itens={lancamentos.data!.items}
              categorias={categorias}
              onEditar={abrirEdicao}
            />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
              <p className="text-sm text-ink-500">
                {total} {total === 1 ? "lançamento" : "lançamentos"}
              </p>

              {totalPaginas > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pagina === 1}
                    onClick={() => setPagina((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-ink-500">
                    {pagina} de {totalPaginas}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pagina >= totalPaginas}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <NovoLancamentoModal open={modalOpen} onClose={fecharModal} lancamento={emEdicao} />
    </div>
  );
}
