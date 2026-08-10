import { useId, useLayoutEffect, useRef } from "react";
import { cn } from "../../lib/cn";
import { formatarValor, parseValorParaCentavos } from "../../lib/finance";

interface CurrencyFieldProps {
  label: string;
  /** Valor em centavos — a única unidade que circula na aplicação. */
  value: number;
  onChange: (centavos: number) => void;
  className?: string;
  autoFocus?: boolean;
  required?: boolean;
}

/**
 * Campo de dinheiro com máscara de caixa eletrônico: o usuário digita só
 * dígitos e eles preenchem da direita para a esquerda (1 → 0,01; 15 → 0,15;
 * 150 → 1,50). Elimina a dúvida de "uso vírgula ou ponto?" e garante que o
 * valor sai daqui já em centavos inteiros, sem passar por float.
 *
 * Nesse modelo, a sequência de dígitos exibida é a única fonte de verdade —
 * não existe "editar o meio do valor". Por isso o cursor é sempre reposto no
 * fim depois de cada atualização: sem isso, um clique no meio do campo (ou
 * uma inserção que não termine exatamente no fim) faz o próximo dígito
 * entrar no meio da sequência e multiplicar o valor por 10, 100, 1000...
 * silenciosamente. Ruim em qualquer campo; inaceitável num valor em dinheiro.
 */
export function CurrencyField({
  label,
  value,
  onChange,
  className,
  autoFocus,
  required,
}: CurrencyFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || document.activeElement !== el) return;
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [value]);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-700">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium text-ink-400">
          R$
        </span>
        <input
          ref={inputRef}
          id={id}
          inputMode="numeric"
          autoFocus={autoFocus}
          required={required}
          value={formatarValor(value)}
          onChange={(e) => onChange(parseValorParaCentavos(e.target.value))}
          // Qualquer clique só reposiciona o cursor no fim — reforça que a
          // edição é sempre "próximo dígito", nunca "inserir aqui no meio".
          onClick={(e) => {
            const el = e.currentTarget;
            const end = el.value.length;
            el.setSelectionRange(end, end);
          }}
          className={cn(
            "w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-3.5 text-right font-display text-sm font-semibold text-ink-900",
            "transition-colors duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            className
          )}
        />
      </div>
    </div>
  );
}
