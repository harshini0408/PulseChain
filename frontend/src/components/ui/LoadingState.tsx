/**
 * Loading states are skeletons shaped like the content they stand in for, so
 * the layout does not jump when real data lands. A centred spinner tells the
 * user nothing about what is coming.
 */

import { PulseLine } from "../motion/PulseLine";

type Variant = "table" | "cards" | "stats" | "list" | "map" | "detail";

interface LoadingStateProps {
  variant?: Variant;
  rows?: number;
  label?: string;
}

function Line({ className = "" }: { className?: string }) {
  return <div className={["skeleton h-3", className].join(" ")} />;
}

export function LoadingState({ variant = "list", rows = 5, label }: LoadingStateProps) {
  const count = Math.max(1, rows);

  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-4">
      <div className="flex items-center justify-between gap-4 px-1 py-1">
        <span className="text-xs font-semibold text-text-subtle">
          {label ?? "Synchronizing corridor data…"}
        </span>
        <div className="w-32 opacity-40">
          <PulseLine height={16} color="hsl(var(--accent))" />
        </div>
      </div>

      {variant === "table" && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
          <div className="border-b border-border bg-surface-sunken px-4 py-3">
            <Line className="w-40" />
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0">
              <Line className="w-28 flex-shrink-0" />
              <Line className="w-20 flex-shrink-0" />
              <Line className="w-12 flex-shrink-0" />
              <Line className="w-24 flex-shrink-0" />
              <Line className="ml-auto w-20 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {variant === "cards" && (
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-raised p-5">
              <div className="flex items-start gap-4">
                <div className="skeleton h-16 w-16 flex-shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-2.5">
                  <Line className="w-2/5" />
                  <Line className="w-3/5" />
                  <Line className="w-1/4" />
                </div>
                <div className="skeleton h-14 w-14 flex-shrink-0 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "stats" && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border bg-surface-raised p-5">
              <div className="skeleton h-8 w-8 rounded-lg" />
              <Line className="w-2/3" />
              <div className="skeleton h-7 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {variant === "list" && (
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-4"
            >
              <div className="skeleton h-9 w-9 flex-shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Line className="w-1/3" />
                <Line className="w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "map" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="skeleton aspect-square w-full rounded-xl" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border bg-surface-raised p-4">
                <Line className="w-1/2" />
                <Line className="w-2/3" />
              </div>
            ))}
          </div>
        </div>
      )}

      {variant === "detail" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-raised p-5">
            <div className="skeleton h-20 w-20 flex-shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2.5">
              <Line className="w-1/3" />
              <Line className="w-1/2" />
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-surface-raised p-5">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton h-8 w-8 flex-shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Line className="w-1/4" />
                  <Line className="w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
