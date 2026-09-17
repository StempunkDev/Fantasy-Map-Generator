import { describe, expect, it } from "vitest";
import { fromLegacySlots, ICE_SLOT, STATES_SLOT, toLegacySlots } from "./index";

const states = [
  { i: 0, name: "Neutrals" },
  { i: 1, name: "Anarres", military: [{ i: 0, name: "1st" }], alert: 1.5 },
  { i: 2, name: "Urras", military: [] }
];
const ice = [{ i: 0, type: "glacier", points: [[1, 2]] }];

const slots = (): string[] => {
  const raw: string[] = [];
  raw[STATES_SLOT] = JSON.stringify(states);
  raw[ICE_SLOT] = JSON.stringify(ice);
  return raw;
};

describe("legacy slots", () => {
  it("splits slot 14 into the states and military slices", () => {
    const data = fromLegacySlots(slots());
    expect(data.states).toEqual([
      { i: 0, name: "Neutrals" },
      { i: 1, name: "Anarres" },
      { i: 2, name: "Urras" }
    ]);
    expect(data.military).toEqual({ 1: { regiments: [{ i: 0, name: "1st" }], alert: 1.5 }, 2: { regiments: [] } });
    expect(data.ice).toEqual(ice);
  });

  it("round-trips a whole body back to the same slots", () => {
    const written = toLegacySlots(fromLegacySlots(slots()));
    expect(JSON.parse(written[STATES_SLOT])).toEqual(states);
    expect(JSON.parse(written[ICE_SLOT])).toEqual(ice);
  });

  it("reads a file saved before the map had ice", () => {
    const raw = slots();
    delete raw[ICE_SLOT];
    expect(fromLegacySlots(raw).ice).toEqual([]);
  });
});
