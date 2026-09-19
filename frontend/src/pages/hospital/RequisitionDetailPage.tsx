/**
 * frontend/src/pages/hospital/RequisitionDetailPage.tsx
 *
 * Comprehensive hospital requisition detail view.
 * Displays live progress, inventory vs community fulfilment sources,
 * secured units, operational event timeline, and safe requisition cancellation.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  useCancelRequisitionMutation,
  useRequisitionEventsQuery,
  useRequisitionQuery,
} from "../../api/hooks";
import {
  BloodGroupToken,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusPill,
  useToast,
} from "../../components/ui";
import { formatDateTime, formatRelative, pluralise } from "../../lib/format";
import { COMPONENT, REQUISITION_STATUS } from "../../lib/status";
import type { RequisitionStatus } from "@pulsechain/shared";

const CANCELLABLE_STATUSES: RequisitionStatus[] = [
  "OPEN",
  "SUBMITTED",
  "VALIDATED",
  "SEARCHING_INVENTORY",
  "PARTIAL",
  "PARTIALLY_FULFILLED",
  "DONOR_TIER",
  "DONOR_ESCALATION",
  "DONOR_MOBILIZING",
];

export function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: requisition, isLoading, isError, error, refetch } = useRequisitionQuery(id ?? null);
  const { data: eventsData, isLoading: eventsLoading } = useRequisitionEventsQuery(id ?? null);
  const cancelMutation = useCancelRequisitionMutation();
  const { push } = useToast();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          to="/hospital/requisitions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Requisitions
        </Link>
        <LoadingState variant="detail" label="Loading requisition details" />
      </div>
    );
  }

  if (isError || !requisition) {
    return (
      <div className="space-y-6">
        <Link
          to="/hospital/requisitions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Requisitions
        </Link>
        <ErrorState
          title="Requisition could not be loaded"
          message={error instanceof Error ? error.message : "Requisition not found or unauthorized."}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const reqId = requisition.id || requisition.reqId || id || "";
  const unitsRequested = requisition.unitsRequested ?? 1;
  const unitsFulfilled = requisition.unitsFulfilled ?? requisition.unitsFilled ?? 0;
  const unitsRemaining = Math.max(0, unitsRequested - unitsFulfilled);
  const isCancellable = CANCELLABLE_STATUSES.includes(requisition.status);
  const neededByDate = requisition.neededBy || requisition.requiredBy;
  const isExpired = neededByDate && new Date(neededByDate).getTime() < Date.now();

  const handleConfirmCancel = async () => {
    try {
      const res = await cancelMutation.mutateAsync({
        id: reqId,
        reason: cancelReason.trim() || undefined,
      });
      setCancelDialogOpen(false);
      setCancelReason("");
      push({
        tone: "success",
        title: "Requisition Cancelled",
        message: `${reqId} was cancelled. ${pluralise(res.releasedReservationsCount, "unit reservation")} released back to regional inventory.`,
      });
    } catch (err) {
      push({
        tone: "error",
        title: "Cancellation Failed",
        message: err instanceof Error ? err.message : "Could not cancel requisition.",
      });
    }
  };

  // Progress stepper stages calculation
  const getStepStatus = (stepIndex: number) => {
    const s = requisition.status;
    if (s === "CANCELLED") return stepIndex === 0 ? "complete" : "cancelled";
    if (s === "EXHAUSTED") return stepIndex < 4 ? "complete" : "exhausted";

    switch (stepIndex) {
      case 0: // Request Received
        return "complete";
      case 1: // Searching Inventory
        if (["SUBMITTED", "VALIDATED", "OPEN"].includes(s)) return "current";
        return "complete";
      case 2: // Inventory Secured / Evaluated
        if (s === "SEARCHING_INVENTORY") return "current";
        if (["PARTIAL", "PARTIALLY_FULFILLED", "DONOR_TIER", "DONOR_ESCALATION", "DONOR_MOBILIZING", "FILLED", "FULFILLED"].includes(s)) {
          return "complete";
        }
        return "pending";
      case 3: // Community Escalation (if needed)
        if (["DONOR_TIER", "DONOR_ESCALATION", "DONOR_MOBILIZING"].includes(s)) return "current";
        if (requisition.donorEscalationStartedAt || requisition.donorEscalationStatus === "MOBILIZING") return "complete";
        if (["FILLED", "FULFILLED"].includes(s)) return "skipped";
        return "pending";
      case 4: // Fulfilled / Resolved
        if (["FILLED", "FULFILLED"].includes(s)) return "complete";
        return "pending";
      default:
        return "pending";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/hospital/requisitions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Requisitions
        </Link>
        <span className="font-mono text-xs text-text-subtle">ID: {reqId}</span>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <BloodGroupToken bloodGroup={requisition.bloodGroup} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-bold text-text">
                  {COMPONENT[requisition.component]?.label ?? requisition.component}
                </h1>
                <StatusPill kind="requisition" value={requisition.status} />
                <StatusPill kind="urgency" value={requisition.urgency} />
                {requisition.source && (
                  <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-text-subtle">
                    {requisition.source}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Created {formatDateTime(requisition.createdAt)} · Needed by{" "}
                <span className={isExpired ? "font-semibold text-status-expired" : "font-medium"}>
                  {formatDateTime(neededByDate)} ({formatRelative(neededByDate)})
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isCancellable && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
                disabled={cancelMutation.isPending}
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" /> Cancel Requisition
              </Button>
            )}
          </div>
        </div>

        {/* Cancellation Notice if Cancelled */}
        {requisition.status === "CANCELLED" && (
          <div className="mt-5 rounded-xl border border-status-expired/30 bg-status-expired-bg/20 p-4">
            <div className="flex items-center gap-2 text-status-expired">
              <Ban className="h-4 w-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Requisition Cancelled</span>
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              Cancelled on {formatDateTime(requisition.cancelledAt || requisition.updatedAt)}
              {requisition.cancelledBy ? ` by ${requisition.cancelledBy}` : ""}.
              {requisition.cancelReason && (
                <span className="block mt-1 italic text-text-subtle">Reason: "{requisition.cancelReason}"</span>
              )}
            </p>
            <p className="mt-1 text-2xs text-text-subtle">
              All reserved blood units not yet dispatched have been safely restored to regional availability.
            </p>
          </div>
        )}

        {/* Exhausted Notice if Exhausted */}
        {requisition.status === "EXHAUSTED" && (
          <div className="mt-5 rounded-xl border border-brand-oxblood/30 bg-brand-oxblood/10 p-4">
            <div className="flex items-center gap-2 text-brand-oxblood">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Requisition Exhausted</span>
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              Regional institutional inventory and the configured community escalation path did not fully satisfy this requisition before the workflow ended.
            </p>
            <p className="mt-1 text-2xs text-text-subtle">
              Please contact the regional blood coordination centre or evaluate alternative clinical options.
            </p>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-text-muted">Requested Demand</p>
          <p className="mt-1 font-display text-2xl font-bold text-text">
            {unitsRequested} <span className="text-xs font-normal text-text-subtle">units</span>
          </p>
          <p className="mt-1 text-2xs text-text-subtle">Initial clinical order</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-text-muted">Secured Units</p>
          <p className="mt-1 font-display text-2xl font-bold text-status-received">
            {unitsFulfilled} <span className="text-xs font-normal text-text-subtle">of {unitsRequested}</span>
          </p>
          <p className="mt-1 text-2xs text-text-subtle">Institutional inventory allocated</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-text-muted">Unmet Remaining</p>
          <p className="mt-1 font-display text-2xl font-bold text-accent">
            {unitsRemaining} <span className="text-xs font-normal text-text-subtle">units</span>
          </p>
          <p className="mt-1 text-2xs text-text-subtle">
            {unitsRemaining === 0 ? "Order fully satisfied" : "Awaiting community or network units"}
          </p>
        </Card>
      </div>

      {/* Progress Stepper */}
      <Card className="p-6">
        <h2 className="text-sm font-bold text-text mb-4">Operational Progress</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {[
            { label: "1. Request Received", desc: "Order validated" },
            { label: "2. Regional Search", desc: "Checking network stock" },
            { label: "3. Inventory Match", desc: `${unitsFulfilled} units secured` },
            { label: "4. Community Fallback", desc: unitsRemaining > 0 ? `${unitsRemaining} units needed` : "Not needed" },
            { label: "5. Resolution", desc: requisition.status === "CANCELLED" ? "Cancelled" : requisition.status === "EXHAUSTED" ? "Exhausted" : "Fulfilled" },
          ].map((step, idx) => {
            const status = getStepStatus(idx);
            return (
              <div
                key={step.label}
                className={`rounded-xl border p-3 transition-colors ${
                  status === "complete"
                    ? "border-status-received/40 bg-status-received-bg/20"
                    : status === "current"
                    ? "border-accent/50 bg-accent-soft/30 ring-1 ring-accent"
                    : status === "cancelled"
                    ? "border-status-expired/30 bg-status-expired-bg/10"
                    : status === "exhausted"
                    ? "border-brand-oxblood/30 bg-brand-oxblood/10"
                    : "border-border/60 bg-surface-subtle/50 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2">
                  {status === "complete" ? (
                    <CheckCircle2 className="h-4 w-4 text-status-received shrink-0" />
                  ) : status === "current" ? (
                    <Clock className="h-4 w-4 text-accent animate-pulse shrink-0" />
                  ) : status === "cancelled" ? (
                    <Ban className="h-4 w-4 text-status-expired shrink-0" />
                  ) : status === "exhausted" ? (
                    <AlertCircle className="h-4 w-4 text-brand-oxblood shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-border-strong shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-text truncate">{step.label}</span>
                </div>
                <p className="mt-1 text-2xs text-text-subtle">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Inventory-First Architecture Demarcation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Secured Institutional Units */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold text-text">Secured Institutional Units</h2>
            </div>
            <span className="text-xs font-semibold text-text-muted">
              {pluralise(requisition.securedUnits?.length ?? unitsFulfilled, "unit")}
            </span>
          </div>

          {!requisition.securedUnits || requisition.securedUnits.length === 0 ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title="No secured institutional units yet"
              message="When compatible inventory is located at regional blood centres, unit details and source facilities will appear here."
            />
          ) : (
            <ul className="space-y-3">
              {requisition.securedUnits.map((u) => (
                <li
                  key={u.unitId}
                  className="rounded-xl border border-border bg-surface-subtle p-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-text">{u.unitId}</span>
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 font-display text-xs font-semibold text-accent">
                          {u.bloodGroup} {u.component}
                        </span>
                        {u.compatibilityLevel && (
                          <span className="rounded bg-surface-overlay px-1.5 py-0.5 text-2xs font-semibold text-text-muted uppercase">
                            {u.compatibilityLevel}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-text-muted flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-text-subtle" />
                        Source: <strong className="font-semibold text-text">{u.facilityName || u.facilityId}</strong>
                      </p>
                      {u.reservedAt && (
                        <p className="mt-0.5 text-2xs text-text-subtle">
                          Reserved {formatDateTime(u.reservedAt)}
                        </p>
                      )}
                      {u.notes && (
                        <p className="mt-2 text-2xs italic text-text-subtle border-l border-border pl-2">
                          {u.notes}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-status-claimed-bg px-2 py-0.5 text-2xs font-semibold text-status-claimed uppercase">
                      {u.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 rounded-lg bg-surface-overlay/50 p-3 text-2xs text-text-subtle flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-text-muted mt-0.5" />
            <span>
              <strong>Clinical Responsibility Notice:</strong> PulseChain facilitates automated compatibility matching. Final cross-match and transfusion release remain the sole clinical responsibility of the attending institution.
            </span>
          </div>
        </Card>

        {/* Right: Community / Donor Mobilization Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold text-text">Community Fallback Tier</h2>
            </div>
          </div>

          {requisition.donorEscalationStartedAt ||
          requisition.donorEscalationStatus === "MOBILIZING" ||
          ["DONOR_TIER", "DONOR_ESCALATION", "DONOR_MOBILIZING"].includes(requisition.status) ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-accent/40 bg-accent-soft/20 p-4">
                <div className="flex items-center gap-2 text-accent">
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Community Mobilisation Active
                  </span>
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  Institutional inventory did not fully satisfy this request. Community coordinators and verified groups have been notified to mobilize donors for the remaining{" "}
                  <strong>{unitsRemaining} units</strong>.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-subtle p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Target Remaining Demand:</span>
                  <strong className="text-text">{unitsRemaining} units</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Mobilisation Scope:</span>
                  <span className="text-text">Regional coordinator network</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Status:</span>
                  <span className="text-accent font-medium">In Progress</span>
                </div>
              </div>

              <div className="rounded-lg bg-surface-overlay/50 p-3 text-2xs text-text-subtle">
                <strong>Zero Health Data Protection:</strong> PulseChain maintains strict patient and donor privacy. Direct donor health records, contact details, or identities are never exposed across the hospital console.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="Community mobilisation not active"
                message={
                  unitsRemaining === 0
                    ? "Demand was satisfied entirely from regional institutional inventory. Community donors were not contacted unnecessarily."
                    : requisition.status === "CANCELLED"
                    ? "Community mobilisation was stopped due to requisition cancellation."
                    : "Community mobilisation activates automatically only if regional institutional inventory is insufficient."
                }
              />
              <div className="rounded-lg bg-surface-overlay/40 p-3 text-2xs text-text-subtle">
                <strong>Inventory First Principle:</strong> Donor mobilisation is strictly a fallback mechanism to prevent donor fatigue and preserve community capacity.
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Operational Event Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold text-text">Operational Audit Timeline</h2>
          </div>
          <span className="text-xs text-text-subtle">Tamper-evident audit log</span>
        </div>

        {eventsLoading ? (
          <LoadingState variant="list" rows={3} label="Loading timeline events" />
        ) : !eventsData?.events || eventsData.events.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">No operational events recorded yet.</p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {eventsData.events.map((evt) => (
              <div key={evt.eventId} className="relative group">
                <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface-raised bg-accent ring-2 ring-surface-raised" />
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-xs font-bold text-text">{evt.title}</h3>
                    <span className="text-2xs text-text-subtle">
                      {formatDateTime(evt.timestamp)} ({formatRelative(evt.timestamp)})
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted leading-relaxed">{evt.summary}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Cancellation Dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        title="Cancel Requisition"
        tone="danger"
        loading={cancelMutation.isPending}
        confirmLabel="Cancel Requisition"
        onCancel={() => {
          if (!cancelMutation.isPending) {
            setCancelDialogOpen(false);
            setCancelReason("");
          }
        }}
        onConfirm={() => void handleConfirmCancel()}
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to cancel this requisition?
            </p>
            <p className="text-xs text-text-subtle leading-relaxed">
              Any blood units reserved but not yet dispatched will be safely released back into regional inventory for other hospitals. Active community mobilisation for this request will be stopped.
            </p>
            <div className="mt-3">
              <label htmlFor="cancel-reason" className="block text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                Operational Reason (Optional)
              </label>
              <input
                id="cancel-reason"
                type="text"
                placeholder="e.g. Patient stabilized, alternative clinical course"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
                maxLength={200}
              />
              <span className="mt-1 block text-2xs text-text-subtle">
                Do not include patient identifiers or sensitive medical information.
              </span>
            </div>
          </div>
        }
      />
    </div>
  );
}
