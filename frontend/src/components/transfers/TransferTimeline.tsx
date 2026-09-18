/**
 * Chain of custody in three steps, in unit-status order.
 *
 * The step labels come from lib/status.ts rather than being written here, so a
 * stepper stage and its status pill can never disagree about what a state is
 * called.
 *
 * `claimedAt` and `receivedAt` exist on BloodUnit; there is no in-transit
 * timestamp, so that step is marked reached but undated rather than guessed at.
 */

import { Check } from "lucide-react";
import type { UnitStatus } from "@pulsechain/shared";
import { formatDateTime } from "../../lib/format";
import { UNIT_STATUS } from "../../lib/status";

interface TransferTimelineProps {
  status: UnitStatus;
  claimedAt?: string;
  receivedAt?: string;
}

/** The custody stages, in order. `as const` keeps the tuple narrow so the
 *  timestamp map below is checked against exactly these three. */
const ORDER = ["CLAIMED", "IN_TRANSIT", "RECEIVED"] as const satisfies readonly UnitStatus[];

type Stage = (typeof ORDER)[number];

export function TransferTimeline({ status, claimedAt, receivedAt }: TransferTimelineProps) {
  const currentIndex = ORDER.findIndex((stage) => stage === status);

  // RECEIVED is terminal: the chain is closed, so its own step is complete
  // rather than "in progress". Without this the last step of a finished
  // transfer renders as the current step forever.
  const isComplete = status === "RECEIVED";

  const timestamps: Record<Stage, string | undefined> = {
    CLAIMED: claimedAt,
    IN_TRANSIT: undefined,
    RECEIVED: receivedAt,
  };

  const steps = ORDER.map((stage) => ({
    label: UNIT_STATUS[stage].label,
    at: timestamps[stage],
  }));

  return (
    <ol className="flex items-start">
      {steps.map((step, i) => {
        const done = currentIndex > i || (isComplete && currentIndex >= i);
        const current = !done && currentIndex === i;
        const reached = done || current;

        return (
          <li key={step.label} className="flex flex-1 items-start last:flex-initial">
            <div className="flex min-w-0 flex-col items-center text-center">
              <span
                className={[
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  done
                    ? "bg-status-received text-text-inverse"
                    : current
                      ? "bg-accent text-text-inverse"
                      : "bg-surface-overlay text-text-subtle",
                ].join(" ")}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span
                className={[
                  "mt-1.5 whitespace-nowrap text-2xs font-semibold",
                  reached ? "text-text" : "text-text-subtle",
                ].join(" ")}
              >
                {step.label}
              </span>
              {step.at && (
                <span className="mt-0.5 whitespace-nowrap text-[10px] tabular-nums text-text-subtle">
                  {formatDateTime(step.at)}
                </span>
              )}
            </div>

            {i < steps.length - 1 && (
              <span
                className={[
                  "mx-2 mt-3 h-0.5 flex-1 rounded-full",
                  currentIndex > i ? "bg-status-received" : "bg-border",
                ].join(" ")}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
