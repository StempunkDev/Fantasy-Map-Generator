// The keyed model <-> the positional .map body. The only code that knows a slot index, or that states
// and military share one. Delete once the body is keyed, see docs/architecture/future-data-model.md
import type { Ice } from "@/generators/ice-generator";
import type { Armies } from "@/modules/military";
import type { ModelState } from "@/modules/states";
import type { ModuleData } from "../module-data";
import { ICE_SLOT, readIce, writeIce } from "./ice";
import { foldArmies, readArmies } from "./military";
import { readStates, STATES_SLOT, writeStates } from "./states";

export { ICE_SLOT, STATES_SLOT };

/** the slices the adapters below translate, named once so the loop stays untyped */
interface ModelSlices {
  states: ModelState[];
  military: Armies;
  ice: Ice[];
}

export function toLegacySlots(data: ModuleData): Record<number, string> {
  const { states, military, ice } = data as unknown as ModelSlices;
  return {
    [STATES_SLOT]: JSON.stringify(foldArmies(writeStates(states), military)),
    [ICE_SLOT]: writeIce(ice)
  };
}

export function fromLegacySlots(raw: string[]): ModuleData {
  const states: LegacyPayload = raw[STATES_SLOT] ? JSON.parse(raw[STATES_SLOT]) : [];
  return { states: readStates(states), military: readArmies(states), ice: readIce(raw[ICE_SLOT]) };
}

type LegacyPayload = Parameters<typeof readStates>[0];
