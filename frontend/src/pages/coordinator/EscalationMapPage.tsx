import { useState, useMemo } from "react";
import { Radio, Truck, Info, Navigation, ArrowRight } from "lucide-react";
import { getConfig, type Facility } from "@pulsechain/shared";
import {
  useEscalationsQuery,
  useFacilityLookup,
  useUnitQuery,
  useStockQuery,
} from "../../api/hooks";
import { useAuth } from "../../auth/AuthProvider";
import { PulseChainGeoMap } from "../../components/escalation/PulseChainGeoMap";
import { EscalationOperationsStrip } from "../../components/escalation/EscalationOperationsStrip";
import { FacilityDetailDrawer } from "../../components/dashboard/FacilityDetailDrawer";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusPill,
} from "../../components/ui";
import { ConnectionDot } from "../../components/layout/ConnectionDot";
import { ringRangeLabel, ringToken } from "../../lib/status";
import { ringAdvanceAt } from "../../lib/escalation";
import { formatRelative } from "../../lib/format";
import type { StockUnit } from "../../api/client";

export function EscalationMapPage() {
  const { facilityId } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectedFacility, setInspectedFacility] = useState<Facility | null>(null);
  const [simulateTransit, setSimulateTransit] = useState(false);

  const escalationsQuery = useEscalationsQuery();
  const { facilities, byId, nameOf, isLoading: facilitiesLoading } = useFacilityLookup();

  const escalations = escalationsQuery.data ?? [];

  // Default to newest active escalation
  const selected =
    escalations.find((e) => e.escalationId === selectedId) ?? escalations[0] ?? undefined;

  // The claimant or unit data
  const subjectUnit = useUnitQuery(
    selected?.subjectType === "UNIT" ? selected.subjectId : null,
  );

  const claimantFacilityId = subjectUnit.data?.claimedBy;

  // Origin and Target facilities
  const originFacility = useMemo(() => {
    if (selected?.originFacilityId) return byId.get(selected.originFacilityId) ?? null;
    return facilities.find((f) => f.type === "BLOOD_CENTRE") ?? null;
  }, [selected, byId, facilities]);

  const targetFacility = useMemo(() => {
    if (claimantFacilityId) return byId.get(claimantFacilityId) ?? null;
    // Nearest prominent hospital
    return facilities.find((f) => f.type === "HOSPITAL" && f.facilityId !== originFacility?.facilityId) ?? null;
  }, [claimantFacilityId, byId, facilities, originFacility]);

  // Create units lookup map
  const unitsById = useMemo(() => {
    const map = new Map<string, StockUnit>();
    if (subjectUnit.data) {
      map.set(subjectUnit.data.unitId, subjectUnit.data);
    }
    return map;
  }, [subjectUnit.data]);

  const isLoading = escalationsQuery.isLoading || facilitiesLoading;
  const running = escalations.filter((e) => e.status === "RUNNING");
  const { rings } = getConfig();

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Coordinator"
        title="Escalation corridor"
        subtitle="Live geographic blood-rescue control centre"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSimulateTransit((prev) => !prev)}
              className={[
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors",
                simulateTransit
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface-raised text-text hover:border-border-strong",
              ].join(" ")}
            >
              <Truck className="h-3.5 w-3.5" />
              {simulateTransit ? "Simulation Active" : "Simulate Transfer"}
            </button>
            <ConnectionDot />
          </div>
        }
      />

      {isLoading ? (
        <LoadingState variant="map" label="Loading the geographic corridor" />
      ) : escalationsQuery.isError ? (
        <ErrorState
          title="Escalations did not load"
          message={
            escalationsQuery.error instanceof Error
              ? escalationsQuery.error.message
              : "The escalations endpoint did not respond."
          }
          onRetry={() => void escalationsQuery.refetch()}
        />
      ) : (
        <div className="flex flex-col">
          {/* ── Prominent Real Geographic Map (70% viewport dominant) ─────── */}
          <div className="relative h-[62vh] min-h-[460px] w-full">
            <PulseChainGeoMap
              facilities={facilities}
              escalation={selected}
              unit={subjectUnit.data}
              originFacility={originFacility}
              targetFacility={targetFacility}
              selectedFacilityId={inspectedFacility?.facilityId ?? targetFacility?.facilityId}
              onSelectFacility={(facId) => {
                const fac = byId.get(facId);
                if (fac) setInspectedFacility(fac);
              }}
              onOpenFacilityDrawer={(fac) => setInspectedFacility(fac)}
              isSimulatingTransit={simulateTransit}
            />
          </div>

          {/* ── Compact Operational Control Strip Below The Map ───────────── */}
          <EscalationOperationsStrip
            escalations={escalations}
            selectedId={selected?.escalationId ?? null}
            onSelect={(id) => setSelectedId(id)}
            facilities={facilities}
            unitsById={unitsById}
            simulatedTransitId={simulateTransit ? selected?.escalationId : null}
          />

          {/* ── Facility Operational Profile Drawer (Reused) ──────────────── */}
          <FacilityDetailDrawer
            facility={inspectedFacility}
            originFacility={originFacility}
            onClose={() => setInspectedFacility(null)}
          />
        </div>
      )}
    </div>
  );
}
