/**
 * The backend's message is the message. A 409 "Already claimed by Kovai
 * Medical Centre" or a 403 naming the wrong facility tells an operator exactly
 * what happened; "Something went wrong" tells them nothing.
 */

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "This did not load",
  message,
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={[
        "rounded-xl border border-status-lost/25 bg-status-lost-bg p-5 sm:p-6",
        className,
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-raised text-status-lost">
          <AlertCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-bold text-text">{title}</h4>
          <p className="mt-1 break-words text-sm leading-relaxed text-text-muted">{message}</p>
          {onRetry && (
            <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
