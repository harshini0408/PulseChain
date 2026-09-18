/**
 * seed/src/generate.ts
 *
 * Generates all DynamoDB items for the PulseChain demo:
 *   - Facility profiles (from facilities.json)
 *   - Donor pool profiles (from donor-pools.json)
 *   - ~150 blood units with realistic expiry spread
 *   - Standing demand (sparse, opinionated)
 *   - 8–12 open requisitions
 *   - 60 days of backdated daily stats
 *
 * Every key is built via @pulsechain/shared keys.ts — no string concatenation here.
 */

import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import {
  facilityKey,
  facilityGsi1,
  unitKey,
  unitQueueGsi1,
  unitStockGsi2,
  demandKey,
  requisitionKey,
  openReqGsi1,
  hospitalReqsGsi2,
  statsDayKey,
  poolKey,
  poolsGsi1,
} from "@pulsechain/shared";
import { addHours, isoNow } from "@pulsechain/shared";
import { getConfig } from "@pulsechain/shared";
import type { BloodGroup, Component, DemandLevel, Urgency } from "@pulsechain/shared";
import type { Facility, DonorPool } from "@pulsechain/shared";

import facilitiesJson from "../data/facilities.json";
import donorPoolsJson from "../data/donor-pools.json";

const cfg = getConfig();

export const FACILITIES: Facility[] = (facilitiesJson as any).facilities;
export const DONOR_POOLS: DonorPool[] = (donorPoolsJson as any).pools;

// ---------------------------------------------------------------------------
// Blood group distribution (realistic Indian population, per published studies)
// O+: 37%, B+: 32%, A+: 21%, AB+: 6%, O-: 2.0%, B-: 1.2%, A-: 0.6%, AB-: 0.2%
// ---------------------------------------------------------------------------

const BG_WEIGHTS: [BloodGroup, number][] = [
  ["O+",  37],
  ["B+",  32],
  ["A+",  21],
  ["AB+",  6],
  ["O-",   2.0],
  ["B-",   1.2],
  ["A-",   0.6],
  ["AB-",  0.2],
];

function weightedBloodGroup(seed: number): BloodGroup {
  const total = BG_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = (seed % 1000) / 1000 * total;
  for (const [g, w] of BG_WEIGHTS) {
    r -= w;
    if (r <= 0) return g;
  }
  return "O+";
}

// A deterministic-ish pseudo-random (not crypto — just reproducibility)
let _seed = 42;
function rng(): number {
  _seed = (_seed * 1664525 + 1013904223) & 0x7fffffff;
  return _seed / 0x7fffffff;
}

function pickBloodGroup(): BloodGroup {
  return weightedBloodGroup(_seed * 1000);
}

function pickBetween(min: number, max: number): number {
  return min + rng() * (max - min);
}

function pickInt(min: number, max: number): number {
  return Math.floor(pickBetween(min, max + 1));
}

// ---------------------------------------------------------------------------
// Volume ranges per component
// ---------------------------------------------------------------------------

function volumeForComponent(component: Component): number {
  switch (component) {
    case "PLATELETS": return pickInt(200, 300);
    case "RBC":       return pickInt(250, 350);
    case "PLASMA":    return pickInt(200, 250);
  }
}

// ---------------------------------------------------------------------------
// Facility helpers
// ---------------------------------------------------------------------------

const BLOOD_CENTRES = FACILITIES.filter((f) => f.type === "BLOOD_CENTRE");
const HOSPITALS     = FACILITIES.filter((f) => f.type === "HOSPITAL");

// The main Coimbatore blood centres — these will hold the lion's share of stock
const PRIMARY_CENTRES = ["FAC_CBE_SNBC", "FAC_CBE_RBANKS"];

function facilityHandles(facId: string, component: Component): boolean {
  return FACILITIES.find((f) => f.facilityId === facId)?.components.includes(component) ?? false;
}

// ---------------------------------------------------------------------------
// Item type tags (stored on each DynamoDB item for count verification)
// ---------------------------------------------------------------------------

export type ItemTag =
  | "FACILITY"
  | "POOL"
  | "UNIT"
  | "DEMAND"
  | "REQUISITION"
  | "STATS";

export interface TaggedItem {
  _tag: ItemTag;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Generate facility items
// ---------------------------------------------------------------------------

export function generateFacilityItems(): TaggedItem[] {
  return FACILITIES.map((f) => ({
    _tag: "FACILITY" as ItemTag,
    ...facilityKey(f.facilityId),
    ...facilityGsi1(f.type, f.facilityId),
    entityType: "FACILITY",
    facilityId: f.facilityId,
    name: f.name,
    type: f.type,
    city: f.city,
    lat: f.lat,
    lng: f.lng,
    components: f.components,
    contactEmail: f.contactEmail,
  }));
}

// ---------------------------------------------------------------------------
// Generate donor pool items
// ---------------------------------------------------------------------------

export function generatePoolItems(): TaggedItem[] {
  return DONOR_POOLS.map((p) => ({
    _tag: "POOL" as ItemTag,
    ...poolKey(p.poolId),
    ...poolsGsi1(p.poolId),
    entityType: "POOL",
    poolId: p.poolId,
    name: p.name,
    poolType: p.poolType,
    lat: p.lat,
    lng: p.lng,
    registered: p.registered,
    groupCounts: p.groupCounts,
  }));
}

// ---------------------------------------------------------------------------
// Generate unit items
// ---------------------------------------------------------------------------

/**
 * Each unit has a _slot that tells the generator how to position its expiry:
 *   "normal"   - comfortably far from expiry (background stock)
 *   "cluster"  - the near-expiry platelet cluster (30–55 h)
 *   "critical" - within 0–1 h of expiry or already expired (for the lost-check worker)
 *   "rbc_near" - near the 168 h RBC threshold
 *   "plasma_near" - near the 720 h plasma threshold
 */
type ExpirySlot =
  | "normal"
  | "cluster"
  | "critical"
  | "rbc_near"
  | "plasma_near";

interface UnitSpec {
  facilityId: string;
  component: Component;
  bloodGroup?: BloodGroup; // if omitted, weighted random
  expirySlot: ExpirySlot;
}

function expiryForSlot(
  component: Component,
  slot: ExpirySlot,
  now: string,
): { collectedAt: string; expiresAt: string } {
  const shelfHours = cfg.shelfLifeDays[component] * 24;

  switch (slot) {
    case "normal": {
      // Collected 1–3 days ago; plenty of shelf life remaining
      const hoursUsed = pickBetween(24, 72);
      const collectedAt = addHours(now, -hoursUsed);
      const expiresAt   = addHours(collectedAt, shelfHours);
      return { collectedAt, expiresAt };
    }
    case "cluster": {
      // platelet cluster: 30–55 hours remaining → expires that far from now
      const hoursLeft = pickBetween(30, 55);
      const expiresAt = addHours(now, hoursLeft);
      const collectedAt = addHours(expiresAt, -shelfHours);
      return { collectedAt, expiresAt };
    }
    case "critical": {
      // 0 to -1 h from now (either just expired or within an hour)
      const hoursLeft = pickBetween(-1, 1);
      const expiresAt = addHours(now, hoursLeft);
      const collectedAt = addHours(expiresAt, -shelfHours);
      return { collectedAt, expiresAt };
    }
    case "rbc_near": {
      // 140–180 h remaining on a 168 h threshold
      const hoursLeft = pickBetween(140, 180);
      const expiresAt = addHours(now, hoursLeft);
      const collectedAt = addHours(expiresAt, -shelfHours);
      return { collectedAt, expiresAt };
    }
    case "plasma_near": {
      // 680–750 h remaining on a 720 h threshold
      const hoursLeft = pickBetween(680, 750);
      const expiresAt = addHours(now, hoursLeft);
      const collectedAt = addHours(expiresAt, -shelfHours);
      return { collectedAt, expiresAt };
    }
  }
}

export function generateUnitItems(now: string): { items: TaggedItem[]; unitCount: number } {
  const specs: UnitSpec[] = [];

  // ---- PRIMARY CENTRE: FAC_CBE_SNBC (large share of stock) ----
  // 30 normal platelets
  for (let i = 0; i < 30; i++) {
    specs.push({ facilityId: "FAC_CBE_SNBC", component: "PLATELETS", expirySlot: "normal" });
  }
  // 8 cluster platelets (the near-expiry cluster that triggers the sweep)
  const clusterGroups: BloodGroup[] = ["O+", "B+", "A+", "O+", "B+", "O+", "A+", "O-"];
  for (const bg of clusterGroups) {
    specs.push({ facilityId: "FAC_CBE_SNBC", component: "PLATELETS", bloodGroup: bg, expirySlot: "cluster" });
  }
  // 2 critical (already expired / nearly expired)
  specs.push({ facilityId: "FAC_CBE_SNBC", component: "PLATELETS", bloodGroup: "A+", expirySlot: "critical" });
  specs.push({ facilityId: "FAC_CBE_SNBC", component: "PLATELETS", bloodGroup: "B+", expirySlot: "critical" });

  // 45 RBC (normal + some near threshold)
  for (let i = 0; i < 38; i++) {
    specs.push({ facilityId: "FAC_CBE_SNBC", component: "RBC", expirySlot: "normal" });
  }
  for (let i = 0; i < 4; i++) {
    specs.push({ facilityId: "FAC_CBE_SNBC", component: "RBC", expirySlot: "rbc_near" });
  }
  specs.push({ facilityId: "FAC_CBE_SNBC", component: "RBC", expirySlot: "critical" });

  // 12 PLASMA
  for (let i = 0; i < 9; i++) {
    specs.push({ facilityId: "FAC_CBE_SNBC", component: "PLASMA", expirySlot: "normal" });
  }
  for (let i = 0; i < 2; i++) {
    specs.push({ facilityId: "FAC_CBE_SNBC", component: "PLASMA", expirySlot: "plasma_near" });
  }
  specs.push({ facilityId: "FAC_CBE_SNBC", component: "PLASMA", expirySlot: "critical" });

  // ---- SECONDARY CENTRE: FAC_CBE_RBANKS ----
  for (let i = 0; i < 6; i++) {
    specs.push({ facilityId: "FAC_CBE_RBANKS", component: "PLATELETS", expirySlot: "normal" });
  }
  // 1 cluster platelet — this creates a second potential escalation
  specs.push({ facilityId: "FAC_CBE_RBANKS", component: "PLATELETS", bloodGroup: "AB-", expirySlot: "cluster" });
  for (let i = 0; i < 10; i++) {
    specs.push({ facilityId: "FAC_CBE_RBANKS", component: "RBC", expirySlot: "normal" });
  }
  for (let i = 0; i < 3; i++) {
    specs.push({ facilityId: "FAC_CBE_RBANKS", component: "PLASMA", expirySlot: "normal" });
  }

  // ---- Regional centres (Tiruppur, Erode) — smaller stock ----
  for (let i = 0; i < 4; i++) {
    specs.push({ facilityId: "FAC_TRP_BC", component: "PLATELETS", expirySlot: "normal" });
  }
  for (let i = 0; i < 6; i++) {
    specs.push({ facilityId: "FAC_TRP_BC", component: "RBC", expirySlot: "normal" });
  }
  for (let i = 0; i < 2; i++) {
    specs.push({ facilityId: "FAC_TRP_BC", component: "PLASMA", expirySlot: "normal" });
  }

  for (let i = 0; i < 3; i++) {
    specs.push({ facilityId: "FAC_ERD_BC", component: "PLATELETS", expirySlot: "normal" });
  }
  for (let i = 0; i < 5; i++) {
    specs.push({ facilityId: "FAC_ERD_BC", component: "RBC", expirySlot: "normal" });
  }
  specs.push({ facilityId: "FAC_ERD_BC", component: "PLASMA", expirySlot: "normal" });
  specs.push({ facilityId: "FAC_ERD_BC", component: "RBC", expirySlot: "rbc_near" });

  for (let i = 0; i < 2; i++) {
    specs.push({ facilityId: "FAC_PLM_BC", component: "RBC", expirySlot: "normal" });
  }
  specs.push({ facilityId: "FAC_PLM_BC", component: "PLASMA", expirySlot: "normal" });

  // Build actual DynamoDB items
  const items: TaggedItem[] = [];
  for (const spec of specs) {
    const bloodGroup = spec.bloodGroup ?? pickBloodGroup();
    const { collectedAt, expiresAt } = expiryForSlot(spec.component, spec.expirySlot, now);
    const unitId = `U${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
    const volume = volumeForComponent(spec.component);

    items.push({
      _tag: "UNIT" as ItemTag,
      ...unitKey(unitId),
      ...unitQueueGsi1("AVAILABLE", spec.component, expiresAt, unitId),
      ...unitStockGsi2(spec.facilityId, expiresAt, unitId),
      entityType: "UNIT",
      unitId,
      facilityId: spec.facilityId,
      component: spec.component,
      bloodGroup,
      volumeMl: volume,
      valueInr: cfg.valuePerUnitInr,
      collectedAt,
      expiresAt,
      status: "AVAILABLE",
      version: 1,
    });
  }

  return { items, unitCount: items.length };
}

// ---------------------------------------------------------------------------
// Generate standing demand items
// ---------------------------------------------------------------------------

export function generateDemandItems(): TaggedItem[] {
  const items: TaggedItem[] = [];

  // Opinionated, sparse demand — not the full cross product.
  const demands: Array<{
    facId: string;
    component: Component;
    group: BloodGroup;
    weeklyUnits: number;
    level: DemandLevel;
  }> = [
    // Large tertiary hospitals: HIGH demand for common groups
    { facId: "FAC_CBE_KMCH",   component: "PLATELETS", group: "O+",  weeklyUnits: 18, level: "HIGH" },
    { facId: "FAC_CBE_KMCH",   component: "PLATELETS", group: "B+",  weeklyUnits: 14, level: "HIGH" },
    { facId: "FAC_CBE_KMCH",   component: "PLATELETS", group: "A+",  weeklyUnits: 10, level: "MEDIUM" },
    { facId: "FAC_CBE_KMCH",   component: "RBC",       group: "O+",  weeklyUnits: 22, level: "HIGH" },
    { facId: "FAC_CBE_KMCH",   component: "RBC",       group: "B+",  weeklyUnits: 16, level: "HIGH" },
    { facId: "FAC_CBE_KMCH",   component: "RBC",       group: "A+",  weeklyUnits: 12, level: "MEDIUM" },

    { facId: "FAC_CBE_GH",     component: "PLATELETS", group: "O+",  weeklyUnits: 14, level: "HIGH" },
    { facId: "FAC_CBE_GH",     component: "PLATELETS", group: "B+",  weeklyUnits: 11, level: "HIGH" },
    { facId: "FAC_CBE_GH",     component: "RBC",       group: "O+",  weeklyUnits: 18, level: "HIGH" },
    { facId: "FAC_CBE_GH",     component: "RBC",       group: "B+",  weeklyUnits: 14, level: "HIGH" },
    { facId: "FAC_CBE_GH",     component: "PLASMA",    group: "AB+", weeklyUnits: 5,  level: "MEDIUM" },

    { facId: "FAC_CBE_PSGIMS", component: "PLATELETS", group: "A+",  weeklyUnits: 9,  level: "MEDIUM" },
    { facId: "FAC_CBE_PSGIMS", component: "RBC",       group: "O+",  weeklyUnits: 13, level: "MEDIUM" },
    { facId: "FAC_CBE_PSGIMS", component: "RBC",       group: "O-",  weeklyUnits: 4,  level: "MEDIUM" },

    { facId: "FAC_CBE_SRMC",   component: "PLATELETS", group: "O+",  weeklyUnits: 6,  level: "MEDIUM" },
    { facId: "FAC_CBE_SRMC",   component: "RBC",       group: "B+",  weeklyUnits: 8,  level: "MEDIUM" },

    // Smaller facilities: mostly LOW
    { facId: "FAC_TRP_GH",     component: "PLATELETS", group: "B+",  weeklyUnits: 7,  level: "MEDIUM" },
    { facId: "FAC_TRP_GH",     component: "RBC",       group: "O+",  weeklyUnits: 9,  level: "MEDIUM" },
    { facId: "FAC_TRP_KMCH",   component: "PLATELETS", group: "O+",  weeklyUnits: 4,  level: "LOW" },
    { facId: "FAC_TRP_KMCH",   component: "RBC",       group: "A+",  weeklyUnits: 5,  level: "LOW" },
    { facId: "FAC_ERD_GH",     component: "RBC",       group: "O+",  weeklyUnits: 8,  level: "MEDIUM" },
    { facId: "FAC_ERD_GH",     component: "PLATELETS", group: "B+",  weeklyUnits: 5,  level: "LOW" },
    { facId: "FAC_PLM_GH",     component: "RBC",       group: "B+",  weeklyUnits: 4,  level: "LOW" },
    { facId: "FAC_MTR_GH",     component: "RBC",       group: "O+",  weeklyUnits: 3,  level: "LOW" },
  ];

  for (const d of demands) {
    items.push({
      _tag: "DEMAND" as ItemTag,
      ...demandKey(d.facId, d.component, d.group),
      entityType: "DEMAND",
      facilityId: d.facId,
      component: d.component,
      bloodGroup: d.group,
      weeklyUnits: d.weeklyUnits,
      level: d.level,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Generate open requisition items
// ---------------------------------------------------------------------------

export function generateRequisitionItems(now: string): TaggedItem[] {
  const items: TaggedItem[] = [];

  const reqs: Array<{
    hospitalId: string;
    component: Component;
    group: BloodGroup;
    urgency: Urgency;
    hoursUntilNeeded: number;
    unitsRequested: number;
  }> = [
    // Matching the near-expiry cluster: O+ platelets, KMCH needs them urgently
    { hospitalId: "FAC_CBE_KMCH",   component: "PLATELETS", group: "O+",  urgency: "HIGH",     hoursUntilNeeded: 6,   unitsRequested: 2 },
    { hospitalId: "FAC_CBE_GH",     component: "PLATELETS", group: "B+",  urgency: "NORMAL",   hoursUntilNeeded: 18,  unitsRequested: 1 },
    { hospitalId: "FAC_CBE_SRMC",   component: "PLATELETS", group: "A+",  urgency: "NORMAL",   hoursUntilNeeded: 24,  unitsRequested: 1 },
    // CRITICAL — platelet need
    { hospitalId: "FAC_CBE_PSGIMS", component: "PLATELETS", group: "O+",  urgency: "CRITICAL", hoursUntilNeeded: 3,   unitsRequested: 1 },
    // RBC requisitions
    { hospitalId: "FAC_CBE_KMCH",   component: "RBC",       group: "O+",  urgency: "NORMAL",   hoursUntilNeeded: 48,  unitsRequested: 3 },
    { hospitalId: "FAC_CBE_GH",     component: "RBC",       group: "B+",  urgency: "HIGH",     hoursUntilNeeded: 12,  unitsRequested: 2 },
    { hospitalId: "FAC_CBE_PSGIMS", component: "RBC",       group: "A+",  urgency: "NORMAL",   hoursUntilNeeded: 72,  unitsRequested: 2 },
    { hospitalId: "FAC_TRP_GH",     component: "RBC",       group: "O+",  urgency: "NORMAL",   hoursUntilNeeded: 36,  unitsRequested: 1 },
    { hospitalId: "FAC_ERD_GH",     component: "RBC",       group: "B+",  urgency: "NORMAL",   hoursUntilNeeded: 96,  unitsRequested: 2 },
    // Plasma requisitions
    { hospitalId: "FAC_CBE_KMCH",   component: "PLASMA",    group: "AB+", urgency: "NORMAL",   hoursUntilNeeded: 120, unitsRequested: 1 },
    { hospitalId: "FAC_CBE_GH",     component: "PLASMA",    group: "O+",  urgency: "NORMAL",   hoursUntilNeeded: 48,  unitsRequested: 1 },
  ];

  for (const r of reqs) {
    const reqId = `RQ${randomUUID().replace(/-/g, "").slice(0, 14).toUpperCase()}`;
    const neededBy = addHours(now, r.hoursUntilNeeded);
    const createdAt = now;

    items.push({
      _tag: "REQUISITION" as ItemTag,
      ...requisitionKey(reqId),
      ...openReqGsi1(r.component, r.group, neededBy),
      ...hospitalReqsGsi2(r.hospitalId, neededBy),
      entityType: "REQUISITION",
      reqId,
      hospitalId: r.hospitalId,
      component: r.component,
      bloodGroup: r.group,
      unitsRequested: r.unitsRequested,
      unitsFilled: 0,
      urgency: r.urgency,
      neededBy,
      status: "OPEN",
      source: "MANUAL",
      createdAt,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Generate 60-day backdated stats
// ---------------------------------------------------------------------------

export function generateStatsItems(now: string): TaggedItem[] {
  const items: TaggedItem[] = [];
  const MS_PER_DAY = 86400_000;
  const nowMs = new Date(now).getTime();

  // Start 60 days ago
  for (let d = 59; d >= 0; d--) {
    const dayMs = nowMs - d * MS_PER_DAY;
    const dayIso = new Date(dayMs).toISOString().slice(0, 10); // yyyy-mm-dd

    // Base: ~12 units processed/day, mild upward trend as system warms up
    const trendMultiplier = 1 + (59 - d) * 0.003; // ~18% growth over 60 days
    // Weekly seasonality: Mon–Wed higher, Thu–Fri moderate, Sat–Sun lower
    const dow = new Date(dayMs).getUTCDay(); // 0=Sun, 6=Sat
    const seasonality = [0.75, 1.1, 1.15, 1.1, 0.95, 0.8, 0.7][dow];
    // Noise: ±20%
    const noise = 0.8 + rng() * 0.4;

    const base = Math.round(12 * trendMultiplier * seasonality * noise);
    const totalUnits = Math.max(1, base);

    // Loss rate: platelets ~25% of volume, overall ~12% loss rate, improving slowly
    const lossRateBase = 0.14 - (59 - d) * 0.0008; // trends from ~14% to ~9%
    const lossRate = Math.max(0.06, lossRateBase + (rng() - 0.5) * 0.04);
    const unitsLost = Math.max(0, Math.round(totalUnits * lossRate));
    const unitsSaved = totalUnits - unitsLost;

    items.push({
      _tag: "STATS" as ItemTag,
      ...statsDayKey(dayIso),
      entityType: "STATS",
      date: dayIso,
      unitsSaved,
      unitsLost,
      valueSavedInr: unitsSaved * cfg.valuePerUnitInr,
      valueLostInr: unitsLost * cfg.valuePerUnitInr,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Master generator — returns all items in one flat array
// ---------------------------------------------------------------------------

export function generateAll(now?: string): {
  items: TaggedItem[];
  counts: Record<ItemTag, number>;
  total: number;
} {
  const ts = now ?? isoNow();

  const facilityItems     = generateFacilityItems();
  const poolItems         = generatePoolItems();
  const { items: unitItems } = generateUnitItems(ts);
  const demandItems       = generateDemandItems();
  const requisitionItems  = generateRequisitionItems(ts);
  const statsItems        = generateStatsItems(ts);

  const all: TaggedItem[] = [
    ...facilityItems,
    ...poolItems,
    ...unitItems,
    ...demandItems,
    ...requisitionItems,
    ...statsItems,
  ];

  const counts: Record<ItemTag, number> = {
    FACILITY: 0,
    POOL: 0,
    UNIT: 0,
    DEMAND: 0,
    REQUISITION: 0,
    STATS: 0,
  };
  for (const item of all) counts[item._tag]++;

  return { items: all, counts, total: all.length };
}

if (process.argv[1] && (process.argv[1].endsWith("generate.ts") || process.argv[1].endsWith("generate.js"))) {
  const now = isoNow();
  const { counts, total } = generateAll(now);
  console.log("\n=== Generated item counts ===");
  for (const [tag, n] of Object.entries(counts)) {
    console.log(`  ${tag.padEnd(14)} ${n}`);
  }
  console.log(`  ${"TOTAL".padEnd(14)} ${total}`);
}
