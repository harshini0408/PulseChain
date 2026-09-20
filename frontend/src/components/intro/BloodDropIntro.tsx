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
  { id: 1, x: -30, y: -18, delay: 0.28 },
  { id: 2, x: 32, y: -20, delay: 0.28 },
  { id: 3, x: -20, y: -26, delay: 0.3 },
  { id: 4, x: 20, y: -24, delay: 0.3 },
  { id: 5, x: -9, y: -32, delay: 0.32 },
  { id: 6, x: 12, y: -30, delay: 0.32 },
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

    // Auto-advance timeline: snappy ~1.1s pacing
    const timer = window.setTimeout(() => {
      handleDismiss();
    }, 1100);

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
            y: -24,
            transition: { duration: 0.35, ease: [0.2, 0, 0, 1] },
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-surface select-none"
        >
          {/* Subtle background ambient gradient and faint NetworkOrb */}
          <div className="pointer-events-none absolute inset-0 brand-field opacity-70" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <NetworkOrb size={640} subtle className="opacity-15" />
          </div>

          {/* Top Bar with Brand only — Skip button removed */}
          <div className="relative z-10 flex w-full max-w-5xl items-center justify-start px-6 py-6 sm:px-10">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
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
            <div className="relative flex h-52 w-52 items-center justify-center">
              {/* Radial red light bloom from impact point */}
              <motion.div
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{
                  opacity: [0, 0, 0.6, 0.15, 0],
                  scale: [0.2, 0.2, 1.6, 2.2, 2.6],
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.15,
                  times: [0, 0.2, 0.45, 0.7, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute h-32 w-32 rounded-full bg-accent/30 blur-2xl"
              />

              {/* Pseudo-3D ground shadow */}
              <motion.div
                initial={{ opacity: 0.1, scaleX: 0.3, scaleY: 0.2 }}
                animate={{
                  opacity: [0.1, 0.3, 0.8, 0.3],
                  scaleX: [0.3, 0.6, 1.5, 1.1],
                  scaleY: [0.2, 0.3, 0.6, 0.4],
                }}
                transition={{
                  duration: 0.5,
                  times: [0, 0.3, 0.6, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute bottom-12 h-4 w-16 rounded-full bg-brand-oxblood/20 blur-sm"
              />

              {/* Ripple Ring 1 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.1 }}
                animate={{
                  opacity: [0, 0.85, 0],
                  scale: [0.1, 1.4, 2.6],
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.28,
                  times: [0, 0.35, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute h-16 w-16 rounded-full border border-accent/75"
              />

              {/* Ripple Ring 2 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.1 }}
                animate={{
                  opacity: [0, 0.6, 0],
                  scale: [0.1, 1.2, 3.2],
                }}
                transition={{
                  duration: 0.55,
                  delay: 0.32,
                  times: [0, 0.35, 1],
                  ease: "easeOut",
                }}
                className="pointer-events-none absolute h-16 w-16 rounded-full border border-accent/45"
              />

              {/* Splash Micro-Particles */}
              {PARTICLES.map((p) => (
                <motion.span
                  key={p.id}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 0.9, 0],
                    x: [0, p.x],
                    y: [0, p.y],
                    scale: [0, 1.2, 0.4],
                  }}
                  transition={{
                    duration: 0.35,
                    delay: p.delay,
                    ease: "easeOut",
                  }}
                  className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-accent"
                />
              ))}

              {/* Falling & Impacting Blood Drop SVG */}
              <motion.div
                initial={{
                  y: -90,
                  scaleY: 1.3,
                  scaleX: 0.8,
                  opacity: 0,
                }}
                animate={{
                  y: [-90, -90, 0, -6, 0],
                  opacity: [0, 1, 1, 1, 0.95],
                  scaleY: [1.3, 1.3, 0.5, 1.1, 1],
                  scaleX: [0.8, 0.8, 1.5, 0.92, 1],
                }}
                transition={{
                  duration: 0.5,
                  times: [0, 0.1, 0.55, 0.75, 1],
                  ease: [0.45, 0, 0.7, 1],
                }}
                className="relative z-20 flex items-center justify-center text-accent drop-shadow-md"
              >
                <svg
                  width="40"
                  height="48"
                  viewBox="0 0 38 46"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-[0_6px_16px_rgba(187,43,41,0.32)]"
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
                    opacity="0.5"
                  />
                </svg>
              </motion.div>
            </div>

            {/* PulseLine emerging horizontally after drop impact */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.45, delay: 0.32, ease: [0.2, 0, 0, 1] }}
              className="w-64 max-w-xs -mt-5 mb-3"
            >
              <PulseLine height={20} color="hsl(var(--accent))" />
            </motion.div>

            {/* Understated Caption */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.36 }}
              className="text-center"
            >
              <p className="font-display text-lg font-bold tracking-tight text-text sm:text-xl">
                Every drop counts.
              </p>
              <p className="mt-0.5 text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                Coimbatore corridor network
              </p>
            </motion.div>
          </div>

          {/* Bottom subtle baseline */}
          <div className="relative z-10 pb-6 text-center">
            <span className="h-1 w-12 rounded-full bg-border inline-block" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
