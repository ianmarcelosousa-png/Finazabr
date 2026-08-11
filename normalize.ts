/**
 * Extrato bancário é texto sujo: o mesmo estabelecimento aparece como
 * "COMPRA CARTAO IFOOD *IFD SAO PAULO", "IFOOD  CLUB 12/24" ou
 * "PIX ENVIADO IFOOD.COM AGENCIA 0001". Normalizar é o que permite tratar os
 * três como a mesma chave — e é essa chave que vira o `pattern` da regra
 * aprendida com o usuário (§15).
 */

/** Ruído estrutural do extrato, sem valor para identificar o estabelecimento. */
const NOISE_TOKENS = new Set([
  "COMPRA",
  "CARTAO",
  "CARTAO DE CREDITO",
  "DEBITO",
  "DEB",
  "CRED",
  "CREDITO",
  "PAGAMENTO",
  "PAGTO",
  "PGTO",
  "PAG",
  "TRANSFERENCIA",
  "TRANSF",
  "TED",
  "DOC",
  "PIX",
  "ENVIADO",
  "RECEBIDO",
  "ELETRONICO",
  "AVULSO",
  "PARCELA",
  "PARC",
  "MENSALIDADE",
  "COMPRAS",
  "NACIONAL",
  "INTERNACIONAL",
  "APROV",
  "APROVADA",
  "LANCAMENTO",
  "SAQUE",
  "TARIFA",
  "REF",
  "VIA",
  "LTDA",
  "ME",
  "EIRELI",
  "SA",
  "CIA",
  "COM",
  "BR",
  "WWW",
]);

/** Remove acentos sem depender de locale — "Alimentação" → "ALIMENTACAO". */
export function stripAccents(value: string): string {
  // U+0300–U+036F = diacríticos combinantes que o NFD separa das letras.
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Reduz uma descrição de extrato à sua "impressão digital": maiúsculas, sem
 * acento, sem pontuação, sem datas/parcelas/documentos e sem as palavras
 * genéricas de operação bancária.
 *
 * Se sobrar nada (ex: descrição era só "PIX ENVIADO"), devolve a versão só
 * limpa em vez de string vazia — uma chave vazia agruparia coisas não
 * relacionadas e envenenaria o aprendizado.
 */
export function normalizeDescription(raw: string): string {
  const cleaned = stripAccents(raw)
    .toUpperCase()
    .replace(/\d{2}[/.-]\d{2}([/.-]\d{2,4})?/g, " ") // datas
    .replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/g, " ") // parcelas "03/12"
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, " ") // CNPJ
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, " ") // CPF
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned
    .split(" ")
    .filter((token) => token.length > 1)
    .filter((token) => !NOISE_TOKENS.has(token))
    // Números soltos (agência, conta, sequencial) não identificam nada.
    .filter((token) => !/^\d+$/.test(token));

  const normalized = tokens.join(" ").trim();
  return normalized || cleaned;
}

/** Tokens únicos da descrição normalizada, para comparação por similaridade. */
export function tokensOf(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter(Boolean));
}

/**
 * Similaridade de Jaccard entre dois conjuntos de tokens: 1 = idênticos,
 * 0 = nada em comum. Barata e suficiente para descrições curtas de extrato,
 * onde o sinal está em *quais* palavras aparecem, não na ordem delas.
 */
export function similarity(a: string, b: string): number {
  const setA = tokensOf(a);
  const setB = tokensOf(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Verifica se `pattern` aparece inteiro dentro de `text`, respeitando os
 * limites de palavra.
 *
 * Existe porque Jaccard pune diferença de tamanho: a regra "IFOOD" contra a
 * descrição "IFOOD IFD SAO PAULO" dá só 0,25, embora seja obviamente o mesmo
 * estabelecimento. Contenção resolve esse caso sem afrouxar o limiar geral,
 * que continua protegendo contra falsos positivos entre descrições longas.
 */
export function containsPattern(text: string, pattern: string): boolean {
  if (!pattern) return false;
  return ` ${text} `.includes(` ${pattern} `);
}
