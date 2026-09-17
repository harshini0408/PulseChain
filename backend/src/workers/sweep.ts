import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import {
  activeEscalationGsi1,
  escalationKey,
  getConfig,
  isoNow,
  queuePartition,
  type BloodUnit,
  type Component,
  type Escalation,
  type WithKeys,
} from "@pulsechain/shared";
import { putItem, queryAll } from "../lib/db.js";
import { transitionUnit } from "../lib/transitions.js";
import { writeAuditEvent } from "../lib/audit.js";
import { handler as lostCheckHandler } from "./lost-check.js";

const sfnClient = new SFNClient({});

export interface SweepOutput {
  scannedAt: string;
  rescueInitiated: string[];
  unitsLost: string[];
}

export async function handler(): Promise<SweepOutput> {
  const config = getConfig();
  const now = isoNow();
  const nowDate = new Date();
  const components: Component[] = ["PLATELETS", "RBC", "PLASMA"];

  const rescueInitiated: string[] = [];
  const unitsLost: string[] = [];

  for (const component of components) {
    const thresholdHours = config.thresholdHours[component];
    const cutoffDate = new Date(nowDate.getTime() + thresholdHours * 3600 * 1000);
    const cutoffIso = cutoffDate.toISOString();

    // 1. Find AVAILABLE units that have crossed threshold
    const availablePartition = queuePartition("AVAILABLE", component);
    const nearExpiryItems = await queryAll<BloodUnit & Record<string, any>>({
      indexName: "GSI1",
      keyCondition: "GSI1PK = :pk AND GSI1SK <= :cutoff",
      values: {
        ":pk": availablePartition,
        ":cutoff": cutoffIso,
      },
    });

    for (const item of nearExpiryItems) {
      const unitId = item.unitId;
      try {
        const escalationId = `ESC-${unitId}-${Date.now().toString(36).toUpperCase()}`;

        // Atomically transition unit to RESCUE_PENDING
        await transitionUnit(unitId, "AVAILABLE", "RESCUE_PENDING", {
          activeEscalationId: escalationId,
          note: `Auto-rescue triggered: ${thresholdHours}h threshold crossed`,
        });

        // Write Escalation item
        const escKeys = escalationKey("UNIT", unitId, escalationId);
        const escGsi1 = activeEscalationGsi1(now);

        const escalation: Escalation = {
          escalationId,
          subjectType: "UNIT",
          subjectId: unitId,
          currentRing: 1,
          status: "RUNNING",
          startedAt: now,
          executionArn: "pending",
        };

        let executionArn = "simulated-local-arn";
        const stateMachineArn = process.env.STATE_MACHINE_ARN;

        if (stateMachineArn) {
          try {
            const sfnRes = await sfnClient.send(
              new StartExecutionCommand({
                stateMachineArn,
                name: `${unitId}-${Date.now()}`,
                input: JSON.stringify({
                  unitId,
                  escalationId,
                }),
              })
            );
            executionArn = sfnRes.executionArn || executionArn;
          } catch (err) {
            console.warn(`[SFN] Could not start state machine for ${unitId}:`, err);
          }
        }

        escalation.executionArn = executionArn;

        const dbEscItem: WithKeys<Escalation> & Escalation = {
          ...escKeys,
          ...escGsi1,
          entityType: "Escalation",
          ...escalation,
        };

        await putItem(dbEscItem);

        await writeAuditEvent({
          eventType: "ESCALATION_STARTED",
          subjectType: "UNIT",
          subjectId: unitId,
          details: {
            escalationId,
            executionArn,
            component,
            bloodGroup: item.bloodGroup,
            expiresAt: item.expiresAt,
          },
        });

        rescueInitiated.push(unitId);
      } catch (err) {
        console.warn(`[Sweep] Failed to initiate rescue for unit ${unitId}:`, err);
      }
    }

    // 2. Check RESCUE_PENDING units that are past absolute expiry
    const rescuePartition = queuePartition("RESCUE_PENDING", component);
    const expiredPending = await queryAll<BloodUnit & Record<string, any>>({
      indexName: "GSI1",
      keyCondition: "GSI1PK = :pk AND GSI1SK <= :now",
      values: {
        ":pk": rescuePartition,
        ":now": now,
      },
    });

    for (const item of expiredPending) {
      try {
        const lostRes = await lostCheckHandler({ unitId: item.unitId });
        if (lostRes.transitioned) {
          unitsLost.push(item.unitId);
        }
      } catch (err) {
        console.warn(`[Sweep] Failed lost check on unit ${item.unitId}:`, err);
      }
    }
  }

  return {
    scannedAt: now,
    rescueInitiated,
    unitsLost,
  };
}
