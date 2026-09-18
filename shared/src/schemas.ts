import { z } from "zod";
import {
  COMPONENTS,
  BLOOD_GROUPS,
  URGENCY_LEVELS,
  COMMUNITY_TYPES,
  CONTACT_VIA,
  REQUISITION_SOURCES,
} from "./enums.js";

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
  source: z.enum(REQUISITION_SOURCES).optional(),
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

// ---------------------------------------------------------------------------
// POST /donors/register — rapid donor registration (no health/payment data)
// ---------------------------------------------------------------------------
export const createDonorSchema = z.object({
  name: z.string().min(1),
  bloodGroup: z.enum(BLOOD_GROUPS),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().min(1),
  communityId: z.string().optional(),
  contactVia: z.enum(CONTACT_VIA).default("COORDINATOR"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  lastDonationAt: z.string().datetime({ offset: true }).optional(),
});

// ---------------------------------------------------------------------------
// POST /donors/:id/defer — self-deferral (NO reason field)
// ---------------------------------------------------------------------------
export const deferDonorSchema = z.object({
  deferredUntil: z.string().datetime({ offset: true }),
});
export type DeferDonorInput = z.infer<typeof deferDonorSchema>;

// ---------------------------------------------------------------------------
// POST /communities/register — community registration
// ---------------------------------------------------------------------------
export const createCommunitySchema = z.object({
  name: z.string().min(1),
  type: z.enum(COMMUNITY_TYPES),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().min(1),
  coordinatorName: z.string().min(1),
  coordinatorContact: z.string().min(1),
});

// ---------------------------------------------------------------------------
// POST /communities/:id/alerts/:alertId/respond — coordinator response
// ---------------------------------------------------------------------------
export const respondAlertSchema = z.object({
  mobilisedCount: z.number().int().nonnegative(),
  status: z.enum(["ACKNOWLEDGED", "MOBILISED"]).default("MOBILISED"),
});
export type RespondAlertInput = z.infer<typeof respondAlertSchema>;

// ---------------------------------------------------------------------------
// POST /communities/:id/donations — facility-confirmed donation
// ---------------------------------------------------------------------------
export const confirmDonationSchema = z.object({
  donorId: z.string().min(1),
  facilityId: z.string().min(1),
  donationDate: z.string().datetime({ offset: true }).optional(),
});
export type ConfirmDonationInput = z.infer<typeof confirmDonationSchema>;

