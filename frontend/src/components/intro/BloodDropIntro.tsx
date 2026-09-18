/**
 * BloodDropIntro.tsx
 *
 * Fullscreen opening intro animation for PulseChain login:
 * - A stylized blood drop accelerates downward under gravity.
 * - Squashes slightly on impact with a gentle radial crimson glow.
 * - 3 subtle ripples expand outward, accompanied by a few gentle micro-particles.
 * - "Every drop counts." appears softly with the PulseChain branding.
 * - Transitions cleanly via a smooth vertical wipe revealing the login screen.
 * - Includes a discreet "Skip" control in the top-right corner.
 * - Respects prefers-reduced-motion by bypassing immediately.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "../../lib/motion";
import { Logo } from "../layout/Logo";

interface BloodDropIntroProps {
  onComplete?: () => void;
}

// 4 tiny splash particles radiating outward on impact
const PARTICLES = [
  { id: 1, x: -28, y: -16, delay: 0.88 },
  { id: 2, x: 28, y: -18, delay: 0.88 },
  { id: 3, x: -18, y: -26, delay: 0.9 },
  { id: 4, x: 18, y: -24, delay: 0.9 },
];

export function BloodDropIntro({ onComplete }: BloodDropIntroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = useState(!reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    // Auto-advance timeline: ~2.15 seconds total duration
    const timer = window.setTimeout(() => {
      handleDismiss();
    }, 2150);

    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  const handleDismiss = () => {
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible && reducedMotion) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="pulsechain-intro-layer"
          initial={{ opacity: 1, y: 0 }}
          exit={{
            y: "100%",
            opacity: 0.98,
            transition: { duration: 0.65, ease: [0.32, 0.72, 0, 1] },
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-surface select-none"
        >
          {/* Subtle background ambient gradient */}
          <div className="pointer-events-none absolute inset-0 brand-field opacity-60" />

          {/* Top Bar with Brand & Skip Option */}
          <div className="relative z-10 flex w-full max-w-5xl items-center justify-between px-6 py-6 sm:px-10">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-2 text-accent"
            >
              <Logo className="h-6 w-6" />
              <span className="font-display text-lg font-bold tracking-tight text-text">
                PulseChain
              </span>
            </motion.div>

            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              onClick={handleDismiss}
              className="rounded-full border border-border bg-surface-raised/80 px-3.5 py-1 text-xs font-medium text-text-muted backdrop-blur-sm transition-colors hover:border-accent/40 hover:text-accent focus:outline-none"
            >
              Skip
            </motion.button>
          </div>

          {/* Centered Animation Stage */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
            <div className="relative flex h-52 w-52 items-center justify-center">
              {/* Impact Surface Glow */}
              <motion.div
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{
                  opacity: [0, 0, 0.45, 0.25],
                  scale: [0.3, 0.3, 1.4, 1.7],
                }}
                transition={{
                  duration: 1.8,
                  times: [0, 0.42, 0.5, 0.9],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute h-24 w-24 rounded-full bg-accent/25 blur-xl"
              />

              {/* Ripple Ring 1 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.1 }}
                animate={{
                  opacity: [0, 0, 0.8, 0],
                  scale: [0.1, 0.1, 1.3, 2.6],
                }}
                transition={{
                  duration: 1.3,
                  times: [0, 0.45, 0.58, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute h-16 w-16 rounded-full border border-accent/70"
              />

              {/* Ripple Ring 2 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.1 }}
                animate={{
                  opacity: [0, 0, 0.6, 0],
                  scale: [0.1, 0.1, 1.1, 3.4],
                }}
                transition={{
                  duration: 1.4,
                  times: [0, 0.5, 0.65, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute h-16 w-16 rounded-full border border-accent/45"
              />

              {/* Ripple Ring 3 (Delicate outer ripple) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.1 }}
                animate={{
                  opacity: [0, 0, 0.4, 0],
                  scale: [0.1, 0.1, 0.9, 4.2],
                }}
                transition={{
                  duration: 1.5,
                  times: [0, 0.55, 0.72, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute h-16 w-16 rounded-full border border-accent/25"
              />

              {/* Splash Micro-Particles */}
              {PARTICLES.map((p) => (
                <motion.span
                  key={p.id}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 0.85, 0],
                    x: [0, p.x],
                    y: [0, p.y],
                    scale: [0, 1.2, 0.4],
                  }}
                  transition={{
                    duration: 0.45,
                    delay: p.delay,
                    ease: "easeOut",
                  }}
                  className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-accent"
                />
              ))}

              {/* Falling & Impacting Blood Drop SVG */}
              <motion.div
                initial={{
                  y: -95,
                  scaleY: 1.3,
                  scaleX: 0.8,
                  opacity: 0,
                }}
                animate={{
                  y: [-95, -95, 0, 0, 0],
                  opacity: [0, 1, 1, 1, 0.9],
                  scaleY: [1.3, 1.3, 0.45, 1.1, 1],
                  scaleX: [0.8, 0.8, 1.55, 0.95, 1],
                }}
                transition={{
                  duration: 1.25,
                  times: [0, 0.15, 0.45, 0.58, 0.75],
                  ease: [0.45, 0, 0.7, 1],
                }}
                className="relative z-20 flex items-center justify-center text-accent drop-shadow-sm"
              >
                <svg
                  width="38"
                  height="46"
                  viewBox="0 0 38 46"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-[0_4px_12px_rgba(187,43,41,0.28)]"
                >
                  {/* Outer droplet shape */}
                  <path
                    d="M19 1.5C19 1.5 35 20.8 35 30.5C35 38.5 27.8 45 19 45C10.2 45 3 38.5 3 30.5C3 20.8 19 1.5 19 1.5Z"
                    fill="hsl(var(--accent))"
                  />
                  {/* Subtle glossy glass highlight on droplet top-left */}
                  <path
                    d="M13 14C11 18 9 24 10 29C10.5 31.5 12 33 13 33"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.45"
                  />
                </svg>
              </motion.div>
            </div>

            {/* Understated Caption */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.95 }}
              className="mt-3 text-center"
            >
              <p className="font-display text-base font-medium tracking-wide text-text sm:text-lg">
                Every drop counts.
              </p>
              <p className="mt-1 text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                Coimbatore corridor network
              </p>
            </motion.div>
          </div>

          {/* Bottom subtle baseline */}
          <div className="relative z-10 pb-8 text-center">
            <span className="h-1 w-12 rounded-full bg-border inline-block" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
