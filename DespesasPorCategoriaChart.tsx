import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { DynamicIcon } from "../ui/DynamicIcon";
import { EmptyState } from "../ui/Feedback";
import { formatarMoeda } from "../../lib/finance";
import { cn } from "../../lib/cn";
import type { FatiaCategoria } from "../../types";

interface Props {
  fatias: FatiaCategoria[];
  totalCents: number;
  carregando: boolean;
}

/**
 * Gráfico de para onde o dinheiro foi (§10).
 *
 * Clicar numa fatia (ou na legenda) fixa a categoria no centro do gráfico, com
 * o valor em reais — o pedido de "clicar/selecionar uma categoria e visualizar
 * o valor correspondente". Clicar de novo desfaz a seleção.
 */
export function DespesasPorCategoriaChart({ fatias, totalCents, carregando }: Props) {
  const [selecionada, setSelecionada] = useState<string | null>(null);

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-40 w-40 animate-pulse rounded-full bg-ink-100" />
      </div>
    );
  }

  if (fatias.length === 0) {
    return (
      <EmptyState
        icon={<PieChartIcon size={20} />}
        title="Nenhuma despesa neste mês"
        description="Assim que você registrar gastos, o gráfico mostra em quais categorias eles estão."
      />
    );
  }

  const destaque = fatias.find((f) => f.categoryId === selecionada) ?? null;
  const alternar = (categoryId: string) =>
    setSelecionada((atual) => (atual === categoryId ? null : categoryId));

  return (
    <div>
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={fatias}
              dataKey="amountCents"
              nameKey="name"
              innerRadius="62%"
              outerRadius="94%"
              paddingAngle={2}
              stroke="none"
              onClick={(entry: unknown) =>
                alternar((entry as { payload: FatiaCategoria }).payload.categoryId)
              }
            >
              {fatias.map((fatia) => (
                <Cell
                  key={fatia.categoryId}
                  fill={fatia.color}
                  className="cursor-pointer outline-none"
                  opacity={!selecionada || selecionada === fatia.categoryId ? 1 : 0.3}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centro do donut: total do mês, ou a categoria selecionada. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-medium text-ink-500">
            {destaque ? destaque.name : "Total de despesas"}
          </span>
          <span className="font-display text-xl font-semibold text-ink-900">
            {formatarMoeda(destaque ? destaque.amountCents : totalCents)}
          </span>
          {destaque && (
            <span className="text-xs font-semibold text-ink-500">
              {destaque.percentage}% do total
            </span>
          )}
        </div>
      </div>

      <ul className="mt-5 space-y-1">
        {fatias.map((fatia) => (
          <li key={fatia.categoryId}>
            <button
              onClick={() => alternar(fatia.categoryId)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors",
                selecionada === fatia.categoryId ? "bg-ink-100" : "hover:bg-ink-50"
              )}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: fatia.color }}
              >
                <DynamicIcon name={fatia.icon} size={13} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-700">
                {fatia.name}
              </span>
              <span className="shrink-0 text-sm font-semibold text-ink-900">
                {formatarMoeda(fatia.amountCents)}
              </span>
              <span className="w-12 shrink-0 text-right text-xs font-medium text-ink-500">
                {fatia.percentage}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
