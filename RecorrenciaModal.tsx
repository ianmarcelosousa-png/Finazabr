import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { TextField } from "../ui/TextField";
import { SelectField } from "../ui/SelectField";
import { CurrencyField } from "../ui/CurrencyField";
import { FormError } from "../ui/Feedback";
import { useMonth } from "../../context/MonthContext";
import {
  useAtualizarRecorrencia,
  useCategorias,
  useCriarRecorrencia,
} from "../../hooks/queries";
import type { Recorrencia, TipoRecorrencia } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: TipoRecorrencia;
  recorrencia?: Recorrencia | null;
}

export function RecorrenciaModal({ open, onClose, tipo, recorrencia }: Props) {
  const { mes } = useMonth();
  const editando = Boolean(recorrencia);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState(0);
  const [categoriaId, setCategoriaId] = useState("");
  const [diaDoMes, setDiaDoMes] = useState(5);
  const [mesInicial, setMesInicial] = useState(mes);
  const [mesFinal, setMesFinal] = useState("");
  const [ativa, setAtiva] = useState(true);

  const { data: categorias = [] } = useCategorias();
  const criar = useCriarRecorrencia();
  const atualizar = useAtualizarRecorrencia();

  const erro = criar.error ?? atualizar.error;
  const salvando = criar.isPending || atualizar.isPending;

  useEffect(() => {
    if (!open) return;

    if (recorrencia) {
      setDescricao(recorrencia.description);
      setValor(recorrencia.amountCents);
      setCategoriaId(recorrencia.categoryId);
      setDiaDoMes(recorrencia.dayOfMonth);
      setMesInicial(recorrencia.startMonth);
      setMesFinal(recorrencia.endMonth ?? "");
      setAtiva(recorrencia.active);
    } else {
      setDescricao("");
      setValor(0);
      setCategoriaId("");
      setDiaDoMes(5);
      setMesInicial(mes);
      setMesFinal("");
      setAtiva(true);
    }

    criar.reset();
    atualizar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recorrencia, mes]);

  const grupo = tipo === "income" ? "income" : "expense";
  const categoriasDoTipo = categorias.filter((c) => c.type === grupo);

  const submeter = async (event: FormEvent) => {
    event.preventDefault();
    if (!categoriaId || valor <= 0) return;

    if (editando && recorrencia) {
      // `startMonth` não muda depois de criada: alterá-lo faria a recorrência
      // retroagir para meses já fechados.
      await atualizar.mutateAsync({
        id: recorrencia.id,
        description: descricao,
        amountCents: valor,
        categoryId: categoriaId,
        dayOfMonth: diaDoMes,
        endMonth: mesFinal || null,
        active: ativa,
      });
    } else {
      await criar.mutateAsync({
        type: tipo,
        description: descricao,
        amountCents: valor,
        categoryId: categoriaId,
        dayOfMonth: diaDoMes,
        startMonth: mesInicial,
        endMonth: mesFinal || null,
        active: ativa,
      });
    }

    onClose();
  };

  const rotuloDia = tipo === "income" ? "Dia do recebimento" : "Dia do vencimento";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editando
          ? "Editar recorrência"
          : tipo === "income"
            ? "Nova receita recorrente"
            : "Nova despesa fixa"
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-recorrencia" disabled={salvando}>
            {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </>
      }
    >
      <form id="form-recorrencia" onSubmit={submeter} className="space-y-4">
        <TextField
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder={tipo === "income" ? "Salário" : "Aluguel"}
          maxLength={200}
          required
          autoFocus
        />

        <CurrencyField label="Valor" value={valor} onChange={setValor} required />

        <SelectField
          label="Categoria"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          required
        >
          <option value="" disabled>
            Selecione uma categoria
          </option>
          {categoriasDoTipo.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label={rotuloDia}
          value={diaDoMes}
          onChange={(e) => setDiaDoMes(Number(e.target.value))}
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
            <option key={dia} value={dia}>
              Dia {dia}
            </option>
          ))}
        </SelectField>

        {diaDoMes > 28 && (
          <p className="rounded-xl bg-ink-50 px-3.5 py-2.5 text-sm text-ink-600">
            Em meses mais curtos, o lançamento cai no último dia do mês.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="A partir de"
            type="month"
            value={mesInicial}
            onChange={(e) => setMesInicial(e.target.value)}
            disabled={editando}
            required
          />
          <TextField
            label="Até (opcional)"
            type="month"
            value={mesFinal}
            onChange={(e) => setMesFinal(e.target.value)}
            min={mesInicial}
          />
        </div>

        <p className="text-sm text-ink-500">
          Deixe &quot;até&quot; em branco para repetir por tempo indeterminado. Use para
          parcelamentos com fim previsto.
        </p>

        {editando && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 px-4 py-3">
            <input
              type="checkbox"
              checked={ativa}
              onChange={(e) => setAtiva(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-ink-900">Ativa</span>
              <span className="block text-sm text-ink-500">
                Ao desativar, as projeções deste mês em diante são removidas. O
                histórico dos meses anteriores permanece.
              </span>
            </span>
          </label>
        )}

        <FormError error={erro} />
      </form>
    </Modal>
  );
}
