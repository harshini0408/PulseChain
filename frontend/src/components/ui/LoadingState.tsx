/**
 * frontend/src/components/ui/LoadingState.tsx
 *
 * Polished loading state with animated skeleton rows.
 */

import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingState: React.FC<{ message?: string }> = ({
  message = "Loading live data from PulseChain...",
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center my-6 space-y-4">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
        {message}
      </p>
    </div>
  );
};
