import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Wallet, X } from "lucide-react";
import { DynamicIcon } from "../ui/DynamicIcon";
import { navItems } from "./navItems";
import { cn } from "../../lib/cn";
import { useAuth } from "../../context/AuthContext";
import { iniciaisDoNome } from "../../lib/finance";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate("/login");
  };

  return (
    <>
      {/* Backdrop (mobile/tablet only) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-side-900 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
              <Wallet size={18} className="text-white" strokeWidth={2.25} />
            </span>
            <span className="font-display text-lg font-semibold text-white">
              Finanza
            </span>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-side-400 hover:bg-side-800 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-4 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-side-400 hover:bg-side-800 hover:text-white"
                )
              }
            >
              <DynamicIcon name={item.icon} size={18} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout + user */}
        <div className="border-t border-side-700 px-4 py-4">
          <button
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-side-400 transition-colors duration-150 hover:bg-side-800 hover:text-white"
          >
            <LogOut size={18} strokeWidth={2} />
            Sair
          </button>

          <div className="mt-3 flex items-center gap-3 rounded-xl bg-side-800 px-3.5 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
              {iniciaisDoNome(user?.name ?? "")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {user?.name}
              </p>
              <p className="truncate text-xs text-side-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
