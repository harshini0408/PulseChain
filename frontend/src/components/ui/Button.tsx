import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Tier A brand surfaces use full-round pill buttons; consoles do not. */
  pill?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-text-inverse hover:bg-accent-hover shadow-card",
  secondary:
    "bg-surface-raised text-text border border-border hover:border-border-strong hover:bg-surface-overlay",
  ghost: "text-text-muted hover:text-text hover:bg-surface-overlay",
  danger: "bg-brand-oxblood text-text-inverse hover:bg-brand-oxblood/90",
  quiet: "bg-surface-overlay text-text hover:bg-border",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      pill = false,
      fullWidth = false,
      children,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "inline-flex items-center justify-center font-semibold transition-colors duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        pill ? "rounded-full" : "rounded-xl",
        fullWidth ? "w-full" : "",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    >
      {loading && <Spinner size="sm" className="text-current" />}
      {children}
    </button>
  ),
);

Button.displayName = "Button";
