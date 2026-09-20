import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUpVariants } from "../../lib/motionTokens";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  hero?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, hero }: PageHeaderProps) {
  return (
    <motion.header
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      className="mb-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold leading-tight text-text tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {hero && <div className="mt-3">{hero}</div>}
    </motion.header>
  );
}
