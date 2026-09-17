// The registries import these and spread them in; a module never registers itself.
// Ordered by generation: states must be deserialized before military writes its armies back onto it.
import type { GenerationPipelineStepId } from "@/generators/generation-pipeline";
import { IceModule } from "./ice";
import type { MapModule } from "./map-module";
import { MilitaryModule } from "./military";
import { StatesModule } from "./states";

export const Modules: readonly MapModule[] = [IceModule, StatesModule, MilitaryModule];

/** every step a module implements */
export type ModuleStepId = keyof (typeof IceModule.steps & typeof StatesModule.steps & typeof MilitaryModule.steps);

// A module may only implement steps the pipeline declares. This cannot be a constraint on `steps` itself:
// GenerationPipelineStepId is derived from the step list, which names those functions. The error names the step.
type NotInPipeline<T extends never> = T;
export type ModuleStepsAreDeclared = NotInPipeline<Exclude<ModuleStepId, GenerationPipelineStepId>>;

export type { MapModule, ModuleSlice } from "./map-module";
export { IceModule, MilitaryModule, StatesModule };
