import { describe, it, expect } from "vitest";
import { compatibilityLevel, isUsable } from "../src/compatibility.js";
import { BLOOD_GROUPS } from "../src/enums.js";

describe("compatibilityLevel — platelets", () => {
  it("O- donor → O- recipient = IDENTICAL", () => {
    expect(compatibilityLevel("PLATELETS", "O-", "O-")).toBe("IDENTICAL");
  });

  it("O- donor → A+ recipient = COMPATIBLE (Rh- to Rh+ OK for platelets)", () => {
    expect(compatibilityLevel("PLATELETS", "O-", "A+")).toBe("COMPATIBLE");
  });

  it("A donor → B recipient = INCOMPATIBLE", () => {
    expect(compatibilityLevel("PLATELETS", "A+", "B+")).toBe("INCOMPATIBLE");
    expect(compatibilityLevel("PLATELETS", "A-", "B-")).toBe("INCOMPATIBLE");
  });
});

describe("compatibilityLevel — RBC", () => {
  it("O- donor → any recipient = COMPATIBLE (universal donor)", () => {
    for (const bg of BLOOD_GROUPS) {
      if (bg === "O-") {
        expect(compatibilityLevel("RBC", "O-", bg)).toBe("IDENTICAL");
      } else {
        expect(compatibilityLevel("RBC", "O-", bg)).toBe("COMPATIBLE");
      }
    }
  });

  it("AB+ recipient accepts any donor = COMPATIBLE", () => {
    for (const bg of BLOOD_GROUPS) {
      if (bg === "AB+") {
        expect(compatibilityLevel("RBC", bg, "AB+")).toBe("IDENTICAL");
      } else {
        expect(compatibilityLevel("RBC", bg, "AB+")).toBe("COMPATIBLE");
      }
    }
  });

  it("A donor → B recipient = INCOMPATIBLE", () => {
    expect(compatibilityLevel("RBC", "A+", "B+")).toBe("INCOMPATIBLE");
    expect(compatibilityLevel("RBC", "A-", "B-")).toBe("INCOMPATIBLE");
  });

  it("Rh+ donor → Rh- recipient = INCOMPATIBLE", () => {
    expect(compatibilityLevel("RBC", "O+", "O-")).toBe("INCOMPATIBLE");
    expect(compatibilityLevel("RBC", "A+", "A-")).toBe("INCOMPATIBLE");
    expect(compatibilityLevel("RBC", "B+", "B-")).toBe("INCOMPATIBLE");
    expect(compatibilityLevel("RBC", "AB+", "AB-")).toBe("INCOMPATIBLE");
  });
});

describe("compatibilityLevel — plasma", () => {
  it("AB plasma donor → any recipient = COMPATIBLE (universal plasma donor)", () => {
    for (const bg of BLOOD_GROUPS) {
      if (bg === "AB+" || bg === "AB-") {
        expect(["IDENTICAL", "COMPATIBLE"]).toContain(compatibilityLevel("PLASMA", "AB+", bg));
      } else {
        expect(compatibilityLevel("PLASMA", "AB+", bg)).toBe("COMPATIBLE");
      }
    }
  });

  it("Rh does not matter for plasma", () => {
    expect(compatibilityLevel("PLASMA", "AB+", "O-")).toBe("COMPATIBLE");
    expect(compatibilityLevel("PLASMA", "AB-", "O+")).toBe("COMPATIBLE");
    expect(compatibilityLevel("PLASMA", "A+", "A-")).toBe("COMPATIBLE");
  });

  it("A plasma → B recipient = INCOMPATIBLE", () => {
    expect(compatibilityLevel("PLASMA", "A+", "B+")).toBe("INCOMPATIBLE");
    expect(compatibilityLevel("PLASMA", "A-", "B+")).toBe("INCOMPATIBLE");
  });
});

describe("isUsable", () => {
  it("IDENTICAL is usable", () => {
    expect(isUsable("IDENTICAL")).toBe(true);
  });

  it("COMPATIBLE is usable", () => {
    expect(isUsable("COMPATIBLE")).toBe(true);
  });

  it("ACCEPTABLE is usable", () => {
    expect(isUsable("ACCEPTABLE")).toBe(true);
  });

  it("INCOMPATIBLE is NOT usable", () => {
    expect(isUsable("INCOMPATIBLE")).toBe(false);
  });
});
