import { describe, expect, it } from "vitest";
import { foldArmies, readArmies } from "./military";
import type { LegacyState } from "./states";

// every shape slot 14 can hold: armies with and without an alert, the neutrals state that never
// gets a `military` key at all, and a removed state
const payload = [
  { i: 0, name: "Neutrals" },
  { i: 1, name: "Anarres", military: [{ i: 0, name: "1st" }], alert: 1.5 },
  { i: 2, name: "Urras", military: [{ i: 0, name: "2nd" }] },
  { i: 3, name: "Gone", removed: true }
] as unknown as LegacyState[];

describe("legacy military adapter", () => {
  it("keys armies by state, skipping states that have none", () => {
    expect(readArmies(payload)).toEqual({
      1: { regiments: [{ i: 0, name: "1st" }], alert: 1.5 },
      2: { regiments: [{ i: 0, name: "2nd" }] }
    });
  });

  it("folds armies back so the slot is unchanged", () => {
    const states = payload.map(state => ({ ...state })) as LegacyState[];
    const armies = readArmies(states);
    for (const state of states) {
      delete state.military;
      delete state.alert;
    }
    expect(foldArmies(states, armies)).toEqual(payload);
  });

  it("restores key presence, not just values", () => {
    const states = [
      { i: 0, name: "Neutrals" },
      { i: 2, name: "Urras" }
    ] as unknown as LegacyState[];
    foldArmies(states, readArmies(payload));

    expect("military" in states[0]).toBe(false); // must not become military: []
    expect("alert" in states[0]).toBe(false);
    expect("alert" in states[1]).toBe(false); // Urras had regiments but no alert
    expect(states[1].military).toEqual([{ i: 0, name: "2nd" }]);
  });
});
