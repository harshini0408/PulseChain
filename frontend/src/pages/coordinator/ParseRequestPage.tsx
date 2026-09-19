/**
 * /coordinator/parse — free-text requests into structured requisitions.
 *
 * THERE IS NO PARSE ENDPOINT. shared/src/parsing.ts is a deterministic,
 * multilingual, dependency-free parser, so it runs perfectly well in the
 * browser and that is exactly where it runs here — no network call, no
 * round trip, no route that could 404 on camera.
 *
 * Creating the requisition hands off to the same session-local adapter as
 * /hospital/requisitions, because POST /requisitions is not deployed either.
 * The panel says so on screen.
 */

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { parseRequisition, type ParseResult } from "@pulsechain/shared";
import { useCreateRequisitionMutation, useFacilityLookup } from "../../api/hooks";
import { ParsePanel } from "../../components/requisitions/ParsePanel";
import type { RequisitionFormValues } from "../../components/requisitions/RequisitionForm";
import { Button, Card, PageHeader, useToast } from "../../components/ui";

/** Real inputs the parser handles, one per supported script. */
const EXAMPLES = [
  {
    label: "English",
    text: "Urgent: Need 2 units of O+ platelets by tonight for emergency surgery",
  },
  { label: "Tamil", text: "B+ தட்டணுக்கள் 4 மணி நேரத்திற்குள்" },
  { label: "Hindi", text: "A- लाल रक्त कोशिकाएं कल सुबह" },
] as const;

export function ParseRequestPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);

  const { facilities } = useFacilityLookup();
  const create = useCreateRequisitionMutation();
  const { push } = useToast();

  const runParse = (value: string) => {
    const trimmed = value.trim();
    setResult(trimmed ? parseRequisition(trimmed) : null);
  };

  const useExample = (example: string) => {
    setText(example);
    runParse(example);
  };

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
        source: "PARSED",
        rawText: text.trim() || values.note || undefined,
      });
      push({
        tone: "success",
        title: "Requisition created",
        message: `${created.reqId} recorded against ${values.hospitalId}.`,
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
        eyebrow="Coordinator"
        title="Request parser"
        subtitle="Free text in Tamil, Hindi or English into a structured requisition"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Input ─────────────────────────────────────────────────────── */}
        <Card>
          <label htmlFor="parse-input" className="mb-2 block text-sm font-bold text-text">
            Incoming request
          </label>

          <textarea
            id="parse-input"
            rows={7}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              runParse(e.target.value);
            }}
            placeholder="Paste a request exactly as it arrived — a message, a phone note, a ward handover."
            className="w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-text transition-colors placeholder:text-text-subtle hover:border-border-strong focus:border-accent focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-widest text-text-subtle">
              Try
            </span>
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => useExample(example.text)}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
              >
                {example.label}
              </button>
            ))}

            {text && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setText("");
                  setResult(null);
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {!text && (
            <p className="mt-4 flex items-start gap-2 text-2xs leading-relaxed text-text-subtle">
              <Wand2 className="mt-0.5 h-3 w-3 flex-shrink-0" />
              The parser reads blood group, component, unit count, urgency and deadline. Anything it
              cannot read with confidence is left for you to fill in.
            </p>
          )}
        </Card>

        {/* ── Output ────────────────────────────────────────────────────── */}
        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Parsed requisition</h2>
          <ParsePanel
            result={result}
            facilities={facilities}
            pending={create.isPending}
            onSubmit={(v) => void handleSubmit(v)}
          />
        </Card>
      </div>
    </div>
  );
}
