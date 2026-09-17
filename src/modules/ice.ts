import { z } from "zod";
import type { Ice } from "@/generators/ice-generator";
import { color, filter, opacity, strokeAttrs } from "@/generators/style-attrs";
import type { MapModule } from "./map-module";

// declared apart from the module: inlining these would widen their types, see map-module.ts
const controllers = {
  IceEditor: () => import("@/controllers/ice-editor").then(m => m.IceEditor)
};

const styles = {
  ice: z.strictObject({ attrs: z.strictObject({ opacity, fill: color, ...strokeAttrs, filter }) })
};

export const IceModule = {
  id: "ice",
  steps: ["ice"],
  layer: "ice",
  controllers,
  styles,
  data: {
    // pack.ice is typed as always present but only exists once Ice.generate() has run
    serialize: (): Ice[] => pack.ice ?? [],
    deserialize: (slice: unknown): void => {
      pack.ice = Array.isArray(slice) ? (slice as Ice[]) : [];
    }
  }
} satisfies MapModule;
