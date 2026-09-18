import { describe, it, expect } from "vitest";
import { parseRequisition, detectLanguage } from "../src/parsing.js";

// Fixed reference date for determinism:
// 2026-09-18 10:00:00 UTC = 2026-09-18 15:30:00 IST (Friday)
const FIXED_NOW = new Date("2026-09-18T10:00:00.000Z");

describe("Deterministic Multilingual Requisition Parser", () => {
  // -------------------------------------------------------------------------
  // 1. Script & Language Detection
  // -------------------------------------------------------------------------
  describe("Language Detection", () => {
    it("detects English from Latin script", () => {
      expect(detectLanguage("Urgent platelets needed")).toBe("en");
    });

    it("detects Tamil from Tamil script", () => {
      expect(detectLanguage("அவசரமாக தட்டணுக்கள் தேவை")).toBe("ta");
    });

    it("detects Hindi from Devanagari script", () => {
      expect(detectLanguage("तुरंत प्लेटलेट्स की आवश्यकता है")).toBe("hi");
    });

    it("handles unknown / empty input", () => {
      expect(detectLanguage("12345 !@#$")).toBe("unknown");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Clean Single-Language Requisitions
  // -------------------------------------------------------------------------
  describe("Clean Single-Language Requisitions", () => {
    it("Case 1: Clean English requisition", () => {
      const text = "Urgent: Need 2 units of O+ platelets by tonight for emergency surgery";
      const res = parseRequisition(text, FIXED_NOW);

      expect(res.ok).toBe(true);
      expect(res.detectedLanguage).toBe("en");
      expect(res.fields.component).toBe("PLATELETS");
      expect(res.fields.bloodGroup).toBe("O+");
      expect(res.fields.unitsRequested).toBe(2);
      expect(res.fields.urgency).toBe("CRITICAL");
      // 21:00 IST today = 15:30 UTC today
      expect(res.fields.neededBy).toBe("2026-09-18T15:30:00.000Z");
      expect(res.confidence.component).toBe(1.0);
      expect(res.confidence.bloodGroup).toBe(1.0);
      expect(res.confidence.unitsRequested).toBe(1.0);
    });

    it("Case 2: Clean Tamil requisition", () => {
      const text = "மிக அவசரம்: 2 யூனிட் ஓ பாசிட்டிவ் தட்டணுக்கள் இன்று இரவு தேவை";
      const res = parseRequisition(text, FIXED_NOW);

      expect(res.ok).toBe(true);
      expect(res.detectedLanguage).toBe("ta");
      expect(res.fields.component).toBe("PLATELETS");
      expect(res.fields.bloodGroup).toBe("O+");
      expect(res.fields.unitsRequested).toBe(2);
      expect(res.fields.urgency).toBe("CRITICAL");
      expect(res.fields.neededBy).toBe("2026-09-18T15:30:00.000Z");
    });

    it("Case 3: Clean Hindi requisition", () => {
      const text = "अति आवश्यक: 2 यूनिट ओ पॉजिटिव प्लेटलेट्स आज रात चाहिए";
      const res = parseRequisition(text, FIXED_NOW);

      expect(res.ok).toBe(true);
      expect(res.detectedLanguage).toBe("hi");
      expect(res.fields.component).toBe("PLATELETS");
      expect(res.fields.bloodGroup).toBe("O+");
      expect(res.fields.unitsRequested).toBe(2);
      expect(res.fields.urgency).toBe("CRITICAL");
      expect(res.fields.neededBy).toBe("2026-09-18T15:30:00.000Z");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Mixed-Script Indian Clinical Messages (WhatsApp Style)
  // -------------------------------------------------------------------------
  describe("Mixed-Script Inputs", () => {
    it("Case 4: Mixed Tamil + English", () => {
      const text = "AB+ platelets 1 unit வேண்டும் urgent by tonight";
      const res = parseRequisition(text, FIXED_NOW);

      expect(res.ok).toBe(true);
      expect(res.fields.component).toBe("PLATELETS");
      expect(res.fields.bloodGroup).toBe("AB+");
      expect(res.fields.unitsRequested).toBe(1);
      expect(res.fields.urgency).toBe("HIGH");
      expect(res.fields.neededBy).toBe("2026-09-18T15:30:00.000Z");
    });

    it("Case 5: Mixed Hindi + English", () => {
      const text = "B+ PRBC 2 units urgently chahiye kal subah tak";
      const res = parseRequisition(text, FIXED_NOW);

      expect(res.ok).toBe(true);
      expect(res.fields.component).toBe("RBC");
      expect(res.fields.bloodGroup).toBe("B+");
      expect(res.fields.unitsRequested).toBe(2);
      expect(res.fields.urgency).toBe("HIGH");
      // tomorrow morning = 08:00 IST tomorrow (Sept 19) = 02:30 UTC Sept 19
      expect(res.fields.neededBy).toBe("2026-09-19T02:30:00.000Z");
    });
  });

  // -------------------------------------------------------------------------
  // 4. Relative Time Resolutions
  // -------------------------------------------------------------------------
  describe("Relative Time Expressions in IST", () => {
    it("Case 6: English 'tonight' -> 21:00 IST today", () => {
      const res = parseRequisition("O+ platelets tonight", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-18T15:30:00.000Z");
    });

    it("Case 7: Tamil 'இன்று இரவு' -> 21:00 IST today", () => {
      const res = parseRequisition("O+ தட்டணுக்கள் இன்று இரவு", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-18T15:30:00.000Z");
    });

    it("Case 8: Hindi 'आज रात' -> 21:00 IST today", () => {
      const res = parseRequisition("O+ प्लेटलेट्स आज रात", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-18T15:30:00.000Z");
    });

    it("Case 9: English 'tomorrow morning' -> 08:00 IST tomorrow", () => {
      const res = parseRequisition("A- RBC tomorrow morning", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-19T02:30:00.000Z");
    });

    it("Case 10: Tamil 'நாளை காலை' -> 08:00 IST tomorrow", () => {
      const res = parseRequisition("A- சிவப்பணுக்கள் நாளை காலை", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-19T02:30:00.000Z");
    });

    it("Case 11: Hindi 'कल सुबह' -> 08:00 IST tomorrow", () => {
      const res = parseRequisition("A- लाल रक्त कोशिकाएं कल सुबह", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-19T02:30:00.000Z");
    });

    it("Case 12: English 'within 6 hours' -> now + 6h", () => {
      const res = parseRequisition("B+ platelets within 6 hours", FIXED_NOW);
      // FIXED_NOW is 10:00 UTC -> 10 + 6 = 16:00 UTC
      expect(res.fields.neededBy).toBe("2026-09-18T16:00:00.000Z");
    });

    it("Case 13: Tamil '4 மணி நேரத்திற்குள்' -> now + 4h", () => {
      const res = parseRequisition("B+ தட்டணுக்கள் 4 மணி நேரத்திற்குள்", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-18T14:00:00.000Z");
    });

    it("Case 14: Hindi '3 घंटे के भीतर' -> now + 3h", () => {
      const res = parseRequisition("B+ प्लेटलेट्स 3 घंटे के भीतर", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-18T13:00:00.000Z");
    });

    it("Case 15: Bare English weekday -> next occurrence at 12:00 IST", () => {
      // FIXED_NOW is Friday Sept 18, 2026.
      // Next Monday is Sept 21. 12:00 IST = 06:30 UTC on Sept 21.
      const res = parseRequisition("Need O+ plasma by Monday", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-21T06:30:00.000Z");
    });

    it("Case 16: Bare Tamil weekday -> next occurrence at 12:00 IST", () => {
      // Next Sunday (ஞாயிறு) is Sept 20. 12:00 IST = 06:30 UTC on Sept 20.
      const res = parseRequisition("O+ பிளாஸ்மா ஞாயிறு தேவை", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-20T06:30:00.000Z");
    });

    it("Case 17: Bare Hindi weekday -> next occurrence at 12:00 IST", () => {
      // Next Tuesday (मंगलवार) is Sept 22. 12:00 IST = 06:30 UTC on Sept 22.
      const res = parseRequisition("O+ प्लाज्मा मंगलवार", FIXED_NOW);
      expect(res.fields.neededBy).toBe("2026-09-22T06:30:00.000Z");
    });

    it("Case 18: Boundary case around 23:00 IST crossing date line in UTC", () => {
      // 2026-09-18 23:00:00 IST = 2026-09-18 17:30:00 UTC
      const lateNightNow = new Date("2026-09-18T17:30:00.000Z");
      // "tomorrow morning" is 08:00 IST on Sept 19.
      // 08:00 IST on Sept 19 = 02:30 UTC on Sept 19.
      const res = parseRequisition("Urgent: O+ platelets tomorrow morning", lateNightNow);
      expect(res.fields.neededBy).toBe("2026-09-19T02:30:00.000Z");
    });
  });

  // -------------------------------------------------------------------------
  // 5. Blood Group Notation Variants
  // -------------------------------------------------------------------------
  describe("Blood Group Notation Variants", () => {
    it("Case 19: AB+", () => {
      const res = parseRequisition("AB+ platelets", FIXED_NOW);
      expect(res.fields.bloodGroup).toBe("AB+");
    });

    it("Case 20: AB positive", () => {
      const res = parseRequisition("AB positive platelets", FIXED_NOW);
      expect(res.fields.bloodGroup).toBe("AB+");
    });

    it("Case 21: ab pos", () => {
      const res = parseRequisition("ab pos platelets", FIXED_NOW);
      expect(res.fields.bloodGroup).toBe("AB+");
    });

    it("Case 22: A -ve", () => {
      const res = parseRequisition("A -ve RBC", FIXED_NOW);
      expect(res.fields.bloodGroup).toBe("A-");
    });

    it("Case 23: O− (Unicode minus U+2212)", () => {
      const res = parseRequisition("O\u2212 platelets", FIXED_NOW);
      expect(res.fields.bloodGroup).toBe("O-");
    });

    it("Case 24: Tamil ஏ பாசிட்டிவ் (A+)", () => {
      const res = parseRequisition("ஏ பாசிட்டிவ் தட்டணுக்கள்", FIXED_NOW);
      expect(res.fields.bloodGroup).toBe("A+");
    });

    it("Case 25: Hindi बी नेगेटिव (B-)", () => {
      const res = parseRequisition("बी नेगेटिव रक्त", FIXED_NOW);
      expect(res.fields.bloodGroup).toBe("B-");
    });
  });

  // -------------------------------------------------------------------------
  // 6. Ambiguity, Edge Cases & Fallbacks
  // -------------------------------------------------------------------------
  describe("Ambiguity & Edge Cases", () => {
    it("Case 26: Two different blood groups -> ambiguity, neither extracted", () => {
      const text = "Urgent requirement: either A+ or B+ platelets 2 units tonight";
      const res = parseRequisition(text, FIXED_NOW);

      expect(res.ok).toBe(true); // component is known
      expect(res.fields.bloodGroup).toBe(null);
      expect(res.confidence.bloodGroup).toBe(0);
      expect(res.warnings.some((w) => w.toLowerCase().includes("conflicting blood groups"))).toBe(true);
    });

    it("Case 27: Repeated same blood group -> extracts reliably", () => {
      const text = "Need O+ blood, patient is O positive urgently";
      const res = parseRequisition(text, FIXED_NOW);

      expect(res.fields.bloodGroup).toBe("O+");
      expect(res.confidence.bloodGroup).toBe(1.0);
    });

    it("Case 28: Missing time expression -> neededBy is null with warning", () => {
      const text = "Need 2 units of B+ RBC for surgery";
      const res = parseRequisition(text, FIXED_NOW);

      expect(res.ok).toBe(true);
      expect(res.fields.neededBy).toBe(null);
      expect(res.confidence.neededBy).toBe(0);
      expect(res.warnings).toContain("no time expression found");
    });

    it("Case 29: Complete garbage input -> ok is false", () => {
      const text = "Random hospital chat message with no blood details 12345 lorem ipsum";
      const res = parseRequisition(text, FIXED_NOW);

      expect(res.ok).toBe(false);
      expect(res.fields.component).toBe(null);
      expect(res.fields.bloodGroup).toBe(null);
    });

    it("Case 30: Empty text input", () => {
      const res = parseRequisition("", FIXED_NOW);
      expect(res.ok).toBe(false);
      expect(res.warnings).toContain("Input text is empty");
    });

    it("Case 31: Word numbers for quantity", () => {
      const resEn = parseRequisition("two units of platelets O-", FIXED_NOW);
      expect(resEn.fields.unitsRequested).toBe(2);

      const resTa = parseRequisition("இரண்டு யூனிட் தட்டணுக்கள் O-", FIXED_NOW);
      expect(resTa.fields.unitsRequested).toBe(2);

      const resHi = parseRequisition("तीन यूनिट प्लेटलेट्स O-", FIXED_NOW);
      expect(resHi.fields.unitsRequested).toBe(3);
    });

    it("Case 32: Unmatched tokens surface clinical details for review", () => {
      const text = "KMCH Hospital Ward 4 urgent O+ platelets 2 units by tonight patient Ram";
      const res = parseRequisition(text, FIXED_NOW);

      expect(res.unmatchedTokens).toContain("KMCH");
      expect(res.unmatchedTokens).toContain("Ward");
      expect(res.unmatchedTokens).toContain("Ram");
    });
  });
});
