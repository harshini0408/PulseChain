/**
 * frontend/src/components/ui/EmptyState.tsx
 *
 * Designed empty state for the offer inbox and other queues.
 * Calm, intentional aesthetic intended for the first frame of the demo video.
 */

import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  message?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No offers right now",
  description,
  message,
  icon,
}) => {
  const text =
    description ??
    message ??
    "Your facility's inbox is clear. Nearby near-expiry units will appear here in real time when regional sweeps trigger.";

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/40 backdrop-blur-sm my-6">
      <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
        {icon ?? <Inbox className="w-7 h-7 stroke-[1.5]" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
        {text}
      </p>
    </div>
  );
};
