/**
 * frontend/src/lib/escalation.ts
 *
 * Ring timing, derived rather than fetched.
 *
 * GET /escalations/active returns `startedAt` and `currentRing` but no
 * "next ring at" timestamp, and the Step Functions wait between rings is a
 * fixed value in shared/src/config.ts. Both facts together give the advance
 * time exactly, so there is no need for another endpoint and no number is
 * written down twice.
 */

import { getConfig } from "@pulsechain/shared";
import type { ActiveEscalation } from "../api/client";

/** ISO timestamp at which the current ring is due to advance. */
export function ringAdvanceAt(startedAt: string, currentRing: number): string {
  const { ringWaitSeconds } = getConfig();
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return new Date().toISOString();
  return new Date(started + currentRing * ringWaitSeconds * 1000).toISOString();
}

/** The escalation currently attached to a unit, if any. */
export function escalationForUnit(
  escalations: ActiveEscalation[] | undefined,
  unitId: string | undefined,
  activeEscalationId?: string,
): ActiveEscalation | undefined {
  if (!escalations?.length || !unitId) return undefined;
  return escalations.find(
    (e) =>
      (activeEscalationId && e.escalationId === activeEscalationId) ||
      (e.subjectType === "UNIT" && e.subjectId === unitId),
  );
}

/** Highest ring this escalation can still reach, from config. */
export function maxRing(): number {
  return getConfig().rings.reduce((max, r) => Math.max(max, r.ring), 1);
}
