/**
 * frontend/src/components/ui/ErrorState.tsx
 *
 * User-facing error message with retry action.
 */

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  onRetry,
}) => {
  return (
    <div className="p-6 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 my-6">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg text-red-600 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="text-base font-semibold text-red-900 dark:text-red-200">
            {title}
          </h4>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1 leading-relaxed">
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-200 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
