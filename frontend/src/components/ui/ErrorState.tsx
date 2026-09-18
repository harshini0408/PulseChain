import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-platelet-bg text-platelet">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-text">Unable to load data</h3>
      <p className="max-w-sm text-sm text-text-muted leading-relaxed">{message}</p>
      {onRetry && (
        <div className="mt-6">
          <Button variant="secondary" size="md" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
