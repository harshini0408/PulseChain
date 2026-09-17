import { describe, it } from "vitest";

// ABO/Rh compatibility rules require medical review before implementation.
// These tests MUST pass before the demo — implement after compatibility.ts is done.

describe("compatibilityLevel — platelets", () => {
  it.todo("O- donor → O- recipient = IDENTICAL");
  it.todo("O- donor → A+ recipient = COMPATIBLE (Rh- to Rh+ OK for platelets)");
  it.todo("A donor → B recipient = INCOMPATIBLE");
});

describe("compatibilityLevel — RBC", () => {
  it.todo("O- donor → any recipient = COMPATIBLE (universal donor)");
  it.todo("AB+ recipient accepts any donor = COMPATIBLE");
  it.todo("A donor → B recipient = INCOMPATIBLE");
  it.todo("Rh+ donor → Rh- recipient = INCOMPATIBLE");
});

describe("compatibilityLevel — plasma", () => {
  it.todo("AB plasma donor → any recipient = COMPATIBLE (universal plasma donor)");
  it.todo("Rh does not matter for plasma");
  it.todo("A plasma → B recipient = INCOMPATIBLE");
});

describe("isUsable", () => {
  it.todo("IDENTICAL is usable");
  it.todo("COMPATIBLE is usable");
  it.todo("ACCEPTABLE is usable");
  it.todo("INCOMPATIBLE is NOT usable");
});
