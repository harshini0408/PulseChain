/**
 * frontend/src/pages/public/MobiliseResponsePage.tsx
 *
 * Public unauthenticated community mobilisation response screen.
 * Accessible via time-limited, single-use link: /mobilise/:token
 *
 * Constraints:
 * - Public route outside ProtectedLayout / RequireAuth
 * - No login, no password, no Cognito, no donor directory
 * - Single dominant action: "Acknowledge — we'll reach out to our members"
 * - Clear state lifecycle: Loading, Invalid, Expired, Pending, Acknowledged
 * - Reuses existing UI components (Card, Button, Badge, ErrorState, BloodGroupToken)
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
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

export function MobiliseResponsePage() {
  const { token } = useParams<{ token: string }>();
  const mobilisationQuery = useMobilisationQuery(token);
  const acknowledgeMutation = useAcknowledgeMobilisationMutation();
  const { push } = useToast();

  const [acknowledgedLocal, setAcknowledgedLocal] = useState(false);

  const handleAcknowledge = async () => {
    if (!token) return;

    try {
      const res = await acknowledgeMutation.mutateAsync(token);
      setAcknowledgedLocal(true);
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
  const isExpired = data?.status === "EXPIRED" || (data?.expiresAt && new Date(data.expiresAt).getTime() <= Date.now());

  return (
    <div className="min-h-screen bg-bg text-text selection:bg-accent-soft selection:text-accent">
      {/* ── Public Brand Header ────────────────────────────────────────── */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-10 px-4 py-3 sm:px-6">
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
            Secure Mobilisation Link
          </span>
        </div>
      </header>

      {/* ── Main Content Container ────────────────────────────────────── */}
      <main className="mx-auto flex max-w-xl flex-col justify-center px-4 py-8 sm:py-12">
        {mobilisationQuery.isLoading ? (
          <Card className="space-y-4">
            <LoadingState variant="cards" rows={1} label="Loading emergency request details…" />
          </Card>
        ) : mobilisationQuery.isError ? (
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
        ) : !data ? (
          <Card>
            <ErrorState
              title="Invalid link"
              message="No request was found matching this mobilisation token."
            />
          </Card>
        ) : isAcknowledged ? (
          /* ── 1. Acknowledged State ───────────────────────────────────── */
          <Card className="border-border bg-surface-raised shadow-card">
            <div className="text-center py-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-received/10 text-status-received ring-8 ring-status-received/5">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <Badge variant="outline" className="mb-2 border-status-received/40 text-status-received font-semibold">
                Mobilisation Acknowledged
              </Badge>

              <h1 className="font-display text-xl font-bold text-text sm:text-2xl">
                Thank you for responding
              </h1>

              <p className="mx-auto mt-2.5 max-w-md text-xs leading-relaxed text-text-muted sm:text-sm">
                Your acknowledgement has been recorded on the corridor audit trail. The Regional Blood Coordination Centre has been notified that{" "}
                <strong className="text-text">{data.poolName}</strong> is reaching out to eligible internal members.
              </p>

              {/* Summary snapshot */}
              <div className="mt-6 rounded-xl border border-border bg-surface-sunken p-4 text-left">
                <div className="flex items-start gap-3">
                  <BloodGroupToken
                    bloodGroup={data.bloodGroup}
                    component={data.component}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold text-text">
                      {pluralise(data.unitsRequested, "unit")} of {data.bloodGroup} {data.component}
                    </p>
                    <p className="mt-0.5 text-text-muted">
                      For {data.hospitalName} ({data.hospitalCity})
                    </p>
                    {data.acknowledgedAt && (
                      <p className="mt-1 text-3xs text-text-subtle font-mono">
                        Acknowledged: {formatDate(data.acknowledgedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-6 text-2xs text-text-subtle">
                You may safely close this page. No further online action is required.
              </p>
            </div>
          </Card>
        ) : isExpired ? (
          /* ── 2. Expired State ────────────────────────────────────────── */
          <Card className="border-border bg-surface-raised shadow-card">
            <div className="text-center py-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-lost/10 text-status-lost ring-8 ring-status-lost/5">
                <Clock className="h-8 w-8" />
              </div>

              <Badge variant="outline" className="mb-2 border-status-lost/40 text-status-lost font-semibold">
                Link Expired
              </Badge>

              <h1 className="font-display text-xl font-bold text-text sm:text-2xl">
                Mobilisation window closed
              </h1>

              <p className="mx-auto mt-2.5 max-w-md text-xs leading-relaxed text-text-muted sm:text-sm">
                This single-use mobilisation link expired on{" "}
                <strong className="text-text">{formatDate(data.expiresAt)}</strong>. In emergency blood coordination, mobilisation requests are strictly time-limited to protect patient care timelines.
              </p>

              <div className="mt-6 rounded-xl border border-border bg-surface-sunken p-4 text-left text-xs text-text-muted">
                <p>
                  If your community has active eligible donors, please contact the Regional Blood Coordination Centre directly or coordinate with the requesting hospital.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          /* ── 3. Active Pending State ─────────────────────────────────── */
          <Card className="border-border bg-surface-raised shadow-card">
            <div className="space-y-6">
              {/* Header section */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="accent" className="text-2xs font-semibold">
                    Community Mobilisation Request
                  </Badge>
                  <span className="flex items-center gap-1 text-2xs text-text-subtle">
                    <Clock className="h-3 w-3" />
                    Expires {formatRelative(data.expiresAt)}
                  </span>
                </div>

                <h1 className="mt-2.5 font-display text-xl font-bold text-text sm:text-2xl">
                  {data.poolName}
                </h1>
                <p className="mt-1 text-xs text-text-muted sm:text-sm">
                  Hospital stock across the corridor is currently insufficient for an urgent clinical requirement. Your registered community pool has been selected to help.
                </p>
              </div>

              {/* Requirement details card */}
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
                        {data.unitsRequested} {pluralise(data.unitsRequested, "unit")} of {data.bloodGroup} {data.component}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 text-xs">
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
                        <span>Needed by: <strong>{formatDate(data.neededBy)}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coordinator explanation notice */}
              <div className="rounded-xl border border-accent/20 bg-accent-soft/30 p-3.5 text-xs leading-relaxed text-text">
                <div className="flex items-start gap-2.5">
                  <Users className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-text">What happens when you acknowledge?</p>
                    <p className="mt-0.5 text-text-muted text-2xs sm:text-xs">
                      Acknowledging tells the regional coordinator that your community group received this request and is actively reaching out to members. Individual donor identities are never collected through this link.
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="space-y-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                  onClick={handleAcknowledge}
                  disabled={acknowledgeMutation.isPending}
                >
                  <HeartHandshake className="mr-2 h-4 w-4" />
                  {acknowledgeMutation.isPending
                    ? "Recording acknowledgement…"
                    : "Acknowledge — we'll reach out to our members"}
                </Button>

                <p className="text-center text-3xs text-text-subtle leading-relaxed">
                  No login or account required · Single-use secure token · Encrypted corridor coordination
                </p>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
