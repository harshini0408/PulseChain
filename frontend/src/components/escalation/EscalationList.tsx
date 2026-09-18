/**
 * frontend/src/components/escalation/EscalationList.tsx
 *
 * Sidebar list of active escalations.
 * Each row shows: component • blood group • ring badge • time since start.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { ActiveEscalation } from "../../api/client";
import { formatDistanceToNow } from "date-fns";

interface EscalationListProps {
  escalations: ActiveEscalation[];
  selected: string | null;
  onSelect: (id: string) => void;
}

const RING_LABELS: Record<number, string> = {
  1: "Ring 1 · <10 km",
  2: "Ring 2 · <30 km",
  3: "Regional",
};

const RING_COLOURS: Record<number, string> = {
  1: "bg-red-100 text-red-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-indigo-100 text-indigo-700",
};

export function EscalationList({ escalations, selected, onSelect }: EscalationListProps) {
  if (escalations.length === 0) {
    return (
      <p className="text-sm text-text-muted py-4 text-center">No active escalations.</p>
    );
  }

  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {escalations.map((esc) => {
          const age = formatDistanceToNow(new Date(esc.startedAt), { addSuffix: true });
          const ringLabel = RING_LABELS[esc.currentRing] ?? `Ring ${esc.currentRing}`;
          const ringColour = RING_COLOURS[esc.currentRing] ?? "bg-gray-100 text-gray-700";
          const isSelected = esc.escalationId === selected;

          return (
            <motion.li
              key={esc.escalationId}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
              onClick={() => onSelect(esc.escalationId)}
              className={[
                "cursor-pointer rounded-lg border p-3 transition-colors",
                isSelected
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-text-muted/40 hover:bg-surface-overlay",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-text">
                    {esc.component ?? esc.subjectType}
                    {esc.bloodGroup ? ` · ${esc.bloodGroup}` : ""}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {esc.originFacilityId ?? esc.subjectId}
                  </p>
                  <p className="text-xs text-text-muted mt-1">{age}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ringColour}`}
                >
                  {ringLabel}
                </span>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
