import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import type { OrigemLancamento, StatusLancamento, TipoLancamento } from "../../types";

const tipoConfig: Record<TipoLancamento, { label: string; className: string }> = {
  income: { label: "Receita", className: "bg-income-50 text-income-600" },
  fixed_expense: { label: "Despesa fixa", className: "bg-expense-50 text-expense-600" },
  variable_expense: { label: "Despesa variável", className: "bg-invest-50 text-invest-600" },
};

export function TipoBadge({ tipo }: { tipo: TipoLancamento }) {
  const config = tipoConfig[tipo];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

const statusConfig: Record<StatusLancamento, { label: string; className: string }> = {
  realizado: { label: "Realizado", className: "bg-ink-100 text-ink-600" },
  previsto: { label: "Previsto", className: "bg-amber-50 text-amber-700" },
};

export function StatusBadge({ status }: { status: StatusLancamento }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

const origemConfig: Record<OrigemLancamento, { label: string; title: string } | null> = {
  // Lançamento manual é o caso comum — não merece um selo repetido em toda linha.
  manual: null,
  recurring: { label: "Recorrente", title: "Gerado automaticamente por uma recorrência" },
  import: { label: "Extrato", title: "Importado do seu extrato bancário" },
};

export function OrigemBadge({ origem }: { origem: OrigemLancamento }) {
  const config = origemConfig[origem];
  if (!config) return null;

  return (
    <span
      title={config.title}
      className="inline-flex items-center rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[11px] font-medium text-ink-500"
    >
      {config.label}
    </span>
  );
}

export function CategoriaBadge({
  nome,
  cor,
  icon,
}: {
  nome: string;
  cor: string;
  icon?: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 py-1 pl-1.5 pr-2.5 text-xs font-medium text-ink-700">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: cor }}
      >
        {icon}
      </span>
      {nome}
    </span>
  );
}
