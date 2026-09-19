/**
 * frontend/src/api/requisitionsAdapter.ts
 *
 * Requisitions client adapter connected to the real backend API:
 * - GET /requisitions?hospitalId=...
 * - POST /requisitions
 */

import type {
  BloodGroup,
  Component,
  Requisition,
  RequisitionSource,
  Urgency,
} from "@pulsechain/shared";
import { request } from "./client";

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

/** Fetches requisitions for a hospital via `GET /requisitions?hospitalId=...` */
export async function listRequisitions(hospitalId: string): Promise<Requisition[]> {
  return request<Requisition[]>(`/requisitions?hospitalId=${encodeURIComponent(hospitalId)}`);
}

/** Creates a requisition via `POST /requisitions` */
export async function createRequisition(input: CreateRequisitionInput): Promise<Requisition> {
  return request<Requisition>("/requisitions", {
    method: "POST",
    body: input,
  });
}

/** False now that requisitions API is fully connected to backend */
export const REQUISITIONS_ARE_SESSION_LOCAL = false;
