import { z } from "zod";
import type { Ice } from "@/generators/ice-generator";
import { color, filter, opacity, strokeAttrs } from "@/generators/style-attrs";
import type { MapModule } from "./map-module";

export const IceModule = {
  id: "ice",
  // the generators are reached through their globals, so a module never pulls one into its chunk
  steps: { ice: () => Ice.generate() },
  layer: "ice",
  controllers: {
    IceEditor: async () => (await import("@/controllers/ice-editor")).IceEditor
  },
  styles: {
    ice: z.strictObject({ attrs: z.strictObject({ opacity, fill: color, ...strokeAttrs, filter }) })
  },
  data: {
    // pack.ice is typed as always present but only exists once Ice.generate() has run
    serialize: (): Ice[] => pack.ice ?? [],
    deserialize: (slice: unknown): void => {
      pack.ice = Array.isArray(slice) ? (slice as Ice[]) : [];
    }
  }
} satisfies MapModule;
