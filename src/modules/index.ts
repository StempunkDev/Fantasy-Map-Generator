// The registries import these and spread them in; a module never registers itself.
// Ordered by generation: states must be deserialized before military writes its armies back onto it.
import { IceModule } from "./ice";
import type { MapModule } from "./map-module";
import { MilitaryModule } from "./military";
import { StatesModule } from "./states";

export const Modules: readonly MapModule[] = [IceModule, StatesModule, MilitaryModule];

export type { MapModule, ModuleSlice } from "./map-module";
export { IceModule, MilitaryModule, StatesModule };
