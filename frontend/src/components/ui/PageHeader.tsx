import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUpVariants } from "../../lib/motionTokens";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Small uppercase line above the title — the section this page belongs to. */
  eyebrow?: string;
  actions?: ReactNode;
  hero?: ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, actions, hero }: PageHeaderProps) {
  return (
    <motion.header
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      className="mb-6 border-b border-border/70 pb-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-2xs font-semibold uppercase tracking-widest text-text-subtle">
              {eyebrow}
            </p>
          )}
          <h1 className="text-xl sm:text-2xl font-bold leading-tight text-text tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {hero && <div className="mt-4">{hero}</div>}
    </motion.header>
  );
}
