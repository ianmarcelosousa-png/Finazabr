import type { Category, CategorizationRule } from "@prisma/client";
import type { SuggestionSource } from "../domain.js";
import { matchMerchant } from "./merchants.js";
import { containsPattern, normalizeDescription, similarity } from "./normalize.js";

export interface ClassificationInput {
  description: string;
  direction: "in" | "out";
}

export interface ClassificationResult {
  categoryId: string | null;
  categoryName: string | null;
  source: SuggestionSource;
  /** 0–1. Abaixo de 0.5 a tela de conferência destaca a linha para revisão. */
  confidence: number;
  /** Chave normalizada — é o que vira `pattern` quando o usuário confirma. */
  pattern: string;
}

/** Similaridade mínima para reaproveitar uma regra que não bate exatamente. */
const FUZZY_RULE_THRESHOLD = 0.6;

/**
 * Tamanho mínimo para uma regra valer por contenção. Sem esse piso, um padrão
 * curto e genérico aprendido por acidente ("SP", "LOJA") passaria a capturar
 * metade do extrato.
 */
const MIN_CONTAINMENT_LENGTH = 4;

/**
 * Escolhe a categoria mais provável para uma movimentação do extrato.
 *
 * Ordem de decisão, da mais forte para a mais fraca:
 *
 *   1. Regra do usuário, casando exatamente a descrição normalizada.
 *   2. Regra do usuário, casando por similaridade de tokens (cobre o caso do
 *      mesmo estabelecimento vindo com sufixo diferente a cada compra).
 *   3. Dicionário de estabelecimentos conhecidos.
 *   4. Fallback pela direção do valor: entrou → receita, saiu → despesa.
 *
 * O que o usuário ensinou vem antes do dicionário de propósito (§15): uma
 * correção feita uma vez não pode ser sobrescrita pelo padrão do sistema.
 */
export function classify(
  input: ClassificationInput,
  rules: (CategorizationRule & { category: Category })[],
  categories: Category[],
  fallback: { income: Category | null; expense: Category | null }
): ClassificationResult {
  const pattern = normalizeDescription(input.description);
  const wantedType = input.direction === "in" ? "income" : "expense";

  // Só considera regras coerentes com a direção do dinheiro — uma regra de
  // "Alimentação" nunca deve ser aplicada a um crédito na conta.
  const eligibleRules = rules.filter((rule) => rule.category.type === wantedType);

  const exact = eligibleRules.find((rule) => rule.pattern === pattern);
  if (exact) {
    return {
      categoryId: exact.categoryId,
      categoryName: exact.category.name,
      source: "user_rule",
      confidence: 1,
      pattern,
    };
  }

  // Regra contida na descrição: "IFOOD" aprendido casa com
  // "IFOOD IFD SAO PAULO". Entre várias, vence a mais longa — a mais
  // específica, portanto a que o usuário ensinou com mais contexto.
  const contained = eligibleRules
    .filter(
      (rule) =>
        rule.pattern.length >= MIN_CONTAINMENT_LENGTH &&
        containsPattern(pattern, rule.pattern)
    )
    .sort((a, b) => b.pattern.length - a.pattern.length)[0];

  if (contained) {
    return {
      categoryId: contained.categoryId,
      categoryName: contained.category.name,
      source: "user_rule",
      confidence: 0.9,
      pattern,
    };
  }

  let bestRule: (typeof eligibleRules)[number] | null = null;
  let bestScore = 0;
  for (const rule of eligibleRules) {
    const score = similarity(rule.pattern, pattern);
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  if (bestRule && bestScore >= FUZZY_RULE_THRESHOLD) {
    return {
      categoryId: bestRule.categoryId,
      categoryName: bestRule.category.name,
      source: "user_rule",
      confidence: bestScore,
      pattern,
    };
  }

  const merchant = matchMerchant(pattern);
  if (merchant && merchant.categoryType === wantedType) {
    const category = categories.find(
      (c) => c.name === merchant.category && c.type === merchant.categoryType
    );
    if (category) {
      return {
        categoryId: category.id,
        categoryName: category.name,
        source: "merchant",
        confidence: 0.8,
        pattern,
      };
    }
  }

  const fallbackCategory = wantedType === "income" ? fallback.income : fallback.expense;
  return {
    categoryId: fallbackCategory?.id ?? null,
    categoryName: fallbackCategory?.name ?? null,
    source: "fallback",
    confidence: 0.2,
    pattern,
  };
}
