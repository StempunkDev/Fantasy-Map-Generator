// A map feature described in one place: its pipeline steps, layer, dialogs and data.
// Modules are plain data the registries read; they never register themselves. See docs/prd/feature-modules.md
import type { z } from "zod";
import type { LayerId } from "@/components/layers";
import type { Loader } from "@/utils/registry";

/**
 * Loaders must be written `async () => (await import(…)).Dialog`. The `.then(m => m.Dialog)` form the
 * Controllers registry uses infers its result from the contextual type, so under `Loader<object>` every
 * dialog would collapse to `object` and the registry would lose its methods.
 */
export type ControllerLoaders = Record<string, Loader<object>>;

/**
 * What a module contributes to the generation pipeline, keyed by the step id that runs it. Not typed by
 * `GenerationPipelineStepId`: that union is derived from the step list, which now names these functions,
 * so constraining here would make the type circular. `modules/index.ts` checks the keys instead.
 */
export type ModuleSteps = Record<string, () => unknown>;

export interface MapModule {
  id: string; // key of the module's slice in the keyed data model
  steps?: ModuleSteps;
  layer?: LayerId;
  controllers?: ControllerLoaders; // spread into the Controllers registry
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

// Declare modules with `satisfies MapModule`, never `: MapModule`: an annotation widens every field to
// the interface's type, and the registries need the exact shapes the module literal spells out.
