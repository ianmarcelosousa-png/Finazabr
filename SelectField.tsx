import type { SelectHTMLAttributes } from "react";
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function SelectField({ label, className, id, children, ...props }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "w-full cursor-pointer appearance-none rounded-xl border border-ink-200 bg-white py-2.5 pl-3.5 pr-9 text-sm text-ink-900",
            "transition-colors duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute inset-y-0 right-3 my-auto text-ink-400"
        />
      </div>
    </div>
  );
}
