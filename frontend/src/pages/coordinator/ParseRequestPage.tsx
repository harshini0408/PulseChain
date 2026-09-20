/**
 * /coordinator/parse — free-text requests into structured requisitions.
 *
 * THERE IS NO PARSE ENDPOINT. shared/src/parsing.ts is a deterministic,
 * multilingual, dependency-free parser, so it runs perfectly well in the
 * browser and that is exactly where it runs here — no network call, no
 * round trip, no route that could 404 on camera.
 *
 * UI Layout:
 * - Single centered layout containing the Incoming Request input and the
 *   pre-filled Requisition Form directly below it.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2 } from "lucide-react";
import { parseRequisition, type ParseResult } from "@pulsechain/shared";
import { useCreateRequisitionMutation, useFacilityLookup } from "../../api/hooks";
import { RequisitionForm, type RequisitionFormValues } from "../../components/requisitions/RequisitionForm";
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

/** Colours for token chip types — strictly from existing token classes */
const TOKEN_CHIP_STYLE: Record<string, string> = {
  bloodGroup: "border-accent/30 bg-accent-soft text-accent",
  component: "border-status-claimed/30 bg-status-claimed-bg text-status-claimed",
  units: "border-status-in-transit/30 bg-status-in-transit-bg text-status-in-transit",
  urgency: "border-status-lost/30 bg-status-lost-bg text-status-lost",
  deadline: "border-status-received/30 bg-status-received-bg text-status-received",
};

const TOKEN_LABEL: Record<string, string> = {
  bloodGroup: "Blood group",
  component: "Component",
  units: "Units",
  urgency: "Urgency",
  deadline: "Deadline",
};

/** Extracted tokens from ParseResult as a flat list of chips */
function getTokenChips(result: ParseResult | null) {
  if (!result || !result.ok) return [];
  const { fields } = result;
  const chips: { key: string; value: string; type: string }[] = [];
  if (fields.bloodGroup) chips.push({ type: "bloodGroup", key: "bloodGroup", value: fields.bloodGroup });
  if (fields.component) chips.push({ type: "component", key: "component", value: fields.component });
  if (fields.unitsRequested)
    chips.push({
      type: "units",
      key: "units",
      value: `${fields.unitsRequested} unit${fields.unitsRequested !== 1 ? "s" : ""}`,
    });
  if (fields.urgency && fields.urgency !== "NORMAL")
    chips.push({ type: "urgency", key: "urgency", value: fields.urgency });
  if (fields.neededBy) chips.push({ type: "deadline", key: "deadline", value: fields.neededBy });
  return chips;
}

/** ISO -> the `datetime-local` shape, in the browser's timezone. */
function toLocalInput(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ParseRequestPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const { facilities } = useFacilityLookup();
  const create = useCreateRequisitionMutation();
  const { push } = useToast();

  const tokens = useMemo(() => getTokenChips(result), [result]);

  const initialValues = useMemo<Partial<RequisitionFormValues> | undefined>(() => {
    if (!result) return undefined;
    const { fields } = result;

    return {
      component: fields.component ?? "",
      bloodGroup: fields.bloodGroup ?? "",
      unitsRequested: fields.unitsRequested ?? 1,
      urgency: fields.urgency,
      neededBy: toLocalInput(fields.neededBy) ?? "",
    };
  }, [result]);

  const runParse = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResult(null);
      return;
    }
    // Brief visual "parsing" state for micro-feedback
    setIsParsing(true);
    setTimeout(() => {
      setResult(parseRequisition(trimmed));
      setIsParsing(false);
    }, 80);
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator"
        title="Request parser"
        subtitle="Free text in Tamil, Hindi or English into a structured requisition"
      />

      <motion.div
        className="mx-auto max-w-2xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.05, 0.7, 0.1, 1] }}
      >
        <Card className="space-y-6">
          {/* ── Incoming request section ──────────────────────────────────── */}
          <div>
            <label htmlFor="parse-input" className="mb-2 block text-sm font-bold text-text">
              Incoming request
            </label>

            {/* Textarea with parsing-wave border animation */}
            <div className="relative">
              <textarea
                id="parse-input"
                rows={5}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  runParse(e.target.value);
                }}
                placeholder="Paste a request exactly as it arrived — a message, a phone note, a ward handover."
                className={[
                  "w-full resize-y rounded-xl border px-3.5 py-3 text-sm leading-relaxed text-text transition-all placeholder:text-text-subtle hover:border-border-strong focus:outline-none",
                  isParsing
                    ? "border-accent bg-accent-soft/20 focus:border-accent"
                    : "border-border bg-surface focus:border-accent",
                ].join(" ")}
              />
              {/* Parsing shimmer bar */}
              <AnimatePresence>
                {isParsing && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 rounded-full bg-accent"
                    initial={{ width: "0%", opacity: 1 }}
                    animate={{ width: "100%", opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.08 }}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Example buttons */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                Try
              </span>
              {EXAMPLES.map((example) => (
                <motion.button
                  key={example.label}
                  type="button"
                  onClick={() => useExample(example.text)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
                >
                  {example.label}
                </motion.button>
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

            {/* Token chips — colour-coded tokens extracted from the parse result */}
            <AnimatePresence>
              {tokens.length > 0 && (
                <motion.div
                  key="token-chips"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.05, 0.7, 0.1, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <div className="flex w-full items-center gap-1.5 mb-1">
                      <Sparkles className="h-3 w-3 text-accent" />
                      <span className="text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                        Tokens recognised
                      </span>
                    </div>
                    {tokens.map((chip, i) => (
                      <motion.span
                        key={chip.key}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06, duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                        className={[
                          "inline-flex flex-col rounded-lg border px-2.5 py-1.5 text-xs",
                          TOKEN_CHIP_STYLE[chip.type] ?? "border-border bg-surface-overlay text-text",
                        ].join(" ")}
                      >
                        <span className="text-2xs font-semibold uppercase tracking-widest opacity-70">
                          {TOKEN_LABEL[chip.type] ?? chip.type}
                        </span>
                        <span className="font-bold">{chip.value}</span>
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!text && (
              <p className="mt-4 flex items-start gap-2 text-2xs leading-relaxed text-text-subtle">
                <Wand2 className="mt-0.5 h-3 w-3 flex-shrink-0" />
                The parser reads blood group, component, unit count, urgency and deadline. Anything it
                cannot read with confidence is left for you to fill in below.
              </p>
            )}
          </div>

          <div className="border-t border-border/80 pt-4">
            <RequisitionForm
              facilityOptions={facilities}
              initialValues={initialValues}
              submitLabel="Create requisition"
              pending={create.isPending}
              onSubmit={(v) => void handleSubmit(v)}
            />
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default ParseRequestPage;
