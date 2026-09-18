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
  sm: { box: "h-12 w-12 rounded-xl", group: "text-base", caption: "text-[9px]" },
  md: { box: "h-16 w-16 rounded-2xl", group: "text-xl", caption: "text-[10px]" },
  lg: { box: "h-20 w-20 rounded-2xl", group: "text-2xl", caption: "text-2xs" },
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
        "flex flex-col items-center justify-center flex-shrink-0 border border-border bg-surface-raised shadow-card",
        s.box,
        className,
      ].join(" ")}
    >
      <span className={["font-display font-black leading-none text-accent", s.group].join(" ")}>
        {bloodGroup}
      </span>
      {token && (
        <span
          className={[
            "mt-1 font-semibold uppercase tracking-wider leading-none",
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
