/**
 * Every status pill in the application. The label and the colour both come
 * from lib/status.ts — this component only decides the shape.
 */

import {
  escalationStatusToken,
  offerStatusToken,
  requisitionStatusToken,
  unitStatusToken,
  urgencyToken,
  type StatusToken,
} from "../../lib/status";

export type StatusKind = "unit" | "offer" | "requisition" | "escalation" | "urgency";

interface StatusPillProps {
  kind: StatusKind;
  value: string;
  size?: "sm" | "md";
  withDot?: boolean;
  className?: string;
}

const resolvers: Record<StatusKind, (value: string) => StatusToken> = {
  unit: unitStatusToken,
  offer: offerStatusToken,
  requisition: requisitionStatusToken,
  escalation: escalationStatusToken,
  urgency: urgencyToken,
};

export function StatusPill({
  kind,
  value,
  size = "md",
  withDot = false,
  className = "",
}: StatusPillProps) {
  const token = resolvers[kind](value);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-2xs" : "px-2.5 py-1 text-xs",
        token.pill,
        className,
      ].join(" ")}
    >
      {withDot && <span className={["h-1.5 w-1.5 rounded-full", token.dot].join(" ")} />}
      {token.label}
    </span>
  );
}
