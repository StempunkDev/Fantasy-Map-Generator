interface IMilitaryUnitConfig {
    name: string;
    icon: string;
    crew: number;
    power: number;
    rural: number;
    urban: number;
    type: TMilitaryUnitType;
    separate: Logical;
    biomes?: number[]; // allowed biomes
    states?: number[]; // allowed states
    cultures?: number[]; // allowed cultures
    religions?: number[]; // allowed religions
  }
  
  interface IRegiment {
    i: number;
    icon: string;
    name: string;
    state: number; // stateId
    cell: number; // base cell
    x: number; // current position x
    y: number; // current position y
    bx: number; // base position x
    by: number; // base position y
    total: number;
    units: {[key: string]: number};
    isNaval: boolean;
  }
  
  type TMilitaryUnitType = "melee" | "ranged" | "mounted" | "machinery" | "naval" | "armored" | "aviation" | "magical";