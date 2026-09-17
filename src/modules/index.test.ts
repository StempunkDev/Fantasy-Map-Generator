import { describe, expect, it } from "vitest";
import { Modules } from "./index";

describe("Modules", () => {
  it("has no duplicate ids", () => {
    const ids = Modules.map(module => module.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate controller names", () => {
    const names = Modules.flatMap(module => Object.keys(module.controllers ?? {}));
    expect(new Set(names).size).toBe(names.length);
  });

  it("orders states before military, which writes its armies back onto states", () => {
    const ids = Modules.map(module => module.id);
    expect(ids.indexOf("states")).toBeLessThan(ids.indexOf("military"));
  });
});
