import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cn } from "../../lib/cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export function TextField({
  label,
  icon,
  trailing,
  className,
  id,
  ...props
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-ink-700">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full rounded-xl border border-ink-200 bg-white py-2.5 text-sm text-ink-900 placeholder:text-ink-400",
            "transition-colors duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            icon ? "pl-10" : "pl-3.5",
            trailing ? "pr-10" : "pr-3.5",
            className
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-3 flex items-center">
            {trailing}
          </span>
        )}
      </div>
    </div>
  );
}
