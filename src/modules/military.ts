import { z } from "zod";
import { DEFAULT_MILITARY_UNITS } from "@/data/military-units";
import type { Regiment } from "@/generators/military-generator";
import { filter, opacity, strokeAttrs } from "@/generators/style-attrs";
import { ids, nonNegative, positive } from "@/utils/schemaUtils";
import type { MapModule } from "./map-module";

/** the unit catalogue a map is generated from; editable per map, so it lives in options.map */
export const militaryUnit = z.strictObject({
  icon: z.string(),
  name: z.string(),
  rural: nonNegative,
  urban: nonNegative,
  crew: positive,
  power: nonNegative,
  type: z.string(),
  separate: z.number().int(),
  biomes: ids,
  states: ids,
  cultures: ids,
  religions: ids
});

/** a state's forces. Both fields are optional: legacy states carry either independently, or neither */
export interface Army {
  alert?: number;
  regiments?: Regiment[];
}

/** the model keys armies by state id instead of hanging them off the state */
export type Armies = Record<number, Army>;

export const MilitaryModule = {
  id: "military",
  // the generators are reached through their globals, so a module never pulls one into its chunk
  steps: { military: () => Military.generate() },
  layer: "military",
  controllers: {
    MilitaryOverview: async () => (await import("@/controllers/military-overview")).MilitaryOverview,
    RegimentsOverview: async () => (await import("@/controllers/regiments-overview")).RegimentsOverview,
    RegimentEditor: async () => (await import("@/controllers/regiment-editor")).RegimentEditor,
    BattleScreen: async () => (await import("@/controllers/battle-screen")).BattleScreen
  },
  styles: {
    military: z.strictObject({
      attrs: z.strictObject({ opacity, ...strokeAttrs, "fill-opacity": opacity, filter }),
      options: z.strictObject({ fontSize: z.number(), boxSize: z.number() })
    })
  },
  options: {
    map: {
      schema: { military: z.strictObject({ units: z.array(militaryUnit) }) },
      defaults: () => ({ military: { units: DEFAULT_MILITARY_UNITS } })
    }
  },
  // armies stay on pack.states at runtime, so every state.military reader is untouched;
  // only the model's view of them is separate. Deserialize runs after states, see modules/index.ts
  data: {
    serialize: (): Armies => {
      const armies: Armies = {};
      for (const state of pack.states) {
        const army: Army = {};
        if (state.military) army.regiments = state.military;
        if (state.alert !== undefined) army.alert = state.alert;
        if (army.regiments || army.alert !== undefined) armies[state.i] = army;
      }
      return armies;
    },
    deserialize: (slice: unknown): void => {
      const armies = (slice ?? {}) as Armies;
      for (const state of pack.states) {
        const army = armies[state.i];
        if (!army) continue;
        if (army.regiments) state.military = army.regiments;
        if (army.alert !== undefined) state.alert = army.alert;
      }
    }
  }
} satisfies MapModule;
