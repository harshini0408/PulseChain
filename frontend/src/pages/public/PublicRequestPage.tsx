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

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, ClipboardCopy, HeartPulse, Phone, User, AlertCircle } from "lucide-react";
import { BLOOD_GROUPS, COMPONENTS, URGENCY_LEVELS, type BloodGroup, type Component, type Urgency } from "@pulsechain/shared";
import { COMPONENT, URGENCY } from "../../lib/status";
import { Logo } from "../../components/layout/Logo";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { createRequisition } from "../../api/requisitionsAdapter";
import { InteractivePinkBackground } from "../../components/visualizations/InteractivePinkBackground";

/** Well-known placeholder: public requests have no authenticated facilityId. */
const PUBLIC_HOSPITAL_ID = "PUBLIC";

/** A datetime-local value for `hours` from now, in the browser's timezone. */
function localDateTime(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const FIELD =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text transition-colors hover:border-border-strong focus:border-accent focus:outline-none";
const LABEL = "mb-1.5 block text-xs font-semibold text-text";

export function PublicRequestPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reqId, setReqId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form Fields
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("");
  const [component, setComponent] = useState<Component | "">("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "">("");
  const [unitsRequested, setUnitsRequested] = useState(1);
  const [urgency, setUrgency] = useState<Urgency>("NORMAL");
  const [neededBy, setNeededBy] = useState(() => localDateTime(24));
  const [condition, setCondition] = useState("");
  const [contactName, setContactName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!component || !bloodGroup || !patientName.trim() || !contactName.trim() || !mobileNumber.trim()) {
      setError("Please fill in all required fields marked with *");
      return;
    }

    setError(null);
    setPending(true);

    const structuredDetails = [
      `Patient: ${patientName.trim()} | Age: ${age || "N/A"} | Gender: ${gender || "N/A"}`,
      `Medical Condition: ${condition.trim() || "Not specified"}`,
      `Contact Person: ${contactName.trim()} | Mobile: ${mobileNumber.trim()}`,
    ].join("\n");

    try {
      const created = await createRequisition({
        hospitalId: PUBLIC_HOSPITAL_ID,
        component,
        bloodGroup,
        unitsRequested: Number(unitsRequested) || 1,
        urgency,
        neededBy: new Date(neededBy).toISOString(),
        source: "MANUAL",
        rawText: structuredDetails,
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
      <div className="mx-auto max-w-xl px-4 pb-16 pt-2 sm:px-6">
        <AnimatePresence mode="wait">
          {reqId ? (
            /* ── Success state ─────────────────────────────────────── */
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
            >
              <Card tier="brand" className="text-center backdrop-blur-sm shadow-xl p-6 sm:p-8">
                <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-status-received-bg">
                  <CheckCircle className="h-7 w-7 text-status-received" />
                </span>

                <h1 className="mb-2 font-display text-2xl font-bold text-text">
                  Blood Request Submitted
                </h1>
                <p className="mb-6 text-sm leading-relaxed text-text-muted">
                  Your request for <strong className="text-text">{patientName}</strong> has been transmitted
                  directly to the PulseChain regional coordinator network for Coimbatore.
                </p>

                {/* Tracking code */}
                <div className="mb-6 rounded-2xl border border-border bg-surface p-5 text-center">
                  <p className="mb-1 text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                    Your Tracking Code
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code
                      id="public-req-tracking-code"
                      className="font-mono text-lg font-bold text-accent"
                    >
                      {reqId}
                    </code>
                    <button
                      type="button"
                      onClick={copyReqId}
                      title="Copy tracking code"
                      className="rounded-lg border border-border p-1.5 text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
                    >
                      <ClipboardCopy className="h-4 w-4" />
                    </button>
                  </div>
                  {copied && (
                    <p className="mt-1.5 text-xs font-medium text-status-received">Copied to clipboard!</p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">
                    Our coordinator will reach out to <strong className="text-text">{contactName}</strong> at <strong className="text-text">{mobileNumber}</strong> as soon as a compatible unit is matched.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setReqId(null);
                      setPatientName("");
                      setAge("");
                      setGender("");
                      setCondition("");
                      setContactName("");
                      setMobileNumber("");
                    }}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-raised"
                  >
                    Submit another request
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
                  >
                    Back to home
                  </button>
                </div>
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
              <div className="mb-6 text-center sm:text-left">
                <PageHeader
                  eyebrow="Emergency & Public Request"
                  title="Request blood"
                  subtitle="Fill in patient & clinical details. A regional coordinator will coordinate with corridor blood banks immediately. For emergencies, call 108."
                />
              </div>

              <Card tier="brand" className="backdrop-blur-sm shadow-xl p-5 sm:p-7">
                {error && (
                  <div
                    role="alert"
                    className="mb-5 flex items-center gap-2.5 rounded-xl border border-status-lost/30 bg-status-lost-bg px-4 py-3 text-xs font-medium text-status-lost"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Section 1: Patient Information */}
                  <div className="rounded-xl border border-border/80 bg-surface/60 p-4 space-y-3.5">
                    <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-text font-semibold text-xs uppercase tracking-wider">
                      <User className="h-4 w-4 text-accent" />
                      Patient Information
                    </div>

                    <div>
                      <label htmlFor="patient-name" className={LABEL}>
                        Patient name <span className="text-accent">*</span>
                      </label>
                      <input
                        id="patient-name"
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className={FIELD}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="patient-gender" className={LABEL}>
                          Gender <span className="text-accent">*</span>
                        </label>
                        <select
                          id="patient-gender"
                          required
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className={FIELD}
                        >
                          <option value="">Select gender…</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="patient-age" className={LABEL}>
                          Age (years) <span className="text-accent">*</span>
                        </label>
                        <input
                          id="patient-age"
                          type="number"
                          required
                          min="0"
                          max="120"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="e.g. 42"
                          className={FIELD}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Blood Requirement */}
                  <div className="rounded-xl border border-border/80 bg-surface/60 p-4 space-y-3.5">
                    <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-text font-semibold text-xs uppercase tracking-wider">
                      <HeartPulse className="h-4 w-4 text-accent" />
                      Blood Requirement
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="req-component" className={LABEL}>
                          Component <span className="text-accent">*</span>
                        </label>
                        <select
                          id="req-component"
                          required
                          value={component}
                          onChange={(e) => setComponent(e.target.value as Component)}
                          className={FIELD}
                        >
                          <option value="">Select component…</option>
                          {COMPONENTS.map((c) => (
                            <option key={c} value={c}>
                              {COMPONENT[c].label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="req-group" className={LABEL}>
                          Blood group <span className="text-accent">*</span>
                        </label>
                        <select
                          id="req-group"
                          required
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                          className={FIELD}
                        >
                          <option value="">Select group…</option>
                          {BLOOD_GROUPS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="req-units" className={LABEL}>
                          Units needed <span className="text-accent">*</span>
                        </label>
                        <input
                          id="req-units"
                          type="number"
                          min="1"
                          max="20"
                          required
                          value={unitsRequested}
                          onChange={(e) => setUnitsRequested(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={FIELD}
                        />
                      </div>

                      <div>
                        <label htmlFor="req-urgency" className={LABEL}>
                          Urgency level
                        </label>
                        <select
                          id="req-urgency"
                          value={urgency}
                          onChange={(e) => setUrgency(e.target.value as Urgency)}
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
                      <label htmlFor="req-needed" className={LABEL}>
                        Needed by <span className="text-accent">*</span>
                      </label>
                      <input
                        id="req-needed"
                        type="datetime-local"
                        required
                        value={neededBy}
                        onChange={(e) => setNeededBy(e.target.value)}
                        className={FIELD}
                      />
                    </div>
                  </div>

                  {/* Section 3: Condition & Medical Explanation (replacing Note) */}
                  <div className="rounded-xl border border-border/80 bg-surface/60 p-4 space-y-2">
                    <label htmlFor="req-condition" className={LABEL}>
                      Medical condition & Clinical reason <span className="text-accent">*</span>
                    </label>
                    <p className="text-2xs text-text-muted leading-relaxed">
                      Explain the medical condition needed for (e.g. Dengue with severe platelet drop, emergency trauma surgery, post-partum hemorrhage, cancer chemotherapy).
                    </p>
                    <textarea
                      id="req-condition"
                      required
                      rows={3}
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      placeholder="Explain diagnosis, current ward or hospital, and doctor's requirement…"
                      className={FIELD}
                    />
                  </div>

                  {/* Section 4: Attendant / Contact Information */}
                  <div className="rounded-xl border border-border/80 bg-surface/60 p-4 space-y-3.5">
                    <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-text font-semibold text-xs uppercase tracking-wider">
                      <Phone className="h-4 w-4 text-accent" />
                      Attendant / Contact Person
                    </div>

                    <div>
                      <label htmlFor="contact-name" className={LABEL}>
                        Contact person name <span className="text-accent">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Priya Kumar (Attendant / Kin)"
                        className={FIELD}
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-mobile" className={LABEL}>
                        Mobile number <span className="text-accent">*</span>
                      </label>
                      <input
                        id="contact-mobile"
                        type="tel"
                        required
                        pattern="[0-9+\s-]{10,15}"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className={FIELD}
                      />
                      <p className="mt-1 text-2xs text-text-subtle">
                        Our regional coordinator will call this number to confirm hospital delivery.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={pending}
                    className="w-full shadow-md py-3 text-base font-semibold"
                  >
                    {pending ? "Transmitting request…" : "Send blood request"}
                  </Button>
                </form>
              </Card>

              <p className="mt-4 text-center text-2xs leading-relaxed text-text-subtle">
                This request goes directly to the PulseChain regional coordinator network.
                Your contact details are encrypted and used solely for emergency coordination.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </InteractivePinkBackground>
  );
}

