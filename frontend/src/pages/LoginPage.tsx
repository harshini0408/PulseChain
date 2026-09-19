import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Hospital, Loader2, Radio } from "lucide-react";
import { DEMO_PERSONAS, LANDING_PATHS, useAuth, type Role } from "../auth/AuthProvider";
import { Logo } from "../components/layout/Logo";
import { Button } from "../components/ui";
import { BloodDropIntro } from "../components/intro/BloodDropIntro";
import { ImpactCounter } from "../components/visualizations/ImpactCounter";
import { PulseLine } from "../components/motion/PulseLine";
import { fadeUpVariants } from "../lib/motionTokens";

const PERSONA_ORDER: Role[] = ["BLOOD_CENTRE", "HOSPITAL", "COORDINATOR"];

const PERSONA_ICON: Record<Role, typeof Building2> = {
  BLOOD_CENTRE: Building2,
  HOSPITAL: Hospital,
  COORDINATOR: Radio,
};

const PERSONA_ROLE_LABEL: Record<Role, string> = {
  BLOOD_CENTRE: "Blood centre",
  HOSPITAL: "Hospital",
  COORDINATOR: "Coordinator",
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
    <div className="brand-field min-h-screen relative overflow-hidden">
      <BloodDropIntro />

      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-10 px-5 py-10 lg:grid-cols-[1.15fr_minmax(0,420px)] lg:gap-16 lg:py-16 relative z-10">
        {/* ── Brand column ───────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="max-w-xl"
        >
          <div className="mb-8 flex items-center gap-2.5 text-accent">
            <Logo className="h-7 w-7" />
            <span className="font-display text-xl font-bold tracking-tight text-text">
              PulseChain
            </span>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-raised/90 px-3.5 py-1.5 text-xs font-medium text-text-muted shadow-sm backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Coimbatore blood corridor
            </p>
            <div className="hidden sm:block flex-1 max-w-[140px] opacity-40">
              <PulseLine height={14} color="hsl(var(--accent))" />
            </div>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-bold text-text leading-[1.08] tracking-tight">
            A unit nobody claims in time is a unit{" "}
            <em className="italic text-accent font-serif font-normal">lost</em> for good.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-text-muted">
            PulseChain watches every component clock across the network. When a unit crosses into
            its expiry window it brokers the unit outward, ring by ring, to the hospitals most
            likely to use it — before the clock runs out.
          </p>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border/70 pt-8">
            <div>
              <dt className="sr-only">Platelet clock</dt>
              <dd>
                <div className="flex items-baseline text-2xl font-bold text-accent">
                  <ImpactCounter value={48} suffix="h" />
                </div>
                <span className="mt-1 block text-2xs font-medium uppercase tracking-widest text-text-subtle">
                  Platelet clock
                </span>
              </dd>
            </div>

            <div>
              <dt className="sr-only">Escalation rings</dt>
              <dd>
                <div className="flex items-baseline text-2xl font-bold text-accent">
                  <ImpactCounter value={3} />
                </div>
                <span className="mt-1 block text-2xs font-medium uppercase tracking-widest text-text-subtle">
                  Escalation rings
                </span>
              </dd>
            </div>

            <div>
              <dt className="sr-only">Console refresh</dt>
              <dd>
                <div className="flex items-baseline text-2xl font-bold text-accent font-display">
                  3.5s
                </div>
                <span className="mt-1 block text-2xs font-medium uppercase tracking-widest text-text-subtle">
                  Console refresh
                </span>
              </dd>
            </div>
          </dl>
        </motion.div>

        {/* ── Sign-in column ─────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
          className="w-full rounded-3xl glass-surface p-7 shadow-xl sm:p-9"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-text">Sign in</h2>
            <span className="text-xs text-text-subtle font-mono">v1.2</span>
          </div>
          <p className="mt-1.5 text-sm text-text-muted leading-snug">
            {next ? "Sign in to continue where you left off." : "Choose a console to work in."}
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-status-lost/30 bg-status-lost-bg px-3.5 py-3 text-xs leading-relaxed text-text font-medium"
            >
              {error}
            </p>
          )}

          <div className="mt-6 space-y-3">
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
                  className="group relative flex w-full items-center gap-3.5 rounded-2xl border border-border/80 bg-surface/80 px-4 py-3.5 text-left transition-all hover:border-accent/50 hover:bg-surface-raised hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform group-hover:scale-105">
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
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </button>
              );
            })}
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border/70" />
            <span className="text-2xs font-medium uppercase tracking-widest text-text-subtle">
              or use credentials
            </span>
            <span className="h-px flex-1 bg-border/70" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full rounded-xl border border-border/80 bg-surface/90 px-3.5 py-2.5 text-sm text-text transition-colors placeholder:text-text-subtle hover:border-border-strong focus:border-accent focus:outline-none"
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
                className="w-full rounded-xl border border-border/80 bg-surface/90 px-3.5 py-2.5 text-sm text-text transition-colors placeholder:text-text-subtle hover:border-border-strong focus:border-accent focus:outline-none"
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

          <p className="mt-5 text-[11px] leading-relaxed text-text-subtle">
            Credentials authenticate against Cognito when a user pool is configured. Without one,
            the personas above sign in locally and the interface marks the session as demo auth.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
