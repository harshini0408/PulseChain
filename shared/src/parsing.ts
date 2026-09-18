/**
 * shared/src/parsing.ts
 *
 * Deterministic multilingual parser converting free-text blood requisitions
 * in Tamil (ta), Hindi (hi), and English (en) into structured requisition fields.
 * Runs completely locally with zero AWS SDK or network calls.
 */

import type { BloodGroup, Component, Urgency } from "./enums.js";
import { createRequisitionSchema } from "./schemas.js";
import {
  COMPONENT_KEYWORDS,
  URGENCY_KEYWORDS,
  RELATIVE_TIME_KEYWORDS,
  NUMBER_WORDS,
} from "./parsing/keywords.js";

export interface ParseResult {
  ok: boolean;
  detectedLanguage: "ta" | "hi" | "en" | "unknown";
  fields: {
    component: Component | null;
    bloodGroup: BloodGroup | null;
    unitsRequested: number | null;
    urgency: Urgency; // defaults to NORMAL when nothing matches
    neededBy: string | null; // ISO 8601 UTC
  };
  confidence: {
    component: number;
    bloodGroup: number;
    unitsRequested: number;
    urgency: number;
    neededBy: number;
  };
  unmatchedTokens: string[];
  warnings: string[];
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // +05:30 in ms

/**
 * Detect language script:
 * Tamil: \u0B80–\u0BFF
 * Devanagari (Hindi): \u0900–\u097F
 * Latin (English): [A-Za-z]
 */
export function detectLanguage(text: string): "ta" | "hi" | "en" | "unknown" {
  let taCount = 0;
  let hiCount = 0;
  let enCount = 0;

  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0x0b80 && code <= 0x0bff) {
      taCount++;
    } else if (code >= 0x0900 && code <= 0x097f) {
      hiCount++;
    } else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      enCount++;
    }
  }

  if (taCount === 0 && hiCount === 0 && enCount === 0) {
    return "unknown";
  }

  if (taCount >= hiCount && taCount >= enCount) {
    return "ta";
  }
  if (hiCount >= taCount && hiCount >= enCount) {
    return "hi";
  }
  return "en";
}

/**
 * Extract Blood Group with strict ambiguity detection.
 * If two different blood groups appear in the text, extract neither and flag a warning.
 */
function extractBloodGroup(text: string): {
  bloodGroup: BloodGroup | null;
  confidence: number;
  matchedSpans: string[];
  warning?: string;
} {
  // Regex capturing letters (AB, A, B, O, or Tamil/Hindi equivalents)
  // and Rh factor (+, -, pos, neg, ve, or words)
  const rhChars = "\\+\\u2212\\u2013\\u2014\\-";
  const bgRegex = new RegExp(
    `(?:\\b|(?<=[\\s,.;:!?]|^))(AB|A|B|O|ஏபி|ஏ|பி|ஓ|एबी|ए|बी|ओ)\\s*([${rhChars}]|[${rhChars}]?ve|pos(?:itive)?|neg(?:ative)?|பாசிட்டிவ்|பாசிடிவ்|நேர்மறை|நெகட்டிவ்|நெகடிவ்|எதிர்மறை|पॉजिटिव|नेगेटिव|सकारात्मक|नकारात्मक|धनात्मक|ऋणात्मक)(?:\\b|(?=[\\s,.;:!?]|$))`,
    "gi",
  );

  const foundGroups = new Map<BloodGroup, string[]>();
  let match: RegExpExecArray | null;

  while ((match = bgRegex.exec(text)) !== null) {
    const rawGroup = match[1].toUpperCase();
    const rawRh = match[2].toLowerCase();

    // Map letter
    let groupLetter = "";
    if (rawGroup === "AB" || rawGroup === "ஏபி" || rawGroup === "एबी") {
      groupLetter = "AB";
    } else if (rawGroup === "A" || rawGroup === "ஏ" || rawGroup === "ए") {
      groupLetter = "A";
    } else if (rawGroup === "B" || rawGroup === "பி" || rawGroup === "बी") {
      groupLetter = "B";
    } else if (rawGroup === "O" || rawGroup === "ஓ" || rawGroup === "ओ") {
      groupLetter = "O";
    }

    // Map Rh
    let isPositive = false;
    if (
      rawRh.includes("+") ||
      rawRh.includes("pos") ||
      rawRh.includes("பாசி") ||
      rawRh.includes("நேர்மறை") ||
      rawRh.includes("पॉजिटिव") ||
      rawRh.includes("सकारात्मक") ||
      rawRh.includes("धनात्मक")
    ) {
      isPositive = true;
    }

    if (groupLetter) {
      const canonical = `${groupLetter}${isPositive ? "+" : "-"}` as BloodGroup;
      const spans = foundGroups.get(canonical) ?? [];
      spans.push(match[0]);
      foundGroups.set(canonical, spans);
    }
  }

  const uniqueGroups = Array.from(foundGroups.keys());

  if (uniqueGroups.length > 1) {
    return {
      bloodGroup: null,
      confidence: 0,
      matchedSpans: Array.from(foundGroups.values()).flat(),
      warning: `Multiple conflicting blood groups detected: ${uniqueGroups.join(", ")}`,
    };
  }

  if (uniqueGroups.length === 1) {
    const bg = uniqueGroups[0];
    return {
      bloodGroup: bg,
      confidence: 1.0,
      matchedSpans: foundGroups.get(bg) ?? [],
    };
  }

  return {
    bloodGroup: null,
    confidence: 0,
    matchedSpans: [],
  };
}

/**
 * Extract Component from lookup tables.
 */
function extractComponent(text: string): {
  component: Component | null;
  confidence: number;
  matchedSpans: string[];
  warning?: string;
} {
  const lower = text.toLowerCase();
  const matchedComponents = new Map<Component, string[]>();

  for (const entry of COMPONENT_KEYWORDS) {
    for (const term of entry.terms) {
      const termLower = term.toLowerCase();
      // For Latin words, require word boundaries
      const isLatin = /^[a-z\s]+$/.test(termLower);
      let matched = false;

      if (isLatin) {
        const regex = new RegExp(`\\b${termLower}\\b`, "i");
        if (regex.test(lower)) {
          matched = true;
        }
      } else {
        if (lower.includes(termLower)) {
          matched = true;
        }
      }

      if (matched) {
        const list = matchedComponents.get(entry.component) ?? [];
        list.push(term);
        matchedComponents.set(entry.component, list);
        break; // Match first term per component entry
      }
    }
  }

  const uniqueComponents = Array.from(matchedComponents.keys());

  if (uniqueComponents.length > 1) {
    return {
      component: null,
      confidence: 0,
      matchedSpans: Array.from(matchedComponents.values()).flat(),
      warning: `Multiple blood components detected: ${uniqueComponents.join(", ")}`,
    };
  }

  if (uniqueComponents.length === 1) {
    const comp = uniqueComponents[0];
    return {
      component: comp,
      confidence: 1.0,
      matchedSpans: matchedComponents.get(comp) ?? [],
    };
  }

  return {
    component: null,
    confidence: 0,
    matchedSpans: [],
  };
}

/**
 * Extract Urgency. Defaults to NORMAL.
 */
function extractUrgency(text: string): {
  urgency: Urgency;
  confidence: number;
  matchedSpans: string[];
} {
  const lower = text.toLowerCase();

  for (const entry of URGENCY_KEYWORDS) {
    for (const term of entry.terms) {
      const termLower = term.toLowerCase();
      const isLatin = /^[a-z\s]+$/.test(termLower);
      let matched = false;

      if (isLatin) {
        const regex = new RegExp(`\\b${termLower}\\b`, "i");
        if (regex.test(lower)) {
          matched = true;
        }
      } else {
        if (lower.includes(termLower)) {
          matched = true;
        }
      }

      if (matched) {
        return {
          urgency: entry.urgency,
          confidence: 1.0,
          matchedSpans: [term],
        };
      }
    }
  }

  return {
    urgency: "NORMAL",
    confidence: 0.8,
    matchedSpans: [],
  };
}

/**
 * Extract Units Requested.
 */
function extractUnitsRequested(text: string): {
  unitsRequested: number | null;
  confidence: number;
  matchedSpans: string[];
} {
  const lower = text.toLowerCase();

  // 1. Explicit digit + unit keyword: e.g. "2 units", "3 bags", "2 யூனிட்", "1 பாக்கெட்", "4 यूनिट"
  const digitWithUnitRegex =
    /(?:\b|^)(\d+)\s*(?:units?|bags?|pints?|யூனிட்(?:கள்)?|பாக்கெட்(?:கள்)?|यूनिट|बैग)(?=[\s,.;:!?]|$)/i;
  const match1 = digitWithUnitRegex.exec(lower);
  if (match1) {
    const num = parseInt(match1[1], 10);
    if (num > 0 && num <= 50) {
      return {
        unitsRequested: num,
        confidence: 1.0,
        matchedSpans: [match1[0]],
      };
    }
  }

  // 2. Word numbers + unit keyword: e.g. "two units", "இரண்டு யூனிட்", "दो यूनिट"
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    const wordPattern = new RegExp(
      `(?:\\b|^)${word}\\s*(?:units?|bags?|pints?|யூனிட்(?:கள்)?|பாக்கெட்(?:கள்)?|यूनिट|बैग)(?=[\\s,.;:!?]|$)`,
      "i",
    );
    const m = wordPattern.exec(lower);
    if (m) {
      return {
        unitsRequested: num,
        confidence: 1.0,
        matchedSpans: [m[0]],
      };
    }
  }

  // 3. Digit preceding component or blood group: e.g. "2 platelets", "3 PRBC", "1 O+ unit"
  const digitPrecedingRegex =
    /\b(\d+)\s+(?:units?\s+)?(?:of\s+)?(?:platelets?|prbc|rbc|plasma|sdp|rdp|o\+|a\+|b\+|ab\+|o-|a-|b-|ab-)\b/i;
  const match2 = digitPrecedingRegex.exec(lower);
  if (match2) {
    const num = parseInt(match2[1], 10);
    if (num > 0 && num <= 50) {
      return {
        unitsRequested: num,
        confidence: 0.85,
        matchedSpans: [match2[1]],
      };
    }
  }

  return {
    unitsRequested: null,
    confidence: 0,
    matchedSpans: [],
  };
}

/**
 * Resolve relative time expressions against injected `now` in IST (+05:30),
 * then emit ISO 8601 UTC.
 */
function extractNeededBy(
  text: string,
  now: Date,
): {
  neededBy: string | null;
  confidence: number;
  matchedSpans: string[];
  warning?: string;
} {
  const lower = text.toLowerCase();

  // 1. "Within N hours" / "In N hours"
  const hoursRegex =
    /(?:within|in)\s+(\d+)\s*(?:hours?|hrs?|h)\b|(\d+)\s*(?:hours?|hrs?|h)\b|(\d+)\s*(?:மணி நேரத்திற்குள்|மணிக்குள்|மணி நேரம்)|(\d+)\s*(?:घंटे के भीतर|घंटे में|घंटों में)/i;
  const hourMatch = hoursRegex.exec(lower);
  if (hourMatch) {
    const rawN = hourMatch[1] || hourMatch[2] || hourMatch[3] || hourMatch[4];
    if (rawN) {
      const hours = parseInt(rawN, 10);
      if (hours > 0 && hours <= 720) {
        const target = new Date(now.getTime() + hours * 3600 * 1000);
        return {
          neededBy: target.toISOString(),
          confidence: 1.0,
          matchedSpans: [hourMatch[0]],
        };
      }
    }
  }

  // Calculate IST components of `now`
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const istYear = istNow.getUTCFullYear();
  const istMonth = istNow.getUTCMonth();
  const istDate = istNow.getUTCDate();
  const istDay = istNow.getUTCDay();

  // Helper: format IST date/hour into UTC ISO string
  const toUtcIso = (year: number, month: number, day: number, hourIst: number, minIst = 0) => {
    const utcMs = Date.UTC(year, month, day, hourIst, minIst, 0) - IST_OFFSET_MS;
    return new Date(utcMs).toISOString();
  };

  // Check lookup relative time expressions
  for (const entry of RELATIVE_TIME_KEYWORDS) {
    for (const term of entry.terms) {
      const termLower = term.toLowerCase();
      const isLatin = /^[a-z\s]+$/.test(termLower);
      let matched = false;

      if (isLatin) {
        const regex = new RegExp(`\\b${termLower}\\b`, "i");
        if (regex.test(lower)) {
          matched = true;
        }
      } else {
        if (lower.includes(termLower)) {
          matched = true;
        }
      }

      if (matched) {
        if (entry.type === "tonight") {
          // 21:00 IST today
          return {
            neededBy: toUtcIso(istYear, istMonth, istDate, 21, 0),
            confidence: 1.0,
            matchedSpans: [term],
          };
        }

        if (entry.type === "tomorrow_morning") {
          // 08:00 IST tomorrow
          return {
            neededBy: toUtcIso(istYear, istMonth, istDate + 1, 8, 0),
            confidence: 1.0,
            matchedSpans: [term],
          };
        }

        if (entry.type === "today") {
          // 18:00 IST today
          return {
            neededBy: toUtcIso(istYear, istMonth, istDate, 18, 0),
            confidence: 0.85,
            matchedSpans: [term],
          };
        }

        if (entry.type === "tomorrow") {
          // 12:00 IST tomorrow
          return {
            neededBy: toUtcIso(istYear, istMonth, istDate + 1, 12, 0),
            confidence: 0.9,
            matchedSpans: [term],
          };
        }

        if (entry.type === "weekday" && entry.weekdayIndex !== undefined) {
          // Bare weekday: next occurrence at 12:00 IST
          let daysAhead = (entry.weekdayIndex - istDay + 7) % 7;
          if (daysAhead === 0) daysAhead = 7; // strictly next occurrence
          return {
            neededBy: toUtcIso(istYear, istMonth, istDate + daysAhead, 12, 0),
            confidence: 0.9,
            matchedSpans: [term],
          };
        }
      }
    }
  }

  return {
    neededBy: null,
    confidence: 0,
    matchedSpans: [],
    warning: "no time expression found",
  };
}

/**
 * Main deterministic requisition parser.
 */
export function parseRequisition(rawText: string, now: Date = new Date()): ParseResult {
  const warnings: string[] = [];
  const matchedTokensSet = new Set<string>();

  if (!rawText || !rawText.trim()) {
    return {
      ok: false,
      detectedLanguage: "unknown",
      fields: {
        component: null,
        bloodGroup: null,
        unitsRequested: null,
        urgency: "NORMAL",
        neededBy: null,
      },
      confidence: {
        component: 0,
        bloodGroup: 0,
        unitsRequested: 0,
        urgency: 0,
        neededBy: 0,
      },
      unmatchedTokens: [],
      warnings: ["Input text is empty"],
    };
  }

  const detectedLanguage = detectLanguage(rawText);

  // 1. Extract Blood Group
  const bgResult = extractBloodGroup(rawText);
  if (bgResult.warning) warnings.push(bgResult.warning);
  bgResult.matchedSpans.forEach((s) => matchedTokensSet.add(s.toLowerCase()));

  // 2. Extract Component
  const compResult = extractComponent(rawText);
  if (compResult.warning) warnings.push(compResult.warning);
  compResult.matchedSpans.forEach((s) => matchedTokensSet.add(s.toLowerCase()));

  // 3. Extract Urgency
  const urgResult = extractUrgency(rawText);
  urgResult.matchedSpans.forEach((s) => matchedTokensSet.add(s.toLowerCase()));

  // 4. Extract Units Requested
  const unitsResult = extractUnitsRequested(rawText);
  unitsResult.matchedSpans.forEach((s) => matchedTokensSet.add(s.toLowerCase()));

  // 5. Extract NeededBy
  const timeResult = extractNeededBy(rawText, now);
  if (timeResult.warning) warnings.push(timeResult.warning);
  timeResult.matchedSpans.forEach((s) => matchedTokensSet.add(s.toLowerCase()));

  // Missing critical fields warnings
  if (!compResult.component && !compResult.warning) {
    warnings.push("Component could not be identified");
  }
  if (!bgResult.bloodGroup && !bgResult.warning) {
    warnings.push("Blood group could not be identified");
  }

  // 6. Compute unmatched tokens
  // Split on whitespace and punctuation
  const allTokens = rawText
    .split(/[\s,.;:!?()[\]{}"'\\/|]+/)
    .filter((t) => t.length > 0);

  const matchedSubstrings = Array.from(matchedTokensSet);
  const unmatchedTokens = allTokens.filter((token) => {
    const tLower = token.toLowerCase();
    // If token is directly matched or substring of matched phrase
    for (const span of matchedSubstrings) {
      if (span.includes(tLower) || tLower.includes(span)) {
        return false;
      }
    }
    return true;
  });

  // Fallback condition: If both component and bloodGroup are null, ok is false
  const ok = compResult.component !== null || bgResult.bloodGroup !== null;

  // Schema verification: if all fields are present, validate with zod schema
  if (
    compResult.component &&
    bgResult.bloodGroup &&
    unitsResult.unitsRequested &&
    timeResult.neededBy
  ) {
    const validation = createRequisitionSchema.safeParse({
      hospitalId: "TEMP_VALIDATION_ID",
      component: compResult.component,
      bloodGroup: bgResult.bloodGroup,
      unitsRequested: unitsResult.unitsRequested,
      urgency: urgResult.urgency,
      neededBy: timeResult.neededBy,
      source: "PARSED",
      rawText,
    });

    if (!validation.success) {
      for (const err of validation.error.errors) {
        warnings.push(`Schema validation: ${err.path.join(".")}: ${err.message}`);
      }
    }
  }

  return {
    ok,
    detectedLanguage,
    fields: {
      component: compResult.component,
      bloodGroup: bgResult.bloodGroup,
      unitsRequested: unitsResult.unitsRequested,
      urgency: urgResult.urgency,
      neededBy: timeResult.neededBy,
    },
    confidence: {
      component: compResult.confidence,
      bloodGroup: bgResult.confidence,
      unitsRequested: unitsResult.confidence,
      urgency: urgResult.confidence,
      neededBy: timeResult.confidence,
    },
    unmatchedTokens,
    warnings,
  };
}
