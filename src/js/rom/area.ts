import {initializer} from './util.js';
import {Rom} from '../rom.js';

// Abstraction for a coherent "area", used for grouping together
// locations for (e.g.) music and palette shuffle, or overworld
// shuffle.

const area = initializer<readonly [AreaOptions?], Area>();
interface AreaOptions {
  // does exit information go here?!? or in areashuffle.ts?
  //  - needs repetition of all elements in that case?
  //  - and it's not an enum so it's harder to do (though not impossible).
  type?: 'overworld'|'connector'|'town'|'terminal';
}

// Export an enum so that we can at least refer to these statically.
export class Areas {
  // Overworld areas: these are the "hubs".
  readonly ValleyOfWind = area({type: 'overworld'});
  readonly CordelPlain = area();
  readonly WaterfallValley = area();
  readonly AngrySea = area();
  readonly GoaValley = area();
  readonly Desert1 = area();
  readonly Desert2 = area();

  // Towns, which may be terminal or not.
  readonly Leaf = area();
  readonly Brynmaer = area();
  readonly Oak = area();
  readonly Amazones = area();
  readonly Nadare = area(); // TODO - tie this to sabre north????
  readonly Portoa = area();
  readonly Joel = area();
  readonly ZombieTown = area();
  readonly Swan = area();
  readonly Shyron = area();
  readonly Goa = area();
  readonly Sahara = area();

  // Connectors.
  readonly EastCave = area(); // new map
  readonly WindmillCave = area();
  readonly SealedCave = area();
  readonly ZebuCave = area();
  readonly Swamp = area();
  readonly MtSabreWest = area();
  readonly MtSabreNorth = area();
  readonly LimeTreeValley = area();
  readonly PortoaPalace = area();
  readonly FishermanHouse = area(); // connected to new beach map
  readonly UndergroundChannel = area();
  readonly JoelPassage = area();
  readonly EvilSpiritIslandEntrance = area();
  readonly EvilSpiritIsland = area(); // main cave
  readonly KirisaPlantCave = area();
  readonly SwanGate = area();
  readonly MtHydra = area();
  // TODO - stitch neighboring music/palette ar sages?
  readonly GoaFortress = area();
  readonly OasisEntrance = area();
  readonly OasisCave = area();
  readonly DesertCave1 = area();
  readonly SaharaMeadow = area();
  readonly DesertCave2 = area();

  // Terminals.
  readonly Mezame = area(); // includes both shrine and right outside
                            // TODO - indicate to stitch music with neighbor?
  readonly Windmill = area(); // incudes the section of wind valley
  readonly StomHouse = area();
  readonly WaterfallCave = area();
  readonly KirisaMeadow = area();
  readonly FogLampCave = area();
  readonly LimeTreeLake = area(); // includes mesia shrine
  readonly Lighthouse = area(); // includes immediate outside
  readonly SaberaFortress = area();
  readonly ShyronTemple = area();
  readonly Styx = area();
  readonly FortressBasement = area();
  readonly Pyramid = area();
  readonly Crypt = area();
  readonly Tower = area();

  readonly Empty = area();

  constructor(readonly rom: Rom) {
    area.commit(this, (key: string, opts?: AreaOptions) =>
                makeArea(this, key, opts || {}));
  }
}

function makeArea(areas: Areas, key: string, opts: AreaOptions): Area {
  // Transform the key into a (obviously presupposes no property renaming)
  const name = key.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace('Of', 'of');
  return new Area(areas, name, opts);
}


export class Area {
  constructor(readonly areas: Areas,
              readonly name: string,
              readonly opts: AreaOptions) {}
}
