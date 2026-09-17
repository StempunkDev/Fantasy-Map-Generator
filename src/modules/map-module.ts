// A map feature described in one place: its pipeline steps, layer, dialogs and data.
// Modules are plain data the registries read; they never register themselves. See docs/prd/feature-modules.md
import type { z } from "zod";
import type { LayerId } from "@/components/layers";
import type { GenerationPipelineStepId } from "@/generators/generation-pipeline";

export interface MapModule {
  id: string; // key of the module's slice in the keyed data model
  steps?: GenerationPipelineStepId[]; // ids in generation-pipeline.ts; says nothing about the erase list
  layer?: LayerId;
  controllers?: Record<string, () => Promise<unknown>>;
  styles?: z.ZodRawShape; // spread into stylesSchema
  options?: { map?: ModuleOptions; generation?: ModuleOptions }; // spread into optionsSchema and its defaults
  data?: ModuleSlice; // the keyed model's shape, never the .map file's — see services/io/legacy
}

export interface ModuleOptions {
  schema: z.ZodRawShape;
  defaults(): Record<string, unknown>;
}

export interface ModuleSlice {
  serialize(): unknown;
  deserialize(slice: unknown): void;
}

// Declare modules with `satisfies MapModule`, never `: MapModule`, and declare `controllers` as its own
// const: annotating either way contextually types the loaders to Promise<unknown>, which collapses the
// Controllers registry to `object` and loses every dialog's methods.
