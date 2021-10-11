// Shuffle areas.
// This is done _after_ shuffling houses.  There's a few possible
// approaches to this.  Here we simply enumerate the areas (not
// using the data in rom/location, since we actually want to base
// things on the exits rather than the locations) and do swaps on
// pairs of exits, maintaining a graph of areas.  By defining the
// areas coarser or finer, we can control the craziness.

import { Random } from '../random.js';
import { Rom } from '../rom.js';
import { ExitSpec, Pos } from '../rom/metalocation.js';
import { Location } from '../rom/location.js';
import { ConnectionType } from '../rom/metascreendata.js';
import { FlagSet } from '../flagset.js';
import { DefaultMap } from '../util.js';

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

interface Exit {
  readonly loc: Location;
  readonly pos: Pos;
  readonly type: ConnectionType;
  readonly key: string;
  conn: AreaConnection|undefined; // cannot shuffle without
  reverse: Exit;
  shuffle: boolean;
  area: string;
  oneWay?: boolean; // can't go this way
}

const connMap = new Map<ConnectionType, AreaConnection>([
  ['stair:up', 'C'],
  ['edge:top', 'N'],
  ['edge:left', 'W'],
  ['edge:right', 'E'],
  ['cave', 'C'],
  ['door', 'C'],
  ['door2', 'C'],
  ['door3', 'C'],
  ['fortress', 'F'],
]);

type ExitDescriptor = readonly [Pos, ConnectionType, ExitSpec];
type ExitFinder = Location|Pos|ConnectionType|readonly ExitFinder[];
type AreaConnection = 'N'|'S'|'W'|'E'|'C'|'X'|'F'|'O';
//type AreaExitSpec = readonly [AreaConnection, ExitFinder, Area, boolean?];
const connInverse = new Map<AreaConnection, AreaConnection>([
  ['N', 'S'],
  ['S', 'N'],
  ['E', 'W'],
  ['W', 'E'],
  ['C', 'X'],
  ['X', 'C'],
  ['F', 'O'],
  ['O', 'F'],
]);

function makeExit(loc: Location, [pos, type, [revLocPos, revType]]: ExitDescriptor): Exit {
  let conn = connMap.get(type) || connInverse.get(connMap.get(revType)!);
  let shuffle = false;
  const area = loc.id.toString(16);
  const key = (loc.id << 8 | pos).toString(16) + ' ' + type;
  const revLoc = loc.rom.locations[revLocPos >>> 8];
  const revPos = revLocPos & 0xff;
  const revKey = revLocPos.toString(16) + ' ' + revType;
  const revArea = revLoc.id.toString(16);
  const reverse: Exit = {
    loc: revLoc, pos: revPos, type: revType,
    area: revArea, key: revKey, reverse: null!,
    get conn() { return connInverse.get(conn!); },
    set conn(c) { conn = connInverse.get(c!); },
    get shuffle() { return shuffle; },
    set shuffle(s) {
      if (s && !conn) throw new Error(`shuffle without conn`);
      shuffle = s;
    },
  };
  const exit: Exit = {
    loc, pos, type, key, reverse, area,
    get conn() { return conn; },
    set conn(c) { conn = c; },
    get shuffle() { return shuffle; },
    set shuffle(s) {
      if (s && !conn) throw new Error(`shuffle without conn`);
      shuffle = s;
    },
  };
  reverse.reverse = exit;
  return exit;
}

function matchExit(exit: Exit, finder: ExitFinder): boolean {
  if (typeof finder === 'string') return exit.type === finder;
  if (typeof finder === 'number') return exit.pos === finder;
  if (finder instanceof Location) return exit.reverse.loc === finder;
  return finder.every(f => matchExit(exit, f));
}

export function shuffleAreas(rom: Rom, flags: FlagSet, random: Random) {
  if (!flags.shuffleAreas()) return;
  const {locations: loc} = rom;

  // Catalogue all the exits in the game
  const exits = new Map<string, Exit>();
  const exitsByLocation = new DefaultMap<Location, Exit[]>(() => []);
  for (const location of rom.locations) {
    for (const exitSpec of location.meta.exits()) {
      const exit = makeExit(location, exitSpec);
      if (exits.has(exit.key)) continue;
      if (exits.has(exit.reverse.key)) {
        throw new Error(`Inconsistent exits: ${exit.key} ${exit.reverse.key}`);
      }
      exits.set(exit.key, exit);
      exits.set(exit.reverse.key, exit.reverse);
      exitsByLocation.get(exit.loc).push(exit);
      exitsByLocation.get(exit.reverse.loc).push(exit.reverse);
    }
  }

  // Make separate areas for windmill and lighthouse
  function findExits(location: Location, ...finders: ExitFinder[]): Exit[] {
    const out = [];
    for (const exit of exitsByLocation.get(location)) {
      for (const finder of finders) {
        if (matchExit(exit, finder)) {
          out.push(exit);
          break;
        }
      }
    }
    return out;
  }
  if (flags.shuffleHouses()) {
    for (const exit of findExits(loc.ValleyOfWind, 'door', 'windmill')) {
      exit.area = 'windmill';
    }
  }
  for (const exit of findExits(loc.AngrySea, 0x64)) {
    exit.area = 'lighthouse';
  }
  findExits(loc.Portoa_FishermanIsland, loc.Portoa)[0].oneWay = true;
  
  // Mark the exits that are eligible to be shuffled.
  function mark(loc: Location, ...exits: ExitFinder[]): void {
    for (const exit of findExits(loc, ...exits)) {
      exit.shuffle = true;
    }
  }
  function markOutside(...locs: Location[]): void {
    const set = new Set(locs);
    for (const loc of locs) {
      for (const exit of exitsByLocation.get(loc)) {
        if (!set.has(exit.reverse.loc)) exit.shuffle = true;
      }
    }
  }
    
  mark(loc.Leaf, loc.Leaf_OutsideStart);
  markOutside(loc.ValleyOfWind, loc.WindmillCave, loc.Windmill);
  if (flags.shuffleHouses()) markOutside(loc.WindmillCave);
  markOutside(loc.EastCave1, loc.EastCave2, loc.EastCave3);
  markOutside(loc.ZebuCave, loc.MtSabreWest_Cave1);
  markOutside(loc.CordelPlainWest, loc.CordelPlainEast);
  markOutside(loc.WaterfallValleyNorth, loc.WaterfallValleySouth);
  markOutside(loc.KirisaMeadow);
  markOutside(loc.LimeTreeLake);
  mark(loc.Portoa_FishermanIsland, loc.Portoa);
  mark(loc.UndergroundChannel, loc.PortoaPalace_ThroneRoom);
  mark(loc.AngrySea, loc.Joel);
  markOutside(loc.JoelSecretPassage); // ???
  //findExits(loc.EvilSpiritIsland1, loc.EvilSpiritIsland2)[0].conn = 'C';
  markOutside(loc.EvilSpiritIsland1, loc.EvilSpiritIsland2);
  mark(loc.ZombieTown, 'cave');
  mark(loc.AngrySea, loc.Swan);
  markOutside(loc.SwanGate);
  mark(loc.GoaValley, loc.MtHydra);
  markOutside(loc.Desert1);
  markOutside(loc.GoaFortressBasement);
  markOutside(loc.DesertCave1);
  markOutside(loc.SaharaOutsideCave);
  markOutside(loc.DesertCave2);

  // TODO - if !shuffleHouses then mark all the fortresses??

  // We should make sure all the shuffled exits have the right type.

  for (const exit of exits.values()) {
    if (!exit.shuffle) continue;
    console.log(`${exit.loc} => ${exit.reverse.loc} ${exit.conn}/${exit.reverse.conn}`);
  }

  // Next find all the non-shuffled exits and UnionFind them!
}

// function matchExit(finder: ExitFinder):
//       (e: readonly [number, ConnectionType, ExitSpec]) => boolean {
//   if (typeof finder === 'string') return ([, t]) => t === finder;
//   if (typeof finder === 'number') return ([p]) => p === finder;
//   if (finder instanceof Location) return ([,, [l]]) => (l >>> 8) === finder.id;
//   const matchers = finder.map(matchExit);
//   return (e) => matchers.every(f => f(e));
// }

// function exitKey(locPos: number, exitType: ConnectionType) {
//   return locPos.toString(16) + ' ' + exitType;
// }

// function addExits(fromLoc: Location,
//                   ...exitSpecs: AreaExitSpec[]): void {
//   const exits = [...fromLoc.meta.exits()];
//   for (const [connection, finder, toArea, oneWay] of exitSpecs) {
//     const [exit, ...rest] = exits.filter(matchExit(finder));
//     if (!exit) throw new Error(`Missing exit: ${finder} in ${fromLoc}`);
//     if (rest.length) throw new Error(`Ambiguous exit: ${finder} in ${fromLoc}`);
//     const fromLocPos = fromLoc.id << 8 | exit[0];
//     const fromType = exit[1];
//     const fromKey = exitKey(fromLocPos, fromType);
//     const [toLocPos, toType] = exit[2];
//     const toKey = exitKey(toLocPos, toType);
//     const fromExit = {
//       conn: connection,
//       dest: toArea,
//       destKey: toKey,
//       locPos: fromLocPos,
//       exitType: fromType,
//     };
//     const toExit = {
//       conn: connInverse.get(connection)!,
//       dest: fromArea,
//       destKey: fromKey,
//       locPos: toLocPos,
//       exitType: toType,
//     };
//     fromArea.exits.set(fromKey, fromExit);
//     if (!oneWay) toArea.exits.set(toKey, toExit);
//   }
// }

// function buildKey(loc: Location|null,
//                   [pos, typ]: readonly [Pos, ConnectionType, ...unknown[]]): string {
//   return ((loc ? loc.id << 8 : 0) | pos).toString(16) + ' ' + typ;
// }


// class ExitMap {
//   exits = new Map<string, Exit>();

//   locations = new Map<string, string>();
//   exitsByLocation = new DefaultMap<string, Set<string>>(() => new Set());
//   opposites = new Map<string, string>();

//   splitLocation(loc: Location, ...finders: ExitFinder[]) {
//     const matchers = finders.map(matchExit);
//     let key: string|undefined;
//     for (const exit of loc.meta.exits()) {
//       for (const matcher of matchers) {
//         if (!matcher(exit)) continue;
//         let exitKey = buildKey(loc, exit);
//         if (key == undefined) key = exitKey;
//         this.locations.set(exitKey, key);
//         break;
//       }
//     }
//   }

//   locationKey(loc: Location, exit: ExitDescriptor): string {
//     const key = buildKey(loc, exit);
//     let value = this.locations.get(key);
//     if (!value) this.locations.set(key, value = loc.id.toString(16));

//     // TODO - this.exitsByLocation

//     return value;
//   }

//   private addExitInternal(fromKey: string, toKey: string): void {
    
//   }

//   addExit(loc: Location, conn: AreaConnection, exit?: ExitFinder): void {
    
//   }
//   addExits(loc: Location, ...exits: ExitFinder[]): void {

//   }
//   addAllExits(loc: Location): void {
//     for (const exit of loc.meta.exits()) {
      
//       const fromKey = buildKey(loc, exit);
//       const toKey = buildKey(null, exit[2]);
//       this.addExitInternal(fromKey, toKey);
//     }
//   }
  
//   // area(loc: Location, finder: ExitFinder): string {
//   //   // 
//   // }
// }

// function unused() {
//   addExits(area.Start, loc.Leaf_OutsideStart, ['W', loc.Leaf, area.Leaf]);
//   addExits(area.WindValley, loc.ValleyOfWind,
//            ['S', loc.Leaf, area.Leaf],
//            ['C', loc.ZebuCave, area.Zebu],
//            ['C', loc.SealedCave1, area.SealedCave]);
//   if (flags.shuffleHouses()) {
//     addExits(area.WindValley, loc.ValleyOfWind, ['C', 0x02, area.WindmillCave]);
//     addExits(area.Windmill, loc.ValleyOfWind, ['C', 'door', area.WindmillCave]);
//   }
//   if (flags.addEastCave()) {
//     addExits(area.WindValley, loc.ValleyOfWind,
//              ['C', loc.EastCave1, area.EastCave]);
//     // NOTE: We could possibly add exit1 and exit2, but it's
//     // hard to figure out if (1) they even exist, and (2) if
//     // they do, which _area_ they go to.  For now, we'll treat
//     // it as a terminal, since the other exits are already
//     // somewhat randomized.
//   }
//   addExits(area.CordelPlain, loc.CordelPlainWest,
//            ['C', loc.SealedCave8, area.SealedCave],
//            ['W', loc.Brynmaer, area.Brynmaer],
//            ['W', loc.MtSabreWest_Lower, area.SabreWest],
//            ['N', loc.OutsideStomHouse, area.StomHouse],
//            ['S', loc.Amazones, area.Amazones]);
//   addExits(area.CordelPlain, loc.CordelPlainEast,
//            ['E', loc.Swamp, area.Swamp],
//            ['N', loc.MtSabreNorth_Main, area.SabreNorth]);
//   addExits(area.WaterfallValley, loc.WaterfallValleyNorth,
//            ['C', loc.MtSabreNorth_SummitCave, area.SabreNorth],
//            ['W', loc.Portoa, area.Portoa],
//            ['C', loc.WaterfallCave1, area.WaterfallCave],
//            ['C', loc.FogLampCave1, area.FogLampCave]);
//   addExits(area.WaterfallValley, loc.WaterfallValleySouth,
//            ['C', loc.KirisaPlantCave1, area.KirisaCave],
//            ['W', loc.LimeTreeValley, area.LimeTreeValley]);
//   addExits(area.KirisaCave, loc.KirisaPlantCave3,
//            ['X', loc.KirisaMeadow, area.KirisaMeadow]);
//   addExits(area.LimeTreeLake, loc.LimeTreeLake,
//            ['X', loc.LimeTreeValley, area.LimeTreeValley],
//            ['C', loc.MesiaShrine, area.MesiaShrine]);
//   addExits(area.AngrySea, loc.Portoa_FishermanIsland,
//            // TODO - how to make this one-way?
//            ['E', loc.Portoa, area.Portoa, true]);
//   addExits(area.AngrySea, loc.EvilSpiritIsland1,
//            ['C', loc.EvilSpiritIsland2, area.EvilSpiritIsland]);
//   addExits(area.AngrySea, loc.AngrySea,
//            ['C', loc.Joel, area.Joel],
//            ['N', loc.Swan, area.Swan]);
//   if (!flags.shuffleHouses()) {
//     // TODO - wrong area if we have house shuffle...? how to fix?
//     addExits(area.JoelPassage, loc.JoelSecretPassage,
//              ['X', loc.Joel_Shed, area.Joel],
//              ['X', loc.AngrySea, area.Lighthouse]);
//   }
//   addExits(area.ZombieTown, loc.ZombieTown,
//            ['C', 'cave', area.EvilSpiritIsland]);
//   addExits(area.Swan, loc.Swan, ['W', loc.SwanGate, area.SwanGate]);
//   addExits(area.GoaValley, loc.GoaValley,
//            ['E', loc.SwanGate, area.SwanGate],
//            ['W', loc.MtHydra, area.Hydra],
//            ['S', loc.Desert1, area.Desert1]);
//   addExits(area.Desert1, loc.Desert1,
//            ['C', loc.OasisCave_Entrance, area.OasisCave],
//            ['C', loc.DesertCave1, area.DesertCave1]);
//   addExits(area.OasisCave, loc.OasisCaveMain,
//            ['C', loc.GoaFortressBasement, area.GoaBasement]);
//   addExits(area.DesertCave1, loc.DesertCave1,
//            ['X', loc.SaharaMeadow, area.Sahara]);
//   addExits(area.SaharaExit, loc.SaharaOutsideCave,
//            ['W', loc.Sahara, area.Sahara],
//            ['C', loc.DesertCave2, area.DesertCave2]);
//   addExits(area.End, loc.Desert2, ['C', loc.DesertCave2, area.DesertCave2]);

//   // We've got the whole graph set up.  Now we need a function to traverse the
//   // graph and make sure it's valid.
//   const allAreas = Object.keys(area).map(k => area[k as keyof typeof area])
//       .filter(a => a.exits.size);
//   function traverse(): Array<Map<AreaConnection, AreaExit[]>> {
//     const seen = new Set();
//     const out = [];
//     for (const a of [area.Start, ...allAreas]) {
//       if (seen.has(a)) continue;
//       const queue = new Set([a]);
//       const map = new DefaultMap<AreaConnection, AreaExit[]>(() => []);
//       for (const next of queue) {
//         for (const exit of next.exits.values()) {
//           if (seen.has(exit.dest)) continue;
//           seen.add(exit.dest);
//           queue.add(exit.dest);
//           map.get(exit.conn).push(exit);
//           const reverse = exit.dest.exits.get(exit.destKey);
//           if (reverse) map.get(reverse.conn).push(reverse);
//         }
//       }
//       out.push(map);
//     }
//     return out;
//   }

//   // Basic plan: pick two random exits of the same type.
//   let iters = 100;
//   let traversal = traverse();
//   while (iters-- > 0 || traversal.length > 1) {
//     if (traversal.length > 2) random.shuffle(traversal);
//     if (traversal.length > 1) {
//       // pick an conn type that's present in both sets
//     }
//     traversal = traverse();
//   }
// }
