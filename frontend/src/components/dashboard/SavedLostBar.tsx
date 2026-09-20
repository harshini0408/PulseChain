/**
 * The saved-to-lost ratio, as one bar.
 *
 * This is part-to-whole for a single total, so it is a ratio bar rather than a
 * pie or a two-bar chart. Segments are separated by a 2px gap in the surface
 * colour so they read as two quantities and not one smeared block, the ends
 * are rounded, and both segments are labelled directly — the percentages are
 * on the bar, not inferred from its colour.
 */

import { formatNumber } from "../../lib/format";

interface SavedLostBarProps {
  unitsSaved: number;
  unitsLost: number;
}

export function SavedLostBar({ unitsSaved, unitsLost }: SavedLostBarProps) {
  const safeSaved = unitsSaved || 0;
  const safeLost = unitsLost || 0;
  const total = safeSaved + safeLost;

  if (total === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
        No units have been resolved yet. The ratio appears once the first unit is saved or lost.
      </p>
    );
  }

  const savedPct = (safeSaved / total) * 100;
  const lostPct = 100 - savedPct;

  return (
    <div>
      <div
        className="flex h-9 w-full gap-0.5 overflow-hidden rounded-lg"
        role="img"
        aria-label={`${formatNumber(safeSaved)} units saved, ${formatNumber(safeLost)} lost, of ${formatNumber(total)} resolved`}
      >
        {safeSaved > 0 && (
          <div
            className="flex items-center justify-start rounded-l-lg bg-status-received pl-2.5 first:rounded-l-lg last:rounded-r-lg"
            style={{ width: `${savedPct}%` }}
          >
            {savedPct >= 14 && (
              <span className="text-2xs font-bold tabular-nums text-text-inverse">
                {savedPct.toFixed(0)}%
              </span>
            )}
          </div>
        )}
        {unitsLost > 0 && (
          <div
            className="flex items-center justify-end rounded-r-lg bg-status-lost pr-2.5 first:rounded-l-lg last:rounded-r-lg"
            style={{ width: `${lostPct}%` }}
          >
            {lostPct >= 14 && (
              <span className="text-2xs font-bold tabular-nums text-text-inverse">
                {lostPct.toFixed(0)}%
              </span>
            )}
          </div>
        )}
      </div>

      <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-status-received" aria-hidden="true" />
          <dt className="text-xs text-text-muted">Saved</dt>
          <dd className="text-sm font-bold tabular-nums text-text" data-numeric="true">
            {formatNumber(unitsSaved)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-status-lost" aria-hidden="true" />
          <dt className="text-xs text-text-muted">Lost</dt>
          <dd className="text-sm font-bold tabular-nums text-text" data-numeric="true">
            {formatNumber(unitsLost)}
          </dd>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <dt className="text-xs text-text-subtle">Resolved</dt>
          <dd className="text-sm font-semibold tabular-nums text-text-muted" data-numeric="true">
            {formatNumber(total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
