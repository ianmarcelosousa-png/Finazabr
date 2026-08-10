import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mesAtual, somarMeses } from "../lib/finance";

interface MonthContextValue {
  mes: string;
  setMes: (mes: string) => void;
  mesAnterior: () => void;
  proximoMes: () => void;
  voltarParaHoje: () => void;
  ehMesAtual: boolean;
}

const MonthContext = createContext<MonthContextValue | null>(null);

const STORAGE_KEY = "finanza:mes-selecionado";
const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Mês selecionado, compartilhado por todas as telas.
 *
 * Abre no mês atual (§3) e lembra a escolha entre recarregamentos — quem está
 * conferindo julho não quer voltar para agosto a cada F5. Um valor corrompido
 * no localStorage é descartado em silêncio: melhor abrir no mês certo do que
 * quebrar a aplicação.
 */
export function MonthProvider({ children }: { children: ReactNode }) {
  const [mes, setMesState] = useState<string>(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    return salvo && MES_VALIDO.test(salvo) ? salvo : mesAtual();
  });

  const setMes = useCallback((novo: string) => {
    setMesState(novo);
    localStorage.setItem(STORAGE_KEY, novo);
  }, []);

  const value = useMemo<MonthContextValue>(
    () => ({
      mes,
      setMes,
      mesAnterior: () => setMes(somarMeses(mes, -1)),
      proximoMes: () => setMes(somarMeses(mes, 1)),
      voltarParaHoje: () => setMes(mesAtual()),
      ehMesAtual: mes === mesAtual(),
    }),
    [mes, setMes]
  );

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth(): MonthContextValue {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useMonth deve ser usado dentro de MonthProvider");
  return ctx;
}
