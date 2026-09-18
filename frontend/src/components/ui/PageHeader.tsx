import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Small uppercase line above the title — the section this page belongs to. */
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-2xs font-semibold uppercase tracking-widest text-text-subtle">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-bold leading-tight text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
