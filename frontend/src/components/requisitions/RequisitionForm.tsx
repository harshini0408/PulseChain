/**
 * Create a requisition.
 *
 * Shared by /hospital/requisitions (fixed to the signed-in hospital) and
 * /coordinator/parse (which picks the requesting facility, and pre-fills from
 * the parser). Both write through the session-local adapter — see
 * api/requisitionsAdapter.ts for why.
 */

import { useEffect, useState, type FormEvent } from "react";
import {
  BLOOD_GROUPS,
  COMPONENTS,
  URGENCY_LEVELS,
  type BloodGroup,
  type Component,
  type Facility,
  type Urgency,
} from "@pulsechain/shared";
import { COMPONENT, URGENCY } from "../../lib/status";
import { Button } from "../ui/Button";

export interface RequisitionFormValues {
  hospitalId: string;
  component: Component | "";
  bloodGroup: BloodGroup | "";
  unitsRequested: number;
  urgency: Urgency;
  neededBy: string; // datetime-local string
  note: string;
}

interface RequisitionFormProps {
  /** Fixed requesting facility. Omit to let the operator pick one. */
  hospitalId?: string;
  /** Hospitals to choose between, when `hospitalId` is not fixed. */
  facilityOptions?: Facility[];
  /** Pre-fill, e.g. from the parser. Changing this resets the form. */
  initialValues?: Partial<RequisitionFormValues>;
  submitLabel?: string;
  pending?: boolean;
  onSubmit: (values: RequisitionFormValues) => void;
}

/** A datetime-local value for `hours` from now, in the browser's timezone. */
function localDateTime(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const FIELD =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text transition-colors hover:border-border-strong focus:border-accent focus:outline-none";
const LABEL = "mb-1.5 block text-xs font-semibold text-text";

export function RequisitionForm({
  hospitalId,
  facilityOptions,
  initialValues,
  submitLabel = "Create requisition",
  pending = false,
  onSubmit,
}: RequisitionFormProps) {
  const [values, setValues] = useState<RequisitionFormValues>(() => ({
    hospitalId: hospitalId ?? "",
    component: "",
    bloodGroup: "",
    unitsRequested: 1,
    urgency: "NORMAL",
    neededBy: localDateTime(24),
    note: "",
    ...initialValues,
  }));

  // Re-seed when the parser hands over a new result.
  useEffect(() => {
    if (!initialValues) return;
    setValues((current) => ({ ...current, ...initialValues }));
  }, [initialValues]);

  const set = <K extends keyof RequisitionFormValues>(key: K, value: RequisitionFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const complete =
    Boolean(values.hospitalId) &&
    Boolean(values.component) &&
    Boolean(values.bloodGroup) &&
    values.unitsRequested > 0 &&
    Boolean(values.neededBy);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!complete) return;
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!hospitalId && (
        <div>
          <label htmlFor="req-facility" className={LABEL}>
            Requesting facility
          </label>
          <select
            id="req-facility"
            value={values.hospitalId}
            onChange={(e) => set("hospitalId", e.target.value)}
            className={FIELD}
          >
            <option value="">Select a hospital…</option>
            {(facilityOptions ?? [])
              .filter((f) => f.type === "HOSPITAL")
              .map((f) => (
                <option key={f.facilityId} value={f.facilityId}>
                  {f.name}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="req-component" className={LABEL}>
            Component
          </label>
          <select
            id="req-component"
            value={values.component}
            onChange={(e) => set("component", e.target.value as Component)}
            className={FIELD}
          >
            <option value="">Select…</option>
            {COMPONENTS.map((c) => (
              <option key={c} value={c}>
                {COMPONENT[c].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="req-group" className={LABEL}>
            Blood group
          </label>
          <select
            id="req-group"
            value={values.bloodGroup}
            onChange={(e) => set("bloodGroup", e.target.value as BloodGroup)}
            className={FIELD}
          >
            <option value="">Select…</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="req-units" className={LABEL}>
            Units needed
          </label>
          <input
            id="req-units"
            type="number"
            min={1}
            max={50}
            value={values.unitsRequested}
            onChange={(e) => set("unitsRequested", Math.max(1, Number(e.target.value) || 1))}
            className={[FIELD, "tabular-nums"].join(" ")}
          />
        </div>

        <div>
          <label htmlFor="req-urgency" className={LABEL}>
            Urgency
          </label>
          <select
            id="req-urgency"
            value={values.urgency}
            onChange={(e) => set("urgency", e.target.value as Urgency)}
            className={FIELD}
          >
            {URGENCY_LEVELS.map((u) => (
              <option key={u} value={u}>
                {URGENCY[u].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="req-needed-by" className={LABEL}>
          Needed by
        </label>
        <input
          id="req-needed-by"
          type="datetime-local"
          value={values.neededBy}
          onChange={(e) => set("neededBy", e.target.value)}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="req-note" className={LABEL}>
          Note <span className="font-normal text-text-subtle">(optional)</span>
        </label>
        <textarea
          id="req-note"
          rows={3}
          value={values.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Ward, consultant, or anything the centre should know."
          className={[FIELD, "resize-y"].join(" ")}
        />
      </div>

      <Button type="submit" loading={pending} disabled={!complete} fullWidth>
        {submitLabel}
      </Button>
    </form>
  );
}
