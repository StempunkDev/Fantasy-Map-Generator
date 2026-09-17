// States: slot 14 holds the states, but a legacy state also carries `military` and `alert`, which the
// model moves to the military module. This adapter only adds and removes that pair; see ./military.ts
// for what fills it.
import type { State } from "@/generators/states-generator";
import type { ModelState } from "@/modules/states";

export const STATES_SLOT = 14;

/** a state as slot 14 stores it: the model's state plus the military module's fields */
export type LegacyState = State;

/** copies, so folding the armies in never touches pack.states */
export function writeStates(slice: ModelState[]): LegacyState[] {
  return slice.map(state => ({ ...state }) as LegacyState);
}

export function readStates(payload: LegacyState[]): ModelState[] {
  return payload.map(({ military, alert, ...state }) => state);
}
