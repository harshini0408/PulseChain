// BloodGroup, Component, UnitStatus, OfferStatus, ReqStatus, EscalationStatus, AuditEventType
// Matches SCHEMA.md section 5 exactly.

export const BLOOD_GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const COMPONENTS = ["PLATELETS", "RBC", "PLASMA"] as const;
export type Component = (typeof COMPONENTS)[number];

export const FACILITY_TYPES = ["BLOOD_CENTRE", "HOSPITAL"] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export const ROLES = [
  "BLOOD_CENTRE",
  "HOSPITAL",
  "COORDINATOR",
  "DONOR",
  "COMMUNITY_COORDINATOR",
] as const;
export type Role = (typeof ROLES)[number];

export const UNIT_STATUSES = [
  "AVAILABLE",
  "RESCUE_PENDING",
  "CLAIMED",
  "IN_TRANSIT",
  "RECEIVED",
  "LOST",
] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const OFFER_STATUSES = [
  "OPEN",
  "CLAIMED",
  "DECLINED",
  "EXPIRED",
  "SUPERSEDED",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const REQUISITION_STATUSES = [
  "OPEN",
  "PARTIAL",
  "FILLED",
  "DONOR_TIER",
  "CLOSED",
] as const;
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

export const ESCALATION_STATUSES = ["RUNNING", "RESOLVED", "EXHAUSTED"] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

export const ESCALATION_SUBJECTS = ["UNIT", "REQUISITION"] as const;
export type EscalationSubject = (typeof ESCALATION_SUBJECTS)[number];

export const URGENCY_LEVELS = ["NORMAL", "HIGH", "CRITICAL"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

export const DEMAND_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type DemandLevel = (typeof DEMAND_LEVELS)[number];

export const COMPATIBILITY_LEVELS = [
  "IDENTICAL",
  "COMPATIBLE",
  "ACCEPTABLE",
  "INCOMPATIBLE",
] as const;
export type CompatibilityLevel = (typeof COMPATIBILITY_LEVELS)[number];

export const POOL_TYPES = ["COLLEGE", "RWA", "CORPORATE"] as const;
export type PoolType = (typeof POOL_TYPES)[number];

export const COMMUNITY_TYPES = ["COLLEGE", "RESIDENTIAL", "CORPORATE", "NGO"] as const;
export type CommunityType = (typeof COMMUNITY_TYPES)[number];

export const CONTACT_VIA = ["COORDINATOR", "DIRECT"] as const;
export type ContactVia = (typeof CONTACT_VIA)[number];

export const COMMUNITY_ALERT_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "MOBILISED",
  "CLOSED",
] as const;
export type CommunityAlertStatus = (typeof COMMUNITY_ALERT_STATUSES)[number];

export const AUDIT_EVENT_TYPES = [
  "UNIT_LOGGED",
  "THRESHOLD_CROSSED",
  "ESCALATION_STARTED",
  "OFFER_CREATED",
  "OFFER_CLAIMED",
  "OFFER_DECLINED",
  "OFFER_EXPIRED",
  "OFFER_SUPERSEDED",
  "OFFER_NOTIFICATION_FAILED",
  "RING_ESCALATED",
  "ESCALATION_EXHAUSTED",
  "CLAIM_REJECTED",
  "TRANSFER_IN_TRANSIT",
  "TRANSFER_RECEIVED",
  "UNIT_LOST",
  "REQUISITION_CREATED",
  "REQUISITION_FILLED",
  "DONOR_TIER_TRIGGERED",
  "COMMUNITY_RESPONDED",
  "DONATION_RECORDED",
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export const REQUISITION_SOURCES = ["MANUAL", "PARSED", "COMMUNITY"] as const;
export type RequisitionSource = (typeof REQUISITION_SOURCES)[number];

