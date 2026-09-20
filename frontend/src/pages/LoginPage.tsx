import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Building2, Hospital, Loader2, Radio } from "lucide-react";
import { DEMO_PERSONAS, LANDING_PATHS, useAuth, type Role } from "../auth/AuthProvider";
import { Logo } from "../components/layout/Logo";
import { Button } from "../components/ui";
import { BloodDropIntro } from "../components/intro/BloodDropIntro";
import { ImpactCounter } from "../components/visualizations/ImpactCounter";
import { PulseLine } from "../components/motion/PulseLine";
import { NetworkOrb } from "../components/visualizations/NetworkOrb";
import { soundManager } from "../lib/soundManager";

import { InteractivePinkBackground } from "../components/visualizations/InteractivePinkBackground";

const PERSONA_ORDER: Role[] = ["BLOOD_CENTRE", "HOSPITAL", "COORDINATOR"];

const PERSONA_ICON: Record<Role, typeof Building2> = {
  BLOOD_CENTRE: Building2,
  HOSPITAL: Hospital,
  COORDINATOR: Radio,
};

const PERSONA_ROLE_LABEL: Record<Role, string> = {
  BLOOD_CENTRE: "Blood centre console",
  HOSPITAL: "Hospital offer inbox",
  COORDINATOR: "Corridor operations",
};

export function LoginPage() {
  const { login, loginAs, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Role | "form" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successDestination, setSuccessDestination] = useState<string | null>(null);

  const next = new URLSearchParams(location.search).get("next");
  const destinationFor = (r: Role) => next || LANDING_PATHS[r];

  useEffect(() => {
    if (isAuthenticated && role && !successDestination) {
      navigate(destinationFor(role), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, role, successDestination]);

  const handlePersona = async (r: Role) => {
    setError(null);
    setPending(r);
    try {
      const user = await loginAs(r);
      soundManager.play("pulse");
      setSuccessDestination(destinationFor(user.role));
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
      soundManager.play("pulse");
      setSuccessDestination(destinationFor(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(null);
    }
  };

  return (
    <InteractivePinkBackground>
      {/* Main content is immediately available; the splash only runs after a successful sign-in. */}
      <AnimatePresence>
          <motion.div
            key="login-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
            className="relative z-10 mx-auto flex min-h-screen w-full max-w-[460px] items-center px-5 py-10"
          >
            {/* ── Brand column ─────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0, 0, 1] }}
              className="hidden"
            >
              <div className="mb-10 flex items-center gap-2.5 text-accent">
                <Logo className="h-7 w-7" />
                <span className="font-display text-xl font-bold tracking-tight text-text">
                  PulseChain
                </span>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-raised/90 px-3.5 py-1.5 text-xs font-medium text-text-muted backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  Coimbatore blood corridor
                </p>
              </div>

              {/* Cinematic headline */}
              <h1 className="editorial-headline text-text">
                A unit nobody claims in time is a unit{" "}
                <em className="italic text-accent" style={{ fontStyle: "italic" }}>
                  lost
                </em>{" "}
                for good.
              </h1>

              {/* PulseLine separator */}
              <div className="mt-7 mb-6 w-48 opacity-50">
                <PulseLine height={16} color="hsl(var(--accent))" />
              </div>

              <p className="max-w-lg text-base leading-relaxed text-text-muted">
                PulseChain watches every component clock across the network. When a unit crosses
                into its expiry window it brokers the unit outward, ring by ring, to the hospitals
                most likely to use it — before the clock runs out.
              </p>

              {/* Stat ticker strip */}
              <div className="mt-10 flex gap-8 border-t border-border/60 pt-8">
                {[
                  { value: 48, suffix: "h", label: "Platelet clock" },
                  { value: 3, suffix: "", label: "Escalation rings" },
                ].map(({ value, suffix, label }) => (
                  <div key={label}>
                    <div className="flex items-baseline gap-0.5 font-display text-3xl font-black text-accent">
                      <ImpactCounter value={value} />
                      {suffix && <span className="text-xl">{suffix}</span>}
                    </div>
                    <span className="mt-1 block text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                      {label}
                    </span>
                  </div>
                ))}
                <div>
                  <div className="font-display text-3xl font-black text-accent">3.5s</div>
                  <span className="mt-1 block text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                    Console refresh
                  </span>
                </div>
              </div>
            </motion.div>

            {/* ── Sign-in column — no visible card border, form floats ──────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.25, ease: [0.2, 0, 0, 1] }}
              className="w-full"
            >
              {/* Form floats without heavy card styling */}
              <div className="rounded-3xl bg-surface-raised/90 backdrop-blur-md border border-border/50 shadow-xl p-7 sm:p-9">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-bold tracking-tight text-text">Sign in</h2>
                  <span className="text-xs text-text-subtle font-mono">v1.2</span>
                </div>
                <p className="text-sm text-text-muted leading-snug mb-6">
                  {next ? "Sign in to continue where you left off." : "Choose a console to work in."}
                </p>

                {error && (
                  <p
                    role="alert"
                    className="mb-4 rounded-xl border border-status-lost/30 bg-status-lost-bg px-3.5 py-3 text-xs leading-relaxed text-text font-medium"
                  >
                    {error}
                  </p>
                )}

                {/* Persona buttons */}
                <div className="space-y-2.5">
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
                        className="group relative flex w-full items-center gap-3.5 rounded-2xl border border-border/60
                          bg-surface/70 px-4 py-3.5 text-left transition-all
                          hover:border-accent/50 hover:bg-surface-raised hover:shadow-sm hover:-translate-y-0.5
                          disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {/* Left accent bar on hover */}
                        <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-accent opacity-0 transition-opacity group-hover:opacity-100" />

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
                  <span className="h-px flex-1 bg-border/60" />
                  <span className="text-2xs font-medium uppercase tracking-widest text-text-subtle">
                    or use credentials
                  </span>
                  <span className="h-px flex-1 bg-border/60" />
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
                      className="w-full rounded-xl border border-border/70 bg-surface/80 px-3.5 py-2.5 text-sm text-text
                        transition-colors placeholder:text-text-subtle hover:border-border-strong focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-text">
                      Password
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-border/70 bg-surface/80 px-3.5 py-2.5 text-sm text-text
                        transition-colors placeholder:text-text-subtle hover:border-border-strong focus:border-accent focus:outline-none"
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

                <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4 text-xs">
                  <button
                    type="button"
                    onClick={() => navigate("/request")}
                    className="font-semibold text-accent transition-colors hover:underline"
                  >
                    I need blood →
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="text-text-muted transition-colors hover:text-text"
                  >
                    Home
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        {successDestination && (
          <BloodDropIntro onComplete={() => navigate(successDestination, { replace: true })} />
        )}
      </AnimatePresence>
    </InteractivePinkBackground>
  );
}
