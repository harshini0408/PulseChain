// Facility, Unit, Offer, Requisition, Escalation, AuditEvent, DonorPool, DailyStats, MatchBreakdown
// Attribute names match SCHEMA.md section 4 exactly. No PK/SK/GSI fields here — see WithKeys<T>.

import type {
  BloodGroup,
  Component,
  FacilityType,
  UnitStatus,
  OfferStatus,
  RequisitionStatus,
  RequisitionSource,
  EscalationStatus,
  EscalationSubject,
  Urgency,
  DemandLevel,
  CompatibilityLevel,
  AuditEventType,
  PoolType,
  MobilisationStatus,
} from "./enums.js";

// ---------------------------------------------------------------------------
// Generic DynamoDB key wrapper — add to any domain type when reading from DB
// ---------------------------------------------------------------------------
export interface WithKeys<T> extends Record<string, unknown> {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  entityType: string;
  /** The domain item payload */
  data?: T;
}

// ---------------------------------------------------------------------------
// Domain types — fields match SCHEMA.md section 4 attribute names
// ---------------------------------------------------------------------------

export interface Facility {
  facilityId: string;
  name: string;
  type: FacilityType;
  city: string;
  lat: number;
  lng: number;
  /** Subset of Component values this facility handles */
  components: Component[];
  contactEmail: string;
}

export interface DistancePair {
  /** ID of the destination facility */
  toFacilityId: string;
  distanceKm: number;
}

export interface StandingDemand {
  facilityId: string;
  component: Component;
  bloodGroup: BloodGroup;
  weeklyUnits: number;
  level: DemandLevel;
}

export interface BloodUnit {
  unitId: string;
  facilityId: string;
  component: Component;
  bloodGroup: BloodGroup;
  volumeMl: number;
  valueInr: number;
  collectedAt: string; // ISO UTC
  expiresAt: string;   // ISO UTC
  status: UnitStatus;
  version: number;
  claimedBy?: string;
  claimedAt?: string;
  receivedAt?: string;
  lostAt?: string;
  activeEscalationId?: string;
}

export interface MatchBreakdown {
  compatibility: number;
  distanceKm: number;
  openRequisition: number;
  standingDemand: number;
  urgency: number;
  hoursRemaining: number;
}

export interface Offer {
  offerId: string;
  escalationId: string;
  ring: 1 | 2 | 3;
  unitId: string;
  originFacilityId: string;
  recipientFacilityId: string;
  status: OfferStatus;
  createdAt: string; // ISO UTC
  claimBy: string;  // ISO UTC
  respondedAt?: string;
  rank: number;
  score: number;
  breakdown: MatchBreakdown;
  reason: string;
  requisitionId?: string;
  component?: Component;
  bloodGroup?: BloodGroup;
  volumeMl?: number;
}

export interface Escalation {
  escalationId: string;
  subjectType: EscalationSubject;
  subjectId: string;
  currentRing: number;
  status: EscalationStatus;
  startedAt: string; // ISO UTC
  endedAt?: string;
  executionArn: string;
}

export interface Requisition {
  reqId: string;
  hospitalId: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  unitsFilled: number;
  urgency: Urgency;
  neededBy: string; // ISO UTC
  status: RequisitionStatus;
  source: RequisitionSource;
  rawText?: string;
  createdAt: string; // ISO UTC
}

export interface AuditEvent {
  eventId: string;
  eventType: AuditEventType;
  subjectType: EscalationSubject;
  subjectId: string;
  /** null = system actor */
  actorFacilityId?: string | null;
  timestamp: string; // ISO UTC
  details: Record<string, unknown>;
}

export interface DailyStats {
  unitsSaved: number;
  unitsLost: number;
  valueSavedInr: number;
  valueLostInr: number;
}

export interface DonorPool {
  poolId: string;
  name: string;
  poolType: PoolType;
  city?: string;
  lat: number;
  lng: number;
  registered: number;
  groupCounts: Partial<Record<BloodGroup, number>>;
  contactName: string;
  contactEmail: string;
  lastMobilisedAt: string | null;
  lastMobilisationStatus?: MobilisationStatus | null;
}

export interface MobilisationRecord {
  token: string;
  poolId: string;
  poolName: string;
  requisitionId: string;
  expiresAt: string;
  status: MobilisationStatus;
  hospitalId: string;
  hospitalName: string;
  hospitalCity: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  urgency: Urgency;
  neededBy: string;
  createdAt: string;
  acknowledgedAt?: string | null;
}

export interface MobilisationSummary {
  token: string;
  poolId: string;
  poolName: string;
  hospitalName: string;
  hospitalCity: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  urgency: Urgency;
  neededBy: string;
  status: MobilisationStatus;
  expiresAt: string;
  acknowledgedAt?: string | null;
}
