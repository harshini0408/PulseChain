/**
 * frontend/src/lib/status.ts
 *
 * The single mapping from every enum value to its human label and its token
 * classes. No component anywhere may hardcode a status label or a status
 * colour — if a new state appears, it is added here and every surface picks
 * it up at once.
 *
 * Class strings are written out in full rather than composed at runtime,
 * because Tailwind only sees literal strings when it scans this file.
 */

import {
  getConfig,
  type CompatibilityLevel,
  type Component,
  type EscalationStatus,
  type OfferStatus,
  type RequisitionStatus,
  type UnitStatus,
  type Urgency,
} from "@pulsechain/shared";

export interface StatusToken {
  /** Sentence-case label shown to an operator. */
  label: string;
  /** Background + foreground, for a pill. */
  pill: string;
  /** Foreground only, for text and icons. */
  text: string;
  /** Background only, for dots, bars and left edges. */
  dot: string;
}

// ---------------------------------------------------------------------------
// Unit statuses
//
// The four instruments the console plays: green means nothing to do, crimson
// means act now, violet means spoken for, amber means moving. LOST is solid
// oxblood — terminal, and never confusable with the bright rescue crimson.
// ---------------------------------------------------------------------------

export const UNIT_STATUS: Record<UnitStatus, StatusToken> = {
  AVAILABLE: {
    label: "Available",
    pill: "bg-status-received-bg text-status-received",
    text: "text-status-received",
    dot: "bg-status-received",
  },
  RESCUE_PENDING: {
    label: "Rescue pending",
    pill: "bg-platelet-bg text-platelet",
    text: "text-platelet",
    dot: "bg-platelet",
  },
  CLAIMED: {
    label: "Claimed",
    pill: "bg-status-claimed-bg text-status-claimed",
    text: "text-status-claimed",
    dot: "bg-status-claimed",
  },
  IN_TRANSIT: {
    label: "In transit",
    pill: "bg-status-in-transit-bg text-status-in-transit",
    text: "text-status-in-transit",
    dot: "bg-status-in-transit",
  },
  RECEIVED: {
    label: "Received",
    pill: "bg-status-received-bg text-status-received",
    text: "text-status-received",
    dot: "bg-status-received",
  },
  RESERVED: {
    label: "Reserved",
    pill: "bg-status-claimed-bg text-status-claimed",
    text: "text-status-claimed",
    dot: "bg-status-claimed",
  },
  LOST: {
    label: "Lost",
    pill: "bg-brand-oxblood text-text-inverse",
    text: "text-brand-oxblood",
    dot: "bg-brand-oxblood",
  },
};

// ---------------------------------------------------------------------------
// Offer statuses
// ---------------------------------------------------------------------------

export const OFFER_STATUS: Record<OfferStatus, StatusToken> = {
  OPEN: {
    label: "Open",
    pill: "bg-status-open-bg text-status-open",
    text: "text-status-open",
    dot: "bg-status-open",
  },
  CLAIMED: {
    label: "Claimed",
    pill: "bg-status-claimed-bg text-status-claimed",
    text: "text-status-claimed",
    dot: "bg-status-claimed",
  },
  DECLINED: {
    label: "Declined",
    pill: "bg-status-expired-bg text-status-expired",
    text: "text-status-expired",
    dot: "bg-status-expired",
  },
  EXPIRED: {
    label: "Expired",
    pill: "bg-status-expired-bg text-status-expired",
    text: "text-status-expired",
    dot: "bg-status-expired",
  },
  SUPERSEDED: {
    label: "Superseded",
    pill: "bg-surface-overlay text-text-subtle",
    text: "text-text-subtle",
    dot: "bg-text-subtle",
  },
};

// ---------------------------------------------------------------------------
// Requisition statuses
//
// DONOR_TIER is styled distinctly on purpose: it is the moment the network
// gives up on stock and starts calling people.
// ---------------------------------------------------------------------------

export const REQUISITION_STATUS: Record<RequisitionStatus, StatusToken> = {
  OPEN: {
    label: "Open",
    pill: "bg-status-open-bg text-status-open",
    text: "text-status-open",
    dot: "bg-status-open",
  },
  SUBMITTED: {
    label: "Submitted",
    pill: "bg-status-open-bg text-status-open",
    text: "text-status-open",
    dot: "bg-status-open",
  },
  VALIDATED: {
    label: "Validated",
    pill: "bg-status-open-bg text-status-open",
    text: "text-status-open",
    dot: "bg-status-open",
  },
  SEARCHING_INVENTORY: {
    label: "Searching Inventory",
    pill: "bg-status-in-transit-bg text-status-in-transit",
    text: "text-status-in-transit",
    dot: "bg-status-in-transit",
  },
  PARTIAL: {
    label: "Partially filled",
    pill: "bg-status-in-transit-bg text-status-in-transit",
    text: "text-status-in-transit",
    dot: "bg-status-in-transit",
  },
  PARTIALLY_FULFILLED: {
    label: "Partially Fulfilled",
    pill: "bg-status-in-transit-bg text-status-in-transit",
    text: "text-status-in-transit",
    dot: "bg-status-in-transit",
  },
  FILLED: {
    label: "Filled",
    pill: "bg-status-received-bg text-status-received",
    text: "text-status-received",
    dot: "bg-status-received",
  },
  FULFILLED: {
    label: "Fulfilled",
    pill: "bg-status-received-bg text-status-received",
    text: "text-status-received",
    dot: "bg-status-received",
  },
  DONOR_TIER: {
    label: "Donor tier",
    pill: "bg-accent-soft text-accent ring-1 ring-inset ring-accent/40",
    text: "text-accent",
    dot: "bg-accent",
  },
  DONOR_ESCALATION: {
    label: "Donor Escalation",
    pill: "bg-accent-soft text-accent ring-1 ring-inset ring-accent/40",
    text: "text-accent",
    dot: "bg-accent",
  },
  DONOR_MOBILIZING: {
    label: "Donor Mobilizing",
    pill: "bg-accent-soft text-accent ring-1 ring-inset ring-accent/40",
    text: "text-accent",
    dot: "bg-accent",
  },
  EXHAUSTED: {
    label: "Exhausted",
    pill: "bg-brand-oxblood text-text-inverse",
    text: "text-brand-oxblood",
    dot: "bg-brand-oxblood",
  },
  EXPIRED: {
    label: "Expired",
    pill: "bg-status-expired-bg text-status-expired",
    text: "text-status-expired",
    dot: "bg-status-expired",
  },
  CLOSED: {
    label: "Closed",
    pill: "bg-status-expired-bg text-status-expired",
    text: "text-status-expired",
    dot: "bg-status-expired",
  },
  CANCELLED: {
    label: "Cancelled",
    pill: "bg-status-expired-bg text-status-expired",
    text: "text-status-expired",
    dot: "bg-status-expired",
  },
};

// ---------------------------------------------------------------------------
// Escalation statuses
// ---------------------------------------------------------------------------

export const ESCALATION_STATUS: Record<EscalationStatus, StatusToken> = {
  RUNNING: {
    label: "Running",
    pill: "bg-platelet-bg text-platelet",
    text: "text-platelet",
    dot: "bg-platelet",
  },
  RESOLVED: {
    label: "Resolved",
    pill: "bg-status-received-bg text-status-received",
    text: "text-status-received",
    dot: "bg-status-received",
  },
  EXHAUSTED: {
    label: "Exhausted",
    pill: "bg-brand-oxblood text-text-inverse",
    text: "text-brand-oxblood",
    dot: "bg-brand-oxblood",
  },
};

// ---------------------------------------------------------------------------
// Urgency
//
// Three values, and only three: NORMAL | HIGH | CRITICAL. There is no ROUTINE.
// ---------------------------------------------------------------------------

export const URGENCY: Record<Urgency, StatusToken> = {
  NORMAL: {
    label: "Normal",
    pill: "bg-surface-overlay text-text-muted",
    text: "text-text-muted",
    dot: "bg-text-subtle",
  },
  HIGH: {
    label: "High",
    pill: "bg-status-in-transit-bg text-status-in-transit",
    text: "text-status-in-transit",
    dot: "bg-status-in-transit",
  },
  CRITICAL: {
    label: "Critical",
    pill: "bg-platelet-bg text-platelet",
    text: "text-platelet",
    dot: "bg-platelet",
  },
};

// ---------------------------------------------------------------------------
// Components and their clocks
// ---------------------------------------------------------------------------

export const COMPONENT: Record<Component, StatusToken> = {
  PLATELETS: {
    label: "Platelets",
    pill: "bg-platelet-bg text-platelet",
    text: "text-platelet",
    dot: "bg-platelet",
  },
  RBC: {
    label: "Red cells",
    pill: "bg-rbc-bg text-rbc",
    text: "text-rbc",
    dot: "bg-rbc",
  },
  PLASMA: {
    label: "Plasma",
    pill: "bg-plasma-bg text-plasma",
    text: "text-plasma",
    dot: "bg-plasma",
  },
};

export interface ComponentClock extends StatusToken {
  component: Component;
  /** Hours before expiry at which this component enters its alert window. */
  thresholdHours: number;
  /** Full shelf life in days. */
  shelfLifeDays: number;
  /** "48-hour clock" / "7-day clock" — how the window reads in prose. */
  clockLabel: string;
}

/**
 * Component metadata with its thresholds read from shared/src/config.ts.
 * Never inline a threshold or a shelf life at a call site.
 */
export function componentClock(component: Component): ComponentClock {
  const cfg = getConfig();
  const thresholdHours = cfg.thresholdHours[component];
  const shelfLifeDays = cfg.shelfLifeDays[component];

  return {
    ...COMPONENT[component],
    component,
    thresholdHours,
    shelfLifeDays,
    clockLabel:
      thresholdHours % 24 === 0
        ? `${thresholdHours / 24}-day clock`
        : `${thresholdHours}-hour clock`,
  };
}

/** True when a unit has crossed into its component's alert window. */
export function isInAlertWindow(component: Component, hoursRemaining: number): boolean {
  return hoursRemaining > 0 && hoursRemaining <= getConfig().thresholdHours[component];
}

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

export const COMPATIBILITY: Record<CompatibilityLevel, StatusToken> = {
  IDENTICAL: {
    label: "Identical group",
    pill: "bg-status-received-bg text-status-received",
    text: "text-status-received",
    dot: "bg-status-received",
  },
  COMPATIBLE: {
    label: "Compatible",
    pill: "bg-status-received-bg text-status-received",
    text: "text-status-received",
    dot: "bg-status-received",
  },
  ACCEPTABLE: {
    label: "Acceptable",
    pill: "bg-status-in-transit-bg text-status-in-transit",
    text: "text-status-in-transit",
    dot: "bg-status-in-transit",
  },
  INCOMPATIBLE: {
    label: "Incompatible",
    pill: "bg-status-lost-bg text-status-lost",
    text: "text-status-lost",
    dot: "bg-status-lost",
  },
};

// ---------------------------------------------------------------------------
// Escalation rings
// ---------------------------------------------------------------------------

export interface RingToken extends StatusToken {
  /** CSS custom property name, for SVG fills and strokes on the map. */
  cssVar: string;
}

export const RING: Record<number, RingToken> = {
  1: {
    label: "Ring 1",
    pill: "bg-platelet-bg text-platelet",
    text: "text-platelet",
    dot: "bg-ring-1",
    cssVar: "--ring-1",
  },
  2: {
    label: "Ring 2",
    pill: "bg-rbc-bg text-rbc",
    text: "text-rbc",
    dot: "bg-ring-2",
    cssVar: "--ring-2",
  },
  3: {
    label: "Ring 3",
    pill: "bg-status-claimed-bg text-status-claimed",
    text: "text-status-claimed",
    dot: "bg-ring-3",
    cssVar: "--ring-3",
  },
};

/** "0–10 km" — the ring's band, read from shared config. */
export function ringRangeLabel(ring: number): string {
  const band = getConfig().rings.find((r) => r.ring === ring);
  if (!band) return "—";
  return band.maxKm >= 999 ? `${band.minKm} km and beyond` : `${band.minKm}–${band.maxKm} km`;
}

export function ringToken(ring: number): RingToken {
  return RING[ring] ?? RING[3];
}

// ---------------------------------------------------------------------------
// Fallback, for a value that somehow arrives outside its enum
// ---------------------------------------------------------------------------

export const UNKNOWN_STATUS: StatusToken = {
  label: "Unknown",
  pill: "bg-surface-overlay text-text-muted",
  text: "text-text-muted",
  dot: "bg-text-subtle",
};

export function unitStatusToken(status: string): StatusToken {
  return UNIT_STATUS[status as UnitStatus] ?? { ...UNKNOWN_STATUS, label: status };
}

export function offerStatusToken(status: string): StatusToken {
  return OFFER_STATUS[status as OfferStatus] ?? { ...UNKNOWN_STATUS, label: status };
}

export function requisitionStatusToken(status: string): StatusToken {
  return REQUISITION_STATUS[status as RequisitionStatus] ?? { ...UNKNOWN_STATUS, label: status };
}

export function escalationStatusToken(status: string): StatusToken {
  return ESCALATION_STATUS[status as EscalationStatus] ?? { ...UNKNOWN_STATUS, label: status };
}

export function urgencyToken(urgency: string): StatusToken {
  return URGENCY[urgency as Urgency] ?? { ...UNKNOWN_STATUS, label: urgency };
}

export function componentToken(component: string): StatusToken {
  return COMPONENT[component as Component] ?? { ...UNKNOWN_STATUS, label: component };
}

export function compatibilityToken(level: string): StatusToken {
  return COMPATIBILITY[level as CompatibilityLevel] ?? { ...UNKNOWN_STATUS, label: level };
}

// ---------------------------------------------------------------------------
// Expiry tone
//
// The alert threshold itself is policy and lives in shared/src/config.ts. The
// narrower "critical" step below is presentation only: the point at which the
// console stops being informative and starts being urgent. It is not a
// business rule, and no backend decision is taken on it.
// ---------------------------------------------------------------------------

export const CRITICAL_DISPLAY_HOURS = 6;

export type ExpiryLevel = "neutral" | "alert" | "critical" | "expired";

export interface ExpiryTone {
  level: ExpiryLevel;
  /** Foreground class for the countdown text. */
  text: string;
  /** Background class for a left edge or bar. */
  dot: string;
}

/**
 * Colour steps for a countdown: neutral outside the component's threshold,
 * the component's own clock colour once inside it, crimson under the critical
 * step, and the lost treatment once it has gone.
 */
export function expiryTone(component: Component, hoursRemaining: number): ExpiryTone {
  if (hoursRemaining <= 0) {
    return { level: "expired", text: UNIT_STATUS.LOST.text, dot: UNIT_STATUS.LOST.dot };
  }

  if (hoursRemaining <= CRITICAL_DISPLAY_HOURS) {
    return { level: "critical", text: "text-accent", dot: "bg-accent" };
  }

  if (isInAlertWindow(component, hoursRemaining)) {
    const token = COMPONENT[component];
    return { level: "alert", text: token.text, dot: token.dot };
  }

  return { level: "neutral", text: "text-text", dot: "bg-border-strong" };
}
