import { Variants, Transition } from "framer-motion";

export const easings = {
  standard: [0.2, 0, 0, 1] as const,
  emphasized: [0.05, 0.7, 0.1, 1] as const,
  spring: { type: "spring", stiffness: 320, damping: 28 } as const,
  gentle: [0.25, 1, 0.5, 1] as const,
};

export const durations = {
  fast: 0.15,
  medium: 0.3,
  slow: 0.6,
  hero: 1.2,
};

export const transitions = {
  standard: {
    duration: durations.medium,
    ease: easings.standard,
  } satisfies Transition,
  emphasized: {
    duration: durations.slow,
    ease: easings.emphasized,
  } satisfies Transition,
  spring: easings.spring satisfies Transition,
  hero: {
    duration: durations.hero,
    ease: easings.emphasized,
  } satisfies Transition,
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.standard,
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: durations.fast, ease: easings.standard },
  },
};

export const fadeSlideVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.standard,
  },
  exit: {
    opacity: 0,
    x: 16,
    transition: { duration: durations.fast, ease: easings.standard },
  },
};

export const scaleRevealVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: durations.fast },
  },
};

export const stateTransitionVariants: Variants = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: transitions.standard,
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: durations.fast },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easings.standard },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: easings.standard },
  },
};
