export interface DefaultCategorySeed {
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
}

/**
 * Categorias criadas para cada novo usuário no registro (§8 do prompt).
 *
 * O `name` é a chave canônica usada pelo motor de classificação de extrato
 * (lib/classification/merchants.ts mapeia estabelecimentos para estes nomes),
 * então renomear uma categoria aqui exige atualizar o dicionário junto.
 *
 * As cores são escolhidas para permanecerem distinguíveis lado a lado no
 * gráfico de pizza — categorias vizinhas nunca compartilham matiz.
 * Os ícones são nomes de componentes do `lucide-react` (ver DynamicIcon).
 */
export const DEFAULT_CATEGORIES: DefaultCategorySeed[] = [
  // Receitas
  { name: "Salário", type: "income", color: "#16a34a", icon: "Wallet" },
  { name: "Renda extra", type: "income", color: "#4ade80", icon: "TrendingUp" },
  { name: "Freelance", type: "income", color: "#0d9488", icon: "Laptop" },
  { name: "Investimentos", type: "income", color: "#65a30d", icon: "PiggyBank" },
  { name: "Outros", type: "income", color: "#94a3b8", icon: "CircleDollarSign" },

  // Despesas
  { name: "Moradia", type: "expense", color: "#2563eb", icon: "Home" },
  { name: "Alimentação", type: "expense", color: "#ea580c", icon: "UtensilsCrossed" },
  { name: "Supermercado", type: "expense", color: "#f59e0b", icon: "ShoppingCart" },
  { name: "Transporte", type: "expense", color: "#0891b2", icon: "Bus" },
  { name: "Combustível", type: "expense", color: "#7c3aed", icon: "Fuel" },
  { name: "Saúde", type: "expense", color: "#db2777", icon: "HeartPulse" },
  { name: "Educação", type: "expense", color: "#15803d", icon: "GraduationCap" },
  { name: "Lazer", type: "expense", color: "#eab308", icon: "Gamepad2" },
  { name: "Compras", type: "expense", color: "#c026d3", icon: "ShoppingBag" },
  { name: "Assinaturas", type: "expense", color: "#e11d48", icon: "Repeat" },
  { name: "Internet/Telefone", type: "expense", color: "#6366f1", icon: "Wifi" },
  { name: "Energia", type: "expense", color: "#f97316", icon: "Zap" },
  { name: "Água", type: "expense", color: "#38bdf8", icon: "Droplet" },
  { name: "Financiamento", type: "expense", color: "#78716c", icon: "Landmark" },
  { name: "Impostos", type: "expense", color: "#a16207", icon: "Receipt" },
  { name: "Outros", type: "expense", color: "#64748b", icon: "Package" },
];

export const DEFAULT_INVESTMENT_PERCENTAGE = 20;

/** Categoria de destino quando nada casa na classificação automática. */
export const FALLBACK_EXPENSE_CATEGORY = "Outros";
export const FALLBACK_INCOME_CATEGORY = "Outros";
