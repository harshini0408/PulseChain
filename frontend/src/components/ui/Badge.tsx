import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "accent" | "outline" | "inverse";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-overlay text-text-muted",
  accent: "bg-accent-soft text-accent",
  outline: "border border-border text-text-muted",
  inverse: "bg-brand-oxblood text-text-inverse",
};

export function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-semibold",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
