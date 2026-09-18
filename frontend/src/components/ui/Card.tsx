import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  noPad?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", noPad = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          "bg-surface-raised rounded-xl border border-border",
          noPad ? "" : "p-5",
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
