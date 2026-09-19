/**
 * frontend/src/api/requisitionsAdapter.ts
 *
 * ===========================================================================
 *  THE REQUISITIONS API IS NOT DEPLOYED.
 *
 *  backend/src/api/requisitions.ts contains exactly `export {};` and has no
 *  Events block in backend/template.yaml. There is no GET /requisitions, no
 *  POST /requisitions and no POST /requisitions/parse behind the HTTP API.
 *
 *  This module therefore holds requisitions in memory for the lifetime of the
 *  browser tab. Nothing here touches the network. Reload the tab and every
 *  requisition created through it is gone.
 *
 *  It exists so /hospital/requisitions and the hand-off from /coordinator/parse
 *  can be demonstrated honestly rather than firing a request that 404s on
 *  camera. The page states this limitation on screen; do not remove that
 *  notice while this file is still the source of truth.
 *
 *  WHEN THE ENDPOINT SHIPS: the two functions below already carry the
 *  signatures the real API would have, and api/hooks.ts consumes only those.
 *  Swap the bodies for `request<Requisition[]>("/requisitions?hospitalId=…")`
 *  and `request<Requisition>("/requisitions", { method: "POST", body })`,
 *  delete the notice on the page, and nothing else changes.
 *
 *  The escalation state machine and the requisition-search and donor-tier
 *  workers DO exist server-side. They are simply not reachable over HTTP.
 *  Do not try to call them.
 * ===========================================================================
 */

import type {
  BloodGroup,
  Component,
  Requisition,
  RequisitionSource,
  Urgency,
} from "@pulsechain/shared";

/** Exactly the fields a caller supplies; the rest is assigned on write. */
export interface CreateRequisitionInput {
  hospitalId: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  urgency: Urgency;
  neededBy: string; // ISO UTC
  source?: RequisitionSource;
  rawText?: string;
}

/** Session-local store, keyed by hospital. Never persisted anywhere. */
const store = new Map<string, Requisition[]>();

let sequence = 0;

function nextReqId(): string {
  sequence += 1;
  const stamp = Date.now().toString(36).toUpperCase();
  return `REQ_LOCAL_${stamp}_${String(sequence).padStart(3, "0")}`;
}

/** Mirrors `GET /requisitions?hospitalId=…` as it would behave. */
export async function listRequisitions(hospitalId: string): Promise<Requisition[]> {
  const rows = store.get(hospitalId) ?? [];
  // Newest first, the order a hospital would want to read them in.
  return [...rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Mirrors `POST /requisitions` as it would behave (isolated fallback only). */
export async function createRequisition(input: CreateRequisitionInput): Promise<Requisition> {
  const reqId = nextReqId();
  const now = new Date().toISOString();
  const requisition: Requisition = {
    id: reqId,
    reqId,
    facilityId: input.hospitalId,
    hospitalId: input.hospitalId,
    component: input.component,
    bloodGroup: input.bloodGroup,
    unitsRequested: input.unitsRequested,
    unitsFulfilled: 0,
    unitsFilled: 0,
    urgency: input.urgency,
    requiredBy: input.neededBy,
    neededBy: input.neededBy,
    status: "OPEN",
    source: input.source ?? "MANUAL",
    rawText: input.rawText,
    createdAt: now,
    updatedAt: now,
  };

  const rows = store.get(input.hospitalId) ?? [];
  store.set(input.hospitalId, [...rows, requisition]);

  return requisition;
}

/** Kept only for isolated demo/offline fallback. Production data path uses DynamoDB API. */
export const REQUISITIONS_ARE_SESSION_LOCAL = false;
