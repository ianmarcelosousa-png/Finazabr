import type { TipoLancamento } from "../types";

/**
 * Formatação e entrada de valores. Nenhum cálculo financeiro acontece aqui —
 * receitas, despesas, saldo e valor a investir vêm somados do servidor
 * (`/api/dashboard/summary`), para existir uma definição só desses números.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_SEM_SIMBOLO = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 150000 → "R$ 1.500,00" */
export function formatarMoeda(centavos: number): string {
  return BRL.format(centavos / 100);
}

/** 150000 → "1.500,00" — para dentro de campos de formulário. */
export function formatarValor(centavos: number): string {
  return BRL_SEM_SIMBOLO.format(centavos / 100);
}

/**
 * Converte o que o usuário digitou em centavos.
 *
 * Aceita "1.500,00", "1500,00", "1500.00" e "1500". Como só os dígitos
 * importam, digitar da direita para a esquerda (máscara de caixa eletrônico)
 * funciona naturalmente: "1", "15", "150" → R$ 0,01 / 0,15 / 1,50.
 */
export function parseValorParaCentavos(entrada: string): number {
  const digitos = entrada.replace(/\D/g, "");
  if (!digitos) return 0;
  return Number(digitos);
}

/** Máscara aplicada enquanto digita, para o campo nunca mostrar lixo. */
export function mascararValor(entrada: string): string {
  const centavos = parseValorParaCentavos(entrada);
  return formatarValor(centavos);
}

/** "2026-08-05" → "05/08/2026". Sem `new Date`, para não deslocar o fuso. */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "2026-08-05" → "05/08" — versão compacta para a tabela. */
export function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "2026-08" → "Agosto de 2026" */
export function formatarMesLabel(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MESES[Number(m) - 1]} de ${ano}`;
}

/** "2026-08" → "Ago/2026" */
export function formatarMesCurto(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MESES[Number(m) - 1].slice(0, 3)}/${ano}`;
}

/** Mês atual do calendário no formato "AAAA-MM". */
export function mesAtual(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

/** Data de hoje no formato "AAAA-MM-DD", para preencher formulários. */
export function hojeISO(): string {
  const agora = new Date();
  return [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0"),
  ].join("-");
}

/** "2026-08" + 1 → "2026-09" */
export function somarMeses(mes: string, deslocamento: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const data = new Date(ano, m - 1 + deslocamento, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

/** Primeiro dia do mês, para o campo de data já abrir no mês certo. */
export function primeiroDiaDoMes(mes: string): string {
  return `${mes}-01`;
}

export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export const LABEL_TIPO: Record<TipoLancamento, string> = {
  income: "Receita",
  fixed_expense: "Despesa fixa",
  variable_expense: "Despesa variável",
};

export function ehDespesa(tipo: TipoLancamento): boolean {
  return tipo !== "income";
}

/** Sinal exibido na tabela: receita entra, despesa sai. */
export function valorComSinal(tipo: TipoLancamento, centavos: number): string {
  return `${ehDespesa(tipo) ? "−" : "+"} ${formatarMoeda(centavos)}`;
}
