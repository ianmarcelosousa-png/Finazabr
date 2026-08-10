import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700 shadow-sm shadow-brand-600/20",
  secondary:
    "bg-white text-ink-700 border border-ink-200 hover:bg-ink-50 active:bg-ink-100",
  ghost: "bg-transparent text-ink-500 hover:bg-ink-100 hover:text-ink-900",
  danger: "bg-expense-500 text-white hover:bg-expense-600",
};

const sizeStyles: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-sm px-4 py-2.5 gap-2 rounded-xl",
  lg: "text-base px-5 py-3 gap-2 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center font-medium transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
