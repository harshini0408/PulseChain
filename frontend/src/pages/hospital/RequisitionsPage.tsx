/**
 * frontend/src/pages/hospital/RequisitionsPage.tsx
 *
 * Hospital Requisitions console:
 * - Create persistent requisitions
 * - Active vs History separation
 * - Operational urgency sorting
 * - Lightweight filtering by component, blood group, and urgency
 * - Deep linking to detailed tracking
 */

import { useMemo, useState } from "react";
import { CheckCircle, Clock, FileText, Filter } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { useCreateRequisitionMutation, useRequisitionsQuery } from "../../api/hooks";
import { RequisitionForm, type RequisitionFormValues } from "../../components/requisitions/RequisitionForm";
import { RequisitionList } from "../../components/requisitions/RequisitionList";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  useToast,
} from "../../components/ui";
import { pluralise } from "../../lib/format";
import type { BloodGroup, Component, Requisition, Urgency } from "@pulsechain/shared";

const TERMINAL_STATUSES = new Set([
  "FULFILLED",
  "FILLED",
  "CANCELLED",
  "EXPIRED",
  "EXHAUSTED",
  "CLOSED",
]);

const URGENCY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function RequisitionsPage() {
  const { facilityId } = useAuth();
  const requisitions = useRequisitionsQuery(facilityId);
  const create = useCreateRequisitionMutation();
  const { push } = useToast();

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [filterComponent, setFilterComponent] = useState<string>("ALL");
  const [filterBloodGroup, setFilterBloodGroup] = useState<string>("ALL");
  const [filterUrgency, setFilterUrgency] = useState<string>("ALL");

  const handleSubmit = async (values: RequisitionFormValues) => {
    if (!values.component || !values.bloodGroup) return;

    try {
      const created = await create.mutateAsync({
        hospitalId: values.hospitalId,
        component: values.component,
        bloodGroup: values.bloodGroup,
        unitsRequested: values.unitsRequested,
        urgency: values.urgency,
        neededBy: new Date(values.neededBy).toISOString(),
        source: "MANUAL",
        rawText: values.note || undefined,
      });
      push({
        tone: "success",
        title: "Requisition created",
        message: `${created.reqId || created.id} is open for ${pluralise(created.unitsRequested, "unit")}.`,
      });
    } catch (err) {
      push({
        tone: "error",
        title: "Could not create the requisition",
        message: err instanceof Error ? err.message : "Failed to create requisition on the server.",
      });
    }
  };

  const rawList = requisitions.data ?? [];

  const { activeRequisitions, historyRequisitions } = useMemo(() => {
    const active: Requisition[] = [];
    const history: Requisition[] = [];

    for (const req of rawList) {
      if (TERMINAL_STATUSES.has(req.status)) {
        history.push(req);
      } else {
        active.push(req);
      }
    }

    // Sort active: CRITICAL first, then neededBy ascending, then creation time descending
    active.sort((a, b) => {
      const uA = URGENCY_RANK[a.urgency] ?? 0;
      const uB = URGENCY_RANK[b.urgency] ?? 0;
      if (uA !== uB) return uB - uA;

      const dateA = new Date(a.neededBy || a.requiredBy || 0).getTime();
      const dateB = new Date(b.neededBy || b.requiredBy || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;

      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    // Sort history: Most recent first
    history.sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return { activeRequisitions: active, historyRequisitions: history };
  }, [rawList]);

  // Apply filters
  const displayedList = useMemo(() => {
    const list = activeTab === "active" ? activeRequisitions : historyRequisitions;
    return list.filter((r) => {
      if (filterComponent !== "ALL" && r.component !== filterComponent) return false;
      if (filterBloodGroup !== "ALL" && r.bloodGroup !== filterBloodGroup) return false;
      if (filterUrgency !== "ALL" && r.urgency !== filterUrgency) return false;
      return true;
    });
  }, [activeTab, activeRequisitions, historyRequisitions, filterComponent, filterBloodGroup, filterUrgency]);

  return (
    <div>
      <PageHeader
        eyebrow="Hospital"
        title="Requisitions"
        subtitle="Network inventory demand & emergency blood coordination"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <Card>
          <h2 className="mb-4 text-sm font-bold text-text">New requisition</h2>
          <RequisitionForm
            hospitalId={facilityId ?? undefined}
            pending={create.isPending}
            onSubmit={(v) => void handleSubmit(v)}
          />
        </Card>

        <div className="space-y-4">
          {/* Tabs & Count */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-subtle p-1">
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === "active"
                    ? "bg-surface-raised text-text shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Active ({activeRequisitions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === "history"
                    ? "bg-surface-raised text-text shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                History ({historyRequisitions.length})
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-2xs text-text-subtle mr-1">
                <Filter className="h-3 w-3" />
                <span>Filters:</span>
              </div>
              <select
                value={filterComponent}
                onChange={(e) => setFilterComponent(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-2xs text-text focus:border-accent focus:outline-none"
                aria-label="Filter by component"
              >
                <option value="ALL">All Components</option>
                <option value="WHOLE_BLOOD">Whole Blood</option>
                <option value="RBC">Packed RBC</option>
                <option value="PLATELETS">Platelets</option>
                <option value="PLASMA">FFP / Plasma</option>
              </select>

              <select
                value={filterBloodGroup}
                onChange={(e) => setFilterBloodGroup(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-2xs text-text focus:border-accent focus:outline-none"
                aria-label="Filter by blood group"
              >
                <option value="ALL">All Groups</option>
                <option value="O_NEG">O-</option>
                <option value="O_POS">O+</option>
                <option value="A_NEG">A-</option>
                <option value="A_POS">A+</option>
                <option value="B_NEG">B-</option>
                <option value="B_POS">B+</option>
                <option value="AB_NEG">AB-</option>
                <option value="AB_POS">AB+</option>
              </select>

              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-2xs text-text focus:border-accent focus:outline-none"
                aria-label="Filter by urgency"
              >
                <option value="ALL">All Urgencies</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {requisitions.isLoading ? (
            <LoadingState variant="list" rows={3} label="Loading requisitions" />
          ) : requisitions.isError ? (
            <ErrorState
              title="Requisitions did not load"
              message={
                requisitions.error instanceof Error
                  ? requisitions.error.message
                  : "Failed to load requisitions."
              }
              onRetry={() => void requisitions.refetch()}
            />
          ) : displayedList.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title={
                activeTab === "active"
                  ? rawList.length === 0
                    ? "No requisitions yet"
                    : "No active requisitions matching filters"
                  : "No completed requisitions in history"
              }
              message={
                activeTab === "active"
                  ? "Create a requisition on the left to request compatible blood units from regional network stock."
                  : "Fulfilled, cancelled, or expired requisitions will appear here as permanent historical records."
              }
            />
          ) : (
            <RequisitionList requisitions={displayedList} />
          )}
        </div>
      </div>
    </div>
  );
}
