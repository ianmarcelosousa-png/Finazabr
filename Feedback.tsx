import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";
import { ApiError } from "../../lib/api";

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Não foi possível completar a operação. Tente novamente.";
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin", className)} size={18} />;
}

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-ink-500">
      <Spinner />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-expense-50 text-expense-500">
        <AlertCircle size={20} />
      </span>
      <p className="text-sm font-medium text-ink-700">{getErrorMessage(error)}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="cursor-pointer text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-ink-400">
        {icon ?? <Inbox size={20} />}
      </span>
      <div>
        <p className="text-sm font-semibold text-ink-700">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Mensagem de erro dentro de formulários, acima dos botões. */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl bg-expense-50 px-3.5 py-2.5 text-sm text-expense-600">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      {getErrorMessage(error)}
    </p>
  );
}
