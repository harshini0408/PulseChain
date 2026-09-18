/**
 * The two custody handovers. Marking a unit received is irreversible and closes
 * the chain, so it goes through a confirmation; dispatching does not.
 */

import { useState } from "react";
import { PackageCheck, Truck } from "lucide-react";
import type { UnitStatus } from "@pulsechain/shared";
import { useInTransitMutation, useReceivedMutation } from "../../api/hooks";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";

interface TransferActionsProps {
  unitId: string;
  status: UnitStatus;
}

export function TransferActions({ unitId, status }: TransferActionsProps) {
  const inTransit = useInTransitMutation();
  const received = useReceivedMutation();
  const { push } = useToast();
  const [confirming, setConfirming] = useState(false);

  const dispatch = async () => {
    try {
      await inTransit.mutateAsync({ unitId });
      push({ tone: "success", title: "Marked in transit", message: `${unitId} is on its way.` });
    } catch (err) {
      push({
        tone: "error",
        title: "Could not mark in transit",
        message: err instanceof Error ? err.message : "The transfer endpoint rejected the change.",
      });
    }
  };

  const confirmReceived = async () => {
    try {
      await received.mutateAsync({ unitId });
      setConfirming(false);
      push({ tone: "success", title: "Receipt confirmed", message: `${unitId} is now yours.` });
    } catch (err) {
      setConfirming(false);
      push({
        tone: "error",
        title: "Could not confirm receipt",
        message: err instanceof Error ? err.message : "The transfer endpoint rejected the change.",
      });
    }
  };

  if (status === "CLAIMED") {
    return (
      <Button size="sm" loading={inTransit.isPending} onClick={() => void dispatch()}>
        {!inTransit.isPending && <Truck className="h-3.5 w-3.5" />}
        Mark in transit
      </Button>
    );
  }

  if (status === "IN_TRANSIT") {
    return (
      <>
        <Button size="sm" loading={received.isPending} onClick={() => setConfirming(true)}>
          {!received.isPending && <PackageCheck className="h-3.5 w-3.5" />}
          Confirm received
        </Button>

        <ConfirmDialog
          open={confirming}
          title="Confirm this unit arrived?"
          description={
            <>
              This closes the chain of custody for <span className="font-mono">{unitId}</span> and
              records it as received at your facility. It cannot be undone from this interface.
            </>
          }
          confirmLabel="Confirm receipt"
          loading={received.isPending}
          onConfirm={() => void confirmReceived()}
          onCancel={() => setConfirming(false)}
        />
      </>
    );
  }

  return null;
}
