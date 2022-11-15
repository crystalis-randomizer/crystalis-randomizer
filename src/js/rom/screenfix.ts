import { Rom } from '../rom';
import { Metascreen } from './metascreen';
import { iters } from '../util';

// Simple tileset-only fixes that unlock some screen-tileset combinations
export enum ScreenFix {
  Unknown,
  // Support "long grass" river screens on the grass tileset by copying
  // some tiles from 51..59 into 40..47.
  GrassLongGrass,
  // In addition to just making the new long grass tiles, we need to
  // also remap the existing ones in some situations to point to the
  // new ones, e.g. for screens 1d,29 to work on river, we need to use
  // the 4x tiles instead of the 5x ones to fix the surrounding.
  GrassLongGrassRemapping, // TODO
  // River tilesets don't define 10,12,14,16,17,1a,1b,1c,22,23,24,25,26,
  // which are used for the "short grass" in the grass tileset.  These
  // would be easy to copy from somewhere else to open up a few screens.
  RiverShortGrass, // TODO
  // Angry sea uses 0a oddly for a simple diagonal beach/mountain tile,
  // preventing parity with grass/river cave entrance bottoms.  Move this
  // tile elsewhere (ad) and fix the graphics/effects.  Note that the
  // actual fix is not entirely satisfying.
  SeaCaveEntrance,
  // Angry sea does not handle rocks correctly.  Fix 5a..5e for parity
  // with grass/river tilesets.  TODO - implement the fix (we could move
  // the existing tiles, used by mountain gates, elsewhere pretty easily,
  // or alternatively move all the 5a..5e in all other tilesets into
  // 89,8a,90,99,9d,d1,d2 which are free in 80,90,94,9c).
  SeaRocks, // TODO
  // Allow the sea to support 34,38,3c..3f, used as marsh in river tileset.
  // These would need to map to simple ocean tiles.  TODO - implement.
  SeaMarsh, // TODO
  // Support 6x,7x tiles (trees) on angry sea.  Probably not worth it.
  // Would need to move (e.g.) Lime Tree Lake to a totally different tileset
  // to free up the metatiles.
  SeaTrees, // TODO
  // Fixing RiverShortGrass for desert is a lot harder because it touches a
  // bunch of tiles used by the mountainRiver tileset (10,14,2x).
  DesertShortGrass, // TODO
  // Fixing GrassLongGrass for desert is difficult because the 4x tiles
  // are used by mountainRiver.
  DesertLongGrass, // TODO
  // Desert doesn't support the 3x marsh tiles (clash with mountainRiver).
  // It's probably not feasible to add support - it would allow screen 33,
  // but there's a similar south-edge-exit screen with DesertTownEntrance.
  DesertMarsh, // TODO
  // Fix 5a..5e to be compatible with grass/river.  5b is already in use
  // on the two oasis screens, so that tile is moved to 5f to make space.
  DesertRocks,
  // Add some missing tree tiles in 63,68,69,6a,6c,6e,6f, required for
  // parity with some river screens.
  DesertTrees,
  // South-facing town entrances use 07 for the top of the town wall.
  // This could be replaced with (e.g. 8c) or maybe something better.
  DesertTownEntrance, // TODO
  // Labyrinth parapets can be blocked/unblocked with a flag.  Registered
  // in maze/goa.
  LabyrinthParapets,
  // Adds flaggable doors to various screens.
  SwampDoors, // TODO (see maze/swamp)
  // Adds some extra spike screens.
  ExtraSpikes, // TODO
  // Make caves closeable.
  CloseCaves,
  // Makes the top exits of arenas full-size rather than narrow, giving
  // more flexibility with what can go there.
  WideArenaExits,
}

type Reqs = Record<any, {requires?: ScreenFix[]}>
export function withRequire<T extends Reqs>(requirement: ScreenFix, props: T) {
  for (const key in props) {
    props[key].requires = [requirement];
  }
  return props;
}


  // // Adds ability to close caves.
  // CloseCaves,


// /** Adds a 'CloseCaves' requirement on all the properties. */
// function closeCaves<T extends Record<any, {requires: ScreenFix[]}>>(props: T) {
//   for (const key in props) {
//     props[key].requires = [ScreenFix.CloseCaves];
//   }
//   return props;
// }


// NOTE: Listing explicit flags doesn't quite work.
// enum Flag {
//   Always = 0x2f0,
//   Windmill = 0x2ee,
//   Prison = 0x2d8,
//   Calm = 0x283,
//   Styx = 0x2b0,
//   Draygon1 = 0x28f,
//   Draygon2 = 0x28d,
// }

// const GRASS = 0x80;
// const TOWN = 0x84;
// const CAVE = 0x88;
// const PYRAMID = 0x8c;
// const RIVER = 0x90;
// const MOUNTAIN = 0x94;
// const SEA = 0x94;
// const SHRINE = 0x98;
// const DESERT = 0x9c;
// const MOUNTAIN_RIVER = 0x9c;
// const SWAMP = 0xa0;
// const HOUSE = 0xa0;
// const FORTRESS = 0xa4;
// const ICE_CAVE = 0xa8;
// const TOWER = 0xac;

/** Apply standard tileset fixes.  Others may be applied later. */
export function fixTilesets(rom: Rom) {
  const {desert, grass, lime, mountain, mountainRiver,
         river, sea, town} = rom.metatilesets;
  const $ = rom.metascreens;

  // Several of the grass/river screens with forest tiles don't work on
  // desert.  Fix them by making 5a..6f work correctly.
  $.registerFix(ScreenFix.DesertRocks);
  desert.getTile(0x5f).copyFrom(0x5b).replaceIn($.oasisCave, $.oasisLake);

  desert.getTile(0x5a).copyFrom(0x98).setTiles([, , 0x1a, 0x18]);
  desert.getTile(0x5b).copyFrom(0x80).setTiles([0x34, 0x32, , ]);
  desert.getTile(0x5c).copyFrom(0x80).setTiles([, , 0x37, 0x35]);
  desert.getTile(0x5d).copyFrom(0x80).setTiles([, 0x37, , 0x34]);
  desert.getTile(0x5e).copyFrom(0x80).setTiles([0x35, , 0x32, ]);

  $.registerFix(ScreenFix.DesertTrees);
  desert.getTile(0x63).copyFrom(0x71);
  desert.getTile(0x68).copyFrom(0x70);
  desert.getTile(0x69).copyFrom(0x60);
  desert.getTile(0x6a).copyFrom(0x65);
  desert.getTile(0x6c).copyFrom(0x70);
  desert.getTile(0x6e).copyFrom(0x76);
  desert.getTile(0x6f).copyFrom(0x78);

  // Long grass screens don't work on grass tilesets because of a few
  // different tiles - copy them where they need to go.
  $.registerFix(ScreenFix.GrassLongGrass);
  grass.getTile(0x40).copyFrom(0x51);
  grass.getTile(0x41).copyFrom(0x52);
  grass.getTile(0x42).copyFrom(0x53);
  grass.getTile(0x43).copyFrom(0x54);
  grass.getTile(0x44).copyFrom(0x55);
  grass.getTile(0x45).copyFrom(0x56);
  grass.getTile(0x46).copyFrom(0x58);
  grass.getTile(0x47).copyFrom(0x59);

  // Angry sea tileset doesn't support tile 0a (used elsewhere for the
  // bottom tile in cave entrances) because it's already in use (but
  // not as an alternative).  Move it to ad and get 0a back.  Also adjust
  // the tiles around the cave entrances to not have damage tiles in the
  // desert tileset.  This changes the graphics a bit (from dark blue
  // water to light blue), which doesn't look quite as nice.  The other
  // alternative is to allocate 3 new tiles, copied from 0x80 in sea but
  // from 0xf7, 0xf8, and 0xfd in desert/river/grass.  Then sea can keep
  // its deep water but desert avoids the damage.
  $.registerFix(ScreenFix.SeaCaveEntrance);
  sea.getTile(0xad).copyFrom(0x0a)
      .replaceIn($.beachExitN, $.lighthouseEntrance, $.oceanShrine);
  sea.getTile(0x0a).copyFrom(0xa2); // don't bother setting an alternative.
  //sea.getTile(0x0a).setTiles([0x91, 0x91, 0x7d, 0x7d]).setAttrs(2);
  $.boundaryN_cave.screen.set2d(0x38, [[    , 0x00, 0x00      ],
                                       [    , 0x0a, 0x0a      ],
                                       [    , 0xf7, 0xf7      ],
                                       [0xf8, 0xf8, 0xf8, 0xf8]]);
  $.cornerSE_cave.screen.set2d(0x49, [[    , 0x00, 0x00],
                                      [    , 0x0a, 0x0a],
                                      [    , 0xf7, 0xf7],
                                      [0xf8, 0xf7, 0xf7],
                                      [    , 0xfd, 0xf7]]);
  $.cornerSE_cave.screen.set2d(0x4a, [[0x00, 0x00],
                                      [0x0a, 0x0a],
                                      [0xf7, 0xf7],
                                      [0xf8, 0xf7],
                                      [0x80, 0xfd],
                                      [0x80, 0xff],
                                      [0xfa      ]]);

     // , [0xf8, 0xf8], [null, 0xfd]]);
  // sea.screens.add($.boundaryW_cave);
  // sea.screens.add($.desertCaveEntrance);

  // To allow caves to be closed, we clear out metatiles 01..04, to be used as
  // the four corners of the cave: [[01, 01], [02, 02]].  03 and 04 are used for
  // water entrances to ensure the player isn't kicked off the dolphin.
  // These are copied from c1,d7 for most tilesets (though ocean is special).
  // Some tilesets already have metatiles in 01..04 so we need to move them to
  // unoccupied spots on a per-tileset basis (note that sea (94) and desert (9c)
  // are entangled here).  [TODO - clean up 2c and 2d as well]
  $.registerFix(ScreenFix.CloseCaves);
  // Move the existing tiles in 01..04 to various free spots
  river.getTile(0x07).copyFrom(0x01).replaceIn(...river);
  river.getTile(0x0e).copyFrom(0x02).replaceIn(...river);
  river.getTile(0x20).copyFrom(0x03).replaceIn(...river);
  river.getTile(0x21).copyFrom(0x04).replaceIn(...river);
  for (const ts of [desert, sea, mountain, mountainRiver, lime]) {
    ts.getTile(0x68).copyFrom(0x01).replaceIn(...ts);
    ts.getTile(0x83).copyFrom(0x02).replaceIn(...ts);
    ts.getTile(0x88).copyFrom(0x03).replaceIn(...ts);
    ts.getTile(0x89).copyFrom(0x04).replaceIn(...ts);
  }
  for (const ts of [town]) {
    // Note: we need the 03/04 tiles here because Sahara Meadow north
    // cave exit is shared with ESI entrance.
    // Need to move 01,02 (vanilla Swan Gate) to somewhere else flaggable,
    // but there aren't two available spots, so we'll move 1a,1b to 50,51
    // first, and then move 01,02 to 1a,1b.
    ts.getTile(0x50).copyFrom(0x1a).replaceIn(...ts);
    ts.getTile(0x51).copyFrom(0x1b).replaceIn(...ts);
    ts.getTile(0x1a).copyFrom(0x01).replaceIn(...ts);
    ts.getTile(0x1b).copyFrom(0x02).replaceIn(...ts);
    ts.getTile(0x52).copyFrom(0x03).replaceIn(...ts);
    ts.getTile(0x57).copyFrom(0x04).replaceIn(...ts);
  }
  // Make 01..04 be flaggable wall/opening
  for (const ts of [grass, river, desert]) {
    ts.getTile(0x01).copyFrom(0xc1).setAlternative(0x00);
    ts.getTile(0x02).copyFrom(0xd7).setAlternative(0x0a);
    ts.getTile(0x03).copyFrom(0xc1).setAlternative(0x00);
    ts.getTile(0x04).copyFrom(0xd7).setAlternative(0x0a);
  }
  for (const ts of [sea]) {
    ts.getTile(0x01).copyFrom(0xc1).setAlternative(0x00);
    ts.getTile(0x02).copyFrom(0xcb).setAlternative(0x00);
    ts.getTile(0x03).copyFrom(0xc1).setAlternative(0xc0);
    ts.getTile(0x04).copyFrom(0xcb).setAlternative(0xc0);
    // copy rock graphics from other tileset (same page is loaded)
    for (let i = 1; i < 5; i++) {
      ts.getTile(i).setTiles(grass.getTile(i).tiles);
    }
  }
  for (const ts of [town]) {
    ts.getTile(0x01).copyFrom(0x63).setAlternative(0x00);
    ts.getTile(0x02).copyFrom(0x64).setAlternative(0xd2);
    ts.getTile(0x03).copyFrom(0x63).setAlternative(0x00);
    ts.getTile(0x04).copyFrom(0x64).setAlternative(0xd2);
  }
  // Set the cave entrances to use 01..04 as appropriate
  const closedCaves = new Set([
    $.boundaryE_cave, $.boundaryW_cave, $.exitW_cave, $.caveAbovePortoa,
    $.beachCave, $.outsideWindmill,
    $.exitS_cave, $.townExitW_cave,
    $.zombieTownBottom_caveExit, // (town)
    // TODO - any way to do $.channelEndW_cave? (stair in dolphinCave)
    // TODO - mountain cave entrances? (both 94 and 
    //   - 0 on top, 16 on bottom for 05 (free in 94) and 06 (from 27 or 3c?)
    //   - or just use 1a/1a/08/09 - only 08 if a key is needed?
  ]);
  const waterCaves = new Set<Metascreen>([]);
  if ($.isFixed(ScreenFix.SeaCaveEntrance)) {
    waterCaves.add($.boundaryN_cave);
    waterCaves.add($.cornerSE_cave);
  }
  const mountainCaves = new Set([
    $.mountainDeadEndW_caveEmpty,
    $.mountainPathW_cave,
    $.mountainCave_empty,
    $.mountainPathE_cave,
    $.mountainPathN_slopeS_cave,
    $.mountainPathWE_slopeN_cave,
    $.mountainPathE_gate,
  ]);
  for (const scr of [...closedCaves, ...waterCaves]) {
    const exit = scr.data.exits!.find(e => e.type === 'cave');
    const pos = Math.min(...exit!.exits) - 0x10;
    const tiles = waterCaves.has(scr) ? [[3, 3], [4, 4]] : [[1, 1], [2, 2]];
    scr.screen.set2d(pos, tiles);
    scr.addCustomFlag(true);
  }
  for (const scr of [...mountainCaves]) {
    const exit = scr.data.exits!.find(e => e.type === 'cave' || e.type === 'gate');
    const pos = Math.min(...exit!.exits) - 0x10;
    const tiles = [[0x1a, 0x1a], [0x08, 0x09]];
    scr.screen.set2d(pos, tiles);
    scr.addCustomFlag(true);
  }
  // Fix the two vanilla sealed-cave graphics to be consistent with
  // our nicer "rockfall" graphics (specifically, add the arched top).
  $.outsideWindmill.screen.set2d(0x43, [[0xca, 0x82]]);
  $.townExitW_cave.screen.set2d(0x2a, [[0xca, 0x82]]);

  // NOTE: the correct caves are closed by pass/fixentrancetriggers.

  // sea.getTile(0x0a).copyFrom(0xa2).setTiles([,,0x91,0x91]).setAttrs(0);
  // This does open up screen $ce (desert cave entrance) for use in the sea,
  // which is interesting because whirlpools can't be flown past - we'd need
  // to add flags to clear the whirlpools, but it would be a cave that's
  // blocked on calming the sea...

  // We could add a number of screens to the sea if we could move 5a..5e
  // (which collides with mountain gates).  89,8a,90,99,9d,d1,d2 are free
  // in 80 (grass), 90 (river), and 9c (desert).  The main problem is that
  // at least the cave entrances don't quite work for these - they end up
  // in shallow water, are a little too short, and it seems to be impossible
  // to pick a palette that is light blue on bottom and black on top.
  //
  // Other options for the sea are 34,38,3c..3f which are marsh tiles in
  // river - would open up some narrow passages (33, 


  //  rom.metascreens;

  // for (const x of Object.values(TILESET_FIXES)) {
  //   const id = x.id;
  //   const ts = rom.tilesets[id];
  //   const te = ts.effects();
  //   for (const tstr in x) {
  //     const t = Number(tstr);
  //     if (isNaN(t)) continue;
  //     const y: number|{base: number} = (x as any)[t];
  //     const base = typeof y === 'number' ? y : (y as any).base;
  //     const rest: any = typeof y === 'number' ? {} : y;
  //     ts.attrs[t] = ts.attrs[base];
  //     te.effects[t] = te.effects[base];
  //     [rest.tl, rest.tr, rest.bl, rest.br].forEach((m, i) => {
  //       ts.tiles[i][t] = ts.tiles[i][m != null ? m : base];
  //     });
  //     if (rest.move) {}
  //     // if (rest.tiles) {
  //     //   rest.tiles.forEach((s: number, i: number) => void (ts.tiles[i][t] = s));
  //     // }
  //   }
  // }
}


// const TILESET_FIXES = {
//   grass: {
//     id: 0x80,
//     0x40: 0x51,
//     0x41: 0x52,
//     0x42: 0x53,
//     0x43: 0x54,
//     0x44: 0x55,
//     0x45: 0x56,
//     0x46: 0x58,
//     0x47: 0x59,
//   },
//   desert: {
//     id: 0x9c,
//     0x5a: {base: 0x98, bl: 0x94, br: 0x94},
//     0x5b: {base: 0x80, tl: 0xfd, tr: 0xfc},
//     0x5c: {base: 0x80, bl: 0xff, br: 0xfe},
//     0x5d: {base: 0x80, tr: 0xff, br: 0xfd},
//     0x5e: {base: 0x80, tl: 0xfe, bl: 0xfc},
//     0x63: 0x71,
//     0x68: 0x70,
//     0x69: 0x60,
//     0x6a: 0x65,
//     0x6c: 0x70,
//     0x6e: 0x76,
//     0x6f: 0x78,
//   },
// } as const;

// const SCREEN_REMAPS = [
//   {tilesets: [0x9c], src: 0x5b, dest: 0x5f, screens: [0xcf]},
// ];
// const [] = SCREEN_REMAPS;

// TODO - copy 5f <- 5b in 9c, then remap in screen cf
//      - better notation?
// Consider doing this programmatically, though we'd want to use
// the _actual_ screen-tileset usages rather than declared options

// class X {
//   readonly m: Metascreens;
//   constructor(r: Rom) {
//     this.m = new Metascreens(r);
//   }
// }

// Applies the WideArenaExits screen fix.
export function wideArenaExits(rom: Rom) {
  function widen(exits: number[]) {
    exits.splice(0, exits.length,
                 ...new Set(iters.concat(
                     ...exits.map(e => [e, e + 1, e - 1]))));
  }

  // Widen the top exits of the simple arenas
  const {
    fortressArena_through, fortressTrap,
    hallNS, hallNS_arena, hallNS_arenaWall, hallNS_entrance,
  } = rom.metascreens;
  hallNS_arena.screen.set2d(0x04, [
    [0x97, 0x76, 0x22, 0x23, 0x23, 0x23, 0x4b, 0x95],
    [0x42, 0x48, 0x22, 0x21, 0x23, 0x23, 0x45, 0x42],
    [0x43, 0x49, 0x2e, 0x23, 0x23, 0x21, 0x46, 0x43],
    [0x44, 0x4a, 0x2e, 0x23, 0x21, 0x21, 0x47, 0x44],
  ]);
  hallNS_arena.setGridTile(' c | a | c '); //, ' c | a | w ');
  widen(hallNS_arena.findExitByType('edge:top').exits as number[]);

  hallNS_arenaWall.screen.set2d(0x04, [
    [0x94, 0x4c, 0x22, 0x21, 0x21, 0x21, 0x4b, 0x93],
    [0x97, 0x4f, 0x00, 0x01, 0x01, 0x02, 0x50, 0x95],
  ]);
  hallNS_arenaWall.setGridTile(' c | a | c ');
  widen(hallNS_arenaWall.findExitByType('edge:top').exits as number[]);

  // Move the abduction trigger down 3 tiles so you can't walk around it
  const abductionTrigger =
      rom.locations.ZebuCave.spawns.find(s => s.isTrigger() && s.id === 0x8c);
  if (abductionTrigger) abductionTrigger.yt += 4;

  // Widen the top exits of the fortress/pyramid arenas
  fortressArena_through.screen.set2d(0x05, [
    [0x5f, 0x22, 0x21, 0x21, 0x21, 0x5f],
    [0xb7, 0x22, 0x21, 0x21, 0x21, 0xb5],
    [0xbf, 0x22, 0x21, 0x21, 0x21, 0xa8],
  ]);
  fortressArena_through.setGridTile(' c | a | w ');
  widen(fortressArena_through.findExitByType('edge:top').exits as number[]);

  // Widen the bottom entrance of sabera's trap
  fortressTrap.screen.set2d(0xc4, [
    [0x3c, 0x3d, 0x21, 0x21, 0x21, 0x21, 0x3b, 0x3c],
    [0x92, 0x4c, 0x22, 0x21, 0x21, 0x21, 0x4b, 0x90],
    [0x94, 0x4c, 0x22, 0x21, 0x21, 0x21, 0x4b, 0x93],
  ]);
  fortressTrap.setGridTile('   | x | c ');
  widen(fortressTrap.findExitByType('edge:bottom').exits as number[]);

  // Find cases where a narrow hallway was used on top
  // of an arena and replace with a normal hallway
  for (const location of rom.locations) {
    const meta = location.meta;
    for (const pos of meta.allPos()) {
      const scr = meta.get(pos);
      if (scr === hallNS_entrance && meta.get(pos + 16)?.hasFeature('arena')) {
        meta.set(pos, hallNS);
        // also set the non-meta version, mainly for map viewer
        const row = location.screens[pos >>> 4];
        if (row) row[pos & 0xf] = hallNS.sid;
      }
    }
  }
}
