/**
 * frontend/src/pages/coordinator/EscalationMapPage.tsx
 *
 * Coordinator view: live escalation corridor map.
 * Left panel: SVG map with ring animation.
 * Right panel: escalation list + selected-unit detail card.
 */

import { useState } from "react";
import { Activity, Radio, AlertCircle } from "lucide-react";
import { PageHeader, Card, Spinner, Badge } from "../../components/ui";
import { CorridorMap } from "../../components/escalation/CorridorMap";
import { EscalationList } from "../../components/escalation/EscalationList";
import { useEscalationsQuery } from "../../api/hooks";
import { useFacilitiesQuery } from "../../api/hooks";
import { formatDistanceToNow } from "date-fns";

const RING_BADGE_VARIANT: Record<number, "blood-centre" | "hospital" | "coordinator" | "default"> = {
  1: "blood-centre",
  2: "coordinator",
  3: "hospital",
};

const STATUS_BADGE_VARIANT: Record<string, "blood-centre" | "hospital" | "coordinator" | "default"> = {
  RUNNING: "coordinator",
  RESOLVED: "hospital",
  EXHAUSTED: "blood-centre",
  CANCELLED: "default",
};

export function EscalationMapPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const {
    data: escalations = [],
    isLoading: loadingEsc,
    isError: errorEsc,
  } = useEscalationsQuery();

  const {
    data: facilities = [],
    isLoading: loadingFac,
  } = useFacilitiesQuery();

  const isLoading = loadingEsc || loadingFac;

  const selectedEsc = escalations.find((e) => e.escalationId === selected) ?? null;

  // Auto-select first escalation when data arrives
  if (!selected && escalations.length > 0) {
    setSelected(escalations[0].escalationId);
  }

  const activeCount = escalations.filter((e) => e.status === "RUNNING").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Escalation Corridor Map"
        subtitle="Live rescue escalations across the Coimbatore blood network"
        actions={
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs font-medium text-text-muted">Live · 3.5s</span>
          </div>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* ── SVG Map ── */}
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-text">Corridor Network</h2>
              <span className="ml-auto text-xs text-text-muted">
                {activeCount} active escalation{activeCount !== 1 ? "s" : ""}
              </span>
            </div>

            {errorEsc && (
              <div className="flex items-center gap-2 text-sm text-red-600 mb-4">
                <AlertCircle className="h-4 w-4" />
                Failed to load escalations
              </div>
            )}

            <CorridorMap
              facilities={facilities}
              escalations={escalations}
              selected={selected}
            />

            {/* Ring legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-border">
              {[
                { ring: 1, label: "Ring 1 · <10 km", colour: "#dc2626" },
                { ring: 2, label: "Ring 2 · <30 km", colour: "#f59e0b" },
                { ring: 3, label: "Regional",        colour: "#6366f1" },
              ].map(({ ring, label, colour }) => (
                <div key={ring} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ background: colour }}
                  />
                  <span className="text-xs text-text-muted">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 sm:ml-auto">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-700 flex-shrink-0" />
                <span className="text-xs text-text-muted">Blood Centre (origin)</span>
              </div>
            </div>
          </Card>

          {/* ── Sidebar ── */}
          <div className="flex flex-col gap-4">
            {/* Escalation list */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-text">Active Escalations</h2>
              </div>
              <EscalationList
                escalations={escalations}
                selected={selected}
                onSelect={setSelected}
              />
            </Card>

            {/* Selected escalation detail */}
            {selectedEsc && (
              <Card>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
                  Selected Unit
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Component</dt>
                    <dd className="font-medium text-text">{selectedEsc.component ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Blood Group</dt>
                    <dd className="font-medium text-text">{selectedEsc.bloodGroup ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Current Ring</dt>
                    <dd>
                      <Badge variant={RING_BADGE_VARIANT[selectedEsc.currentRing] ?? "default"}>
                        Ring {selectedEsc.currentRing}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Status</dt>
                    <dd>
                      <Badge variant={STATUS_BADGE_VARIANT[selectedEsc.status] ?? "default"}>
                        {selectedEsc.status}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Started</dt>
                    <dd className="text-text-muted text-xs">
                      {formatDistanceToNow(new Date(selectedEsc.startedAt), { addSuffix: true })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Origin</dt>
                    <dd className="text-xs text-text truncate max-w-[140px]">
                      {selectedEsc.originFacilityId ?? selectedEsc.subjectId}
                    </dd>
                  </div>
                </dl>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
