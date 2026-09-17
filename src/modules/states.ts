import { z } from "zod";
import type { State } from "@/generators/states-generator";
import { filter, opacity, strokeWidth } from "@/generators/style-attrs";
import { count, nonNegative } from "@/utils/schemaUtils";
import type { MapModule } from "./map-module";

/** a state as the model holds it: its armies and war alert belong to the military module */
export type ModelState = Omit<State, "military" | "alert">;

export const StatesModule = {
  id: "states",
  // the generators are reached through their globals, so a module never pulls one into its chunk
  steps: {
    states: () => States.generate(),
    stateStatistics: () => States.collectStatistics(),
    stateForms: () => States.defineStateForms(),
    taxes: () => States.collectTaxes()
  },
  layer: "states", // `borders` is shared with provinces and stays in the layer list
  controllers: {
    StatesEditor: async () => (await import("@/controllers/states-editor")).StatesEditor,
    DiplomacyEditor: async () => (await import("@/controllers/diplomacy-editor")).DiplomacyEditor
  },
  styles: {
    states: z.strictObject({
      statesBody: z.strictObject({ attrs: z.strictObject({ opacity, filter }) }),
      statesHalo: z.strictObject({
        attrs: z.strictObject({ opacity, "stroke-width": strokeWidth, filter }),
        options: z.strictObject({ width: z.number() })
      })
    })
  },
  options: {
    generation: {
      schema: { states: z.strictObject({ limit: count, sizeVariety: nonNegative, growthRate: nonNegative }) },
      defaults: () => ({ states: { limit: 18, sizeVariety: 4, growthRate: 1 } })
    }
  },
  data: {
    serialize: (): ModelState[] => pack.states.map(({ military, alert, ...state }) => state),
    deserialize: (slice: unknown): void => {
      pack.states = (Array.isArray(slice) ? slice : []) as State[];
    }
  }
} satisfies MapModule;
