interface StatTileProps {
  label: string;
  value?: string | number;
  unit?: string;
  delta?: string;
  accent?: boolean;
}

export function StatTile({ label, value = "-", unit, delta, accent = false }: StatTileProps) {
  return (
    <div className="bg-surface-raised rounded-xl border border-border p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span
          className={["text-3xl font-bold tabular-nums", accent ? "text-platelet" : "text-text"].join(" ")}
          data-numeric="true"
        >
          {value}
        </span>
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
      </div>
      {delta && (
        <p className="mt-2 text-xs text-text-muted">{delta}</p>
      )}
    </div>
  );
}
