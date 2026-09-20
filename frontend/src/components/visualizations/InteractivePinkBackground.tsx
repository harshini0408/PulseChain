import React, { useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { NetworkOrb } from "./NetworkOrb";

interface InteractivePinkBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const InteractivePinkBackground: React.FC<InteractivePinkBackgroundProps> = ({
  children,
  className = "",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for high-precision cursor tracking
  const smoothX = useSpring(mouseX, { stiffness: 250, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 250, damping: 30 });

  // Small-area white hover spotlight gradient right under cursor
  const whiteCursorSpotlight = useTransform(
    [smoothX, smoothY],
    ([x, y]) =>
      `radial-gradient(160px circle at ${x}px ${y}px, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.35) 40%, transparent 80%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
    if (!isHovered) setIsHovered(true);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`brand-field relative min-h-screen w-full overflow-hidden ${className}`}
    >
      {/* 1. Original ambient Network Orb background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
        <NetworkOrb size={800} subtle />
      </div>

      {/* 2. Small-area White Hover Effect layer */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-200"
        style={{
          background: whiteCursorSpotlight,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* 3. Page Content */}
      <div className="relative z-10 min-h-screen w-full flex flex-col justify-between">{children}</div>
    </div>
  );
};
