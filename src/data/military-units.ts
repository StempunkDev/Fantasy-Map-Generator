// The units a new map starts with. Owned by the military module, which offers them as the default
// for options.map.military.units; the Units Editor rewrites that list from here.
export const DEFAULT_MILITARY_UNITS = [
  {
    icon: "⚔️",
    name: "infantry",
    rural: 0.25,
    urban: 0.2,
    crew: 1,
    power: 1,
    type: "melee",
    separate: 0
  },
  {
    icon: "🏹",
    name: "archers",
    rural: 0.12,
    urban: 0.2,
    crew: 1,
    power: 1,
    type: "ranged",
    separate: 0
  },
  {
    icon: "🐴",
    name: "cavalry",
    rural: 0.12,
    urban: 0.03,
    crew: 2,
    power: 2,
    type: "mounted",
    separate: 0
  },
  {
    icon: "💣",
    name: "artillery",
    rural: 0,
    urban: 0.03,
    crew: 8,
    power: 12,
    type: "machinery",
    separate: 0
  },
  {
    icon: "🌊",
    name: "fleet",
    rural: 0,
    urban: 0.015,
    crew: 100,
    power: 50,
    type: "naval",
    separate: 1
  }
];
