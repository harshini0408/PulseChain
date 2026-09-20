import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "../../lib/motion";
import { Logo } from "../layout/Logo";
import { PulseLine } from "../motion/PulseLine";
import { NetworkOrb } from "../visualizations/NetworkOrb";

interface BloodDropIntroProps {
  onComplete?: () => void;
}

// Micro splash particles radiating outward on impact
const PARTICLES = [
  { id: 1, x: -34, y: -20, delay: 0.38 },
  { id: 2, x: 36, y: -22, delay: 0.38 },
  { id: 3, x: -22, y: -28, delay: 0.42 },
  { id: 4, x: 24, y: -26, delay: 0.42 },
  { id: 5, x: -10, y: -34, delay: 0.45 },
  { id: 6, x: 12, y: -32, delay: 0.45 },
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

    // Sequenced timeline: 1. Splash -> 2. Left-to-Right Pulse -> 3. Caption (~2.4s duration)
    const timer = window.setTimeout(() => {
      handleDismiss();
    }, 2400);

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
            opacity: 0,
            y: -20,
            transition: { duration: 0.45, ease: [0.2, 0, 0, 1] },
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-surface select-none"
        >
          {/* Subtle background ambient gradient and faint NetworkOrb */}
          <div className="pointer-events-none absolute inset-0 brand-field opacity-70" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <NetworkOrb size={720} subtle className="opacity-20" />
          </div>

          {/* Top Bar Branding */}
          <div className="relative z-10 flex w-full max-w-5xl items-center justify-start px-6 py-6 sm:px-10">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2.5 text-accent"
            >
              <Logo className="h-6 w-6" />
              <span className="font-display text-lg font-bold tracking-tight text-text">
                PulseChain
              </span>
            </motion.div>
          </div>

          {/* Centered Animation Stage */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
            <div className="relative flex h-56 w-56 items-center justify-center">
              {/* Radial red light bloom from impact point */}
              <motion.div
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{
                  opacity: [0, 0, 0.7, 0.2, 0],
                  scale: [0.2, 0.2, 1.7, 2.3, 2.7],
                }}
                transition={{
                  duration: 0.8,
                  delay: 0.22,
                  times: [0, 0.2, 0.5, 0.75, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute h-34 w-34 rounded-full bg-accent/35 blur-2xl"
              />

              {/* Pseudo-3D ground shadow */}
              <motion.div
                initial={{ opacity: 0.1, scaleX: 0.3, scaleY: 0.2 }}
                animate={{
                  opacity: [0.1, 0.3, 0.8, 0.3],
                  scaleX: [0.3, 0.6, 1.5, 1.15],
                  scaleY: [0.2, 0.3, 0.65, 0.4],
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.1,
                  times: [0, 0.3, 0.6, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute bottom-13 h-4 w-17 rounded-full bg-brand-oxblood/25 blur-sm"
              />

              {/* Ripple Ring 1 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.1 }}
                animate={{
                  opacity: [0, 0.85, 0],
                  scale: [0.1, 1.45, 2.7],
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.35,
                  times: [0, 0.4, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute h-16 w-16 rounded-full border-2 border-accent/80"
              />

              {/* Ripple Ring 2 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.1 }}
                animate={{
                  opacity: [0, 0.6, 0],
                  scale: [0.1, 1.25, 3.3],
                }}
                transition={{
                  duration: 0.75,
                  delay: 0.4,
                  times: [0, 0.4, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute h-16 w-16 rounded-full border border-accent/50"
              />

              {/* Splash Micro-Particles */}
              {PARTICLES.map((p) => (
                <motion.span
                  key={p.id}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 0.95, 0],
                    x: [0, p.x],
                    y: [0, p.y],
                    scale: [0, 1.25, 0.4],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: p.delay,
                    ease: "easeOut",
                  }}
                  className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-accent"
                />
              ))}

              {/* Falling & Impacting Blood Drop SVG */}
              <motion.div
                initial={{
                  y: -100,
                  scaleY: 1.3,
                  scaleX: 0.8,
                  opacity: 0,
                }}
                animate={{
                  y: [-100, -100, 0, -7, 0],
                  opacity: [0, 1, 1, 1, 1],
                  scaleY: [1.3, 1.3, 0.55, 1.1, 1],
                  scaleX: [0.8, 0.8, 1.45, 0.92, 1],
                }}
                transition={{
                  duration: 0.65,
                  times: [0, 0.12, 0.6, 0.8, 1],
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="relative z-20 flex items-center justify-center text-accent drop-shadow-lg"
              >
                <svg
                  width="44"
                  height="52"
                  viewBox="0 0 38 46"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-[0_8px_20px_rgba(187,43,41,0.38)]"
                >
                  <path
                    d="M19 1.5C19 1.5 35 20.8 35 30.5C35 38.5 27.8 45 19 45C10.2 45 3 38.5 3 30.5C3 20.8 19 1.5 19 1.5Z"
                    fill="hsl(var(--accent))"
                  />
                  <path
                    d="M13 14C11 18 9 24 10 29C10.5 31.5 12 33 13 33"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                </svg>
              </motion.div>
            </div>

            {/* PulseLine loads from left to right AFTER blood splatter finishes */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              style={{ transformOrigin: "left center" }}
              transition={{ duration: 0.65, delay: 0.9, ease: [0.25, 1, 0.5, 1] }}
              className="w-68 max-w-xs -mt-4 mb-3.5 origin-left"
            >
              <PulseLine height={20} color="hsl(var(--accent))" />
            </motion.div>

            {/* Understated Caption loads after pulse line */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 1.25 }}
              className="text-center"
            >
              <p className="font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
                Every drop counts.
              </p>
              <p className="mt-1 text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                Coimbatore corridor network
              </p>
            </motion.div>
          </div>

          {/* Bottom subtle baseline */}
          <div className="relative z-10 pb-6 text-center">
            <span className="h-1.5 w-14 rounded-full bg-border/80 inline-block" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
