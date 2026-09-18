/**
 * Floating demo controls. Present only when VITE_DEMO_MODE is "true", so a
 * production build never ships a "wipe the table" button.
 *
 * Both actions invalidate every query key, because both move server state
 * underneath every window that is open — the point of pressing Run sweep now
 * is that four browser windows react on the next poll at once.
 */

import { useState } from "react";
import { Play, RotateCcw, Wrench, X } from "lucide-react";
import { useResetMutation, useSweepMutation } from "../../api/hooks";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";
import { pluralise } from "../../lib/format";

export function DemoToolbar() {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { push } = useToast();

  const sweep = useSweepMutation();
  const reset = useResetMutation();

  if (import.meta.env.VITE_DEMO_MODE !== "true") return null;

  const runSweep = async () => {
    try {
      const res = await sweep.mutateAsync();
      push({
        tone: "success",
        title: `Sweep complete — ${pluralise(res.sweptCount, "unit")} swept`,
        message:
          res.sweptCount > 0
            ? "Rescue escalations have started. Watch the stock console and the inboxes."
            : "Nothing was inside an alert window. Reset the demo data to stage a unit.",
      });
    } catch (err) {
      push({
        tone: "error",
        title: "Sweep failed",
        message: err instanceof Error ? err.message : "The sweep endpoint did not respond.",
      });
    }
  };

  const runReset = async () => {
    try {
      const res = await reset.mutateAsync();
      setConfirmReset(false);
      push({
        tone: "success",
        title: "Demo data reset",
        message: `${res.actualCount} of ${res.expectedCount} items reloaded in ${res.elapsedSec}s.`,
      });
    } catch (err) {
      setConfirmReset(false);
      push({
        tone: "error",
        title: "Reset failed",
        message: err instanceof Error ? err.message : "The reset endpoint did not respond.",
      });
    }
  };

  return (
    <>
      {/* Sits above the mobile tab bar, clear of it on desktop. */}
      <div className="fixed bottom-20 right-4 z-[70] flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
        {open && (
          <div className="w-60 rounded-2xl border border-border bg-surface-raised p-3 shadow-raised">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                Demo controls
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-text-subtle transition-colors hover:bg-surface-overlay hover:text-text"
                aria-label="Close demo controls"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <Button
                size="sm"
                fullWidth
                loading={sweep.isPending}
                onClick={runSweep}
                className="justify-start"
              >
                {!sweep.isPending && <Play className="h-3.5 w-3.5 fill-current" />}
                Run sweep now
              </Button>

              <Button
                variant="secondary"
                size="sm"
                fullWidth
                loading={reset.isPending}
                onClick={() => setConfirmReset(true)}
                className="justify-start"
              >
                {!reset.isPending && <RotateCcw className="h-3.5 w-3.5" />}
                Reset demo
              </Button>
            </div>

            <p className="mt-2.5 text-[10px] leading-relaxed text-text-subtle">
              Both actions refresh every open window on the next poll.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-text-inverse shadow-raised transition-colors hover:bg-accent-hover"
          aria-label={open ? "Hide demo controls" : "Show demo controls"}
        >
          <Wrench className="h-5 w-5" />
        </button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        tone="danger"
        title="Reset the demo data?"
        description={
          <>
            This wipes every live item in the DynamoDB table and reloads the seed inventory,
            including the staged units the demo run depends on. Anything claimed or received
            during this session is discarded.
          </>
        }
        confirmLabel="Reset demo data"
        loading={reset.isPending}
        onConfirm={runReset}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}
