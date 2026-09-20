/**
 * The blood-group token from the donor-app reference screens: the group set
 * large in the display serif over a small component caption. On an offer card
 * this is the dominant element — it is the first thing a clinician needs.
 */

import type { BloodGroup, Component } from "@pulsechain/shared";
import { componentToken } from "../../lib/status";

interface BloodGroupTokenProps {
  bloodGroup: BloodGroup | string;
  component?: Component | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: {
    box: "min-w-[3.75rem] h-auto min-h-[3.25rem] px-2 py-1.5 rounded-xl gap-0.5",
    group: "text-sm font-black leading-tight",
    caption: "text-[8px] font-bold tracking-wider leading-none text-center max-w-full px-0.5 truncate",
  },
  md: {
    box: "min-w-[4.5rem] h-auto min-h-[4rem] px-2.5 py-2 rounded-2xl gap-1",
    group: "text-lg font-black leading-tight",
    caption: "text-[9px] font-bold tracking-wider leading-none text-center max-w-full px-0.5 truncate",
  },
  lg: {
    box: "min-w-[5.5rem] h-auto min-h-[5rem] px-3 py-2.5 rounded-2xl gap-1",
    group: "text-2xl font-black leading-tight",
    caption: "text-2xs font-bold tracking-wider leading-none text-center max-w-full px-0.5 truncate",
  },
} as const;

export function BloodGroupToken({
  bloodGroup,
  component,
  size = "md",
  className = "",
}: BloodGroupTokenProps) {
  const s = sizeClasses[size];
  const token = component ? componentToken(component) : undefined;

  return (
    <div
      className={[
        "flex flex-col items-center justify-center flex-shrink-0 border border-border bg-surface-raised shadow-card overflow-hidden",
        s.box,
        className,
      ].join(" ")}
    >
      <span className={["font-display text-accent", s.group].join(" ")}>
        {bloodGroup}
      </span>
      {token && (
        <span
          className={[
            "font-semibold uppercase leading-none",
            s.caption,
            token.text,
          ].join(" ")}
        >
          {token.label}
        </span>
      )}
    </div>
  );
}
