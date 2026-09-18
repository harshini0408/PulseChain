import { forwardRef, type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  noPad?: boolean;
  /** Tier A brand surfaces: 24px radius and a softer shadow. */
  tier?: "console" | "brand";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", noPad = false, tier = "console", ...props }, ref) => (
    <div
      ref={ref}
      className={[
        "bg-surface-raised border border-border",
        tier === "brand" ? "rounded-3xl shadow-brand" : "rounded-xl shadow-card",
        noPad ? "" : tier === "brand" ? "p-6 sm:p-8" : "p-5",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  ),
);

Card.displayName = "Card";
