/**
 * The parser's output, as an editable form.
 *
 * Everything the parser found is pre-filled and everything it did not find is
 * left empty and marked "needs input". It never guesses a blood group, and
 * neither does this panel.
 *
 * Confidence is shown per field because a 0.5 on blood group and a 0.5 on
 * urgency mean very different things to whoever is about to press Create.
 */

import { useMemo } from "react";
import { AlertTriangle, Info } from "lucide-react";
import type { Facility, ParseResult } from "@pulsechain/shared";
import { RequisitionForm, type RequisitionFormValues } from "./RequisitionForm";

interface ParsePanelProps {
  result: ParseResult | null;
  facilities: Facility[];
  pending?: boolean;
  onSubmit: (values: RequisitionFormValues) => void;
}

const LANGUAGE_LABEL: Record<ParseResult["detectedLanguage"], string> = {
  ta: "Tamil",
  hi: "Hindi",
  en: "English",
  unknown: "Not detected",
};

const FIELD_LABEL: Record<string, string> = {
  component: "Component",
  bloodGroup: "Blood group",
  unitsRequested: "Units",
  urgency: "Urgency",
  neededBy: "Needed by",
};

/** ISO -> the `datetime-local` shape, in the browser's timezone. */
function toLocalInput(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function confidenceTone(value: number): string {
  if (value >= 0.8) return "bg-status-received-bg text-status-received";
  if (value >= 0.4) return "bg-status-in-transit-bg text-status-in-transit";
  return "bg-status-expired-bg text-status-expired";
}

export function ParsePanel({ result, facilities, pending = false, onSubmit }: ParsePanelProps) {
  const initialValues = useMemo<Partial<RequisitionFormValues> | undefined>(() => {
    if (!result) return undefined;
    const { fields } = result;

    return {
      // Only carry across what was actually extracted. A null stays empty and
      // the form's own validation keeps Create disabled until it is filled.
      component: fields.component ?? "",
      bloodGroup: fields.bloodGroup ?? "",
      unitsRequested: fields.unitsRequested ?? 1,
      urgency: fields.urgency,
      neededBy: toLocalInput(fields.neededBy) ?? "",
    };
  }, [result]);

  if (!result) {
    return (
      <div className="flex h-full min-h-[18rem] items-center justify-center rounded-xl border border-dashed border-border px-6 text-center">
        <p className="max-w-xs text-sm text-text-muted">
          Paste a request on the left, or pick an example. The parser runs here in the browser and
          fills in what it can read.
        </p>
      </div>
    );
  }

  const missing = Object.entries(result.fields)
    .filter(([key, value]) => key !== "urgency" && (value === null || value === undefined))
    .map(([key]) => FIELD_LABEL[key] ?? key);

  return (
    <div className="space-y-4">
      {/* ── What the parser read ──────────────────────────────────────────── */}
      <div className="rounded-xl bg-surface-sunken p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted">
            Detected
          </p>
          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-2xs font-semibold text-text">
            {LANGUAGE_LABEL[result.detectedLanguage]}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {Object.entries(result.confidence).map(([field, value]) => (
            <span
              key={field}
              className={[
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium",
                confidenceTone(value),
              ].join(" ")}
              title={`${FIELD_LABEL[field] ?? field}: ${Math.round(value * 100)}% confidence`}
            >
              {FIELD_LABEL[field] ?? field}
              <span className="tabular-nums opacity-80">{Math.round(value * 100)}%</span>
            </span>
          ))}
        </div>

        {missing.length > 0 && (
          <p className="mt-2.5 flex items-start gap-1.5 text-2xs text-text-muted">
            <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>
              Needs input: <span className="font-semibold text-text">{missing.join(", ")}</span>.
              These are left empty rather than guessed.
            </span>
          </p>
        )}

        {result.warnings.length > 0 && (
          <ul className="mt-2.5 space-y-1">
            {result.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-1.5 text-2xs text-text-muted">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-status-in-transit" />
                {warning}
              </li>
            ))}
          </ul>
        )}

        {result.unmatchedTokens.length > 0 && (
          <p className="mt-2.5 text-2xs text-text-subtle">
            Ignored: {result.unmatchedTokens.slice(0, 12).join(" · ")}
          </p>
        )}
      </div>

      {/* ── Editable form ─────────────────────────────────────────────────── */}
      <RequisitionForm
        facilityOptions={facilities}
        initialValues={initialValues}
        submitLabel="Create requisition"
        pending={pending}
        onSubmit={onSubmit}
      />
    </div>
  );
}
