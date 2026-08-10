import { useEffect, useState } from "react";

/**
 * Atrasa a propagação de um valor que muda a cada tecla digitada, para a busca
 * não disparar uma requisição por caractere.
 */
export function useDebounce<T>(valor: T, atrasoMs = 300): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);

  return debounced;
}
