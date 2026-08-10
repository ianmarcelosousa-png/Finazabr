import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { TextField } from "../ui/TextField";
import { SelectField } from "../ui/SelectField";
import { DynamicIcon } from "../ui/DynamicIcon";
import { FormError } from "../ui/Feedback";
import { cn } from "../../lib/cn";
import { useAtualizarCategoria, useCriarCategoria } from "../../hooks/queries";
import type { Categoria, GrupoCategoria } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  categoria?: Categoria | null;
}

/** Paleta fixa: garante contraste no gráfico e evita cor inválida no banco. */
const CORES = [
  "#2563eb", "#0891b2", "#0d9488", "#16a34a", "#65a30d", "#eab308",
  "#f59e0b", "#ea580c", "#f97316", "#db2777", "#e11d48", "#c026d3",
  "#7c3aed", "#6366f1", "#78716c", "#64748b",
];

/** Ícones do lucide-react que fazem sentido para finanças pessoais. */
const ICONES = [
  "Home", "UtensilsCrossed", "ShoppingCart", "Bus", "Car", "Fuel",
  "HeartPulse", "GraduationCap", "Gamepad2", "ShoppingBag", "Repeat",
  "Wifi", "Zap", "Droplet", "Landmark", "Receipt", "Package", "Wallet",
  "TrendingUp", "PiggyBank", "Laptop", "Dog", "Plane", "Dumbbell",
  "Baby", "Gift", "Shirt", "Coffee", "Music", "Book",
];

export function NovaCategoriaModal({ open, onClose, categoria }: Props) {
  const editando = Boolean(categoria);

  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState<GrupoCategoria>("expense");
  const [cor, setCor] = useState(CORES[0]);
  const [icone, setIcone] = useState(ICONES[0]);

  const criar = useCriarCategoria();
  const atualizar = useAtualizarCategoria();

  const erro = criar.error ?? atualizar.error;
  const salvando = criar.isPending || atualizar.isPending;

  useEffect(() => {
    if (!open) return;

    if (categoria) {
      setNome(categoria.name);
      setGrupo(categoria.type);
      setCor(categoria.color);
      setIcone(categoria.icon);
    } else {
      setNome("");
      setGrupo("expense");
      setCor(CORES[0]);
      setIcone(ICONES[0]);
    }

    criar.reset();
    atualizar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoria]);

  const submeter = async (event: FormEvent) => {
    event.preventDefault();
    if (!nome.trim()) return;

    if (editando && categoria) {
      // O grupo não é editável: trocá-lo invalidaria os lançamentos já ligados.
      await atualizar.mutateAsync({ id: categoria.id, name: nome.trim(), color: cor, icon: icone });
    } else {
      await criar.mutateAsync({ name: nome.trim(), type: grupo, color: cor, icon: icone });
    }

    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? "Editar categoria" : "Nova categoria"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-categoria" disabled={salvando}>
            {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Criar categoria"}
          </Button>
        </>
      }
    >
      <form id="form-categoria" onSubmit={submeter} className="space-y-5">
        <div className="flex items-center gap-4 rounded-xl bg-ink-50 px-4 py-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: cor }}
          >
            <DynamicIcon name={icone} size={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900">{nome || "Sua categoria"}</p>
            <p className="text-sm text-ink-500">
              {grupo === "income" ? "Receita" : "Despesa"}
            </p>
          </div>
        </div>

        <TextField
          label="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Pets"
          maxLength={50}
          required
          autoFocus
        />

        <SelectField
          label="Grupo"
          value={grupo}
          onChange={(e) => setGrupo(e.target.value as GrupoCategoria)}
          disabled={editando}
        >
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </SelectField>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink-700">Cor</span>
          <div className="flex flex-wrap gap-2">
            {CORES.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setCor(opcao)}
                style={{ backgroundColor: opcao }}
                className={cn(
                  "h-8 w-8 cursor-pointer rounded-lg transition-transform",
                  cor === opcao && "ring-2 ring-ink-900 ring-offset-2"
                )}
                aria-label={`Cor ${opcao}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink-700">Ícone</span>
          <div className="grid grid-cols-8 gap-2">
            {ICONES.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setIcone(opcao)}
                className={cn(
                  "flex h-9 cursor-pointer items-center justify-center rounded-lg border transition-colors",
                  icone === opcao
                    ? "border-brand-500 bg-brand-50 text-brand-600"
                    : "border-ink-200 text-ink-500 hover:bg-ink-50"
                )}
                aria-label={`Ícone ${opcao}`}
              >
                <DynamicIcon name={opcao} size={16} />
              </button>
            ))}
          </div>
        </div>

        <FormError error={erro} />
      </form>
    </Modal>
  );
}
