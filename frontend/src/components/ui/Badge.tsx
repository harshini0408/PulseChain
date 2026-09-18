import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "blood-centre" | "hospital" | "coordinator";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-overlay text-text-muted border border-border",
  "blood-centre": "bg-rbc-bg text-rbc border border-rbc/20",
  hospital: "bg-plasma-bg text-plasma border border-plasma/20",
  coordinator: "bg-platelet-bg text-platelet border border-platelet/20",
};

export function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
