import { z } from "zod";
import type { State } from "@/generators/states-generator";
import { filter, opacity, strokeWidth } from "@/generators/style-attrs";
import { count, nonNegative } from "@/utils/schemaUtils";
import type { MapModule } from "./map-module";

/** a state as the model holds it: its armies and war alert belong to the military module */
export type ModelState = Omit<State, "military" | "alert">;

// declared apart from the module: inlining these would widen their types, see map-module.ts
const controllers = {
  StatesEditor: () => import("@/controllers/states-editor").then(m => m.StatesEditor),
  DiplomacyEditor: () => import("@/controllers/diplomacy-editor").then(m => m.DiplomacyEditor)
};

const styles = {
  states: z.strictObject({
    statesBody: z.strictObject({ attrs: z.strictObject({ opacity, filter }) }),
    statesHalo: z.strictObject({
      attrs: z.strictObject({ opacity, "stroke-width": strokeWidth, filter }),
      options: z.strictObject({ width: z.number() })
    })
  })
};

// what the generator is asked for, so it lives in options.generation, not in the .map file
const options = {
  generation: {
    schema: { states: z.strictObject({ limit: count, sizeVariety: nonNegative, growthRate: nonNegative }) },
    defaults: () => ({ states: { limit: 18, sizeVariety: 4, growthRate: 1 } })
  }
};

export const StatesModule = {
  id: "states",
  steps: ["states", "stateStatistics", "stateForms", "taxes"],
  layer: "states", // `borders` is shared with provinces and stays in the layer list
  controllers,
  styles,
  options,
  data: {
    serialize: (): ModelState[] => pack.states.map(({ military, alert, ...state }) => state),
    deserialize: (slice: unknown): void => {
      pack.states = (Array.isArray(slice) ? slice : []) as State[];
    }
  }
} satisfies MapModule;
