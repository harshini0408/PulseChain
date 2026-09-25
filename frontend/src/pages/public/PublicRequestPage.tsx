/**
 * /request — Public blood request form (unauthenticated).
 *
 * Any member of the public can submit a blood request without an account.
 * The form reuses RequisitionForm exactly — same fields, same validation,
 * same POST /requisitions endpoint as the hospital console uses.
 *
 * hospitalId is sent as "PUBLIC" — a well-known coordinator-visible sentinel
 * value that requires no new schema field. The SCHEMA.md Requisition entity
 * already has hospitalId as a plain string; this is just a known string value
 * rather than a real facilityId. The coordinator can see all OPEN requisitions
 * regardless, so PUBLIC requests surface immediately on the escalation map.
 *
 * On success: shows the tracking reqId and a "a coordinator will follow up"
 * message. No account, no OTP, no password.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, ClipboardCopy } from "lucide-react";
import { Logo } from "../../components/layout/Logo";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { RequisitionForm, type RequisitionFormValues } from "../../components/requisitions/RequisitionForm";
import { createRequisition } from "../../api/requisitionsAdapter";
import { InteractivePinkBackground } from "../../components/visualizations/InteractivePinkBackground";

/** Well-known placeholder: public requests have no authenticated facilityId. */
const PUBLIC_HOSPITAL_ID = "PUBLIC";

export function PublicRequestPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reqId, setReqId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (values: RequisitionFormValues) => {
    setError(null);
    setPending(true);
    try {
      const created = await createRequisition({
        hospitalId: PUBLIC_HOSPITAL_ID,
        component: values.component as Exclude<RequisitionFormValues["component"], "">,
        bloodGroup: values.bloodGroup as Exclude<RequisitionFormValues["bloodGroup"], "">,
        unitsRequested: values.unitsRequested,
        urgency: values.urgency,
        neededBy: new Date(values.neededBy).toISOString(),
        source: "MANUAL",
        rawText: values.note || undefined,
      });
      setReqId(created.reqId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your request. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const copyReqId = () => {
    if (!reqId) return;
    navigator.clipboard.writeText(reqId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <InteractivePinkBackground>
      <div className="relative z-10">
        {/* ── Top nav ──────────────────────────────────────────────────── */}
        <nav className="flex items-center justify-between px-6 py-5 sm:px-10">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2.5 text-accent">
            <Logo className="h-5 w-5" />
            <span className="font-display text-base font-bold tracking-tight text-text">
              PulseChain
            </span>
          </div>
        </nav>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-lg px-6 pb-16 pt-4 sm:px-10">
          <AnimatePresence mode="wait">
            {reqId ? (
              /* ── Success state ─────────────────────────────────────── */
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
              >
                <Card tier="brand" className="text-center backdrop-blur-sm shadow-xl">
                  <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-status-received-bg">
                    <CheckCircle className="h-7 w-7 text-status-received" />
                  </span>

                  <h1 className="mb-2 font-display text-xl font-bold text-text">
                    Request received
                  </h1>
                  <p className="mb-6 text-sm leading-relaxed text-text-muted">
                    A regional coordinator will review your request and follow up. If this is
                    a life-threatening emergency, please call{" "}
                    <strong className="text-text">108</strong> immediately.
                  </p>

                  {/* Tracking code */}
                  <div className="mb-6 rounded-xl border border-border bg-surface p-4">
                    <p className="mb-1.5 text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                      Your tracking code
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <code
                        id="public-req-tracking-code"
                        className="font-mono text-sm font-bold text-accent"
                      >
                        {reqId}
                      </code>
                      <button
                        type="button"
                        onClick={copyReqId}
                        title="Copy tracking code"
                        className="rounded-lg border border-border p-1.5 text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
                      >
                        <ClipboardCopy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {copied && (
                      <p className="mt-1.5 text-2xs text-status-received">Copied!</p>
                    )}
                    <p className="mt-2 text-2xs leading-relaxed text-text-subtle">
                      Keep this code. A coordinator may ask for it when they contact you.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    Back to home
                  </button>
                </Card>
              </motion.div>
            ) : (
              /* ── Form state ────────────────────────────────────────── */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
              >
                <div className="mb-6">
                  <PageHeader
                    eyebrow="No account needed"
                    title="Request blood"
                    subtitle="Fill in what you need. A coordinator will follow up as quickly as possible. For emergencies, call 108."
                  />
                </div>

                <Card tier="brand" className="backdrop-blur-sm shadow-lg">
                  {error && (
                    <p
                      role="alert"
                      className="mb-4 rounded-xl border border-status-lost/30 bg-status-lost-bg px-3.5 py-3 text-xs font-medium leading-relaxed text-text"
                    >
                      {error}
                    </p>
                  )}

                  {/*
                   * Reuse RequisitionForm exactly — pass hospitalId="PUBLIC" so
                   * it bypasses the facility selector and goes straight to the
                   * component/blood-group/units fields.
                   */}
                  <RequisitionForm
                    hospitalId={PUBLIC_HOSPITAL_ID}
                    submitLabel="Send blood request"
                    pending={pending}
                    onSubmit={(values) => void handleSubmit(values)}
                  />
                </Card>

                <p className="mt-4 text-center text-2xs leading-relaxed text-text-subtle">
                  This form goes directly to the PulseChain coordinator network.
                  Your information is not shared publicly.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </InteractivePinkBackground>
  );
}
