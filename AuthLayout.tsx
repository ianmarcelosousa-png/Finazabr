import type { ReactNode } from "react";
import { Wallet, ShieldCheck, PieChart, TrendingUp } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
}

const highlights = [
  { icon: PieChart, text: "Veja para onde vai o seu dinheiro, por categoria" },
  { icon: TrendingUp, text: "Descubra quanto pode investir todo mês" },
  { icon: ShieldCheck, text: "Seus dados, organizados e sob controle" },
];

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Branding panel */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-side-900 px-12 py-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(124,58,237,0.25), transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Wallet size={20} className="text-white" strokeWidth={2.25} />
          </span>
          <span className="font-display text-xl font-semibold">Finanza</span>
        </div>

        <div className="relative">
          <h2 className="font-display text-3xl leading-tight font-semibold text-balance">
            Controle financeiro pessoal, sem complicação.
          </h2>
          <ul className="mt-8 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-side-400">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon size={15} className="text-white" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-side-400">
          © 2026 Finanza. Todos os direitos reservados.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
            <Wallet size={18} className="text-white" strokeWidth={2.25} />
          </span>
          <span className="font-display text-lg font-semibold text-ink-900">
            Finanza
          </span>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
