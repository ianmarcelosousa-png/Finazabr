export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

/** Menu lateral do §2, na ordem pedida. "Sair" é um botão à parte no rodapé. */
export const navItems: NavItem[] = [
  { to: "/", label: "Visão Geral", icon: "LayoutDashboard" },
  { to: "/lancamentos", label: "Lançamentos", icon: "ArrowLeftRight" },
  { to: "/receitas", label: "Receitas", icon: "TrendingUp" },
  { to: "/despesas", label: "Despesas", icon: "TrendingDown" },
  { to: "/importar", label: "Importar Extrato", icon: "Upload" },
  { to: "/categorias", label: "Categorias", icon: "Tags" },
  { to: "/configuracoes", label: "Configurações", icon: "Settings" },
];
