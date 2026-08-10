import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMonth } from "../../context/MonthContext";
import { formatarMesLabel } from "../../lib/finance";

/**
 * Navegação entre meses (§3). Sem lista fixa de meses: o usuário pode ir para
 * qualquer mês, passado ou futuro — os meses futuros mostram justamente as
 * projeções das recorrências.
 */
export function MonthSelector() {
  const { mes, mesAnterior, proximoMes, voltarParaHoje, ehMesAtual } = useMonth();

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-white p-1 shadow-card">
      <button
        onClick={mesAnterior}
        className="cursor-pointer rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={16} />
      </button>

      <span className="min-w-[132px] text-center text-sm font-semibold text-ink-900">
        {formatarMesLabel(mes)}
      </span>

      <button
        onClick={proximoMes}
        className="cursor-pointer rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        aria-label="Próximo mês"
      >
        <ChevronRight size={16} />
      </button>

      {!ehMesAtual && (
        <button
          onClick={voltarParaHoje}
          className="ml-1 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
          title="Voltar para o mês atual"
        >
          <CalendarDays size={14} className="mr-1 inline" />
          Hoje
        </button>
      )}
    </div>
  );
}
