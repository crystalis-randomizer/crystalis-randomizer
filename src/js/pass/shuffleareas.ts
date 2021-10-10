// Shuffle areas.
// This is done _after_ shuffling houses.  There's a few possible
// approaches to this.  Here we simply enumerate the areas (not
// using the data in rom/location, since we actually want to base
// things on the exits rather than the locations) and do swaps on
// pairs of exits, maintaining a graph of areas.  By defining the
// areas coarser or finer, we can control the craziness.

import { Random } from '../random.js';
import { Rom } from '../rom.js';
import { ExitSpec, Metalocation, Pos } from '../rom/metalocation.js';
import { HouseType, Location } from '../rom/location.js';
import { ConnectionType } from '../rom/metascreendata.js';
import { FlagSet } from '../flagset.js';
import { DefaultMap, lowerCamelToWords } from '../util.js';

interface Area {
  name: string;
  exits: Map<string, AreaExit>;
  //expectedExits: number;
}
interface AreaExit {
  conn: AreaConnection;
  dest: Area;
  destKey: string;
  locPos: number;
  exitType: string;
}

type ExitFinder = Location|Pos|ConnectionType|readonly ExitFinder[];
type AreaConnection = 'N'|'S'|'W'|'E'|'C'|'X';
type AreaExitSpec = readonly [AreaConnection, ExitFinder, Area, boolean?];

const inverse = {N: 'S', S: 'N', W: 'E', E: 'W', C: 'X', X: 'C'} as const;

function matchExit(finder: ExitFinder):
      (e: readonly [number, ConnectionType, ExitSpec]) => boolean {
  if (typeof finder === 'string') return ([, t]) => t === finder;
  if (typeof finder === 'number') return ([p]) => p === finder;
  if (finder instanceof Location) return ([,, [l]]) => (l >>> 8) === finder.id;
  const matchers = finder.map(matchExit);
  return (e) => matchers.every(f => f(e));
}

function exitKey(locPos: number, exitType: ConnectionType) {
  return locPos.toString(16) + '|' + exitType;
}

function addExits(fromLoc: Location,
                  ...exitSpecs: AreaExitSpec[]): void {
  const exits = [...fromLoc.meta.exits()];
  for (const [connection, finder, toArea, oneWay] of exitSpecs) {
    const [exit, ...rest] = exits.filter(matchExit(finder));
    if (!exit) throw new Error(`Missing exit: ${finder} in ${fromLoc}`);
    if (rest.length) throw new Error(`Ambiguous exit: ${finder} in ${fromLoc}`);
    const fromLocPos = fromLoc.id << 8 | exit[0];
    const fromType = exit[1];
    const fromKey = exitKey(fromLocPos, fromType);
    const [toLocPos, toType] = exit[2];
    const toKey = exitKey(toLocPos, toType);
    const fromExit = {
      conn: connection,
      dest: toArea,
      destKey: toKey,
      locPos: fromLocPos,
      exitType: fromType,
    };
    const toExit = {
      conn: inverse[connection],
      dest: fromArea,
      destKey: fromKey,
      locPos: toLocPos,
      exitType: toType,
    };
    fromArea.exits.set(fromKey, fromExit);
    if (!oneWay) toArea.exits.set(toKey, toExit);
  }
}



class ExitMap {
  map: Map<string, []>;
}

export function shuffleAreas(rom: Rom, flags: FlagSet, random: Random) {
  if (!flags.shuffleAreas()) return;

  const exit



  const area = makeAreas({
    // Main areas
    WindValley: 5, CordelPlain: 7, WaterfallValley: 6,
    AngrySea: 4, GoaValley: 3, Desert1: 3,
    // Start and end
    Start: 1, End: 1,
    // Filler locations
    EastCave: 1,
    Leaf: 2, Zebu: 2, WindmillCave: 2, SealedCave: 2,
    SabreWest: 2, SabreNorth: 2, KirisaCave: 2,
    LimeTreeValley: 2, LimeTreeLake: 2,
    Portoa: 2, Joel: 2, JoelPassage: 2,
    EvilSpiritIsland: 2, Swan: 2, SwanGate: 2, OasisCave: 2,
    DesertCave1: 2, Sahara: 2, SaharaExit: 2, DesertCave2: 2,
    // Terminals
    Windmill: 1, Brynmaer: 1, Swamp: 1, StomHouse: 1, Amazones: 1,
    WaterfallCave: 1, FogLampCave: 1, KirisaMeadow: 1,
    MesiaShrine: 1, Lighthouse: 1, ZombieTown: 1, Hydra: 1,
    GoaBasement: 1,
  } as const);

  const {locations: loc} = rom;
  addExits(area.Start, loc.Leaf_OutsideStart, ['W', loc.Leaf, area.Leaf]);
  addExits(area.WindValley, loc.ValleyOfWind,
           ['S', loc.Leaf, area.Leaf],
           ['C', loc.ZebuCave, area.Zebu],
           ['C', loc.SealedCave1, area.SealedCave]);
  if (flags.shuffleHouses()) {
    addExits(area.WindValley, loc.ValleyOfWind, ['C', 0x02, area.WindmillCave]);
    addExits(area.Windmill, loc.ValleyOfWind, ['C', 'door', area.WindmillCave]);
  }
  if (flags.addEastCave()) {
    addExits(area.WindValley, loc.ValleyOfWind,
             ['C', loc.EastCave1, area.EastCave]);
    // NOTE: We could possibly add exit1 and exit2, but it's
    // hard to figure out if (1) they even exist, and (2) if
    // they do, which _area_ they go to.  For now, we'll treat
    // it as a terminal, since the other exits are already
    // somewhat randomized.
  }
  addExits(area.CordelPlain, loc.CordelPlainWest,
           ['C', loc.SealedCave8, area.SealedCave],
           ['W', loc.Brynmaer, area.Brynmaer],
           ['W', loc.MtSabreWest_Lower, area.SabreWest],
           ['N', loc.OutsideStomHouse, area.StomHouse],
           ['S', loc.Amazones, area.Amazones]);
  addExits(area.CordelPlain, loc.CordelPlainEast,
           ['E', loc.Swamp, area.Swamp],
           ['N', loc.MtSabreNorth_Main, area.SabreNorth]);
  addExits(area.WaterfallValley, loc.WaterfallValleyNorth,
           ['C', loc.MtSabreNorth_SummitCave, area.SabreNorth],
           ['W', loc.Portoa, area.Portoa],
           ['C', loc.WaterfallCave1, area.WaterfallCave],
           ['C', loc.FogLampCave1, area.FogLampCave]);
  addExits(area.WaterfallValley, loc.WaterfallValleySouth,
           ['C', loc.KirisaPlantCave1, area.KirisaCave],
           ['W', loc.LimeTreeValley, area.LimeTreeValley]);
  addExits(area.KirisaCave, loc.KirisaPlantCave3,
           ['X', loc.KirisaMeadow, area.KirisaMeadow]);
  addExits(area.LimeTreeLake, loc.LimeTreeLake,
           ['X', loc.LimeTreeValley, area.LimeTreeValley],
           ['C', loc.MesiaShrine, area.MesiaShrine]);
  addExits(area.AngrySea, loc.Portoa_FishermanIsland,
           // TODO - how to make this one-way?
           ['E', loc.Portoa, area.Portoa, true]);
  addExits(area.AngrySea, loc.EvilSpiritIsland1,
           ['C', loc.EvilSpiritIsland2, area.EvilSpiritIsland]);
  addExits(area.AngrySea, loc.AngrySea,
           ['C', loc.Joel, area.Joel],
           ['N', loc.Swan, area.Swan]);
  if (!flags.shuffleHouses()) {
    // TODO - wrong area if we have house shuffle...? how to fix?
    addExits(area.JoelPassage, loc.JoelSecretPassage,
             ['X', loc.Joel_Shed, area.Joel],
             ['X', loc.AngrySea, area.Lighthouse]);
  }
  addExits(area.ZombieTown, loc.ZombieTown,
           ['C', 'cave', area.EvilSpiritIsland]);
  addExits(area.Swan, loc.Swan, ['W', loc.SwanGate, area.SwanGate]);
  addExits(area.GoaValley, loc.GoaValley,
           ['E', loc.SwanGate, area.SwanGate],
           ['W', loc.MtHydra, area.Hydra],
           ['S', loc.Desert1, area.Desert1]);
  addExits(area.Desert1, loc.Desert1,
           ['C', loc.OasisCave_Entrance, area.OasisCave],
           ['C', loc.DesertCave1, area.DesertCave1]);
  addExits(area.OasisCave, loc.OasisCaveMain,
           ['C', loc.GoaFortressBasement, area.GoaBasement]);
  addExits(area.DesertCave1, loc.DesertCave1,
           ['X', loc.SaharaMeadow, area.Sahara]);
  addExits(area.SaharaExit, loc.SaharaOutsideCave,
           ['W', loc.Sahara, area.Sahara],
           ['C', loc.DesertCave2, area.DesertCave2]);
  addExits(area.End, loc.Desert2, ['C', loc.DesertCave2, area.DesertCave2]);

  // We've got the whole graph set up.  Now we need a function to traverse the
  // graph and make sure it's valid.
  const allAreas = Object.keys(area).map(k => area[k as keyof typeof area])
      .filter(a => a.exits.size);
  function traverse(): Array<Map<AreaConnection, AreaExit[]>> {
    const seen = new Set();
    const out = [];
    for (const a of [area.Start, ...allAreas]) {
      if (seen.has(a)) continue;
      const queue = new Set([a]);
      const map = new DefaultMap<AreaConnection, AreaExit[]>(() => []);
      for (const next of queue) {
        for (const exit of next.exits.values()) {
          if (seen.has(exit.dest)) continue;
          seen.add(exit.dest);
          queue.add(exit.dest);
          map.get(exit.conn).push(exit);
          const reverse = exit.dest.exits.get(exit.destKey);
          if (reverse) map.get(reverse.conn).push(reverse);
        }
      }
      out.push(map);
    }
    return out;
  }

  // Basic plan: pick two random exits of the same type.
  let iters = 100;
  let traversal = traverse();
  while (iters-- > 0 || traversal.length > 1) {
    if (traversal.length > 2) random.shuffle(traversal);
    if (traversal.length > 1) {
      // pick an conn type that's present in both sets
    }
    traversal = traverse();
  }
}
