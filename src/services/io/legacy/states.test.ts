import { describe, expect, it } from "vitest";
import type { LegacyState } from "./states";
import { readStates, writeStates } from "./states";

const payload = [
  { i: 0, name: "Neutrals" },
  { i: 1, name: "Anarres", capital: 4, military: [{ i: 0 }], alert: 2 }
] as unknown as LegacyState[];

describe("legacy states adapter", () => {
  it("strips the military module's fields and changes nothing else", () => {
    expect(readStates(payload)).toEqual([
      { i: 0, name: "Neutrals" },
      { i: 1, name: "Anarres", capital: 4 }
    ]);
  });

  it("copies, so folding armies in never mutates the model's states", () => {
    const slice = readStates(payload);
    const written = writeStates(slice);
    written[1].alert = 9;
    expect("alert" in slice[1]).toBe(false);
  });
});
