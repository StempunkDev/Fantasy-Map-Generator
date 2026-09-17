// The keyed data model: every module's slice under its own id. Save and Load talk to this, and the
// translation to today's positional .map body lives in ./legacy.
import { Modules } from "@/modules";

export type ModuleData = Record<string, unknown>;

export function serializeModules(): ModuleData {
  const data: ModuleData = {};
  for (const module of Modules) if (module.data) data[module.id] = module.data.serialize();
  return data;
}

/** in list order: states before military, which writes its armies back onto them */
export function deserializeModules(data: ModuleData): void {
  for (const module of Modules) if (module.data) module.data.deserialize(data[module.id]);
}
