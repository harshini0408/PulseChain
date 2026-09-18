/**
 * shared/src/parsing/keywords.ts
 *
 * Auditable, deterministic lookup tables for multilingual blood requisition parsing
 * across Tamil (ta), Hindi (hi), and English (en) + common transliterations.
 *
 * NOTE ON HUMAN REVIEW:
 * Entries marked with `// VERIFY:` require native speaker or clinical review before
 * production use. If unsure of an uncommon dialect or phrase, prefer omission.
 */

import type { Component, Urgency } from "../enums.js";

// ---------------------------------------------------------------------------
// 1. Component Keyword Tables
// ---------------------------------------------------------------------------

export interface ComponentEntry {
  component: Component;
  terms: string[];
  isTransliterated?: boolean;
}

export const COMPONENT_KEYWORDS: ComponentEntry[] = [
  {
    component: "PLATELETS",
    terms: [
      // English & Clinical Acronyms
      "platelets",
      "platelet",
      "plt",
      "plts",
      "sdp",
      "rdp",
      "single donor platelets",
      "random donor platelets",
      // Tamil (ta)
      "தட்டணுக்கள்",
      "தட்டணு",
      "பிளேட்லெட்", // VERIFY: Tamil phonetic transliteration of platelet
      "பிளேட்லெட்டுகள்", // VERIFY: Tamil phonetic plural
      // Hindi (hi)
      "प्लेटलेट्स",
      "प्लेटलेट",
      "बिम्बाणु",
      // Transliterated / WhatsApp vernacular
      "thattanukkal",
      "thattanu",
      "bimbanu",
    ],
  },
  {
    component: "RBC",
    terms: [
      // English & Clinical Acronyms
      "rbc",
      "prbc",
      "packed red blood cells",
      "red blood cells",
      "red blood cell",
      "red cells",
      "packed cells",
      "whole blood",
      "wb",
      // Tamil (ta)
      "இரத்த சிவப்பணுக்கள்",
      "சிவப்பணுக்கள்",
      "சிவப்பு அணுக்கள்",
      "இரத்தம்",
      "ரத்தம்",
      // Hindi (hi)
      "लाल रक्त कोशिकाएं",
      "लाल रक्त कोशिका",
      "रक्त",
      "खून",
      "आरबीसी",
      "पीआरबीसी",
      // Transliterated / WhatsApp vernacular
      "sivappu anukkal",
      "raththam",
      "rattham",
      "iraththam",
      "laal rakt",
      "rakt",
      "khoon",
    ],
  },
  {
    component: "PLASMA",
    terms: [
      // English & Clinical Acronyms
      "plasma",
      "ffp",
      "fresh frozen plasma",
      // Tamil (ta)
      "பிளாஸ்மா",
      "திரவ பிளாஸ்மா", // VERIFY: Tamil term for liquid plasma
      // Hindi (hi)
      "प्लाज्मा",
      "ताजा प्लाज्मा", // VERIFY: Hindi term for fresh plasma
      // Transliterated
      "thirava plasma",
      "taaza plasma",
    ],
  },
];

// ---------------------------------------------------------------------------
// 2. Urgency Keyword Tables
// ---------------------------------------------------------------------------

export interface UrgencyEntry {
  urgency: Urgency;
  terms: string[];
}

export const URGENCY_KEYWORDS: UrgencyEntry[] = [
  {
    urgency: "CRITICAL",
    terms: [
      // English
      "stat",
      "critical",
      "emergency",
      "immediate",
      "immediately",
      "sos",
      "life threatening",
      "urgently needed",
      // Tamil (ta)
      "அவசரம்",
      "மிக அவசரம்",
      "உடனடியாக",
      "உடனே",
      "அவசரநிலை",
      // Hindi (hi)
      "आपातकालीन",
      "तुरंत",
      "अति आवश्यक",
      "अत्यंत आवश्यक",
      "फौरन",
      "तत्काल",
      "इमरजेंसी",
      // Transliterated
      "avasaram",
      "miga avasaram",
      "udanadiyaaga",
      "udane",
      "aapatkaalin",
      "turant",
      "phauran",
      "tatkal",
    ],
  },
  {
    urgency: "HIGH",
    terms: [
      // English
      "urgent",
      "urgently",
      "priority",
      "high priority",
      "asap",
      "as soon as possible",
      "needed soon",
      // Tamil (ta)
      "முக்கியம்",
      "விரைவில்",
      "சீக்கிரம்",
      // Hindi (hi)
      "आवश्यक",
      "जरूरी",
      "शीघ्र",
      "जल्दी",
      // Transliterated
      "mukkiyam",
      "viraivil",
      "seekkiram",
      "zaroori",
      "jaruri",
      "shighra",
      "jaldi",
      "aavashyak",
    ],
  },
];

// ---------------------------------------------------------------------------
// 3. Relative Time Keywords
// ---------------------------------------------------------------------------

export type RelativeTimeType =
  | "tonight"
  | "tomorrow_morning"
  | "today"
  | "tomorrow"
  | "weekday";

export interface RelativeTimeEntry {
  type: RelativeTimeType;
  targetHourIst?: number; // hour in IST (e.g. 21 for 21:00 IST)
  terms: string[];
  weekdayIndex?: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

export const RELATIVE_TIME_KEYWORDS: RelativeTimeEntry[] = [
  {
    type: "tonight",
    targetHourIst: 21,
    terms: [
      "tonight",
      "this night",
      "by tonight",
      "இன்று இரவு",
      "இன்றிரவு",
      "இன்னைக்கு நைட்டு", // VERIFY: colloquial Tamil spoken WhatsApp phrasing
      "आज रात",
      "आज रात्रि",
      "aaj raat",
      "innaiku night",
    ],
  },
  {
    type: "tomorrow_morning",
    targetHourIst: 8,
    terms: [
      "tomorrow morning",
      "tmrw morning",
      "tmrw mrng",
      "tomorrow mrng",
      "tmr morning",
      "நாளை காலை",
      "நாளைக்கு காலையில", // VERIFY: colloquial Tamil spoken WhatsApp phrasing
      "कल सुबह",
      "कल प्रातः",
      "kal subah",
      "kal subha",
      "naalai kaalai",
    ],
  },
  {
    type: "today",
    targetHourIst: 18,
    terms: [
      "today",
      "by today",
      "இன்று",
      "இன்னைக்கு", // VERIFY: colloquial Tamil phrasing
      "आज",
      "आज ही",
      "indru",
      "innaiku",
      "aaj",
    ],
  },
  {
    type: "tomorrow",
    targetHourIst: 12,
    terms: [
      "tomorrow",
      "tmrw",
      "tmr",
      "நாளை",
      "நாளைக்கு", // VERIFY: colloquial Tamil phrasing
      "कल",
      "naalai",
      "naalaikku",
      "kal",
    ],
  },
  // Bare Weekdays (Next occurrence at 12:00 IST)
  {
    type: "weekday",
    weekdayIndex: 0,
    targetHourIst: 12,
    terms: ["sunday", "sun", "ஞாயிறு", "रविवार", "itwar", "ravivar", "gnayiru"],
  },
  {
    type: "weekday",
    weekdayIndex: 1,
    targetHourIst: 12,
    terms: ["monday", "mon", "திங்கள்", "सोमवार", "somvar", "thingal"],
  },
  {
    type: "weekday",
    weekdayIndex: 2,
    targetHourIst: 12,
    terms: ["tuesday", "tue", "செவ்வாய்", "मंगलवार", "mangalvar", "sevvai"],
  },
  {
    type: "weekday",
    weekdayIndex: 3,
    targetHourIst: 12,
    terms: ["wednesday", "wed", "புதன்", "बुधवार", "budhvar", "budhan"],
  },
  {
    type: "weekday",
    weekdayIndex: 4,
    targetHourIst: 12,
    terms: ["thursday", "thu", "வியாழன்", "गुरुवार", "बृहस्पतिवार", "guruvar", "viyazhan"],
  },
  {
    type: "weekday",
    weekdayIndex: 5,
    targetHourIst: 12,
    terms: ["friday", "fri", "வெள்ளி", "शुक्रवार", "shukravar", "velli"],
  },
  {
    type: "weekday",
    weekdayIndex: 6,
    targetHourIst: 12,
    terms: ["saturday", "sat", "சனி", "शनिवार", "shanivar", "sani"],
  },
];

// ---------------------------------------------------------------------------
// 4. Number Words for Units Requested
// ---------------------------------------------------------------------------

export const NUMBER_WORDS: Record<string, number> = {
  // English
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  // Tamil
  ஒன்று: 1,
  ஒரு: 1,
  இரண்டு: 2,
  ரெண்டு: 2,
  மூன்று: 3,
  மூணு: 3,
  நான்கு: 4,
  நாலு: 4,
  ஐந்து: 5,
  அஞ்சு: 5,
  // Hindi
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  छह: 6,
};
