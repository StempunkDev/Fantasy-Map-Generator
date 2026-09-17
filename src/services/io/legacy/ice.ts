// Ice: slot 39 holds exactly what the model holds. The only difference is presence — the slot is
// empty in files saved before the map had ice.
import type { Ice } from "@/generators/ice-generator";

export const ICE_SLOT = 39;

export function writeIce(slice: Ice[]): string {
  return JSON.stringify(slice);
}

export function readIce(raw: string | undefined): Ice[] {
  return raw ? JSON.parse(raw) : [];
}
