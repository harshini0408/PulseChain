/**
 * frontend/src/pages/public/MobiliseResponsePage.tsx
 *
 * Public unauthenticated community mobilisation response screen.
 * Accessible via time-limited, single-use link: /mobilise/:token
 *
 * UI/UX Enhancements:
 * - Blood drop icon with radial ripple animation on load
 * - Framer Motion AnimatePresence state transitions (Loading → Pending → Acknowledged)
 * - Full-page bloom success animation on acknowledge
 * - Urgency countdown strip with colour-coded time remaining
 * - Animated acknowledge button with loading press state
 * - Mobile-first single-column layout
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useMobilisationQuery, useAcknowledgeMobilisationMutation } from "../../api/hooks";
import {
  Badge,
  BloodGroupToken,
  Button,
  Card,
  ErrorState,
  LoadingState,
  useToast,
} from "../../components/ui";
import { formatDate, formatRelative, pluralise } from "../../lib/format";

/** Radial ripple that emits from the blood drop icon on load */
function BloodDropHero() {
  return (
    <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
      {/* Expanding ring 1 */}
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-accent/30"
        initial={{ scale: 0.6, opacity: 0.8 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0 }}
      />
      {/* Expanding ring 2 */}
      <motion.span
        className="absolute inset-0 rounded-full border border-accent/20"
        initial={{ scale: 0.6, opacity: 0.7 }}
        animate={{ scale: 2.8, opacity: 0 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
      />
      {/* Core icon */}
      <motion.div
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_8px_24px_hsl(var(--accent)/0.35)]"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <Droplets className="h-8 w-8 fill-current" />
      </motion.div>
    </div>
  );
}

/** Countdown strip — shows time remaining with colour coding */
function CountdownStrip({ expiresAt }: { expiresAt: string }) {
  const expiryMs = new Date(expiresAt).getTime() - Date.now();
  const hours = Math.floor(expiryMs / 3600000);
  const isUrgent = hours < 4;

  return (
    <motion.div
      className={[
        "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium",
        isUrgent
          ? "border-status-lost/30 bg-status-lost-bg text-status-lost"
          : "border-status-in-transit/30 bg-status-in-transit-bg text-status-in-transit",
      ].join(" ")}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Clock
        className={["h-3.5 w-3.5", isUrgent ? "text-status-lost" : "text-status-in-transit"].join(
          " ",
        )}
      />
      <span>
        {isUrgent ? "Urgent — " : ""}Link expires {formatRelative(expiresAt)}
      </span>
      {isUrgent && (
        <span
          className="ml-auto h-1.5 w-1.5 rounded-full bg-status-lost"
          style={{ animation: "breathe 1.2s ease-in-out infinite" }}
        />
      )}
    </motion.div>
  );
}

/** Full-page bloom that plays when acknowledged */
function AcknowledgementBloom() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-status-received-bg/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 1.5, times: [0, 0.3, 1] }}
    >
      <motion.div
        className="flex h-40 w-40 items-center justify-center rounded-full bg-status-received text-white shadow-[0_0_80px_hsl(var(--status-received)/0.5)]"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <CheckCircle2 className="h-20 w-20" />
      </motion.div>
    </motion.div>
  );
}

export function MobiliseResponsePage() {
  const { token } = useParams<{ token: string }>();
  const mobilisationQuery = useMobilisationQuery(token);
  const acknowledgeMutation = useAcknowledgeMobilisationMutation();
  const { push } = useToast();

  const [acknowledgedLocal, setAcknowledgedLocal] = useState(false);
  const [showBloom, setShowBloom] = useState(false);

  const handleAcknowledge = async () => {
    if (!token) return;

    try {
      const res = await acknowledgeMutation.mutateAsync(token);
      // Show bloom animation first, then set acknowledged state
      setShowBloom(true);
      setTimeout(() => {
        setAcknowledgedLocal(true);
        setShowBloom(false);
      }, 1400);
      push({
        tone: "success",
        title: "Mobilisation Acknowledged",
        message: res.message || "Regional coordinator notified.",
      });
    } catch (err: any) {
      push({
        tone: "error",
        title: "Could not acknowledge",
        message: err instanceof Error ? err.message : "The server rejected the request.",
      });
    }
  };

  const data = mobilisationQuery.data;
  const isAcknowledged = acknowledgedLocal || data?.status === "ACKNOWLEDGED";
  const isExpired =
    data?.status === "EXPIRED" ||
    (data?.expiresAt && new Date(data.expiresAt).getTime() <= Date.now());

  return (
    <div className="min-h-screen bg-surface text-text selection:bg-accent-soft selection:text-accent">
      {/* Bloom overlay animation */}
      <AnimatePresence>{showBloom && <AcknowledgementBloom />}</AnimatePresence>

      {/* ── Public Brand Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
              <Droplets className="h-4 w-4 fill-current" />
            </div>
            <div>
              <span className="font-display text-sm font-bold tracking-tight text-text">
                PulseChain
              </span>
              <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-3xs font-medium text-text-subtle">
                Community Network
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-2xs text-text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Secure link
          </span>
        </div>
      </header>

      {/* ── Main Content Container ────────────────────────────────────── */}
      <main className="mx-auto flex max-w-xl flex-col justify-center px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {mobilisationQuery.isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="space-y-4">
                <LoadingState variant="cards" rows={1} label="Loading emergency request details…" />
              </Card>
            </motion.div>
          ) : mobilisationQuery.isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <ErrorState
                  title="Mobilisation link not found"
                  message={
                    mobilisationQuery.error instanceof Error
                      ? mobilisationQuery.error.message
                      : "This link may have been entered incorrectly or is no longer valid on the network."
                  }
                />
              </Card>
            </motion.div>
          ) : !data ? (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <ErrorState
                  title="Invalid link"
                  message="No request was found matching this mobilisation token."
                />
              </Card>
            </motion.div>
          ) : isAcknowledged ? (
            /* ── Acknowledged State ─────────────────────────────────────── */
            <motion.div
              key="acknowledged"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Card className="border-status-received/20 bg-surface-raised shadow-card">
                <div className="py-6 text-center">
                  {/* Animated check icon */}
                  <motion.div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-status-received/10 text-status-received ring-8 ring-status-received/5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <CheckCircle2 className="h-9 w-9" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Badge
                      variant="outline"
                      className="mb-2 border-status-received/40 font-semibold text-status-received"
                    >
                      Mobilisation Acknowledged
                    </Badge>

                    <h1 className="mt-2 font-display text-xl font-bold text-text sm:text-2xl">
                      Thank you for responding
                    </h1>

                    <p className="mx-auto mt-2.5 max-w-md text-xs leading-relaxed text-text-muted sm:text-sm">
                      Your acknowledgement has been recorded on the corridor audit trail. The Regional Blood
                      Coordination Centre has been notified that{" "}
                      <strong className="text-text">{data.poolName}</strong> is reaching out to eligible
                      internal members.
                    </p>
                  </motion.div>

                  {/* Summary snapshot */}
                  <motion.div
                    className="mt-6 rounded-xl border border-border bg-surface-sunken p-4 text-left"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-start gap-3">
                      <BloodGroupToken
                        bloodGroup={data.bloodGroup}
                        component={data.component}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-semibold text-text">
                          {pluralise(data.unitsRequested, "unit")} of {data.bloodGroup}{" "}
                          {data.component}
                        </p>
                        <p className="mt-0.5 text-text-muted">
                          For {data.hospitalName} ({data.hospitalCity})
                        </p>
                        {data.acknowledgedAt && (
                          <p className="mt-1 font-mono text-3xs text-text-subtle">
                            Acknowledged: {formatDate(data.acknowledgedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  <p className="mt-6 text-2xs leading-relaxed text-text-subtle">
                    You may safely close this page. No further online action is required.
                  </p>
                </div>
              </Card>
            </motion.div>
          ) : isExpired ? (
            /* ── Expired State ──────────────────────────────────────────── */
            <motion.div
              key="expired"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Card className="border-border bg-surface-raised shadow-card">
                <div className="py-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-lost/10 text-status-lost ring-8 ring-status-lost/5">
                    <Clock className="h-8 w-8" />
                  </div>

                  <Badge
                    variant="outline"
                    className="mb-2 border-status-lost/40 font-semibold text-status-lost"
                  >
                    Link Expired
                  </Badge>

                  <h1 className="font-display text-xl font-bold text-text sm:text-2xl">
                    Mobilisation window closed
                  </h1>

                  <p className="mx-auto mt-2.5 max-w-md text-xs leading-relaxed text-text-muted sm:text-sm">
                    This single-use mobilisation link expired on{" "}
                    <strong className="text-text">{formatDate(data.expiresAt)}</strong>. In
                    emergency blood coordination, mobilisation requests are strictly time-limited to
                    protect patient care timelines.
                  </p>

                  <div className="mt-6 rounded-xl border border-border bg-surface-sunken p-4 text-left text-xs text-text-muted">
                    <p>
                      If your community has active eligible donors, please contact the Regional
                      Blood Coordination Centre directly or coordinate with the requesting hospital.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : (
            /* ── Active Pending State ───────────────────────────────────── */
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.05, 0.7, 0.1, 1] }}
            >
              {/* Blood drop hero */}
              <BloodDropHero />

              <Card className="border-border bg-surface-raised shadow-card">
                <div className="space-y-5">
                  {/* Expiry countdown strip */}
                  <CountdownStrip expiresAt={data.expiresAt} />

                  {/* Header */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="accent" className="text-2xs font-semibold">
                        Community Mobilisation Request
                      </Badge>
                    </div>
                    <h1 className="mt-2.5 font-display text-xl font-bold text-text sm:text-2xl">
                      {data.poolName}
                    </h1>
                    <p className="mt-1 text-xs text-text-muted sm:text-sm">
                      Hospital stock across the corridor is currently insufficient for an urgent
                      clinical requirement. Your registered community pool has been selected to
                      help.
                    </p>
                  </div>

                  {/* Requirement details */}
                  <div className="rounded-2xl border border-border bg-surface-sunken p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      <BloodGroupToken
                        bloodGroup={data.bloodGroup}
                        component={data.component}
                        size="lg"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div>
                          <span className="text-3xs font-semibold uppercase tracking-widest text-text-subtle">
                            Requirement
                          </span>
                          <p className="text-base font-bold text-text sm:text-lg">
                            {data.unitsRequested}{" "}
                            {pluralise(data.unitsRequested, "unit")} of {data.bloodGroup}{" "}
                            {data.component}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 pt-1 text-xs sm:grid-cols-2">
                          <div className="flex items-center gap-1.5 text-text-muted">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-text-subtle" />
                            <span className="truncate">{data.hospitalName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-text-muted">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-text-subtle" />
                            <span>{data.hospitalCity}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-text-muted sm:col-span-2">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-text-subtle" />
                            <span>
                              Needed by:{" "}
                              <strong className="text-text">{formatDate(data.neededBy)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Explanation notice */}
                  <div className="rounded-xl border border-accent/20 bg-accent-soft/30 p-3.5 text-xs leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                      <div>
                        <p className="font-semibold text-text">What happens when you acknowledge?</p>
                        <p className="mt-0.5 text-2xs text-text-muted sm:text-xs">
                          Acknowledging tells the regional coordinator that your community group received
                          this request and is actively reaching out to members. Individual donor
                          identities are never collected through this link.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA with enhanced animation */}
                  <div className="space-y-3 pt-1">
                    <div className="relative">
                      {/* Glow behind button */}
                      {!acknowledgeMutation.isPending && (
                        <span
                          className="pointer-events-none absolute inset-0 rounded-xl bg-accent/15 blur-md"
                          style={{ animation: "breathe 2s ease-in-out infinite" }}
                          aria-hidden="true"
                        />
                      )}
                      <Button
                        variant="primary"
                        size="lg"
                        className="relative w-full justify-center py-4 text-sm font-bold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                        onClick={handleAcknowledge}
                        disabled={acknowledgeMutation.isPending}
                        loading={acknowledgeMutation.isPending}
                      >
                        <HeartHandshake className="mr-2 h-4 w-4" />
                        {acknowledgeMutation.isPending
                          ? "Recording acknowledgement…"
                          : "Acknowledge — we'll reach out to our members"}
                      </Button>
                    </div>

                    <p className="text-center text-3xs leading-relaxed text-text-subtle">
                      No login or account required · Single-use secure token · Encrypted corridor
                      coordination
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
