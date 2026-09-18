// Acceptance check script: prints platelet 8x8 matrix + worked scoreOffer example
// Run with: node --input-type=module < acceptance-check.mjs

import { getCompatibility } from "./shared/src/compatibility.js";
import { scoreOffer } from "./shared/src/scoring.js";

const GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

// --- Platelet 8x8 matrix ---
console.log("\n=== PLATELET COMPATIBILITY MATRIX (donor rows × recipient cols) ===\n");

const ABBREV = { IDENTICAL: "IDENT", COMPATIBLE: "COMPAT", ACCEPTABLE: "ACCEPT", INCOMPATIBLE: "INCOMPAT" };

// header
process.stdout.write("Donor\\Recip".padEnd(12));
for (const r of GROUPS) process.stdout.write(r.padStart(9));
console.log();

for (const donor of GROUPS) {
  process.stdout.write(donor.padEnd(12));
  for (const recipient of GROUPS) {
    const level = getCompatibility("PLATELETS", donor, recipient).level;
    process.stdout.write(ABBREV[level].padStart(9));
  }
  console.log();
}

// --- Worked scoreOffer example ---
console.log("\n=== WORKED scoreOffer EXAMPLE ===\n");

const compat = getCompatibility("PLATELETS", "O-", "A+"); // COMPATIBLE, rhdMismatch
const result = scoreOffer({
  compatibility: compat,
  distanceKm: 22.6,
  hasOpenRequisition: false,
  standingDemand: "HIGH",
  urgency: "NORMAL",
  hoursRemaining: 9,
  component: "PLATELETS",
});

console.log("Input:");
console.log("  component:       PLATELETS");
console.log("  donor/recipient: O- → A+ (COMPATIBLE, RhD mismatch)");
console.log("  distanceKm:      22.6");
console.log("  openRequisition: false");
console.log("  standingDemand:  HIGH");
console.log("  urgency:         NORMAL");
console.log("  hoursRemaining:  9");
console.log("\nBreakdown:");
console.log("  compatibility:   ", result.breakdown.compatibility, " (COMPATIBLE=0.7)");
console.log("  distanceKm:      ", result.breakdown.distanceKm, " km (raw)");
console.log("  distanceScore:   ", result.breakdown.distanceScore.toFixed(4));
console.log("  openRequisition: ", result.breakdown.openRequisition);
console.log("  standingDemand:  ", result.breakdown.standingDemand, " (HIGH=1.0)");
console.log("  urgency:         ", result.breakdown.urgency.toFixed(4), " (clock: 1-9/48=0.8125, stated: 0.2, max=0.8125)");
console.log("  hoursRemaining:  ", result.breakdown.hoursRemaining, " h (raw)");
console.log("\nScore:  ", result.score, " (0..1, 3dp)");
console.log("Reason:", result.reason);
