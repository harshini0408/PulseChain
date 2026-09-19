/**
 * /coordinator/escalations — Coordinator Map Page.
 *
 * New composition:
 *  - Map fills the entire available viewport (no header above)
 *  - Floating glass HUD (top-left): live count + selected escalation summary
 *  - Floating controls (top-right): simulate transit toggle
 *  - Operations strip slides up from bottom (overlaid on map)
 *  - Facility drawer remains
 *
 * Existing API hooks, facility lookup, and business logic are preserved.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, Radio, Truck } from "lucide-react";
import type { Facility } from "@pulsechain/shared";
import {
  useEscalationsQuery,
  useFacilityLookup,
  useUnitQuery,
} from "../../api/hooks";
import { useAuth } from "../../auth/AuthProvider";
import { PulseChainGeoMap } from "../../components/escalation/PulseChainGeoMap";
import { EscalationOperationsStrip } from "../../components/escalation/EscalationOperationsStrip";
import { FacilityDetailDrawer } from "../../components/dashboard/FacilityDetailDrawer";
import { ErrorState, LoadingState } from "../../components/ui";
import { ConnectionDot } from "../../components/layout/ConnectionDot";
import { soundManager } from "../../lib/soundManager";
import type { StockUnit } from "../../api/client";

export function EscalationMapPage() {
  const { facilityId } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectedFacility, setInspectedFacility] = useState<Facility | null>(null);
  const [simulateTransit, setSimulateTransit] = useState(false);
  const [stripOpen, setStripOpen] = useState(true);

  const escalationsQuery = useEscalationsQuery();
  const { facilities, byId, nameOf, isLoading: facilitiesLoading } = useFacilityLookup();

  const escalations = escalationsQuery.data ?? [];

  const selected =
    escalations.find((e) => e.escalationId === selectedId) ?? escalations[0] ?? undefined;

  const subjectUnit = useUnitQuery(
    selected?.subjectType === "UNIT" ? selected.subjectId : null,
  );

  const claimantFacilityId = subjectUnit.data?.claimedBy;

  const originFacility = useMemo(() => {
    if (selected?.originFacilityId) return byId.get(selected.originFacilityId) ?? null;
    return facilities.find((f) => f.type === "BLOOD_CENTRE") ?? null;
  }, [selected, byId, facilities]);

  const targetFacility = useMemo(() => {
    if (claimantFacilityId) return byId.get(claimantFacilityId) ?? null;
    return facilities.find((f) => f.type === "HOSPITAL" && f.facilityId !== originFacility?.facilityId) ?? null;
  }, [claimantFacilityId, byId, facilities, originFacility]);

  const unitsById = useMemo(() => {
    const map = new Map<string, StockUnit>();
    if (subjectUnit.data) map.set(subjectUnit.data.unitId, subjectUnit.data);
    return map;
  }, [subjectUnit.data]);

  const isLoading = escalationsQuery.isLoading || facilitiesLoading;
  const running = escalations.filter((e) => e.status === "RUNNING");

  const handleSimulateToggle = () => {
    const next = !simulateTransit;
    setSimulateTransit(next);
    if (next) soundManager.play("transferStart");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingState variant="map" label="Connecting to the corridor network…" />
      </div>
    );
  }

  if (escalationsQuery.isError) {
    return (
      <ErrorState
        title="Escalations did not load"
        message={
          escalationsQuery.error instanceof Error
            ? escalationsQuery.error.message
            : "The escalations endpoint did not respond."
        }
        onRetry={() => void escalationsQuery.refetch()}
      />
    );
  }

  return (
    /*
     * Full-bleed map scene: -mx-4/-mx-6/-mx-8 cancels the AppShell padding
     * and -mt-5/-mt-6/-mt-8 cancels the top padding, so the map truly fills
     * the available viewport from edge to edge.
     */
    <div className="relative -mx-4 -mt-5 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 overflow-hidden"
      style={{ height: "calc(100dvh - 3.5rem)" }}
    >
      {/* ── Map fills entire container ─────────────────────────────────────── */}
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

      {/* ── Floating HUD — top-left ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -16, y: -8 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="map-hud absolute left-3 top-3 z-[500] min-w-[180px] max-w-[240px] p-3.5"
      >
        {/* Live indicator */}
        <div className="flex items-center gap-2 mb-2">
          <ConnectionDot showLabel={false} />
          <span className="text-2xs font-bold uppercase tracking-widest text-text-subtle">
            Corridor Operations
          </span>
        </div>

        {/* Active rescue count */}
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold text-text tabular-nums">
            {running.length}
          </span>
          <span className="text-xs text-text-muted">
            {running.length === 1 ? "active rescue" : "active rescues"}
          </span>
        </div>

        {/* Selected escalation summary */}
        {selected && (
          <div className="mt-2.5 pt-2.5 border-t border-border/60 text-xs">
            <p className="font-semibold text-text truncate">
              {selected.subjectId.slice(-6).toUpperCase()}
            </p>
            <p className="text-text-muted mt-0.5 text-2xs">
              {nameOf(selected.originFacilityId)}
            </p>
            {targetFacility && (
              <p className="text-accent font-medium text-2xs mt-0.5">
                → {targetFacility.name.split(" ").slice(0, 2).join(" ")}
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Floating Controls — top-right ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 16, y: -8 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="absolute right-3 top-3 z-[500] flex flex-col gap-2"
      >
        <button
          type="button"
          onClick={handleSimulateToggle}
          className={[
            "map-hud inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold transition-all",
            simulateTransit
              ? "!bg-accent !border-accent/80 text-white"
              : "text-text hover:border-accent/40",
          ].join(" ")}
        >
          <Truck className="h-3.5 w-3.5" />
          {simulateTransit ? "Simulation Active" : "Simulate Transit"}
        </button>
      </motion.div>

      {/* ── Operations Strip — slides from bottom ─────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-[500]">
        {/* Toggle tab */}
        <div className="flex justify-center mb-0.5 pointer-events-none">
          <button
            type="button"
            onClick={() => setStripOpen((v) => !v)}
            className="pointer-events-auto map-hud px-4 py-1.5 flex items-center gap-1.5 text-2xs font-semibold text-text hover:text-accent transition-colors rounded-b-none rounded-t-xl border-b-0"
          >
            {stripOpen ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Hide operations
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                {escalations.length} escalation{escalations.length !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {stripOpen && (
            <motion.div
              initial={{ y: "100%", opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            >
              <EscalationOperationsStrip
                escalations={escalations}
                selectedId={selected?.escalationId ?? null}
                onSelect={(id) => setSelectedId(id)}
                facilities={facilities}
                unitsById={unitsById}
                simulatedTransitId={simulateTransit ? selected?.escalationId : null}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Facility Operational Profile Drawer ───────────────────────────── */}
      <FacilityDetailDrawer
        facility={inspectedFacility}
        originFacility={originFacility}
        onClose={() => setInspectedFacility(null)}
      />
    </div>
  );
}
