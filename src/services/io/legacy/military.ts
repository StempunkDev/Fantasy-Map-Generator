// Military: the .map body has no slot of its own. Regiments and the war alert are stored inline on
// each state inside slot 14, and only on the states that have them — the generator gives `military`
// to `s.i && !s.removed` only, and `alert` appears only once it has been edited. So the fold must
// restore key presence, not just values: a state that had no `military` must not come back with [].
import type { Armies, Army } from "@/modules/military";
import type { LegacyState } from "./states";

/** writes the armies onto the states of slot 14, in place */
export function foldArmies(states: LegacyState[], armies: Armies): LegacyState[] {
  for (const state of states) {
    const army = armies[state.i];
    if (!army) continue;
    if (army.regiments) state.military = army.regiments;
    if (army.alert !== undefined) state.alert = army.alert;
  }
  return states;
}

export function readArmies(payload: LegacyState[]): Armies {
  const armies: Armies = {};
  for (const state of payload) {
    const army: Army = {};
    if (state.military) army.regiments = state.military;
    if (state.alert !== undefined) army.alert = state.alert;
    if (army.regiments || army.alert !== undefined) armies[state.i] = army;
  }
  return armies;
}
