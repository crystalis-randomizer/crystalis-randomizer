import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Flag, Spawn} from '../rom/locationtables.js';
import {Location} from '../rom/location.js';
import {Metalocation} from '../rom/metalocation.js';
import {cloneArray} from '../rom/util.js';
import {removeWhirlpools} from './removewhirlpools.js';

type EastCaveExit = 'cordel' | 'lime' | 'goa' | 'desert';

interface EastCaveOptions {
  exit1?: EastCaveExit;
  exit2?: EastCaveExit;
}

interface Options {
  eastCave?: EastCaveOptions;
  classicLimeTreeToLeaf?: boolean;
  removeWhirlpools?: boolean;
}

export function standardMapEdits(rom: Rom, opts: Options) {
  if (opts.eastCave) {
    eastCave(rom, opts.eastCave);
  } else if (opts.classicLimeTreeToLeaf) {
    connectLimeTreeToLeaf(rom);
  }
  addTowerExit(rom);
  reversibleSwanGate(rom);
  shrinkMado2(rom);
  removeUnusedGoaKensuExits(rom);
  adjustAbductionTrigger(rom);

  splitSaberaPalace2(rom);
  //splitStyx2(rom); // don't actually do this one?
  // closeCaveEntrances(rom); // NOTE: after other map edits

  if (opts.removeWhirlpools) {
    removeWhirlpools(rom);
  }
}

export namespace standardMapEdits {
  export function generateOptions(flags: FlagSet, random: Random): Options {
    const options: Options = {};
    if (flags.addEastCave()) {
      options.eastCave = {};
      const exits: EastCaveExit[] = ['cordel', 'lime', 'goa', 'desert'];
      let i = random.nextInt(4);
      [options.eastCave.exit1] = exits.splice(i, 1);
      options.eastCave.exit2 = random.pick(exits);
    } else if (flags.connectLimeTreeToLeaf()) {
      options.classicLimeTreeToLeaf = true;
    }
    if (flags.removeDesertWhirlpools()) {
      options.removeWhirlpools = true;
    }
    return options;
  }
}

function eastCave(rom: Rom, opts: EastCaveOptions) {
  const {
    locations: {EastCave1, EastCave2, EastCave3, SealedCave1, ValleyOfWind},
    metascreens: {boundaryE_cave,
                  branchNSE, branchNWE, branchNWSE, branchNWS, branchWSE,
                  caveEmpty,
                  deadEndE, deadEndE_downStair, deadEndE_upStair,
                  deadEndN_stairs, deadEndS, deadEndS_stairs,
                  deadEndW, deadEndW_downStair,
                  hallNE, hallNS, hallNW, hallSE, hallWS, hallWE,
                  hallNS_entrance, hallNS_ramp, hallNS_wall,
                 },
    //flags: {AlwaysTrue},
  } = rom;

  rom.locations.allocate(EastCave1);
  rom.locations.allocate(EastCave2);
  if (opts.exit2) rom.locations.allocate(EastCave3);

  for (const l of [EastCave1, EastCave2, EastCave3]) {
    l.bgm = l.originalBgm = 0x17; // mt sabre cave music?
    l.entrances = [];
    l.exits = [];
    l.pits = [];
    l.spawns = [];
    l.flags = [];
    l.width = l.height = 1;
    l.screens = [[0x80]];
    l.tilePalettes = [0x1a, 0x1b, 0x05]; // rock wall
    l.originalTilePalettes = [0x1a, 0x1b, 0x05]; // rock wall
    l.tileset = 0x88;
    l.tileEffects = 0xb5;
    l.tilePatterns = [0x14, 0x02];
    l.spritePatterns = [...SealedCave1.spritePatterns] as [number, number];
    l.spritePalettes = [...SealedCave1.spritePalettes] as [number, number];
  }

  // NOTE: 0x9c can become 0x99 in top left or 0x97 in top right or bottom middle for a cave exit
  EastCave1.meta = new Metalocation(EastCave1.id, rom.metatilesets.cave, 5, 5);
  EastCave1.meta.set2d(0x00, [
    [deadEndE,        hallWS,      caveEmpty, hallSE,           deadEndW],
    [caveEmpty,       hallNS,      hallSE,    hallNW,           caveEmpty],
    [hallSE,          branchNWSE,  branchNWS, caveEmpty,        caveEmpty],
    [hallNS,          hallNS_ramp, hallNE,    hallWE,           hallWS],
    [hallNS_entrance, hallNE,      deadEndW,  deadEndE_upStair, hallNW],
  ]);

  EastCave2.meta = new Metalocation(EastCave2.id, rom.metatilesets.cave, 5, 5);
  EastCave2.meta.set2d(0x00, [
    [deadEndE,  hallWS,      deadEndS,  caveEmpty, deadEndS],
    [caveEmpty, hallNS,      hallNS,    caveEmpty, hallNS],
    [caveEmpty, branchNSE,   branchNWE, branchWSE, hallNW],
    [caveEmpty, hallNS_ramp, caveEmpty, hallNE,    hallWS],
    [deadEndE,  hallNW,      caveEmpty, caveEmpty, deadEndN_stairs],
  ]);

  // Add entrance to valley of wind
  ValleyOfWind.meta.set2d(0x33, [[boundaryE_cave]]);
  rom.tileEffects[0].effects[0xc0] = 0;
  // TODO - do this once we fix the sea tileset
  // rom.screens[0xc2].tiles[0x5a] = 0x0a;
  // rom.screens[0xc2].tiles[0x5b] = 0x0a;

  // Connect maps
  EastCave1.meta.attach(0x43, EastCave2.meta, 0x44);
  EastCave1.meta.attach(0x40, ValleyOfWind.meta, 0x33);

  if (opts.exit1) {
    EastCave1.meta.set2d(0x04, [[deadEndW_downStair]]); // down stair
    connectEastCaveExit(EastCave1, 0x04, opts.exit1);
  }

  if (opts.exit2) {
    EastCave3.meta = new Metalocation(EastCave3.id, rom.metatilesets.cave, 3, 1);
    EastCave3.meta.set2d(0x00, [
      [deadEndS_stairs],
      [hallNS_wall],
      [hallNS_entrance],
    ]);

    // Add a rock wall (id=0).
    EastCave3.spawns.push(Spawn.from([0x18, 0x07, 0x23, 0x00]));
    EastCave3.flags.push(Flag.of({screen: 0x10, flag: rom.flags.alloc(0x200)}));

    // Make the connections.
    EastCave2.meta.set2d(0x40, [[deadEndE_downStair]]);
    EastCave2.meta.attach(0x40, EastCave3.meta, 0x00);
    connectEastCaveExit(EastCave3, 0x20, opts.exit2);
  }

  // Add monsters
  EastCave1.spawns.push(
    Spawn.of({screen: 0x21, tile: 0x87, timed: true, id: 0x2}),
    Spawn.of({screen: 0x12, tile: 0x88, timed: false, id: 0x2}),
    Spawn.of({screen: 0x13, tile: 0x89, timed: true, id: 0x2}),
    Spawn.of({screen: 0x32, tile: 0x68, timed: false, id: 0x2}),
    Spawn.of({screen: 0x41, tile: 0x88, timed: true, id: 0x2}),
    Spawn.of({screen: 0x33, tile: 0x98, timed: true, id: 0x2}),
    Spawn.of({screen: 0x03, tile: 0x88, timed: true, id: 0x2}),
  );
  EastCave2.spawns.push(
    Spawn.of({screen: 0x01, tile: 0x88, timed: true, id: 0x2}),
    Spawn.of({screen: 0x11, tile: 0x48, timed: false, id: 0x2}),
    Spawn.of({screen: 0x12, tile: 0x77, timed: true, id: 0x2}),
    Spawn.of({screen: 0x14, tile: 0x28, timed: false, id: 0x2}),
    Spawn.of({screen: 0x23, tile: 0x85, timed: true, id: 0x2}),
    Spawn.of({screen: 0x31, tile: 0x88, timed: true, id: 0x2}),
    Spawn.of({screen: 0x33, tile: 0x8a, timed: false, id: 0x2}),
    Spawn.of({screen: 0x34, tile: 0x98, timed: true, id: 0x2}),
    Spawn.of({screen: 0x41, tile: 0x82, timed: true, id: 0x2}),
    // chest: medical herb
    Spawn.of({y: 0x110, x: 0x478, type: 2, id: 0x59}),
    // chest: mimic
    Spawn.of({y: 0x070, x: 0x108, type: 2, id: 0x7c}),
  );
  // TODO - this is subtle: there's a handful of different places this check
  // could end up.  Ultimately, we need to make sure there are unique checks
  // in the early spheres.  Ultimately, we'd like the student and/or any chests
  // in Mezame to be "unique" as well, but we've only got one unique item to
  // play with.  Maybe figure out a way to mark a "unique" medical herb?
  rom.slots.swap(0x31, 0x59);
  // swap out alarm flute for medical herb - this makes it a unique check.
  // WindmillGuard.data[1] = 0x59; // alarm flute -> medical herb
  // WindmillGuard.dialog(Leaf_StudentHouse)[0].condition = ~0x159;
}

function connectEastCaveExit(loc: Location, scr: number, exit: EastCaveExit) {
  const {
    locations: {
      CordelPlainEast, CordelPlainWest, Desert2, GoaValley, LimeTreeValley,
    },
    metascreens: {
      bendNE, bendSE,
      boundaryN_trees, boundaryW_cave,
      cornerNE, cornerNW, cornerSE, cornerSE_cave, cornerSW,
    }} = loc.rom;
  let dest: Location;
  let destScr: number;
  switch (exit) {
    case 'lime':
      // Add entrance to lime tree valley
      dest = LimeTreeValley;
      destScr = 0x10;
      dest.resizeScreens(0, 1, 0, 0); // add one screen to left edge
      dest.meta.spliceColumns(0, 1, 2, [
        [cornerNW,       boundaryN_trees],
        [boundaryW_cave, bendSE],
        [cornerSW,       cornerSE],
      ]);
      break;

    case 'cordel':
      const mapEdit = [
        [boundaryW_cave, bendSE],
        [cornerSW,       cornerSE],
      ];
      dest = CordelPlainEast;
      destScr = 0x55;
      dest.meta.set2d(0x55, mapEdit);
      // Also need to mirror the map edit on west
      CordelPlainWest.meta.set2d(0x55, mapEdit);
      break;

    case 'goa':
      dest = GoaValley;
      destScr = 0x11;
      dest.meta.set2d(0x01, [
        [cornerNW,       cornerNE],
        [boundaryW_cave, bendNE]]);
      break;

    case 'desert':
      dest = Desert2;
      destScr = 0x53;
      dest.meta.set2d(0x53, [[cornerSE_cave]]);
      break;
  }
  loc.meta.attach(scr, dest.meta, destScr);
}

// Programmatically add a hole between valley of wind and lime tree valley
function connectLimeTreeToLeaf(rom: Rom) {
  const {
    locations: {ValleyOfWind, LimeTreeValley},
    metascreens: {exitE, exitW_southwest, overworldEmpty_alt},
  } = rom;

  ValleyOfWind.meta.set2d(0x54, [[exitE]]);
  LimeTreeValley.meta.set2d(0x10, [[exitW_southwest],
                                   [overworldEmpty_alt]]);
  ValleyOfWind.meta.attach(0x54, LimeTreeValley.meta, 0x10);
}

function addTowerExit(rom: Rom) {
  const {TowerEntrance, Crypt_Teleporter} = rom.locations;
  Crypt_Teleporter.meta.attach(0x00, TowerEntrance.meta, 0x00,
                               'teleporter', 'teleporter');
}

function reversibleSwanGate(rom: Rom) {
  const {
    flags: {OpenedSwanGate},
    locations: {SwanGate},
    npcs: {SoldierGuard},
  } = rom;
  // Allow opening Swan from either side by adding a pair of guards on the
  // opposite side of the gate.
  SwanGate.spawns.push(
    // NOTE: Soldiers must come in pairs (with index ^1 from each other)
    Spawn.of({xt: 0x0a, yt: 0x02, type: 1, id: 0x2d}), // new soldier
    Spawn.of({xt: 0x0b, yt: 0x02, type: 1, id: 0x2d}), // new soldier
    //Spawn.of({xt: 0x0e, yt: 0x0a, type: 2, id: 0xb3}), // new trigger: erase guards
  );

  // // NOTE: just use the actual flag instead?
  // // Guards ($2d) at swan gate ($73) ~ set 0ef after opening gate => condition for despawn
  // rom.npcs[0x2d].localDialogs.get(0x73)![0].flags.push(0x0ef);
  // // Despawn guard trigger requires 0ef
  // rom.trigger(0xb3).conditions.push(0x0ef);
  SoldierGuard.localDialogs.get(SwanGate.id)![0].flags.push(OpenedSwanGate.id);
  //rom.trigger(0xb3).conditions.push(OpenedSwanGate.id);
  // TODO - can we do away with the trigger?  Just spawn them on the same condition...
}

function splitSaberaPalace2(rom: Rom) {
  splitMap(rom.locations.SaberaPalace2_West, rom.locations.SaberaPalace2,
           0x00, 0x01, 0x10, 0x20, 0x30, 0x31, 0x41, 0x51, 0x61);
}

// function splitStyx2(rom: Rom) {
//   const {riverCave_deadEndsE, riverCave_deadEndsW} = rom.metascreens;
//   splitMap(rom.locations.Styx2_East, rom.locations.Styx2,
//            0x24, 0x33, 0x34, 0x43, 0x44, 0x53);
//   rom.locations.Styx2.meta.set(0x42, riverCave_deadEndsW);
//   rom.locations.Styx2_East.meta.set(0x42, riverCave_deadEndsE);
// }

// Moves the listed pos from one location to a new one (i.e. for maps that
// are actually disconnected).
function splitMap(newLoc: Location, loc: Location, ...splitPos: number[]) {
  const rom = newLoc.rom;
  rom.locations.allocate(newLoc, loc);
  newLoc.bgm = loc.bgm;
  newLoc.entrances = [];
  newLoc.exits = [];
  newLoc.pits = [];
  newLoc.spawns = [];
  newLoc.flags = [];
  newLoc.width = newLoc.height = 1;
  newLoc.screens = [[0x80]];
  newLoc.tilePalettes = cloneArray(loc.tilePalettes);
  newLoc.originalTilePalettes = cloneArray(loc.originalTilePalettes);
  newLoc.tileset = loc.tileset;
  newLoc.tileEffects = loc.tileEffects;
  newLoc.tilePatterns = cloneArray(loc.tilePatterns);
  newLoc.spritePatterns = cloneArray(loc.spritePatterns);
  newLoc.spritePalettes = cloneArray(loc.spritePalettes);

  let h = 0;
  let w = 0;
  for (const pos of splitPos) {
    h = Math.max(h, (pos >>> 4) + 1);
    w = Math.max(w, (pos & 0xf) + 1);
  }
  newLoc.meta = new Metalocation(newLoc.id, loc.meta.tileset, h, w);
  for (const pos of splitPos) {
    newLoc.meta.set(pos, loc.meta.get(pos));
    loc.meta.set(pos, loc.meta.tileset.empty);
  }
  const posSet = new Set(splitPos);
  newLoc.flags = loc.flags.filter(f => posSet.has(f.screen));
  loc.flags = loc.flags.filter(f => !posSet.has(f.screen));
  newLoc.spawns = loc.spawns.filter(s => posSet.has(s.screen));
  loc.spawns = loc.spawns.filter(s => !posSet.has(s.screen));
  loc.meta.moveExitsAndPitsTo(newLoc.meta);
}


/** Mado 2's area has a 4x4 section of unused tiles at the top.  Delete them. */
function shrinkMado2(rom: Rom) {
  // TODO - implement spliceRows
  // rom.locations.GoaFortress_Mado3.meta.spliceRows(0, 4, 0, []);
}

// function closeCaveEntrances(rom: Rom): void {
//   // Destructure out a few locations by name
//   const {
//     flags: {AlwaysTrue, OpenedSealedCave, OpenedPrison},
//     locations: {
//       CordelPlainEast, CordelPlainWest, Desert2,
//       KirisaMeadow, SaharaOutsideCave, ValleyOfWind,
//       WaterfallValleyNorth, WaterfallValleySouth,
//     },
//   } = rom;

//   // // Prevent softlock from exiting sealed cave before windmill started
//   // ValleyOfWind.entrances[1].y += 16; // unneeded after entrance normalization

//   // Clear tiles 1,2,3,4 for blockable caves in tilesets 90, 94, and 9c

//   // // NOTE: flag 2f0 is ALWAYS set - use it as a baseline.
//   // const flagsToClear: [Location, number][] = [
//   //   [ValleyOfWind, 0x30], // valley of wind, zebu's cave
//   //   //[CordelPlainWest, 0x30], // cordel west, vampire cave
//   //   //[CordelPlainEast, 0x30], // cordel east, vampire cave
//   //   //[WaterfallValleyNorth, 0x00], // waterfall north, prison cave
//   //   [WaterfallValleyNorth, 0x14], // waterfall north, fog lamp
//   //   [WaterfallValleySouth, 0x74], // waterfall south, kirisa
//   //   [KirisaMeadow, 0x10], // kirisa meadow
//   //   [SaharaOutsideCave, 0x00], // cave to desert
//   //   [Desert2, 0x41],
//   // ];
//   // function pushFlag(loc: Location, screen: number, flag: flags.Flag) {
//   //   loc.flags.push(Flag.of({screen, flag: flag.id}));
//   // }

//   // for (const [loc, screen] of flagsToClear) {
//   //   pushFlag(loc, screen, AlwaysTrue);
//   // }

//   // NOTE - this used to be configurable...

//   // function replaceFlag(loc: Location, yx: number, flag: number): void {
//   //   for (const f of loc.flags) {
//   //     if (f.yx === yx) {
//   //       f.flag = flag;
//   //       return;
//   //     }
//   //   }
//   //   throw new Error(`Could not find flag to replace at ${loc}:${yx}`);
//   // };

//   // NOTE: we could also close it off until boss killed...?
//   //  - const vampireFlag = ~rom.npcSpawns[0xc0].conditions[0x0a][0];
//   //  -> kelbesque for the other one.
//   pushFlag(CordelPlainWest, 0x30, OpenedSealedCave);
//   pushFlag(CordelPlainEast, 0x30, OpenedSealedCave);
//   pushFlag(WaterfallValleyNorth, 0x00, OpenedPrison);
//   const explosion = Spawn.of({y: 0x060, x: 0x060, type: 4, id: 0x2c});
//   const keyTrigger = Spawn.of({y: 0x070, x: 0x070, type: 2, id: 0xad});
//   WaterfallValleyNorth.spawns.splice(1, 0, explosion);
//   WaterfallValleyNorth.spawns.push(keyTrigger);
// }

function removeUnusedGoaKensuExits(rom: Rom) {
  // These exits are never actually reachable, and they cause problems
  // when their other side ends up getting shuffled.  Possibly the best
  // option is to detect the unreciprocated exits and update them when
  // we transfer.  But for now this is all that's really needed.
  const meta = rom.locations.GoaFortress_Kensu.meta;
  for (const [pos, type] of meta.exits()) {
    if (pos < 0x10 || type.startsWith('seamless')) continue;
    meta.deleteExit(pos, type);
  }

  // NOTE: maps $21 and $ba are seamless pairs of maps with flags, but they
  // lack the actual same flags.  We need to keep them in sync...?  Probably
  // shouldn't allocate a separate flag for them - just reuse the other one.
}

function adjustAbductionTrigger(rom: Rom) {
  // Ensure we can step on it even when there's just a solid wall behind the
  // breakable wall.
  rom.locations.ZebuCave.spawns.find(s => s.isTrigger())!.yt += 3;
}
