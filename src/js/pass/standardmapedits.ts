import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Entrance, Exit, Flag, Location, Spawn} from '../rom/location.js';

type EastCaveExit = 'cordel' | 'lime' | 'goa' | 'desert';

interface EastCaveOptions {
  exit1?: EastCaveExit;
  exit2?: EastCaveExit;
}

interface Options {
  eastCave?: EastCaveOptions;
  classicLimeTreeToLeaf?: boolean;
}

export function standardMapEdits(rom: Rom, opts: Options) {
  if (opts.eastCave) {
    eastCave(rom, opts.eastCave);
  } else if (opts.classicLimeTreeToLeaf) {
    connectLimeTreeToLeaf(rom);
  }
  addTowerExit(rom);
  reversibleSwanGate(rom);
  closeCaveEntrances(rom); // NOTE: after other map edits
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
    return options;
  }
}

function eastCave(rom: Rom, opts: EastCaveOptions) {
  const {
    locations: {EastCave1, EastCave2, EastCave3, SealedCave1, ValleyOfWind},
    //flags: {AlwaysTrue},
  } = rom;

  rom.locations.allocate(rom.locations.EastCave1);
  rom.locations.allocate(rom.locations.EastCave2);
  if (opts.exit2) rom.locations.allocate(rom.locations.EastCave3);

  // NOTE: 0x9c can become 0x99 in top left or 0x97 in top right or bottom middle for a cave exit
  EastCave1.screens = [[0x9c, 0x84, 0x80, 0x83, 0x9c],
                       [0x80, 0x81, 0x83, 0x86, 0x80],
                       [0x83, 0x88, 0x89, 0x80, 0x80],
                       [0x81, 0x8c, 0x85, 0x82, 0x84],
                       [0x9e, 0x85, 0x9c, 0x98, 0x86]];

  EastCave2.screens = [[0x9c, 0x84, 0x9b, 0x80, 0x9b],
                       [0x80, 0x81, 0x81, 0x80, 0x81],
                       [0x80, 0x87, 0x8b, 0x8a, 0x86],
                       [0x80, 0x8c, 0x80, 0x85, 0x84],
                       [0x9c, 0x86, 0x80, 0x80, 0x9a]];

  for (const l of [EastCave1, EastCave2, EastCave3]) {
    l.bgm = l.originalBgm = 0x17; // mt sabre cave music?
    l.entrances = [];
    l.exits = [];
    l.pits = [];
    l.spawns = [];
    l.flags = [];
    l.height = l.screens.length;
    l.width = l.screens[0].length;
    l.extended = 0;
    l.tilePalettes = [0x1a, 0x1b, 0x05]; // rock wall
    l.originalTilePalettes = [0x1a, 0x1b, 0x05]; // rock wall
    l.tileset = 0x88;
    l.tileEffects = 0xb5;
    l.tilePatterns = [0x14, 0x02];
    l.spritePatterns = [...SealedCave1.spritePatterns] as [number, number];
    l.spritePalettes = [...SealedCave1.spritePalettes] as [number, number];
  }

  // Add entrance to valley of wind
  // TODO - maybe just do (0x33, [[0x19]]) once we fix that screen for grass
  ValleyOfWind.writeScreens2d(0x23, [
    [0x11, 0x0d],
    [0x09, ~0xc2]]);
  rom.tileEffects[0].effects[0xc0] = 0;
  // TODO - do this once we fix the sea tileset
  // rom.screens[0xc2].tiles[0x5a] = 0x0a;
  // rom.screens[0xc2].tiles[0x5b] = 0x0a;

  // Connect maps
  EastCave1.connect(0x43, EastCave2, 0x44);
  EastCave1.connect(0x40, ValleyOfWind, 0x34);

  if (opts.exit1) {
    EastCave1.screens[0][4] = 0x97; // down stair
    connectEastCaveExit(EastCave1, 0x04, opts.exit1);
  }

  if (opts.exit2) {
    rom.locations.allocate(EastCave3);
    EastCave3.screens = [[0x9a],
                         [0x8f],
                         [0x9e]];
    EastCave3.height = 3;
    EastCave3.width = 1;

    // Add a rock wall (id=0).
    EastCave3.spawns.push(Spawn.from([0x18, 0x07, 0x23, 0x00]));
    EastCave3.flags.push(Flag.of({screen: 0x10, flag: rom.flags.alloc(0x200)}));

    // Make the connections.
    EastCave2.screens[4][0] = 0x99;
    EastCave2.connect(0x40, EastCave3, ~0x00);
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
    // chest: alarm flute
    Spawn.of({y: 0x110, x: 0x478, type: 2, id: 0x31}),
    // chest: mimic
    Spawn.of({y: 0x070, x: 0x108, type: 2, id: 0x70}),
  );
  rom.npcs.WindmillGuard.data[1] = 0x59; // alarm flute -> medical herb
}

function connectEastCaveExit(loc: Location, scr: number, exit: EastCaveExit) {
  let dest: Location;
  let destScr: number;
  switch (exit) {
    case 'lime':
      // Add entrance to lime tree valley
      dest = loc.rom.locations.LimeTreeValley;
      destScr = 0x10;
      dest.resizeScreens(0, 1, 0, 0); // add one screen to left edge
      dest.writeScreens2d(0x00, [
        [ 0x0c, 0x11],
        [~0x15, 0x36],
        [ 0x0e, 0x0f]]);
      break;

    case 'cordel':
      dest = loc.rom.locations.CordelPlainEast;
      destScr = 0x55;
      dest.writeScreens2d(0x55, [
        [~0x15, 0x36],
        [ 0x0e, 0x0f]]);
      break;

    case 'goa':
      dest = loc.rom.locations.GoaValley;
      destScr = 0x11;
      dest.writeScreens2d(0x01, [
        [ 0x0c, 0x0d],
        [~0x15, 0x35]]);
      break;

    case 'desert':
      dest = loc.rom.locations.Desert2;
      destScr = 0x53;
      dest.writeScreens2d(0x53, [[~0xc2]]);
      break;
  }
  loc.connect(scr, dest, destScr);
}

// Programmatically add a hole between valley of wind and lime tree valley
function connectLimeTreeToLeaf(rom: Rom) {
  const {ValleyOfWind, LimeTreeValley} = rom.locations;

  ValleyOfWind.screens[5][4] = 0x10; // new exit
  LimeTreeValley.screens[1][0] = 0x1a; // new exit
  LimeTreeValley.screens[2][0] = 0x0c; // nicer mountains

  const windEntrance =
      ValleyOfWind.entrances.push(Entrance.of({x: 0x4ef, y: 0x578})) - 1;
  const limeEntrance =
      LimeTreeValley.entrances.push(Entrance.of({x: 0x010, y: 0x1c0})) - 1;

  ValleyOfWind.exits.push(
      Exit.of({x: 0x4f0, y: 0x560, dest: 0x42, entrance: limeEntrance}),
      Exit.of({x: 0x4f0, y: 0x570, dest: 0x42, entrance: limeEntrance}));
  LimeTreeValley.exits.push(
      Exit.of({x: 0x000, y: 0x1b0, dest: 0x03, entrance: windEntrance}),
      Exit.of({x: 0x000, y: 0x1c0, dest: 0x03, entrance: windEntrance}));
}

function addTowerExit(rom: Rom) {
  const {TowerEntrance, Crypt_Teleporter} = rom.locations;
  const entrance = Crypt_Teleporter.entrances.length;
  const dest = Crypt_Teleporter.id;
  Crypt_Teleporter.entrances.push(Entrance.of({tile: 0x68}));
  TowerEntrance.exits.push(Exit.of({tile: 0x57, dest, entrance}));
  TowerEntrance.exits.push(Exit.of({tile: 0x58, dest, entrance}));
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

function closeCaveEntrances(rom: Rom): void {
  // Destructure out a few locations by name
  const {
    flags: {AlwaysTrue, OpenedSealedCave, OpenedPrison},
    locations: {
      CordelPlainEast, CordelPlainWest, Desert2,
      KirisaMeadow, SaharaOutsideCave, ValleyOfWind,
      WaterfallValleyNorth, WaterfallValleySouth,
    },
  } = rom;

  // Prevent softlock from exiting sealed cave before windmill started
  ValleyOfWind.entrances[1].y += 16;

  // Clear tiles 1,2,3,4 for blockable caves in tilesets 90, 94, and 9c
  rom.swapMetatiles([0x90],
                    [0x07, [0x01, 0x00], ~0xc1],
                    [0x0e, [0x02, 0x00], ~0xc1],
                    [0x20, [0x03, 0x0a], ~0xd7],
                    [0x21, [0x04, 0x0a], ~0xd7]);
  rom.swapMetatiles([0x94, 0x9c],
                    [0x68, [0x01, 0x00], ~0xc1],
                    [0x83, [0x02, 0x00], ~0xc1],
                    [0x88, [0x03, 0x0a], ~0xd7],
                    [0x89, [0x04, 0x0a], ~0xd7]);

  // Now replace the tiles with the blockable ones
  rom.screens[0x0a].tiles[0x38] = 0x01;
  rom.screens[0x0a].tiles[0x39] = 0x02;
  rom.screens[0x0a].tiles[0x48] = 0x03;
  rom.screens[0x0a].tiles[0x49] = 0x04;

  rom.screens[0x15].tiles[0x79] = 0x01;
  rom.screens[0x15].tiles[0x7a] = 0x02;
  rom.screens[0x15].tiles[0x89] = 0x03;
  rom.screens[0x15].tiles[0x8a] = 0x04;

  rom.screens[0x19].tiles[0x48] = 0x01;
  rom.screens[0x19].tiles[0x49] = 0x02;
  rom.screens[0x19].tiles[0x58] = 0x03;
  rom.screens[0x19].tiles[0x59] = 0x04;

  rom.screens[0x3e].tiles[0x56] = 0x01;
  rom.screens[0x3e].tiles[0x57] = 0x02;
  rom.screens[0x3e].tiles[0x66] = 0x03;
  rom.screens[0x3e].tiles[0x67] = 0x04;

  // NOTE: flag 2f0 is ALWAYS set - use it as a baseline.
  const flagsToClear: [Location, number][] = [
    [ValleyOfWind, 0x30], // valley of wind, zebu's cave
    //[CordelPlainWest, 0x30], // cordel west, vampire cave
    //[CordelPlainEast, 0x30], // cordel east, vampire cave
    //[WaterfallValleyNorth, 0x00], // waterfall north, prison cave
    [WaterfallValleyNorth, 0x14], // waterfall north, fog lamp
    [WaterfallValleySouth, 0x74], // waterfall south, kirisa
    [KirisaMeadow, 0x10], // kirisa meadow
    [SaharaOutsideCave, 0x00], // cave to desert
    [Desert2, 0x41],
  ];
  for (const [loc, yx] of flagsToClear) {
    loc.flags.push(Flag.of({yx, flag: AlwaysTrue.id}));
  }

  // NOTE - this used to be configurable...

  // function replaceFlag(loc: Location, yx: number, flag: number): void {
  //   for (const f of loc.flags) {
  //     if (f.yx === yx) {
  //       f.flag = flag;
  //       return;
  //     }
  //   }
  //   throw new Error(`Could not find flag to replace at ${loc}:${yx}`);
  // };

  // NOTE: we could also close it off until boss killed...?
  //  - const vampireFlag = ~rom.npcSpawns[0xc0].conditions[0x0a][0];
  //  -> kelbesque for the other one.
  CordelPlainWest.flags.push(Flag.of({yx: 0x30, flag: OpenedSealedCave.id}));
  CordelPlainEast.flags.push(Flag.of({yx: 0x30, flag: OpenedSealedCave.id}));
  WaterfallValleyNorth.flags.push(Flag.of({yx: 0x00, flag: OpenedPrison.id}));
  const explosion = Spawn.of({y: 0x060, x: 0x060, type: 4, id: 0x2c});
  const keyTrigger = Spawn.of({y: 0x070, x: 0x070, type: 2, id: 0xad});
  WaterfallValleyNorth.spawns.splice(1, 0, explosion);
  WaterfallValleyNorth.spawns.push(keyTrigger);
}
