/**
 * Active escalations. On a phone this list comes first, because it is the
 * useful half — a 390px map is decoration, a list of what is escalating is not.
 */

import type { ActiveEscalation } from "../../api/client";
import { StatusPill } from "../ui/StatusPill";
import { ringToken } from "../../lib/status";
import { formatRelative } from "../../lib/format";

interface EscalationListProps {
  escalations: ActiveEscalation[];
  selectedId: string | null;
  onSelect: (escalationId: string) => void;
}

export function EscalationList({ escalations, selectedId, onSelect }: EscalationListProps) {
  return (
    <ul className="space-y-2">
      {escalations.map((esc) => {
        const ring = ringToken(esc.currentRing);
        const selected = esc.escalationId === selectedId;

        return (
          <li key={esc.escalationId}>
            <button
              type="button"
              onClick={() => onSelect(esc.escalationId)}
              aria-current={selected}
              className={[
                "w-full rounded-xl border p-3 text-left transition-colors",
                selected
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface-raised hover:border-border-strong",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-2xs text-text-muted">{esc.subjectId}</p>
                  <p className="mt-0.5 text-sm font-semibold text-text">
                    {esc.bloodGroup ?? "—"}{" "}
                    <span className="font-normal text-text-muted">
                      {esc.component?.toLowerCase() ?? esc.subjectType.toLowerCase()}
                    </span>
                  </p>
                </div>
                <StatusPill kind="escalation" value={esc.status} size="sm" />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={["inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-semibold", ring.pill].join(" ")}
                >
                  <span className={["h-1.5 w-1.5 rounded-full", ring.dot].join(" ")} />
                  {ring.label}
                </span>
                <span className="text-2xs text-text-subtle">{formatRelative(esc.startedAt)}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
