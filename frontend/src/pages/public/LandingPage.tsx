/**
 * frontend/src/pages/public/LandingPage.tsx
 *
 * Block 6: The thin public front door.
 *
 * Features:
 * 1. BloodDropIntro plays on initial visit (reusing components/intro/BloodDropIntro.tsx as-is).
 * 2. Clean single-screen presentation with one-line description.
 * 3. Two primary actions: "I need blood" (/request) and "Facility login" (/login).
 * 4. 4 "How it works" steps using PageHeader and Card from components/ui/*.
 * 5. Strictly on-theme, zero scope creep (no blog, CMS, stories, or FAQ).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock, HeartHandshake, ShieldCheck, Truck } from "lucide-react";
import { BloodDropIntro } from "../../components/intro/BloodDropIntro";
import { Card, PageHeader } from "../../components/ui";
import { Logo } from "../../components/layout/Logo";
import { PulseLine } from "../../components/motion/PulseLine";
import { NetworkOrb } from "../../components/visualizations/NetworkOrb";

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Stock Monitoring",
    description: "Centres register available units with live component-expiry countdowns.",
    icon: Clock,
  },
  {
    step: "02",
    title: "Escalation Brokerage",
    description: "At-risk units broker outward ring-by-ring to hospitals with matching demand.",
    icon: ShieldCheck,
  },
  {
    step: "03",
    title: "1-Click Claim & Transfer",
    description: "Hospitals claim incoming units instantly with tracked courier dispatch.",
    icon: Truck,
  },
  {
    step: "04",
    title: "Community Mobilisation",
    description: "When network stock is empty, registered regional donor pools receive secure alerts.",
    icon: HeartHandshake,
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [introDone, setIntroDone] = useState(false);

  return (
    <div className="brand-field min-h-screen relative overflow-hidden flex flex-col justify-between">
      {/* Play intro on first mount if not dismissed */}
      {!introDone && (
        <BloodDropIntro onComplete={() => setIntroDone(true)} />
      )}

      {/* Subtle ambient background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-8">
        <NetworkOrb size={700} subtle />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* ── Top Header ──────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-6 py-5 sm:px-10 max-w-6xl w-full mx-auto">
          <div className="flex items-center gap-2.5 text-accent">
            <Logo className="h-6 w-6" />
            <span className="font-display text-lg font-bold tracking-tight text-text">
              PulseChain
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="rounded-full border border-border bg-surface-raised/80 px-4 py-1.5 text-xs font-semibold text-text backdrop-blur-sm transition-all hover:border-accent/40 hover:text-accent shadow-sm"
          >
            Facility login
          </button>
        </header>

        {/* ── Hero Section ────────────────────────────────────────────── */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 sm:px-10 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
            className="text-center max-w-3xl mx-auto mb-10"
          >
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-raised/90 px-3.5 py-1 text-2xs font-bold uppercase tracking-wider text-accent shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Regional Blood Coordination Network
            </p>

            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-text leading-tight sm:leading-tight">
              A unit nobody claims in time is a unit{" "}
              <span className="text-accent italic">lost</span> for good.
            </h1>

            <div className="my-4 mx-auto w-40 opacity-70">
              <PulseLine height={16} color="hsl(var(--accent))" />
            </div>

            <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl mx-auto">
              PulseChain brokers urgent blood supplies and surplus inventory between regional centres and hospitals before the expiry clock runs out.
            </p>

            {/* CTA Action Buttons */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                id="btn-public-request-blood"
                onClick={() => navigate("/request")}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-raised transition-all hover:bg-accent-hover hover:shadow-brand hover:-translate-y-0.5"
              >
                I need blood
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                id="btn-public-facility-login"
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-5 py-3 text-sm font-semibold text-text transition-all hover:border-border-strong hover:bg-surface"
              >
                Facility login
              </button>
            </div>
          </motion.div>

          {/* ── How It Works Steps ──────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.2, 0, 0, 1] }}
            aria-label="How it works"
            className="mt-4"
          >
            <div className="mb-4 text-center">
              <PageHeader
                eyebrow="Corridor operations"
                title="How PulseChain works"
                subtitle="Four coordinated stages from inventory alerting to community response"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <Card key={step.step} tier="console" className="relative p-4 flex flex-col justify-between hover:border-accent/30 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="font-mono text-2xs font-bold text-text-subtle">
                          {step.step}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-text mb-1">{step.title}</h3>
                      <p className="text-2xs text-text-muted leading-relaxed">{step.description}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.section>
        </main>

        {/* ── Minimal Footer ──────────────────────────────────────────── */}
        <footer className="py-4 text-center text-2xs text-text-subtle border-t border-border/40">
          PulseChain Regional Care Corridor • Secure Automated Coordination
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;
