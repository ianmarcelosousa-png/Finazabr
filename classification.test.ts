import { describe, expect, it } from "vitest";
import type { Category, CategorizationRule } from "@prisma/client";
import {
  normalizeDescription,
  similarity,
  stripAccents,
} from "../../src/lib/classification/normalize.js";
import { matchMerchant } from "../../src/lib/classification/merchants.js";
import { classify } from "../../src/lib/classification/classify.js";

function category(name: string, type: "income" | "expense"): Category {
  return {
    id: `cat-${name}-${type}`,
    userId: "user-1",
    name,
    type,
    color: "#000000",
    icon: "Tag",
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const CATEGORIES = [
  category("Salário", "income"),
  category("Outros", "income"),
  category("Alimentação", "expense"),
  category("Transporte", "expense"),
  category("Combustível", "expense"),
  category("Assinaturas", "expense"),
  category("Supermercado", "expense"),
  category("Saúde", "expense"),
  category("Outros", "expense"),
];

const FALLBACK = {
  income: CATEGORIES.find((c) => c.type === "income" && c.name === "Outros")!,
  expense: CATEGORIES.find((c) => c.type === "expense" && c.name === "Outros")!,
};

function rule(pattern: string, categoryName: string, type: "income" | "expense") {
  const cat = CATEGORIES.find((c) => c.name === categoryName && c.type === type)!;
  return {
    id: `rule-${pattern}`,
    userId: "user-1",
    categoryId: cat.id,
    pattern,
    type,
    hitCount: 1,
    source: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    category: cat,
  } as CategorizationRule & { category: Category };
}

describe("stripAccents", () => {
  it("remove acentos preservando as letras", () => {
    expect(stripAccents("Alimentação")).toBe("Alimentacao");
    expect(stripAccents("Saúde é ótimo")).toBe("Saude e otimo");
  });
});

describe("normalizeDescription", () => {
  it("reduz variações do mesmo estabelecimento à mesma chave", () => {
    const a = normalizeDescription("COMPRA CARTAO IFOOD *IFD SAO PAULO");
    const b = normalizeDescription("IFOOD  IFD - SAO PAULO 03/12");
    expect(a).toBe(b);
  });

  it("descarta datas, parcelas, CPF/CNPJ e números soltos", () => {
    const normalized = normalizeDescription(
      "PAGTO 12/34 NETFLIX 12.345.678/0001-99 00012345"
    );
    expect(normalized).toBe("NETFLIX");
  });

  it("não devolve chave vazia quando só há ruído", () => {
    // Uma chave vazia agruparia movimentações sem relação e envenenaria o
    // aprendizado — melhor cair para a versão apenas limpa.
    expect(normalizeDescription("PIX ENVIADO")).not.toBe("");
  });
});

describe("similarity", () => {
  it("dá 1 para descrições idênticas e 0 para disjuntas", () => {
    expect(similarity("IFOOD SAO PAULO", "IFOOD SAO PAULO")).toBe(1);
    expect(similarity("IFOOD", "NETFLIX")).toBe(0);
  });

  it("pontua parcialmente descrições que compartilham tokens", () => {
    const score = similarity("POSTO CENTRAL", "POSTO CENTRAL LTDA COMBUSTIVEL");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe("matchMerchant", () => {
  it("reconhece os estabelecimentos do prompt", () => {
    expect(matchMerchant(normalizeDescription("IFOOD"))?.category).toBe("Alimentação");
    expect(matchMerchant(normalizeDescription("NETFLIX.COM"))?.category).toBe("Assinaturas");
    expect(matchMerchant(normalizeDescription("UBER *TRIP"))?.category).toBe("Transporte");
    expect(matchMerchant(normalizeDescription("POSTO IPIRANGA"))?.category).toBe("Combustível");
    expect(matchMerchant(normalizeDescription("SUPERMERCADO ASSAI"))?.category).toBe("Supermercado");
    expect(matchMerchant(normalizeDescription("DROGARIA PACHECO"))?.category).toBe("Saúde");
    expect(matchMerchant(normalizeDescription("SALARIO EMPRESA X"))?.category).toBe("Salário");
  });

  it("prefere a regra mais específica quando duas poderiam casar", () => {
    // "POSTO SHELL" é combustível, não transporte genérico.
    expect(matchMerchant(normalizeDescription("AUTO POSTO SHELL"))?.category).toBe(
      "Combustível"
    );
  });

  it("devolve null quando não conhece o estabelecimento", () => {
    expect(matchMerchant(normalizeDescription("XPTO COMERCIO 998877"))).toBeNull();
  });
});

describe("classify", () => {
  it("usa o dicionário quando o usuário ainda não ensinou nada", () => {
    const result = classify(
      { description: "COMPRA CARTAO IFOOD *IFD", direction: "out" },
      [],
      CATEGORIES,
      FALLBACK
    );

    expect(result.categoryName).toBe("Alimentação");
    expect(result.source).toBe("merchant");
  });

  it("faz a regra do usuário vencer o dicionário", () => {
    // O usuário decidiu que iFood, para ele, é "Supermercado". A correção dele
    // não pode ser sobrescrita pelo padrão do sistema (§15).
    const rules = [rule(normalizeDescription("IFOOD"), "Supermercado", "expense")];

    const result = classify(
      { description: "IFOOD *IFD SAO PAULO", direction: "out" },
      rules,
      CATEGORIES,
      FALLBACK
    );

    expect(result.categoryName).toBe("Supermercado");
    expect(result.source).toBe("user_rule");
  });

  it("não deixa uma regra curta demais capturar o extrato inteiro", () => {
    // "SP" tem menos que o mínimo para valer por contenção — se valesse,
    // qualquer descrição com "SP" viraria Supermercado.
    const rules = [rule("SP", "Supermercado", "expense")];

    const result = classify(
      { description: "NETFLIX SP", direction: "out" },
      rules,
      CATEGORIES,
      FALLBACK
    );

    expect(result.categoryName).toBe("Assinaturas");
  });

  it("aprende o caso 'POSTO CENTRAL' descrito no prompt", () => {
    const unknown = { description: "POSTO CENTRAL 55", direction: "out" as const };

    // Antes de ensinar: o dicionário reconhece "POSTO" como combustível.
    const before = classify(unknown, [], CATEGORIES, FALLBACK);
    expect(before.source).toBe("merchant");

    // Depois de o usuário corrigir para Transporte, a regra dele prevalece.
    const rules = [rule(before.pattern, "Transporte", "expense")];
    const after = classify(unknown, rules, CATEGORIES, FALLBACK);
    expect(after.categoryName).toBe("Transporte");
    expect(after.source).toBe("user_rule");
  });

  it("reaproveita a regra quando a descrição varia um pouco", () => {
    const rules = [rule(normalizeDescription("MERCEARIA DO ZE"), "Supermercado", "expense")];

    const result = classify(
      { description: "MERCEARIA DO ZE - LOJA 2", direction: "out" },
      rules,
      CATEGORIES,
      FALLBACK
    );

    expect(result.categoryName).toBe("Supermercado");
    expect(result.source).toBe("user_rule");
  });

  it("nunca aplica regra de despesa a um crédito na conta", () => {
    const rules = [rule(normalizeDescription("ACME"), "Alimentação", "expense")];

    const result = classify(
      { description: "ACME PAGAMENTO", direction: "in" },
      rules,
      CATEGORIES,
      FALLBACK
    );

    expect(result.categoryName).toBe("Outros");
    expect(result.source).toBe("fallback");
  });

  it("cai no fallback com confiança baixa quando não reconhece nada", () => {
    const result = classify(
      { description: "ZZZZ COMERCIO 4455", direction: "out" },
      [],
      CATEGORIES,
      FALLBACK
    );

    expect(result.categoryName).toBe("Outros");
    expect(result.source).toBe("fallback");
    expect(result.confidence).toBeLessThan(0.5);
  });
});
