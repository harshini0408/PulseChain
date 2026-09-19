import React, { useEffect, useState } from "react";

interface ImpactCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
  displayFont?: boolean;
}

export const ImpactCounter: React.FC<ImpactCounterProps> = ({
  value,
  prefix = "",
  suffix = "",
  durationMs = 1200,
  className = "",
  displayFont = true,
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = current;
    const diff = value - startValue;

    if (diff === 0) return;

    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(startValue + diff * ease));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, [value, durationMs]);

  return (
    <span
      className={`tabular-nums font-bold inline-flex items-baseline ${
        displayFont ? "font-display" : "font-sans"
      } ${className}`}
      data-numeric="true"
    >
      {prefix && <span className="mr-0.5 opacity-80">{prefix}</span>}
      <span>{current.toLocaleString()}</span>
      {suffix && <span className="ml-0.5 opacity-80">{suffix}</span>}
    </span>
  );
};
