import { type ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-overlay text-text-muted">
        {icon}
      </div>
      <h3 className="mb-1 text-base font-semibold text-text">{title}</h3>
      <p className="max-w-sm text-sm text-text-muted leading-relaxed">{message}</p>
      {action && (
        <div className="mt-6">
          <Button variant="secondary" size="md" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
