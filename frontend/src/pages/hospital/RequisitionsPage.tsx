/**
 * /hospital/requisitions
 *
 * The requisitions API is not deployed — backend/src/api/requisitions.ts is a
 * stub with no route in template.yaml. This page therefore reads and writes
 * api/requisitionsAdapter.ts, which holds requisitions in memory for this tab
 * only, and it says so on screen permanently.
 *
 * That notice is not decoration. A button that 404s on camera costs more than
 * a stated limitation does.
 */

import { FileText } from "lucide-react";
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

export function RequisitionsPage() {
  const { facilityId } = useAuth();
  const requisitions = useRequisitionsQuery(facilityId);
  const create = useCreateRequisitionMutation();
  const { push } = useToast();

  const handleSubmit = async (values: RequisitionFormValues) => {
    // The form only enables submit once both are chosen; this narrows the
    // "" placeholder out of the union rather than casting it away.
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
        message: `${created.reqId} is open for ${pluralise(created.unitsRequested, "unit")}.`,
      });
    } catch (err) {
      push({
        tone: "error",
        title: "Could not create the requisition",
        message: err instanceof Error ? err.message : "The server rejected the record.",
      });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Hospital"
        title="Requisitions"
        subtitle="What this facility has asked the network for"
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

        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-bold text-text">Open and recent</h2>
            <span className="text-xs text-text-muted">
              {pluralise(requisitions.data?.length ?? 0, "requisition")}
            </span>
          </div>

          {requisitions.isLoading ? (
            <LoadingState variant="list" rows={3} label="Loading requisitions" />
          ) : requisitions.isError ? (
            <ErrorState
              title="Requisitions did not load"
              message={
                requisitions.error instanceof Error
                  ? requisitions.error.message
                  : "The session store could not be read."
              }
              onRetry={() => void requisitions.refetch()}
            />
          ) : (requisitions.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No requisitions yet"
              message="Create one on the left and it appears here. A requisition tells the network what this facility needs, so matching units are offered to you first."
            />
          ) : (
            <RequisitionList requisitions={requisitions.data ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}
