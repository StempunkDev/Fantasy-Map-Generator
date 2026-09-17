import { describe, expect, it } from "vitest";
import type { PackedGraph } from "@/types/PackedGraph";
import { IceModule } from "./ice";
import { MilitaryModule } from "./military";
import { StatesModule } from "./states";

const stubPack = (states: unknown[] = [], ice?: unknown[]): void => {
  globalThis.pack = { states, ...(ice && { ice }) } as unknown as PackedGraph;
};

const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe("IceModule.data", () => {
  it("round-trips glaciers and icebergs", () => {
    const ice = [
      { i: 0, type: "glacier", points: [[1, 2]] },
      { i: 1, type: "iceberg", points: [[3, 4]], cellId: 7, size: 0.5 }
    ];
    stubPack([], ice);
    const wire = roundTrip(IceModule.data.serialize());

    stubPack();
    IceModule.data.deserialize(wire);
    expect(pack.ice).toEqual(ice);
  });

  it("defaults when pack.ice was never initialized", () => {
    stubPack();
    expect(IceModule.data.serialize()).toEqual([]);

    IceModule.data.deserialize(undefined);
    expect(pack.ice).toEqual([]);
  });
});

describe("StatesModule.data", () => {
  it("leaves the military module's fields out of its slice", () => {
    stubPack([{ i: 1, name: "Anarres", military: [{ i: 0 }], alert: 2 }]);
    expect(StatesModule.data.serialize()).toEqual([{ i: 1, name: "Anarres" }]);
  });

  it("round-trips the states themselves", () => {
    const states = [
      { i: 0, name: "Neutrals" },
      { i: 1, name: "Anarres", capital: 4, treasury: 10 }
    ];
    stubPack(states);
    const wire = roundTrip(StatesModule.data.serialize());

    stubPack();
    StatesModule.data.deserialize(wire);
    expect(pack.states).toEqual(states);
  });
});

describe("MilitaryModule.data", () => {
  it("keys armies by state and writes them back onto pack.states", () => {
    const regiments = [{ i: 0, name: "1st Regiment" }];
    stubPack([
      { i: 0, name: "Neutrals" },
      { i: 1, name: "Anarres", military: regiments, alert: 1.5 }
    ]);
    const wire = roundTrip(MilitaryModule.data.serialize());
    expect(wire).toEqual({ 1: { regiments, alert: 1.5 } });

    stubPack([
      { i: 0, name: "Neutrals" },
      { i: 1, name: "Anarres" }
    ]);
    MilitaryModule.data.deserialize(wire);
    expect(pack.states[1].military).toEqual(regiments);
    expect(pack.states[1].alert).toBe(1.5);
  });

  it("gives a state with no armies no entry, and no key back", () => {
    stubPack([{ i: 0, name: "Neutrals" }]);
    expect(MilitaryModule.data.serialize()).toEqual({});

    MilitaryModule.data.deserialize({});
    expect("military" in pack.states[0]).toBe(false);
    expect("alert" in pack.states[0]).toBe(false);
  });
});
