/**
 * backend/src/workers/sweep.ts
 *
 * Expiry sweep worker:
 * Queries GSI1 QUEUE#AVAILABLE#<component> with SK <= now + threshold(component).
 * For each hit:
 * 1. Transitions AVAILABLE → RESCUE_PENDING (audit THRESHOLD_CROSSED)
 * 2. Creates escalation item (ESC#<escId>, currentRing: 1, status: RUNNING, GSI1 ESC#ACTIVE)
 * 3. Invokes match-ring for ring 1 and create-offers
 *
 * Fully idempotent via condition expressions; handles pagination across the queue.
 */

import { randomUUID } from "crypto";
import {
  COMPONENTS,
  getConfig,
  addHours,
  isoNow,
  escalationKey,
  activeEscalationGsi1,
  type Component,
  type BloodUnit,
  type Escalation,
} from "@pulsechain/shared";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { queryAll, putItem } from "../lib/db.js";
import { transitionAvailableToRescuePending } from "../lib/transitions.js";
import { matchRing } from "./match-ring.js";
import { createOffers, type CreateOffersResult } from "./create-offers.js";

export interface SweptUnitSummary {
  unitId: string;
  component: Component;
  bloodGroup: string;
  expiresAt: string;
  escalationId: string;
  offersResult: CreateOffersResult;
}

export interface SweepResult {
  timestamp: string;
  sweptCount: number;
  units: SweptUnitSummary[];
}

export async function runSweep(nowStr?: string): Promise<SweepResult> {
  const ts = nowStr ?? isoNow();
  const cfg = getConfig();
  const sweptUnits: SweptUnitSummary[] = [];

  for (const component of COMPONENTS) {
    const thresholdHours = cfg.thresholdHours[component];
    const cutoff = addHours(ts, thresholdHours);

    // Query in pages using queryAll
    const queueHits = await queryAll<BloodUnit & { GSI1PK: string; GSI1SK: string }>({
      indexName: "GSI1",
      keyCondition: "GSI1PK = :pk AND GSI1SK <= :cutoff",
      values: {
        ":pk": `QUEUE#AVAILABLE#${component}`,
        ":cutoff": cutoff,
      },
    });

    for (const unit of queueHits) {
      const escId = `ESC_${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

      try {
        // 1. Transition AVAILABLE → RESCUE_PENDING
        await transitionAvailableToRescuePending({
          unitId: unit.unitId,
          component: unit.component,
          expiresAt: unit.expiresAt,
          escalationId: escId,
          timestamp: ts,
        });
      } catch (err: any) {
        // If condition check failed, unit was already swept or claimed — skip idempotently
        if (
          err.name === "TransactionCanceledException" ||
          err.message?.includes("ConditionalCheckFailed")
        ) {
          continue;
        }
        throw err;
      }

      // 2. Start Step Functions execution and create escalation item
      let executionArn = "direct-invoke";
      if (process.env.UNIT_ESCALATION_STATE_MACHINE_ARN) {
        try {
          const sfn = new SFNClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
          const sfnRes = await sfn.send(
            new StartExecutionCommand({
              stateMachineArn: process.env.UNIT_ESCALATION_STATE_MACHINE_ARN,
              name: `Esc-${unit.unitId}-${escId}`.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80),
              input: JSON.stringify({
                unitId: unit.unitId,
                escalationId: escId,
                currentRing: 1,
                offerWindow: cfg.offerWindowSeconds,
                now: ts,
              }),
            }),
          );
          executionArn = sfnRes.executionArn ?? "direct-invoke";
        } catch (sfnErr: any) {
          console.warn(`[sweep] Step Functions start failed: ${sfnErr.message}`);
        }
      }

      const escKeys = escalationKey("UNIT", unit.unitId, escId);
      const escGsi1 = activeEscalationGsi1(ts);

      const escalationItem: Escalation & Record<string, unknown> = {
        ...escKeys,
        ...escGsi1,
        entityType: "ESCALATION",
        escalationId: escId,
        subjectType: "UNIT",
        subjectId: unit.unitId,
        currentRing: 1,
        status: "RUNNING",
        startedAt: ts,
        executionArn,
      };

      await putItem(escalationItem);

      // 3. Match ring 1
      const matchRes = await matchRing({
        unitId: unit.unitId,
        ring: 1,
        now: ts,
      });

      // 4. Create offers
      const offersResult = await createOffers({
        unitId: unit.unitId,
        escalationId: escId,
        ring: 1,
        candidates: matchRes.candidates,
        now: ts,
      });

      sweptUnits.push({
        unitId: unit.unitId,
        component: unit.component,
        bloodGroup: unit.bloodGroup,
        expiresAt: unit.expiresAt,
        escalationId: escId,
        offersResult,
      });
    }
  }

  return {
    timestamp: ts,
    sweptCount: sweptUnits.length,
    units: sweptUnits,
  };
}

export async function handler(event?: any) {
  return await runSweep();
}
