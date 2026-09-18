/**
 * /login — a Tier A brand surface.
 *
 * Blush gradient field, display serif at a large size, pill buttons, 24px
 * radii. This is the only screen in the application that uses the italicised
 * single word from the reference hero; repeated anywhere else it becomes a tic.
 */

import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Hospital, Loader2, Radio } from "lucide-react";
import { DEMO_PERSONAS, LANDING_PATHS, useAuth, type Role } from "../auth/AuthProvider";
import { Logo } from "../components/layout/Logo";
import { Button } from "../components/ui";
import { BloodDropIntro } from "../components/intro/BloodDropIntro";

const PERSONA_ORDER: Role[] = ["BLOOD_CENTRE", "HOSPITAL", "COORDINATOR", "COMMUNITY_COORDINATOR", "DONOR"];

const PERSONA_ICON: Record<Role, typeof Building2> = {
  BLOOD_CENTRE: Building2,
  HOSPITAL: Hospital,
  COORDINATOR: Radio,
  COMMUNITY_COORDINATOR: Building2,
  DONOR: Hospital,
};

const PERSONA_ROLE_LABEL: Record<Role, string> = {
  BLOOD_CENTRE: "Blood centre",
  HOSPITAL: "Hospital",
  COORDINATOR: "Coordinator",
  COMMUNITY_COORDINATOR: "Community Network",
  DONOR: "Blood Donor",
};

export function LoginPage() {
  const { login, loginAs, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Role | "form" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Where RequireAuth was taking them before it bounced them here.
  const next = new URLSearchParams(location.search).get("next");

  const destinationFor = (r: Role) => next || LANDING_PATHS[r];

  // Already signed in (e.g. they navigated to /login by hand) — do not make
  // them sign in twice.
  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(destinationFor(role), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, role]);

  const handlePersona = async (r: Role) => {
    setError(null);
    setPending(r);
    try {
      const user = await loginAs(r);
      navigate(destinationFor(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending("form");
    try {
      const user = await login(email.trim(), password);
      navigate(destinationFor(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="brand-field min-h-screen relative">
      <BloodDropIntro />
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_minmax(0,420px)] lg:gap-16 lg:py-16">
        {/* ── Brand column ───────────────────────────────────────────────── */}
        <div className="max-w-xl">
          <div className="mb-8 flex items-center gap-2.5 text-accent">
            <Logo className="h-7 w-7" />
            <span className="font-display text-xl font-bold tracking-tight text-text">
              PulseChain
            </span>
          </div>

          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3.5 py-1.5 text-xs font-medium text-text-muted shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Coimbatore blood corridor
          </p>

          <h1 className="font-display text-display-md font-bold text-text sm:text-display-lg">
            A unit nobody claims in time is a unit <em className="italic text-accent">lost</em> for
            good
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-text-muted">
            PulseChain watches every component clock across the network. When a unit crosses into
            its expiry window it brokers the unit outward, ring by ring, to the hospitals most
            likely to use it — before the clock runs out.
          </p>

          <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-7">
            {[
              { value: "48h", label: "Platelet clock" },
              { value: "3", label: "Escalation rings" },
              { value: "3.5s", label: "Console refresh" },
            ].map(({ value, label }) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span
                    className="block font-display text-2xl font-bold tabular-nums text-accent"
                    data-numeric="true"
                  >
                    {value}
                  </span>
                  <span className="mt-0.5 block text-2xs font-medium uppercase tracking-widest text-text-subtle">
                    {label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Sign-in column ─────────────────────────────────────────────── */}
        <div className="w-full rounded-3xl border border-border bg-surface-raised p-6 shadow-brand sm:p-8">
          <h2 className="text-lg font-bold text-text">Sign in</h2>
          <p className="mt-1 text-sm text-text-muted">
            {next ? "Sign in to continue where you left off." : "Choose a console to work in."}
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-status-lost/25 bg-status-lost-bg px-3.5 py-3 text-xs leading-relaxed text-text"
            >
              {error}
            </p>
          )}

          <div className="mt-6 space-y-2.5">
            {PERSONA_ORDER.map((r) => {
              const persona = DEMO_PERSONAS[r];
              const Icon = PERSONA_ICON[r];
              const isPending = pending === r;

              return (
                <button
                  key={r}
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void handlePersona(r)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text">
                      {persona.facilityName}
                    </span>
                    <span className="block text-2xs text-text-muted">{PERSONA_ROLE_LABEL[r]}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-text-subtle transition-colors group-hover:text-accent" />
                </button>
              );
            })}
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-2xs font-medium uppercase tracking-widest text-text-subtle">
              or use credentials
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-text">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="centre@example.invalid"
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text transition-colors placeholder:text-text-subtle hover:border-border-strong focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-xs font-semibold text-text"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text transition-colors placeholder:text-text-subtle hover:border-border-strong focus:border-accent focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              pill
              fullWidth
              loading={pending === "form"}
              disabled={pending !== null || !email}
            >
              Sign in
            </Button>
          </form>

          <p className="mt-5 text-[10px] leading-relaxed text-text-subtle">
            Credentials authenticate against Cognito when a user pool is configured. Without one,
            the personas above sign in locally and the interface marks the session as demo auth.
          </p>
        </div>
      </div>
    </div>
  );
}
