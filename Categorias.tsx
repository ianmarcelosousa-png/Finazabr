import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { DynamicIcon } from "../components/ui/DynamicIcon";
import { ErrorState, FormError, LoadingState } from "../components/ui/Feedback";
import { NovaCategoriaModal } from "../components/categorias/NovaCategoriaModal";
import { useCategorias, useExcluirCategoria } from "../hooks/queries";
import type { Categoria } from "../types";

function CategoriaGroup({
  titulo,
  itens,
  onEditar,
  onExcluir,
}: {
  titulo: string;
  itens: Categoria[];
  onEditar: (categoria: Categoria) => void;
  onExcluir: (categoria: Categoria) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 font-display text-base font-semibold text-ink-900">{titulo}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {itens.map((categoria) => (
          <Card
            key={categoria.id}
            className="group relative flex flex-col items-center gap-2.5 p-4 text-center transition-shadow duration-150 hover:shadow-pop"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: categoria.color }}
            >
              <DynamicIcon name={categoria.icon} size={20} />
            </span>
            <span className="text-sm font-medium text-ink-900">{categoria.name}</span>

            {/* Ações aparecem no hover para o grid não virar um painel de botões. */}
            <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <button
                onClick={() => onEditar(categoria)}
                className="cursor-pointer rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-900"
                aria-label={`Editar ${categoria.name}`}
              >
                <Pencil size={13} />
              </button>
              {!categoria.isDefault && (
                <button
                  onClick={() => onExcluir(categoria)}
                  className="cursor-pointer rounded-lg p-1.5 text-ink-400 hover:bg-expense-50 hover:text-expense-600"
                  aria-label={`Excluir ${categoria.name}`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Categorias() {
  const [modalOpen, setModalOpen] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Categoria | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Categoria | null>(null);

  const categorias = useCategorias();
  const excluir = useExcluirCategoria();

  const receitas = (categorias.data ?? []).filter((c) => c.type === "income");
  const despesas = (categorias.data ?? []).filter((c) => c.type === "expense");

  const abrirNova = () => {
    setEmEdicao(null);
    setModalOpen(true);
  };

  const abrirEdicao = (categoria: Categoria) => {
    setEmEdicao(categoria);
    setModalOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    await excluir.mutateAsync(paraExcluir.id);
    setParaExcluir(null);
  };

  return (
    <div>
      <PageHeader
        title="Categorias"
        description="Organize suas receitas e despesas por categoria"
        actions={
          <Button icon={<Plus size={16} />} onClick={abrirNova}>
            Nova categoria
          </Button>
        }
      />

      {categorias.isLoading ? (
        <Card className="p-5">
          <LoadingState />
        </Card>
      ) : categorias.isError ? (
        <Card className="p-5">
          <ErrorState error={categorias.error} onRetry={() => categorias.refetch()} />
        </Card>
      ) : (
        <div className="space-y-8">
          <CategoriaGroup
            titulo="Receitas"
            itens={receitas}
            onEditar={abrirEdicao}
            onExcluir={setParaExcluir}
          />
          <CategoriaGroup
            titulo="Despesas"
            itens={despesas}
            onEditar={abrirEdicao}
            onExcluir={setParaExcluir}
          />
        </div>
      )}

      <NovaCategoriaModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEmEdicao(null);
        }}
        categoria={emEdicao}
      />

      <Modal
        open={Boolean(paraExcluir)}
        onClose={() => {
          setParaExcluir(null);
          excluir.reset();
        }}
        title="Excluir categoria"
        footer={
          <>
            <Button variant="secondary" onClick={() => setParaExcluir(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao} disabled={excluir.isPending}>
              {excluir.isPending ? "Excluindo…" : "Excluir"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            Excluir a categoria <strong className="text-ink-900">{paraExcluir?.name}</strong>?
          </p>
          <p className="text-sm text-ink-500">
            Categorias com lançamentos vinculados não podem ser excluídas — altere esses
            lançamentos primeiro.
          </p>
          <FormError error={excluir.error} />
        </div>
      </Modal>
    </div>
  );
}
