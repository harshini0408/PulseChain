import React from "react";
import { motion } from "framer-motion";
import { pageTransitionVariants } from "../../lib/motionTokens";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = "",
}) => {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`w-full flex-1 ${className}`}
    >
      {children}
    </motion.div>
  );
};
