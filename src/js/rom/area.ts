// Abstraction for a coherent "area", used for grouping together
// locations for (e.g.) music and palette shuffle, or overworld
// shuffle.

// const area = initializer<readonly [AreaOptions?], Area>();
// interface AreaOptions {
//   // does exit information go here?!? or in areashuffle.ts?
//   //  - needs repetition of all elements in that case?
//   //  - and it's not an enum so it's harder to do (though not impossible).
//   type?: 'overworld'|'connector'|'town'|'terminal';
// }

// Used for auto-generated names, but we'll replace them anyway.
let count = 0;

// TODO - is there any value in mutating areas directly?
//        we can always just consult the rom if we need something?
//        we could also even make accessors, WeakMap<Rom, ...>, etc?
//         - though that breaks encapsulation pretty badly - no way to clone.
export abstract class Area {
  readonly name = `Area ${++count}`;
  readonly abstract exits: readonly [number, number];
  readonly abstract type: 'overworld' | 'town' | 'connector' | 'terminal';
}

export abstract class Overworld extends Area {
  type = 'overworld' as const;
}

export abstract class Town extends Area {
  type = 'town' as const;
}

export class Connector extends Area {
  type = 'connector' as const;
  exits = [2, 2] as const;
}

export class Terminal extends Area {
  type = 'terminal' as const;
  exits = [1, 1] as const;
}

// Export an enum so that we can at least refer to these statically.
export namespace Areas {
  export const Unused = new Terminal();
  // Overworld areas: these are the "hubs".
  export const ValleyOfWind = new class extends Overworld {
    exits = [3, 6] as const;
  };
  export const CordelPlain = new class extends Overworld {
    exits = [5, 8] as const;
  };
  export const WaterfallValley = new class extends Overworld {
    exits = [6, 6] as const;
  };
  export const AngrySea = new class extends Overworld {
    exits = [0, 0] as const;
  };
  export const GoaValley = new class extends Overworld {
    exits = [0, 0] as const;
  };
  export const Desert1 = new class extends Overworld {
    exits = [0, 0] as const;
  };
  export const Desert2 = new class extends Overworld {
    exits = [0, 0] as const;
  };

  // Towns, which may be terminal or not.
  export const Leaf = new class extends Town {
    exits = [0, 0] as const;
  };
  export const Brynmaer = new class extends Town {
    exits = [0, 0] as const;
  };
  export const Oak = new class extends Town {
    exits = [0, 0] as const;
  };
  export const Amazones = new class extends Town {
    exits = [0, 0] as const;
  };
  export const Nadare = new class extends Town {
    // TODO - tie this to sabre north????
    exits = [0, 0] as const;
  };
  export const Portoa = new class extends Town {
    exits = [0, 0] as const;
  };
  export const Joel = new class extends Town {
    exits = [0, 0] as const;
  };
  export const ZombieTown = new class extends Town {
    exits = [0, 0] as const;
  };
  export const Swan = new class extends Town {
    exits = [0, 0] as const;
  };
  export const Shyron = new class extends Town {
    exits = [0, 0] as const;
  };
  export const Goa = new class extends Town {
    exits = [0, 0] as const;
  };
  export const Sahara = new class extends Town {
    exits = [0, 0] as const;
  };

  // Connectors.
  export const WindmillCave = new class extends Connector {};
  export const SealedCave = new class extends Connector {};
  export const ZebuCave = new class extends Connector {};
  export const MtSabreWest = new class extends Connector {};
  export const MtSabreNorth = new class extends Connector {};
  export const LimeTreeValley = new class extends Connector {};
  export const PortoaPalace = new class extends Connector {};
  export const FishermanHouse = new class extends Connector {}; // includes new beach
  export const UndergroundChannel = new class extends Connector {};
  export const JoelPassage = new class extends Connector {};
  export const EvilSpiritIslandEntrance = new class extends Connector {};
  export const EvilSpiritIsland = new class extends Connector {}; // main cave
  export const KirisaPlantCave = new class extends Connector {};
  export const SwanGate = new class extends Connector {};
  export const MtHydra = new class extends Connector {}; // 3-way
  // TODO - stitch neighboring music/palette ar sages?
  export const GoaFortress = new class extends Connector {};
  export const OasisEntrance = new class extends Connector {};
  export const OasisCave = new class extends Connector {};
  export const DesertCave1 = new class extends Connector {};
  export const SaharaMeadow = new class extends Connector {};
  export const DesertCave2 = new class extends Connector {};

  // Maybe connectors
  export const EastCave = new class extends Connector {}; // new map
  export const Swamp = new class extends Connector {};

  // Terminals.
  export const Mezame = new class extends Terminal {}; // includes maps 0 and 1
  export const Windmill = new class extends Terminal {}; // incudes part of wind valley
  export const StomHouse = new class extends Terminal {};
  export const WaterfallCave = new class extends Terminal {};
  export const KirisaMeadow = new class extends Terminal {};
  export const FogLampCave = new class extends Terminal {};
  export const LimeTreeLake = new class extends Terminal {}; // includes mesia shrine
  export const Lighthouse = new class extends Terminal {}; // includes immediate outside
  export const SaberaFortress = new class extends Terminal {};
  export const ShyronTemple = new class extends Terminal {};
  export const Styx = new class extends Terminal {};
  export const FortressBasement = new class extends Terminal {};
  export const Pyramid = new class extends Terminal {};
  export const Crypt = new Terminal();
  export const Tower = new Terminal();
}

function capitalize(key: string): string {
  return key.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace('Of', 'of');
}

// Fix the names
for (const [key, area] of Object.entries(Areas)) {
  (area as {name: string}).name = capitalize(key);
}
