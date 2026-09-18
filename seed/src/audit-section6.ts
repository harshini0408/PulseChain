import { parseRequisition } from "c:/D/First_Commit/shared/src/parsing.js";
import fs from "fs";

const fixedNow = new Date("2026-09-18T10:00:00.000Z"); // 15:30 IST

console.log("=== Section 6 Parser Execution ===");

const cases = [
  { name: "English", text: "Urgent: Need 2 units of O+ platelets by tonight for KMCH" },
  { name: "Tamil", text: "மிக அவசரம்: 2 யூனிட் ஓ பாசிட்டிவ் தட்டணுக்கள் இன்று இரவு தேவை" },
  { name: "Hindi", text: "अति आवश्यक: 2 यूनिट ओ पॉजिटिव प्लेटलेट्स आज रात चाहिए" },
  { name: "Mixed-Script", text: "AB+ platelets 1 unit வேண்டும் urgent by tonight" },
];

for (const c of cases) {
  console.log(`\n--- ${c.name} ---`);
  console.log("Input:", c.text);
  const res = parseRequisition(c.text, fixedNow);
  console.log("Result:", JSON.stringify(res, null, 2));
}

// 6.3: // VERIFY: inventory
const keywordsSrc = fs.readFileSync("c:/D/First_Commit/shared/src/parsing/keywords.ts", "utf8");
const verifyMatches = keywordsSrc.match(/\/\/\s*VERIFY:.*$/gm) || [];
console.log("\n--- 6.3 // VERIFY: Inventory ---");
verifyMatches.forEach((m) => console.log("  ", m));

// 6.4: Never invents a deadline
const noTime = parseRequisition("Need 2 units of O+ platelets", fixedNow);
console.log("\n--- 6.4 Never invents deadline ---");
console.log("neededBy:", noTime.fields.neededBy, "warnings:", noTime.warnings);

// 6.5: Ambiguity surfaces
const ambig = parseRequisition("Need A+ or B+ platelets", fixedNow);
console.log("\n--- 6.5 Ambiguity surfaces ---");
console.log("bloodGroup:", ambig.fields.bloodGroup, "confidence:", ambig.confidence.bloodGroup, "warnings:", ambig.warnings);

// 6.6: IST->UTC at 23:30 IST
// 23:30 IST on 2026-09-18 = 18:00 UTC on 2026-09-18
const lateNight = new Date("2026-09-18T18:00:00.000Z");
const tonightLate = parseRequisition("Urgent O+ platelets tonight", lateNight);
console.log("\n--- 6.6 Tonight at 23:30 IST ---");
console.log("neededBy for tonight at 23:30 IST:", tonightLate.fields.neededBy);
