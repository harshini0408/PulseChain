/**
 * / — Public landing page (unauthenticated).
 *
 * Reuses BloodDropIntro exactly as /login does today. After the animation
 * completes, a single calm screen explains what PulseChain is and offers two
 * paths: "I need blood" → /request, and "Facility login" → /login.
 *
 * No blog, no CMS, no donor stories, no FAQ. Just a front door.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Clock, Droplets, Network, ShieldCheck } from "lucide-react";
import { BloodDropIntro } from "../../components/intro/BloodDropIntro";
import { NetworkOrb } from "../../components/visualizations/NetworkOrb";
import { PulseLine } from "../../components/motion/PulseLine";
import { Logo } from "../../components/layout/Logo";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";

const HOW_IT_WORKS = [
  {
    icon: Droplets,
    step: "01",
    title: "A unit nears expiry",
    body: "Every component has a shelf clock. PulseChain watches all of them across the network in real time.",
  },
  {
    icon: Clock,
    step: "02",
    title: "The network escalates",
    body: "When a unit enters its rescue window, the system broadcasts to the nearest hospitals, ring by ring, until someone claims it.",
  },
  {
    icon: Network,
    step: "03",
    title: "Transfers are tracked",
    body: "From claim to in-transit to received — every step is logged so coordinators and blood centres see exactly where each unit is.",
  },
  {
    icon: ShieldCheck,
    step: "04",
    title: "Impact is measured",
    body: "Every saved unit appears on the Impact dashboard with its rupee value. Nothing is invented — every number comes from a real transfer.",
  },
] as const;

export function LandingPage() {
  const navigate = useNavigate();
  const [introComplete, setIntroComplete] = useState(false);

  return (
    <div className="brand-field min-h-screen relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
        <NetworkOrb size={900} subtle />
      </div>

      {/* Reuse BloodDropIntro exactly as /login does */}
      <BloodDropIntro onComplete={() => setIntroComplete(true)} />

      <AnimatePresence>
        {introComplete && (
          <motion.div
            key="landing-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
            className="relative z-10"
          >
            {/* ── Top nav bar ─────────────────────────────────────────────── */}
            <nav className="flex items-center justify-between px-6 py-5 sm:px-10">
              <div className="flex items-center gap-2.5 text-accent">
                <Logo className="h-6 w-6" />
                <span className="font-display text-lg font-bold tracking-tight text-text">
                  PulseChain
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="rounded-full border border-border/70 bg-surface-raised/85 px-4 py-1.5 text-xs font-semibold text-text-muted backdrop-blur-md transition-all hover:border-accent/40 hover:text-accent"
              >
                Facility login
              </button>
            </nav>

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <section className="mx-auto max-w-4xl px-6 pb-12 pt-8 text-center sm:px-10 sm:pt-14">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-raised/90 px-3.5 py-1.5 text-xs font-medium text-text-muted backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Coimbatore blood corridor
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 }}
                className="font-display text-3xl font-black leading-tight text-text sm:text-4xl lg:text-5xl"
              >
                Blood that would expire{" "}
                <em className="not-italic text-accent">reaches a patient instead.</em>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.28 }}
                className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-text-muted sm:text-lg"
              >
                PulseChain connects blood centres, hospitals, and donor pools so that
                every unit is claimed before its clock runs out — and every family that
                needs blood can reach the network in seconds.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.38 }}
                className="mt-4 flex justify-center"
              >
                <div className="w-40 opacity-50">
                  <PulseLine height={16} color="hsl(var(--accent))" />
                </div>
              </motion.div>

              {/* ── CTAs ──────────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.46 }}
                className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
              >
                <button
                  type="button"
                  id="landing-need-blood-btn"
                  onClick={() => navigate("/request")}
                  className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-accent px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-auto"
                >
                  <Droplets className="h-4 w-4" />
                  I need blood
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  id="landing-facility-login-btn"
                  onClick={() => navigate("/login")}
                  className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-surface-raised/90 px-8 py-4 text-sm font-semibold text-text backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent sm:w-auto"
                >
                  Facility login
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </motion.div>
            </section>

            {/* ── How it works ────────────────────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mx-auto max-w-5xl px-6 pb-16 sm:px-10"
            >
              <div className="mb-8">
                <PageHeader
                  eyebrow="Network Flow"
                  title="How it works"
                  subtitle="Four automated steps turning critical expiry risk into successful transfusion."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {HOW_IT_WORKS.map(({ icon: Icon, step, title, body }) => (
                  <Card
                    key={step}
                    tier="brand"
                    className="p-5 backdrop-blur-sm"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-display text-2xl font-black text-accent/20">
                        {step}
                      </span>
                    </div>
                    <p className="mb-1.5 text-sm font-bold text-text">{title}</p>
                    <p className="text-xs leading-relaxed text-text-muted">{body}</p>
                  </Card>
                ))}
              </div>
            </motion.section>

            {/* ── Footer line ─────────────────────────────────────────────── */}
            <footer className="border-t border-border/40 px-6 py-5 text-center">
              <p className="text-2xs text-text-subtle">
                PulseChain · Coimbatore blood corridor · Not a substitute for emergency services.
                If this is a life-threatening emergency, call{" "}
                <strong className="text-text">108</strong>.
              </p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
