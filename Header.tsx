import { Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { iniciaisDoNome } from "../../lib/finance";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-200 bg-white/85 px-4 py-3 backdrop-blur-sm sm:px-6 lg:hidden">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onMenuClick}
          className="cursor-pointer rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <span className="font-display text-base font-semibold text-ink-900">
          Finanza
        </span>
      </div>

      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
        {iniciaisDoNome(user?.name ?? "")}
      </span>
    </header>
  );
}
