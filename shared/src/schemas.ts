// zod schemas for API input validation and Bedrock output parsing.
import { z } from "zod";
import { COMPONENTS, BLOOD_GROUPS, URGENCY_LEVELS } from "./enums.js";

// ---------------------------------------------------------------------------
// POST /units — log a new blood unit
// ---------------------------------------------------------------------------
export const createUnitSchema = z.object({
  facilityId: z.string().min(1),
  component: z.enum(COMPONENTS),
  bloodGroup: z.enum(BLOOD_GROUPS),
  volumeMl: z.number().int().positive(),
  valueInr: z.number().nonnegative().default(1500),
  collectedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;

// ---------------------------------------------------------------------------
// POST /requisitions — create a manual blood request
// ---------------------------------------------------------------------------
export const createRequisitionSchema = z.object({
  hospitalId: z.string().min(1),
  component: z.enum(COMPONENTS),
  bloodGroup: z.enum(BLOOD_GROUPS),
  unitsRequested: z.number().int().positive(),
  urgency: z.enum(URGENCY_LEVELS).default("NORMAL"),
  neededBy: z.string().datetime({ offset: true }),
  rawText: z.string().optional(),
});
export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>;

// ---------------------------------------------------------------------------
// Bedrock output — parsed requisition from free text (Tamil / Hindi / English)
// ---------------------------------------------------------------------------
export const parsedRequisitionSchema = z.object({
  hospitalName: z.string().optional(),
  component: z.enum(COMPONENTS),
  bloodGroup: z.enum(BLOOD_GROUPS),
  units: z.number().int().positive(),
  urgency: z.enum(URGENCY_LEVELS),
  /** ISO UTC datetime string for when the blood is needed */
  neededBy: z.string().datetime({ offset: true }),
  /** Model confidence 0–1; below 0.5 trigger human review */
  confidence: z.number().min(0).max(1),
});
export type ParsedRequisition = z.infer<typeof parsedRequisitionSchema>;
