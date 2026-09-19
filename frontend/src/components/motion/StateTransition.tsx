import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stateTransitionVariants } from "../../lib/motionTokens";

interface StateTransitionProps {
  children: React.ReactNode;
  stateKey: string | number;
  className?: string;
}

export const StateTransition: React.FC<StateTransitionProps> = ({
  children,
  stateKey,
  className = "",
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stateKey}
        variants={stateTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
