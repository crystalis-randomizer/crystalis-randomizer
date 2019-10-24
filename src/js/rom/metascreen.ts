import {Rom} from '../rom.js';
//import {Screen} from './screen.js';
import { initializer, seq} from './util.js';
import {DefaultMap} from '../util.js';
import {Metatileset, Metatilesets} from './metatileset.js';
//import {SparseArray} from '../util.js';

// TODO - make a separate Metascreens??? Then Screens can just be normal?

// BASIC PLAN: Screen is the physical array, Metascreen has the extra info.
//             Only Metascreen is tied to specific (Meta)tilesets.

// type ScreenKey = keyof typeof SCREENS;
// type MetascreensBase = {readonly [T in ScreenKey]: Metascreen};
// const MetascreensBase: {new(): MetascreensBase} = class {};

const $ = initializer<[MetascreenData], Metascreen>();

// export type Tilesets = TilesetsClass & {[T in keyof typeof TILESETS]: Metatileset};

// export const Tilesets: {new(rom: Rom): Tilesets} = TilesetsClass as any;


// TODO - Metascreens should define MetaExits (Connections?) that
//        include data about tiles for entrance and exits; then
//        we teach Location to work with these.

type StairType = 'stair:up' | 'stair:down';
type EdgeType = 'edge:top' | 'edge:bottom' | 'edge:left' | 'edge:right';
type ConnectionType =
     StairType | EdgeType | 'cave' | 'door' | 'fortress' | 'other';

export interface Connection {
  readonly type: ConnectionType;
  readonly dir: number;              // 0=up, 1=left, 2=down, 3=right
  readonly entrance: number;         // pos YyXx
  readonly exits: readonly number[]; // tile YX
  // TODO - singleHeightEntrance - for dir=2 just subtract 0x20 ??
  // TODO - opposite direction? waterfall cave is a right/down matchup...
}

/** @param tile position of lower-left metatile (e.g. 0x42 for 40_30). */
function upStair(tile: number, width = 2): Connection {
  // from map 04: entrance 40_30  => exits 32,33
  // from map 19 (single-width): tile 68 => entrance 78_88, exit 68
  const y = tile >>> 4;
  const x = tile & 0xf;
  if (width === 1) {
    const entrance = ((y << 12) + 0x1800) | ((x << 4) + 0x0008);
    return {
      type: 'stair:down',
      dir: 2,
      entrance,
      exits: [tile],
    };
  }
  const entrance = y << 12 | (x + 1) << 4;
  return {
    type: 'stair:up',
    dir: 0,
    entrance,
    exits: seq(width, i => tile - 0x10 + i),
  };
}

/** @param tile position of upper-left metatile (e.g. 0xa2 for af_30). */
function downStair(tile: number, width = 2): Connection {
  // from map 05: entrance af_30  => exits b2,b3
  // from map d4 (single-width): tile 4c => entrance 38_c8, exit 4c
  const y = tile >>> 4;
  const x = tile & 0xf;
  if (width === 1) {
    const entrance = ((y << 12) - 0x0800) | ((x << 4) + 0x0008);
    return {
      type: 'stair:down',
      dir: 2,
      entrance,
      exits: [tile],
    };
  }
  const entrance = y << 12 | 0x0f00 | (x + 1) << 4;
  return {
    type: 'stair:down',
    dir: 2,
    entrance,
    exits: [seq(width, i => tile + 0x10 + i)],
  };
}

function cave(tile: number, type = 'cave'): Connection {
  return {...upStair(tile), type};
}

function door(tile: number, type = 'door'): Connection {
  return {...upStair(tile, 1), type};
}

/** @param tile bottom-left metatile */
function waterfallCave(tile: number): Connection {
  const y = tile >>> 4;
  const x = tile & 0xf;
  return {
    type: 'cave',
    dir: 0,
    entrance: y << 12 | 0x0f00 | x << 4,
    exits: [tile - 0xf, tile + 1],
  };
}

function topEdge(left = 7, width = 2): Connection {
  return {
    type: 'edge:top',
    dir: 0,
    entrance: 0x30_00 | (left + 1) << 4, // TODO - do single-height maps differ?
    exits: seq(width, i => 0x20 | (i + left)),
  };
}

function bottomEdge(left = 7, width = 2): Connection {
  // TODO - maybe just make a separate set of numbers for single-height?
  //  - the function call will still be correct.
  return {
    type: 'edge:bottom',
    dir: 2,
    entrance: 0xdf_00 | (left + 1) << 4, // NOTE - single-height maps differ!!
    exits: seq(width, i => 0xe0 | (i + left)),
  };
}

function leftEdge(top = 7, height = 2): Connection {
  return {
    type: 'edge:left',
    dir: 1,
    // entrance: 0x30_00 | (top + 1) << 4, // TODO - do single-height maps differ?
    // exits: seq(height, i => 0x20 | (i + height)),
  };
}

function rightEdge(top = 7, height = 2): Connection {
  return {
    type: 'edge:right',
    dir: 1,
    // entrance: 0x30_00 | (top + 1) << 4, // TODO - do single-height maps differ?
    // exits: seq(height, i => 0x20 | (i + height)),
  };
}

/** @param tile Top-left tile of transition (height 2) */
function seamlessVertical(tile: number, width = 2): Connection {
  throw new Error();
}

export class Metascreen {
  readonly screen?: number;

  constructor(readonly rom: Rom, readonly data: MetascreenData) {
    this.screen = data.id;
  }

  replace(from: number, to: number): Metascreen {
    if (this.screen == null) throw new Error(`cannot replace unused screen`);
    const scr = this.rom.screens[this.screen];
    for (let i = 0; i < scr.tiles.length; i++) {
      if (scr.tiles[i] === from) scr.tiles[i] = to;
    }
    return this;
  }
}

interface MetascreenData {
  id?: number;
  icon?: Icon;
  tilesets?: {[name in keyof Metatilesets]?: {
    requires?: ScreenFix[],
    type?: string, // for town?
  }};
  generate?: unknown;
  migrated?: number;
}

interface Icon {
  short: string; // single character
  full: readonly [string, string, string]; // 3x3 grid
}

function icon(arr: TemplateStringsArray): Icon {
  if (arr.length != 1) throw new Error('Bad icon input');
  const str = arr[0];
  // parse the string.
  const lines = str.split('\n');
  // lines 1..3 are the full icon.
  const full = lines.slice(1).map(l => l.replace(/^\s*\||\|\s*$/g, ''));
  const short = /\S/.test(lines[0]) ? lines[0][0] : full[1][1];
  return {short, full: [full[0], full[1], full[2]]};
}

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

// Simple tileset-only fixes that unlock some screen-tileset combinations
export enum ScreenFix {
  // Support "long grass" river screens on the grass tileset by copying
  // some tiles from 51..59 into 40..47.
  GrassLongGrass,
  // In addition to just making the new long grass tiles, we need to
  // also remap the existing ones in some situations to point to the
  // new ones, e.g. for screens 1d,29 to work on river, we need to use
  // the 4x tiles instead of the 5x ones to fix the surrounding.
  GrassLongGrassRemapping,
  // River tilesets don't define 10,12,14,16,17,1a,1b,1c,22,23,24,25,26,
  // which are used for the "short grass" in the grass tileset.  These
  // would be easy to copy from somewhere else to open up a few screens.
  RiverShortGrass,
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
  SeaRocks,
  // Allow the sea to support 34,38,3c..3f, used as marsh in river tileset.
  // These woud need to map to simple ocean tiles.  TODO - implement.
  SeaMarsh,
  // Support 6x,7x tiles (trees) on angry sea.  Probably not worth it.
  // Would need to move (e.g.) Lime Tree Lake to a totally different tileset
  // to free up the metatiles.
  SeaTrees,
  // Fixing RiverShortGrass for desert is a lot harder because it touches a
  // bunch of tiles used by the mountainRiver tileset (10,14,2x).
  DesertShortGrass,
  // Fixing GrassLongGrass for desert is difficult because the 4x tiles
  // are used by mountainRiver.
  DesertLongGrass,
  // Desert doesn't support the 3x marsh tiles (clash with mountainRiver).
  // It's probably not feasible to add support - it would allow screen 33,
  // but there's a similar south-edge-exit screen with DesertTownEntrance.
  DesertMarsh,
  // Fix 5a..5e to be compatible with grass/river.  5b is already in use
  // on the two oasis screens, so that tile is moved to 5f to make space.
  DesertRocks,
  // Add some missing tree tiles in 63,68,69,6a,6c,6e,6f, required for
  // parity with some river screens.
  DesertTrees,
  // South-facing town entrances use 07 for the top of the town wall.
  // This could be replaced with (e.g. 8c) or maybe something better.
  DesertTownEntrance,
}

export class Metascreens { // extends Set<Metascreen> {

  screens = new Set<Metascreen>();
  fixes = new Set<ScreenFix>();
  screensByFix = new DefaultMap<ScreenFix, Metascreen[]>(() => []);

  constructor(readonly rom: Rom) {
    //super();
    $.commit(this, (key: string, data: MetascreenData) => {
      const screen = new Metascreen(rom, data);
      this.screens.add(screen);
      for (const tilesetName in data.tilesets) {
        const key = tilesetName as keyof Metatilesets;
        const tilesetData = data.tilesets[key]!;
        if (tilesetData.requires) {
          for (const fix of tilesetData.requires) {
            this.screensByFix.get(fix).push(screen);
          }
        } else {
          (rom.metatilesets[key] as Metatileset).screens.add(screen)
        }
      }
      //this.add(screen);
      return screen;
    });
  }

  registerFix(fix: ScreenFix) {
    this.fixes.add(fix);
    for (const screen of this.screensByFix.get(fix)) {
      for (const tilesetName in screen.data.tilesets) {
        const key = tilesetName as keyof Metatilesets;
        const data = screen.data.tilesets[key];
        if (!data || !data.requires) continue;
        let match = true;
        for (const require of data.requires) {
          if (this.fixes.has(require)) continue;
          match = false;
          break;
        }
        if (match) {
          (this.rom.metatilesets[key] as Metatileset).screens.add(screen);
        }
      }
    }
  }

  mountain = $({
    id: 0x00,
    icon: icon`
      |███|
      |███|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  // boundaryW_trees: ???
  boundaryW_trees = $({
    id: 0x01,
    icon: icon`
      |█▌ |
      |█▌^|
      |█▌ |`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               sea: {requires: [ScreenFix.SeaTrees]}},
  });
  boundaryW = $({
    id: 0x02,
    icon: icon`
      |█▌ |
      |█▌ |
      |█▌ |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  boundaryE_rocks = $({
    id: 0x03,
    icon: icon`
      |.▐█|
      | ▐█|
      |.▐█|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               sea: {requires: [ScreenFix.SeaRocks]}},
  });
  boundaryE = $({
    id: 0x04,
    icon: icon`
      | ▐█|
      | ▐█|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  longGrassS = $({
    id: 0x05,
    icon: icon`
      |vv |
      | vv|
      |   |`,
    tilesets: {river: {},
               grass: {requires: [ScreenFix.GrassLongGrass]}},
  });
  longGrassN = $({
    id: 0x06,
    icon: icon`
      |   |
      | vv|
      |vv |`,
    tilesets: {river: {},
               grass: {requires: [ScreenFix.GrassLongGrass]}},
  });
  boundaryS_rocks = $({
    id: 0x07,
    icon: icon`
      | . |
      |▄▄▄|
      |███|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               sea: {requires: [ScreenFix.SeaRocks]}},
  });
  fortressTownEntrance = $({ // goa
    id: 0x08,
    icon: icon`
      |███|
      |█∩█|
      |   |`,
    // TODO - entrance!
    // TODO - right edge wants top-half mountain; left edge top can have
    //        any top half (bottom half plain), top edge can have any
    //        left-half (right-half mountain)
    tilesets: {grass: {}},
    connections: [cave(0xa7, 'fortress')],
  });
  bendSE_longGrass = $({
    id: 0x09,
    icon: icon`▗
      | v |
      |vv▄|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  exitW_cave = $({ // near sahara, fog lamp
    id: 0x0a,
    icon: icon`∩
      |█∩█|
      |  █|
      |███|`,
    // TODO - entrance
    // TODO - edge
    tilesets: {grass: {}, river: {}, desert: {},
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    connections: [cave(0x48), leftEdge(6)],
  });
  bendNE_grassRocks = $({
    id: 0x0b,
    icon: icon`▝
      |.▐█|
      |  ▀|
      |;;;|`,
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass]},
               desert: {requires: [ScreenFix.DesertShortGrass,
                                   ScreenFix.DesertRocks]}},
  });
  cornerNW = $({
    id: 0x0c,
    icon: icon`▛
      |███|
      |█ ▀|
      |█▌ |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  cornerNE = $({
    id: 0x0d,
    icon: icon`▜
      |███|
      |▀██|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  cornerSW = $({
    id: 0x0e,
    icon: icon`▙
      |█▌ |
      |██▄|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  cornerSE = $({
    id: 0x0f,
    icon: icon`▟
      | ▐█|
      |▄██|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  exitE = $({
    id: 0x10,
    icon: icon`╶
      | ▐█|
      |   |
      | ▐█|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]}},
    connections: [rightEdge(6)],
    // TODO - edge
  });
  boundaryN_trees = $({
    id: 0x11,
    icon: icon`
      |███|
      |▀▀▀|
      | ^ |`,
    tilesets: {grass: {}, river: {}, desert: {},
               sea: {requires: [ScreenFix.SeaTrees]}},
  });
  bridgeToPortoa = $({
    id: 0x12,
    icon: icon`╴
      |═  |
      |╞══|
      |│  |`,
    tilesets: {river: {}},
    connections: [leftEdge(1)],
    // TODO - edge
  });
  slopeAbovePortoa = $({
    id: 0x13,
    icon: icon`
      |█↓█|
      |█↓▀|
      |│  |`,
    tilesets: {river: {}},
  });
  riverBendSE = $({
    id: 0x14,
    icon: icon`
      |w  |
      | ╔═|
      | ║ |`,
    tilesets: {river: {}},
  });
  boundaryW_cave = $({
    id: 0x15,
    icon: icon`
      |█▌ |
      |█∩ |
      |█▌ |`,
    tilesets: {grass: {}, river: {}, desert: {},
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    connections: [cave(0x89)],
    // TODO - flaggable?
  });
  exitN = $({
    id: 0x16,
    icon: icon`╵
      |█ █|
      |▀ ▀|
      | ^ |`,
    tilesets: {grass: {}, river: {}, desert: {}}, // sea has no need for exits?
    connections: [topEdge()],
    // TODO - edge
  });
  riverWE_woodenBridge = $({
    id: 0x17,
    icon: icon`═
      |   |
      |═║═|
      |   |`,
    tilesets: {river: {}},
    connections: [seamlessVertical(0x77)],
  });
  riverBoundaryE_waterfall = $({
    id: 0x18,
    icon: icon`╡
      | ▐█|
      |══/|
      | ▐█|`,
    tilesets: {river: {}},
  });
  boundaryE_cave = $({
    id: 0x19,
    icon: icon`
      | ▐█|
      |v∩█|
      |v▐█|`,
    tilesets: {river: {},
               grass: {requires: [ScreenFix.GrassLongGrass]},
               desert: {requires: [ScreenFix.DesertLongGrass]}},
    connections: [cave(0x58)],
  });
  exitW_southwest = $({
    id: 0x1a,
    icon: icon`╴
      |█▌ |
      |▀ ▄|
      |▄██|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               // Sea has no need for this screen?  Go to some other beach?
               sea: {requires: [ScreenFix.SeaRocks]}},
    connections: [leftEdge(0xb)],
  });
  nadare = $({
    id: 0x1b,
    //icon: '?',
    //migrated: 0x2000,
    tilesets: {house: {}},
    connections: [bottomEdge(), door(0x23), door(0x25), door(0x2a)],
  });
  townExitW = $({
    id: 0x1c,
    icon: icon`╴
      |█▌ |
      |▀ ^|
      |█▌ |`,
    tilesets: {grass: {}, river: {}},
    connections: [leftEdge(8)],
  });
  shortGrassS = $({
    id: 0x1d,
    icon: icon` |
      |;;;|
      | v |
      |   |`,
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass,
                                  ScreenFix.GrassLongGrassRemapping]}},
  });
  townExitS = $({
    id: 0x1e,
    icon: icon`╷
      | ^ |
      |▄ ▄|
      |█ █|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks,
                                   ScreenFix.DesertTownEntrance]}},
    connections: [bottomEdge()],
  });
  swanGate = $({
    id: 0x1f,
    //icon: '?',
    tilesets: {town: {}},
    connections: [leftEdge(3), rightEdge(9)],
  }); 

  riverBranchNSE = $({
    id: 0x20,
    icon: icon`
      | ║ |
      | ╠═|
      | ║ |`,
    tilesets: {river: {}},
  });
  riverWE = $({
    id: 0x21,
    icon: icon`
      |   |
      |═══|
      |   |`,
    tilesets: {river: {}},
  });
  riverBoundaryS_waterfall = $({
    id: 0x22,
    icon: icon`╨
      | ║ |
      |▄║▄|
      |█/█|`,
    tilesets: {river: {}},
  });
  shortGrassSE = $({
    id: 0x23,
    icon: icon`
      |;;;|
      |;  |
      |; ^|`,
    tilesets: {grass: {}},
  });
  shortGrassNE = $({
    id: 0x24,
    icon: icon` |
      |;  |
      |;v |
      |;;;|`,
    tilesets: {grass: {}},
  });
  stomHouse = $({
    id: 0x25,
    //icon: '?', // Should never share a map??? - or just make something
    tilesets: {grass: {}},
    connections: [door(0x68), bottomEdge()],
  });
  bendNW_trees = $({
    id: 0x26,
    icon: icon`▘
      |█▌ |
      |▀ ^|
      | ^^|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks,
                                   ScreenFix.DesertTrees]},
               sea: {requires: [ScreenFix.SeaRocks,
                                ScreenFix.SeaTrees]}},
  });
  shortGrassSW = $({
    id: 0x27,
    icon: icon`
      |;;;|
      |  ;|
      |^ ;|`,
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass]}},
  });
  riverBranchNWS = $({
    id: 0x28,
    icon: icon`
      | ║ |
      |═╣ |
      | ║ |`,
    tilesets: {river: {}},
  });
  shortGrassNW = $({
    id: 0x29,
    icon: icon`
      |  ;|
      | v;|
      |;;;|`,
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass,
                                  ScreenFix.GrassLongGrassRemapping]}},
  });
  valleyBridge = $({
    id: 0x2a,
    icon: icon` |
      |▛║▜|
      | ║ |
      |▙║▟|`,
    tilesets: {grass: {}, river: {}},
    connections: [seamlessVertical(0x77)],
  });
  exitS_cave = $({
    id: 0x2b,
    icon: icon`∩
      |█∩█|
      |▌ ▐|
      |█ █|`,
    tilesets: {grass: {}, river: {}, desert: {},
               // Not particularly useful since no connector on south end?
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    connections: [cave(0x67), bottomEdge()]
  });
  outsideWindmill = $({
    id: 0x2c,
    icon: icon`╳
      |██╳|
      |█∩█|
      |█ █|`,
    tilesets: {grass: {}},
    // TODO - annotate 3 exits, spawn for windmill blade
    connections: [cave(0x63), bottomEdge(), door(0x89), door(0x8c)],
  });
  townExitW_cave = $({ // outside leaf (TODO - consider just deleting?)
    id: 0x2d,
    icon: icon`∩
      |█∩█|
      |▄▄█|
      |███|`,
    tilesets: {grass: {}}, // cave entrance breaks river and others...
    connections: [cave(0x4a), leftEdge(5)],
  });
  riverNS = $({
    id: 0x2e,
    icon: icon`
      | ║ |
      | ║ |
      | ║ |`,
    tilesets: {river: {}},
  });
  riverNS_bridge = $({
    id: 0x2f,
    icon: icon`
      | ║ |
      |w╏w|
      | ║ |`,
    tilesets: {river: {}},
    // TODO - indicate bridge
  });
  riverBendWS = $({
    id: 0x30,
    icon: icon`
      | w▜|
      |═╗w|
      | ║ |`,
    tilesets: {river: {}},
  });
  boundaryN_waterfallCave = $({
    id: 0x31,
    icon: icon`
      |▛║█|
      |▘║▀|
      | ║ |`,
    tilesets: {river: {}},
    // TODO - flag version without entrance?
    //  - will need a tileset fix
    connections: [waterfallCave(0x75)],
  });
  open_trees = $({
    id: 0x32,
    icon: icon`
      | ^ |
      |^ ^|
      | ^ |`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertTrees,
                                   ScreenFix.DesertRocks]}},
  });
  exitS = $({
    id: 0x33,
    icon: icon`╷
      | w |
      |▄ ▄|
      |█ █|`,
    tilesets: {grass: {}, river: {},
               // NOTE: These fixes are not likely to ever land.
               desert: {requires: [ScreenFix.DesertMarsh]},
               sea: {requires: [ScreenFix.SeaMarsh]}},
    connections: [bottomEdge()],
  });
  bendNW = $({
    id: 0x34,
    icon: icon`▘
      |█▌ |
      |▀▀ |
      |   |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  bendNE = $({
    id: 0x35,
    icon: icon`▝
      | ▐█|
      |  ▀|
      |   |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  bendSE = $({
    id: 0x36,
    icon: icon`▗
      |   |
      | ▄▄|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  bendWS = $({
    id: 0x37,
    icon: icon`▖
      |   |
      |▄▄ |
      |█▌ |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  towerPlain = $({
    id: 0x38,
    icon: icon`┴
      | ┊ |
      |─┴─|
      |   |`,
    tilesets: {tower: {}},
    // TODO - annotate possible stairway w/ flag?
  });
  towerRobotDoor_downStair = $({
    id: 0x39,
    icon: icon`┬
      | ∩ |
      |─┬─|
      | ┊ |`,
    tilesets: {tower: {}},
    // TODO - connections
  });
  towerDynaDoor = $({
    id: 0x3a,
    icon: icon`∩
      | ∩ |
      |└┬┘|
      | ┊ |`,
    tilesets: {tower: {}},
    // TODO - connections
  });
  towerLongStairs = $({
    id: 0x3b,
    icon: icon`
      | ┊ |
      | ┊ |
      | ┊ |`,
    tilesets: {tower: {}},
    // TODO - connections
  });
  towerMesiaRoom = $({
    id: 0x3c,
    tilesets: {tower: {}},
    // TODO - connections
  });
  towerTeleporter = $({
    id: 0x3d,
    tilesets: {tower: {}},
    // TODO - connections
  });
  caveAbovePortoa = $({
    id: 0x3e,
    icon: icon`
      |███|
      |█∩█|
      |█↓█|`,
    tilesets: {river: {}},
    connections: [cave(0x66)],
  });
  cornerNE_flowers = $({
    id: 0x3f,
    icon: icon`▜
      |███|
      |▀*█|
      | ▐█|`,
    tilesets: {grass: {}},
    // NOTE: could extend this to desert/etc by swapping the 7e/7f tiles
    // with e.g. a windmill or castle tile that's not used in 9c, but
    // we still don't have a good sprite to use for it...
  });
  towerEdge = $({
    id: 0x40,
    icon: icon` |
      |   |
      |┤ ├|
      |   |`,
    tilesets: {tower: {}},
  });
  towerRobotDoor = $({
    id: 0x41,
    icon: icon`─
      | O |
      |───|
      |   |`,
    tilesets: {tower: {}},
  });
  towerDoor = $({
    id: 0x42,
    icon: icon`∩
      | ∩ |
      |─┴─|
      |   |`,
    tilesets: {tower: {}},
    // TODO - connections
  });
  house_bedroom = $({
    id: 0x43,
    tilesets: {house: {}},
    connections: [bottomEdge()],
  });
  shed = $({
    id: 0x44,
    tilesets: {house: {}},
    connections: [bottomEdge()],
  });
  // TODO - separate metascreen for shedWithHiddenDoor
  tavern = $({
    id: 0x45,
    tilesets: {house: {}},
    connections: [bottomEdge()],
  });
  house_twoBeds = $({
    id: 0x46,
    tilesets: {house: {}},
    connections: [bottomEdge()],
  });
  throneRoom_stairs = $({
    id: 0x47,
    tilesets: {house: {}},
    // TODO - need to fix the single-width stair!
    connections: [bottomEdge(), downStair(0x4c, 1)],
  });
  house_ruinedUpstairs = $({
    id: 0x48,
    tilesets: {house: {}},
    connections: [bottomEdge(), downStair(0x9c, 1)],
  });
  house_ruinedDownstairs = $({
    id: 0x49,
    tilesets: {house: {}},
  });
  foyer = $({
    id: 0x4a,
    tilesets: {house: {}},
  });
  throneRoom_door = $({
    id: 0x4b,
    tilesets: {house: {}},
  });
  fortuneTeller = $({
    id: 0x4c,
    tilesets: {house: {}},
  });
  backRoom = $({
    id: 0x4d,
    tilesets: {house: {}},
  });
  dojo = $({
    id: 0x4e,
    tilesets: {house: {}},
  });
  windmillInside = $({
    id: 0x4f,
    tilesets: {house: {}},
  });
  horizontalTownMiddle = $({
    // brynmaer + swan (TODO - split so we can move exits)
    id: 0x50,
    tilesets: {town: {}},
  });
  brynmaerRight_exitE = $({
    // brynmaer
    id: 0x51,
    tilesets: {town: {type: 'horizontal'}},
  });
  brynmaerLeft_deadEnd = $({
    // brynmaer
    id: 0x52,
    tilesets: {town: {type: 'horizontal'}},
  });
  swanLeft_exitW = $({
    // swan
    id: 0x53,
    tilesets: {town: {type: 'horizontal'}},
  });
  swanRight_exitS = $({
    // swan
    id: 0x54,
    tilesets: {town: {type: 'horizontal'}},
  });
  horizontalTownLeft_exitN = $({
    // sahara, amazones (TODO - split so we can move exits)
    id: 0x55,
    tilesets: {town: {type: 'horizontal'}},
  });
  amazonesRight_deadEnd = $({
    // amazones
    id: 0x56,
    tilesets: {town: {type: 'horizontal'}},
  });
  saharaRight_exitE = $({
    // sahara
    id: 0x57,
    tilesets: {town: {type: 'horizontal'}},
  });
  portoaNW = $({
    // portoa
    id: 0x58,
    tilesets: {town: {type: 'square'}},
  });
  portoaNE = $({
    // portoa
    id: 0x59,
    tilesets: {town: {type: 'square'}},
  });
  portoaSW_exitW = $({
    // portoa
    id: 0x5a,
    tilesets: {town: {type: 'square'}},
  });
  portoaSE_exitE = $({
    // portoa
    id: 0x5b,
    tilesets: {town: {type: 'square'}},
  });
  dyna = $({
    id: 0x5c,
    tilesets: {tower: {}},
  });
  portoaFisherman = $({
    // portoa
    id: 0x5d,
    tilesets: {town: {type: 'square'}},
  });
  verticalTownTop_fortress = $({
    // shyron, zombie town (probably not worth splitting this one)
    id: 0x5e,
    tilesets: {town: {type: 'vertical'}},
  });
  shyronMiddle = $({
    // shyron
    id: 0x5f,
    tilesets: {town: {type: 'vertical'}},
  });
  shyronBottom_exitS = $({
    // shyron
    id: 0x60,
    tilesets: {town: {type: 'vertical'}},
  });
  zombieTownMiddle = $({
    // zombie town
    id: 0x61,
    tilesets: {town: {type: 'vertical'}},
  });
  zombieTownBottom_caveExit = $({
    // zombie town
    id: 0x62,
    tilesets: {town: {type: 'vertical'}},
  });
  leafNW_houseShed = $({
    // leaf
    id: 0x63,
    tilesets: {town: {type: 'square'}},
  });
  squareTownNE_house = $({
    // leaf, goa (TODO - split)
    id: 0x64,
    tilesets: {town: {type: 'square'}},
  });
  leafSW_shops = $({
    // leaf
    id: 0x65,
    tilesets: {town: {type: 'square'}},
  });
  leafSE_exitE = $({
    // leaf
    id: 0x66,
    tilesets: {town: {type: 'square'}},
  });
  goaNW_tavern = $({
    // goa
    id: 0x67,
    tilesets: {town: {type: 'square'}},
  });
  squareTownNW_exitS = $({
    // goa, joel (TODO - split)
    id: 0x68,
    tilesets: {town: {type: 'square'}},
  });
  goaSE_shop = $({
    // goa
    id: 0x69,
    tilesets: {town: {type: 'square'}},
  });
  joelNE_shop = $({
    // joel
    id: 0x6a,
    tilesets: {town: {type: 'square'}},
  });
  joelSE_lake = $({
    // joel
    id: 0x6b,
    tilesets: {town: {type: 'square'}},
  });
  oakNW = $({
    // oak
    id: 0x6c,
    tilesets: {town: {type: 'square'}},
  });
  oakNE = $({
    // oak
    id: 0x6d,
    tilesets: {town: {type: 'square'}},
  });
  oakSW = $({
    // oak
    id: 0x6e,
    tilesets: {town: {type: 'square'}},
  });
  oakSE = $({
    // oak
    id: 0x6f,
    tilesets: {town: {type: 'square'}},
  });
  temple = $({
    // shyron
    id: 0x70,
    tilesets: {house: {}},
  });
  wideDeadEndN = $({
    id: 0x71,
    icon: icon`
      | ┃ |
      | > |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideDeadEndN = $({
    id: 0x71,
    icon: icon`
      |╵┃╵|
      | > |
      |   |`,
    tilesets: {goa1: {}},
  });
  wideHallNS = $({
    id: 0x72,
    icon: icon`
      | ┃ |
      | ┃ |
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideHallNS = $({
    id: 0x72,
    // TODO - don't show this for all fortresses,
    //        just opt in for the one where we actually use it...
    // Consider tagging "Goa 1" as a separate tileset?? but then redundant
    icon: icon`
      |│┃│|
      |│┃│|
      |│┃│|`,
    tilesets: {goa1: {}},
  });
  goaWideHallNS_blockedRight = $({
    // NOTE: this is a possible unflagged 72?
    icon: icon`
      |│┃│|
      |│┃ |
      |│┃│|`,
    tilesets: {goa1: {}},
    generate: { // TODO - method to generate this screen
      id: 0x72,
      option: 0,
      flagged: false,
    },
    //   - probably given an existing screen?
    //   - will need to also tell where to put itself?
  });
  goaWideArena = $({
    id: 0x73,
    icon: icon`<
      |╻<╻|
      |┡━┩|
      |│╻│|`,
    tilesets: {goa1: {}},
  });
  limeTreeLake = $({
    id: 0x74,
    tilesets: {}, // sea or mountain (94) - but not really
  });
  // Swamp screens
  swampNW = $({
    id: 0x75,
    icon: icon`
      | │ |
      |─┘ |
      |   |`,
    tilesets: {swamp: {}},
  });
  swampE = $({
    id: 0x76,
    icon: icon`
      |   |
      | ╶─|
      |   |`,
    tilesets: {swamp: {}},
    // TODO - flaggable for door
  });
  swampE_door = $({
    icon: icon`∩
      | ∩ |
      | ╶─|
      |   |`,
    tilesets: {swamp: {}},
  });
  swampNWSE = $({
    id: 0x77,
    icon: icon`
      | │ |
      |─┼─|
      | │ |`,
    tilesets: {swamp: {}},
  });
  swampNWS = $({
    id: 0x78,
    icon: icon`
      | │ |
      |─┤ |
      | │ |`,
    tilesets: {swamp: {}},
  });
  swampNE = $({
    id: 0x79,
    icon: icon`
      | │ |
      | └─|
      |   |`,
    tilesets: {swamp: {}},
  });
  swampWSE = $({
    id: 0x7a,
    icon: icon`
      |   |
      |─┬─|
      | │ |`,
    tilesets: {swamp: {}},
    // TODO - flaggable
  });
  swampWSE_door = $({
    icon: icon`∩
      | ∩  |
      |─┬─|
      | │ |`,
    tilesets: {swamp: {}},
    // TODO - flaggable
  });
  swampW = $({
    id: 0x7b,
    icon: icon`
      |   |
      |─╴ |
      |   |`,
    tilesets: {swamp: {}},
    // TODO - flaggable
  });
  swampW_door = $({
    icon: icon`∩
      | ∩ |
      |─╴ |
      |   |`,
    tilesets: {swamp: {}},
    // TODO - flaggable
  });
  swampArena = $({
    id: 0x7c,
    icon: icon`
      |   |
      |┗┯┛|
      | │ |`,
    tilesets: {swamp: {}},
  });
  swampNWE = $({
    id: 0x7d,
    icon: icon`
      | │ |
      |─┴─|
      |   |`,
    tilesets: {swamp: {}},
  });
  swampSW = $({
    id: 0x7e,
    icon: icon`
      |   |
      |─┐ |
      | │ |`,
    tilesets: {swamp: {}},
  });
  swampSW_door = $({
    icon: icon`∩
      | ∩ |
      |─┐ |
      | │ |`,
    tilesets: {swamp: {}},
  });
  swampEmpty = $({
    id: 0x7f,
    icon: icon`
      |   |
      |   |
      |   |`,
    tilesets: {swamp: {}},
  });
  // Missing swamp screens
  swampN = $({
    icon: icon`
      | │ |
      | ╵ |
      |   |`,
    tilesets: {swamp: {}},
  });
  swampS = $({
    icon: icon`
      |   |
      | ╷ |
      | │ |`,
    tilesets: {swamp: {}},
  });
  swampNS = $({
    icon: icon`
      | │ |
      | │ |
      | │ |`,
    tilesets: {swamp: {}},
  });
  swampWE = $({
    icon: icon`
      |   |
      |───|
      |   |`,
    tilesets: {swamp: {}},
  });
  swampWE_door = $({
    icon: icon`∩
      | ∩ |
      |───|
      |   |`,
    tilesets: {swamp: {}},
    // TODO - how to link to swampWE to indicate flag=false?
  });
  swampSE = $({
    icon: icon`
      |   |
      | ┌─|
      | │ |`,
    tilesets: {swamp: {}},
  });
  swampSE_door = $({
    icon: icon`∩
      | ∩ |
      | ┌─|
      | │ |`,
    tilesets: {swamp: {}},
  });
  swampNSE = $({
    icon: icon`
      | │ |
      | ├─|
      | │ |`,
    tilesets: {swamp: {}},
  });
  // Cave screens
  empty = $({
    id: 0x80,
    icon: icon`
      |   |
      |   |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallNS = $({
    id: 0x81,
    icon: icon`
      | │ |
      | │ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallWE = $({
    id: 0x82,
    icon: icon`
      |   |
      |───|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallSE = $({
    id: 0x83,
    icon: icon`
      |   |
      | ┌─|
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallWS = $({
    id: 0x84,
    icon: icon`
      |   |
      |─┐ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallNE = $({
    id: 0x85,
    icon: icon`
      | │ |
      | └─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallNW = $({
    id: 0x86,
    icon: icon`
      | │ |
      |─┘ |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  branchNSE = $({
    id: 0x87,
    icon: icon`
      | │ |
      | ├─|
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  branchNWSE = $({
    id: 0x88,
    icon: icon`
      | │ |
      |─┼─|
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  branchNWS = $({
    id: 0x89,
    icon: icon`
      | │ |
      |─┤ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  branchWSE = $({
    id: 0x8a,
    icon: icon`
      |   |
      |─┬─|
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  branchNWE = $({
    id: 0x8b,
    icon: icon`
      | │ |
      |─┴─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallNS_stairs = $({
    id: 0x8c,
    icon: icon`
      | ┋ |
      | ┋ |
      | ┋ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallSN_overBridge = $({
    id: 0x8d,
    icon: icon`
      | ╽ |
      |─┃─|
      | ╿ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallWE_underBridge = $({
    id: 0x8e,
    icon: icon`
      | ╽ |
      |───|
      | ╿ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallNS_wall = $({
    id: 0x8f,
    icon: icon`
      | │ |
      | ┆ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    // TODO - record the wall
  });
  hallWE_wall = $({
    id: 0x90,
    icon: icon`
      |   |
      |─┄─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallNS_arena = $({
    id: 0x91,
    icon: icon`
      |┌┸┐|
      |│&│|
      |└┬┘|`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  hallNS_arenaWall = $({
    id: 0x92,
    icon: icon`
      |┌┄┐|
      |│&│|
      |└┬┘|`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  // NOTE: screen 93 is missing!
  branchNWE_wall = $({
    id: 0x94,
    icon: icon`
      | ┆ |
      |─┴─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  branchNWE_upStair = $({
    id: 0x95,
    icon: icon`<
      | < |
      |─┴─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  deadEndW_upStair = $({
    id: 0x96,
    icon: icon`<
      | < |
      |─┘ |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  deadEndW_downStair = $({
    id: 0x97,
    icon: icon`>
      |   |
      |─┐ |
      | > |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  deadEndE_upStair = $({
    id: 0x98,
    icon: icon`<
      | < |
      | └─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  deadEndE_downStair = $({
    id: 0x99,
    icon: icon`>
      |   |
      | ┌─|
      | > |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  deadEndNS_stairs = $({
    id: 0x9a,
    icon: icon`
      | > |
      |   |
      | < |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  deadEndNS = $({
    id: 0x9b,
    icon: icon`
      | ╵ |
      |   |
      | ╷ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  deadEndWE = $({
    id: 0x9c,
    icon: icon`
      |   |
      |╴ ╶|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  // NOTE: 9d missing
  hallNS_entrance = $({
    id: 0x9e,
    icon: icon`╽
      | │ |
      | │ |
      | ╽ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  });
  channelExitSE = $({
    id: 0x9f,
    icon: icon`
      |   |
      | ╔═|
      | ║ |`,
    tilesets: {cave: {}},
  });
  channelBendWS = $({
    id: 0xa0,
    icon: icon`
      |█  |
      |═╗ |
      |█║ |`,
    tilesets: {cave: {}},
  });
  channelHallNS = $({
    id: 0xa1,
    icon: icon`
      | ║ |
      | ╠┈|
      | ║ |`,
    tilesets: {cave: {}},
  });
  channelEntranceSE = $({
    id: 0xa2,
    icon: icon`
      |   |
      | ╔┈|
      |╷║ |`,
    tilesets: {cave: {}},
  });
  channelCross = $({
    id: 0xa3,
    icon: icon`
      | ║ |
      |═╬═|
      |╷║╷|`,
    tilesets: {cave: {}},
  });
  channelDoor = $({
    id: 0xa4,
    icon: icon`∩
      | ∩█|
      |┈══|
      |  █|`,
    tilesets: {cave: {}},
  });
  mountainFloatingIsland = $({
    id: 0xa5,
    icon: icon`*
      |═╗█|
      |*║ |
      |═╣█|`,
    tilesets: {mountainRiver: {}},
  });
  mountainPathNE_stair = $({
    id: 0xa6,
    icon: icon`└
      |█┋█|
      |█  |
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainBranchNWE = $({
    id: 0xa7,
    icon: icon`┴
      |█ █|
      |   |
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainPathWE_iceBridge = $({
    id: 0xa8,
    icon: icon`╫
      |█║█|
      | ┆ |
      |█║█|`,
    tilesets: {mountainRiver: {}},
  });
  mountainPathSE = $({
    id: 0xa9,
    icon: icon`┌
      |███|
      |█  |
      |█ █|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainDeadEndW_caveEmpty = $({
    id: 0xaa,
    icon: icon`∩
      |█∩█|
      |▐ ▐|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainPathNE = $({
    id: 0xab,
    icon: icon`└
      |█ █|
      |█  |
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainBranchWSE = $({
    id: 0xac,
    icon: icon`┬
      |███|
      |   |
      |█ █|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainPathW_cave = $({
    id: 0xad,
    icon: icon`∩
      |█∩█|
      |  ▐|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainPathE_slopeS = $({
    id: 0xae,
    icon: icon`╓
      |███|
      |█  |
      |█↓█|`,
    tilesets: {mountain: {}},
  });
  mountainPathNW = $({
    id: 0xaf,
    icon: icon`┘
      |█ █|
      |  █|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainCave_empty = $({
    id: 0xb0,
    icon: icon`∩
      |█∩█|
      |▌ ▐|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainPathE_cave = $({
    id: 0xb1,
    icon: icon`∩
      |█∩█|
      |█  |
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainPathWE_slopeN = $({
    id: 0xb2,
    icon: icon`╨
      |█↓█|
      |   |
      |███|`,
    tilesets: {mountain: {}},
  });
  mountainDeadEndW = $({
    id: 0xb3,
    icon: icon`╴
      |███|
      |  █|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainPathWE = $({
    id: 0xb4,
    icon: icon`─
      |███|
      |   |
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainArena_gate = $({
    id: 0xb5,
    icon: icon`#
      |█#█|
      |▌ ▐|
      |█┋█|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainPathN_slopeS_cave = $({
    id: 0xb6,
    icon: icon`∩
      |█┋∩|
      |▌  |
      |█↓█|`,
    tilesets: {mountain: {}},
  });
  mountainPathWE_slopeNS = $({
    id: 0xb7,
    icon: icon`╫
      |█↓█|
      |   |
      |█↓█|`,
    tilesets: {mountain: {}},
  });
  mountainPathWE_slopeN_cave = $({
    id: 0xb8,
    icon: icon`∩
      |█↓∩|
      |   |
      |███|`,
    tilesets: {mountain: {}},
  });
  mountainPathWS = $({
    id: 0xb9,
    icon: icon`┐
      |███|
      |  █|
      |█ █|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  mountainSlope = $({
    id: 0xba,
    icon: icon`↓
      |█↓█|
      |█↓█|
      |█↓█|`,
    tilesets: {mountain: {}},
  });
  mountainRiver = $({
    id: 0xba,
    icon: icon`║
      |█║█|
      |█║█|
      |█║█|`,
    tilesets: {mountainRiver: {}},
  });
  mountainPathE_gate = $({
    id: 0xbb,
    icon: icon`∩
      |█∩█|
      |█  |
      |███|`,
    tilesets: {mountain: {}},
  });
  mountainPathWE_inn = $({
    id: 0xbc,
    icon: icon`∩
      |█∩█|
      |   |
      |███|`,
    tilesets: {mountain: {}},
  });
  mountainPathWE_bridgeOverSlope = $({
    id: 0xbd,
    icon: icon`═
      |█↓█|
      | ═ |
      |█↓█|`,
    tilesets: {mountain: {}},
  });
  mountainPathWE_bridgeOverRiver = $({
    id: 0xbd,
    icon: icon`═
      |█║█|
      | ═ |
      |█║█|`,
    tilesets: {mountainRiver: {}},
  });
  mountainSlope_underBridge = $({
    id: 0xbe,
    icon: icon`↓
      |█↓█|
      | ═ |
      |█↓█|`,
    tilesets: {mountain: {}},
    // TODO - could fly under bridge on mountainRiver
  });
  mountainSolid = $({
    id: 0xbf,
    icon: icon`
      |███|
      |███|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
  });
  boundaryS = $({
    id: 0xc0,
    icon: icon`
      |   |
      |▄▄▄|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    // TODO - grass/river should maybe use rocks instead?
  });
  boundaryN_cave = $({
    id: 0xc1,
    icon: icon`
      |███|
      |▀∩▀|
      |   |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  boundarySE_cave = $({
    id: 0xc2,
    icon: icon`
      | ▐█|
      |▄∩█|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  });
  waterfall = $({
    id: 0xc3,
    icon: icon`
      |   |
      |↓↓↓|
      |   |`,
    tilesets: {sea: {}},
  });
  whirlpoolBlocker = $({
    id: 0xc4,
    icon: icon`
      |   |
      |█╳█|
      |   |`,
    tilesets: {sea: {}},
    // TODO - indicate flag
  });
  beachExitN = $({
    id: 0xc5,
    icon: icon`
      |█ █|
      |█╱▀|
      |█▌ |`,
    tilesets: {sea: {}},
  });
  whirlpoolOpen = $({
    id: 0xc6,
    icon: icon`
      |   |
      | ╳ |
      |   |`,
    tilesets: {sea: {}},
  });
  lighthouseEntrance = $({
    id: 0xc7,
    icon: icon`
      |▗▟█|
      |▐∩▛|
      |▝▀▘|`,
    tilesets: {sea: {}},
    // TODO - indicate uniqueness?
  });
  beachCave = $({
    id: 0xc8,
    icon: icon`
      |█∩█|
      |▀╲█|
      |   |`,
    tilesets: {sea: {}},
  });
  beachCabinEntrance = $({
    id: 0xc9,
    icon: icon`
      | ∩█|
      | ╲▀|
      |█▄▄|`,
    tilesets: {sea: {}},
  });
  oceanShrine = $({
    id: 0xca,
    icon: icon`
      |▗▄▖|
      |▐*▌|
      |▝ ▘|`,
    tilesets: {sea: {}},
    // TODO - indicate uniqueness?
  });
  pyramidEntrance = $({
    id: 0xcb,
    icon: icon`
      | ▄ |
      |▟∩▙|
      | ╳ |`,
    tilesets: {desert: {}},
    // TODO - indicate uniqueness?
  });
  cryptEntrance = $({
    id: 0xcc,
    icon: icon`
      | ╳ |
      |▐>▌|
      |▝▀▘|`,
    tilesets: {desert: {}},
  });
  oasisLake = $({
    id: 0xcd,
    icon: icon`
      | ^ |
      |vOv|
      | vv|`,
    tilesets: {desert: {}},
  });
  desertCaveEntrance = $({
    id: 0xce,
    icon: icon`
      |▗▄▖|
      |▜∩▛|
      | ╳ |`,
    tilesets: {desert: {},
               // TODO - probably need to pull this out since flags differ
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
  });
  oasisCave = $({
    id: 0xcf,
    icon: icon`
      | vv|
      |▄∩v|
      |█▌ |`,
    tilesets: {desert: {}},
  });
  channelEndW_cave = $({
    id: 0xd0,
    icon: icon`
      |██∩|
      |══ |
      |███|`,
    tilesets: {cave: {}},
  });
  boatChannel = $({
    id: 0xd1,
    icon: icon`
      |███|
      |▀▀▀|
      |▄▄▄|`,
    tilesets: {sea: {}},
  });
  channelWE = $({
    id: 0xd2,
    icon: icon`
      |███|
      |═══|
      |███|`,
    tilesets: {cave: {}},
  });
  riverCaveNWSE = $({
    id: 0xd3,
    icon: icon`
      |┘║└|
      |═╬═|
      |┬┇┬|`,
      // |▘║▝|
      // |═╬═|
      // |▖┆▗|`,
    tilesets: {cave: {}, fortress: {}},
    // TODO - consider using solids for the corners instead?
  });
  riverCaveNS = $({
    id: 0xd4,
    icon: icon`
      |│║│|
      |│║│|
      |│║│|`,
      // |▌║▐|
      // |▌║▐|
      // |▌║▐|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveWE = $({
    id: 0xd5,
    icon: icon`
      |───|
      |═══|
      |───|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveNS_bridge = $({
    id: 0xd6,
    icon: icon`
      |│║│|
      |├┇┤|
      |│║│|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveWE_bridge = $({
    id: 0xd7,
    icon: icon`
      |─┬─|
      |═┅═|
      |─┴─|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveSE = $({
    id: 0xd8,
    icon: icon`
      |┌──|
      |│╔═|
      |│║┌|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveWS = $({
    id: 0xd9,
    icon: icon`
      |──┐|
      |═╗│|
      |┐║│|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveNE = $({
    id: 0xda,
    icon: icon`
      |│║└|
      |│╚═|
      |└──|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveNW = $({
    id: 0xdb,
    icon: icon`
      |┘║│|
      |═╝│|
      |──┘|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveWE_passageN = $({
    id: 0xdc,
    icon: icon`╧
      |─┴─|
      |═══|
      |───|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveWE_passageS = $({
    id: 0xdd,
    icon: icon`╤
      |───|
      |═══|
      |─┬─|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveNS_passageW = $({
    id: 0xde,
    icon: icon`╢
      |│║│|
      |┤║│|
      |│║│|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveNS_passageE = $({
    id: 0xdf,
    icon: icon`╟
      |│║│|
      |│║├|
      |│║│|`,
    tilesets: {cave: {}, fortress: {}},
  });
  wideHallNE = $({
    id: 0xe0,
    icon: icon`
      | ┃ |
      | ┗━|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideHallNE = $({
    id: 0xe0,
    icon: icon`
      |│┃└|
      |│┗━|
      |└──|`,
    tilesets: {goa1: {}},
  });
  goaWideHallNE_blockedLeft = $({
    id: 0xe0,
    icon: icon`
      |│┃└|
      | ┗━|
      |└──|`,
    tilesets: {goa1: {}},
    generate: { // TODO - method to generate this screen
    },
  });
  wideHallNW = $({
    id: 0xe1,
    icon: icon`
      | ┃ |
      |━┛ |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideHallNW = $({
    id: 0xe1,
    icon: icon`
      |┘┃│|
      |━┛│|
      |──┘|`,
    tilesets: {goa1: {}},
    generate: {}, // fix tiles, then this is the flagged version
  });
  goaWideHallNW_blockedRight = $({
    id: 0xe1,
    icon: icon`
      |┘┃│|
      |━┛ |
      |──┘|`,
    tilesets: {goa1: {}},
  });
  wideHallSE = $({
    id: 0xe2,
    icon: icon`
      |   |
      | ┏━|
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideHallSE = $({
    id: 0xe2,
    icon: icon`
      |┌──|
      |│┏━|
      |│┃┌|`,
    tilesets: {goa1: {}},
  });
  goaWideHallSE_blockedLeft = $({
    id: 0xe2,
    icon: icon`
      |┌──|
      | ┏━|
      |│┃┌|`,
    tilesets: {goa1: {}},
    generate: {}, // fix tiles, then this is the UNflagged version
  });
  wideHallWS = $({
    id: 0xe3,
    icon: icon`
      |   |
      |━┓ |
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideHallWS = $({
    id: 0xe3,
    icon: icon`
      |──┐|
      |━┓│|
      |┐┃│|`,
    tilesets: {goa1: {}},
    generate: {}, // fix tiles, then this is the flagged version
  });
  goaWideHallWS_blockedRight = $({
    id: 0xe3,
    icon: icon`
      |──┐|
      |━┓ |
      |┐┃│|`,
    tilesets: {goa1: {}},
  });
  goaWideHallNS_stairs = $({
    id: 0xe4,
    icon: icon`
      |├┨│|
      |│┃│|
      |│┠┤|`,
    tilesets: {goa1: {}},
  });
  goaWideHallNS_stairsBlocked = $({
    id: 0xe4,
    icon: icon`
      |└┨│|
      |╷┃╵|
      |│┠┐|`,
    tilesets: {goa1: {}},
    generate: {}, // fix tiles, then this is the UNflagged version
  });
  // TODO - custom inverted version of e4 with the top stair on the right
  wideHallNS_deadEnds = $({
    id: 0xe5,
    icon: icon`
      | ╹ |
      |   |
      | ╻ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  // TODO - add one-way views of this?!?
  goaWideHallNS_deadEnd = $({
    id: 0xe5,
    icon: icon`
      |│╹│|
      |├─┤|
      |│╻│|`,
    tilesets: {goa1: {}},
  });
  goaWideHallNS_deadEndBlocked = $({
    id: 0xe5,
    icon: icon`
      |╵╹│|
      |┌─┘|
      |│╻╷|`,
    tilesets: {goa1: {}},
    generate: {}, // fix tiles, then this is the UNflagged version (TODO - alt)
  });
  wideHallNWSE = $({
    id: 0xe6,
    icon: icon`
      | ┃ |
      |━╋━|
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideHallNWSE = $({
    id: 0xe6,
    icon: icon`
      |┘┃└|
      |━╋━|
      |┐┃┌|`,
    tilesets: {goa1: {}},
  });
  goaWideHallNWSE_blocked = $({
    id: 0xe6,
    icon: icon`
      |┘┃ |
      |━╋━|
      | ┃┌|`,
    tilesets: {goa1: {}},
    generate: {}, // fix tiles, then this is UNflagged version (TODO - alt)
  });
  wideHallNWE = $({
    id: 0xe7,
    icon: icon`
      | ┃ |
      |━┻━|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideHallNWE = $({
    id: 0xe7,
    icon: icon`
      |┘┃└|
      |━┻━|
      |───|`,
    tilesets: {goa1: {}},
  });
  goaWideHallNWE_blockedTop = $({
    id: 0xe7,
    icon: icon`
      | ┃ |
      |━┻━|
      |───|`,
    tilesets: {goa1: {}},
    generate: {}, // fix tiles, then this is UNflagged
  });
  wideHallWSE = $({
    id: 0xe8,
    icon: icon`
      |   |
      |━┳━|
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideHallWSE = $({
    id: 0xe8,
    icon: icon`
      |───|
      |━┳━|
      |┐┃┌|`,
    tilesets: {goa1: {}},
  });
  goaWideHallWSE_blockedBottom = $({
    id: 0xe8,
    icon: icon`
      |───|
      |━┳━|
      | ┃ |`,
    tilesets: {goa1: {}},
    generate: {}, // fix tiles, then this is UNflagged
  });
  wideHallNS_wallTop = $({
    id: 0xe9,    // NOTE: the passage narrows at the top
    icon: icon`
      | ┆ |
      | ┃ |
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideHallNS_wallTop = $({
    id: 0xe9,    // NOTE: the passage narrows at the top
    icon: icon`
      | ┆ |
      |╷┃╷|
      |│┃│|`,
    tilesets: {goa1: {}},
  });
  wideHallWE = $({
    id: 0xea,
    icon: icon`
      |   |
      |━━━|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  });
  goaWideHallWE = $({
    id: 0xea,
    icon: icon`
      |───|
      |━━━|
      |───|`,
    tilesets: {goa1: {}},
  });
  pitWE = $({
    id: 0xeb,
    icon: icon`
      |   |
      |─╳─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the pit
  });
  pitNS = $({
    id: 0xec,
    icon: icon`
      | │ |
      | ╳ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the pit
  });
  spikesNS_hallS = $({
    id: 0xed,
    icon: icon`
      | ░ |
      | ░ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the spikes?
  });
  spikesNS_hallN = $({
    id: 0xee,
    icon: icon`
      | │ |
      | ░ |
      | ░ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the spikes?
  });
  spikesNS_hallWE = $({
    id: 0xef,
    icon: icon`
      | ░ |
      |─░─|
      | ░ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the spikes?
  });
  riverCave_deadEndsNS = $({
    id: 0xf0,
    icon: icon`
      | ╨ |
      |   |
      | ╥ |`,
    tilesets: {cave: {}, fortress: {}},
  });
  // TODO - single-direction dead-ends
  riverCave_deadEndsWE = $({
    id: 0xf1,
    icon: icon`
      |   |
      |╡ ╞|
      |   |`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveN_bridge = $({
    id: 0xf2,
    icon: icon`
      | ┇ |
      | ╨ |
      |   |`,
    tilesets: {cave: {}, fortress: {}},
    // TODO - note bridge
  });
  riverCaveS_bridge = $({
    id: 0xf2,
    icon: icon`
      |   |
      | ╥ |
      | ┇ |`,
    tilesets: {cave: {}, fortress: {}},
    // TODO - note bridge
  });
  riverCaveWSE = $({
    id: 0xf3,
    icon: icon`
      |───|
      |═╦═|
      |┐║┌|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveNWE = $({
    id: 0xf4,
    icon: icon`
      |┘║└|
      |═╩═|
      |───|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveNS_blockedRight = $({
    id: 0xf5,
    icon: icon`
      |│║│|
      |│║ |
      |│║│|`,
    tilesets: {cave: {}, fortress: {}},
  });
  riverCaveNS_blockedLeft = $({
    id: 0xf6,
    icon: icon`
      |│║│|
      | ║│|
      |│║│|`,
    tilesets: {cave: {}, fortress: {}},
  });
  spikesNS = $({
    id: 0xf7,
    icon: icon`
      | ░ |
      | ░ |
      | ░ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the spikes?
  });
  cryptArena_statues = $({
    id: 0xf8,
    icon: icon`<
      |&<&|
      |│ │|
      |└┬┘|`,
    tilesets: {pyramid: {}},
  });
  pyramidArena_draygon = $({
    id: 0xf9,
    icon: icon`
      |┌─┐|
      |│╳│|
      |└┬┘|`,
    tilesets: {pyramid: {}},
  });
  cryptArena_draygon2 = $({
    id: 0xfa,
    icon: icon`
      |┏┷┓|
      |┃&┃|
      |┗┳┛|`,
    tilesets: {pyramid: {}},
  });
  cryptArena_entrance = $({
    id: 0xfb,
    icon: icon`
      | ┃ |
      | ┃ |
      | ╿ |`,
    tilesets: {pyramid: {}},
    // NOTE: narrow bottom
  });
  cryptTeleporter = $({
    id: 0xfc,
    tilesets: {pyramid: {}},
  });
  pyramidArena_azteca = $({
    id: 0xfd,
    icon: icon`╽
      |┌┴┐|
      |│ │|
      |┕┳┙|`,
    tilesets: {pyramid: {}},
    // NOTE: wide bottom
    // NOTE: we could use this for a pit that requires flight to cross?
  });
  fortressTrap = $({
    id: 0xfe,
    icon: icon`
      |└─┘|
      | ╳ |
      |╶┬╴|`,
    tilesets: {pyramid: {}},
  });
  shrine = $({
    id: 0xff,
    tilesets: {shrine: {}},
  });
  inn = $({
    id: 0x100,
    tilesets: {house: {}},
  });
  toolShop = $({
    id: 0x101,
    tilesets: {house: {}},
  });
  armorShop = $({
    id: 0x102,
    tilesets: {house: {}},
  });
}

//   ╔╦╗         ╢  ╥
//   ╠╬╣ ╞═╤╧╪╡  ║  ╫
//   ╚╩╝         ╨  ╟
//  ┌┬┐  ╷
//  ├┼┤  │ ╶─╴ 
//  └┴┘  ╵
// ▗▄▖   ▟▙
// ▐█▌   ▜▛ 
// ▝▀▘
// U+250x ─ ━ │ ┃ ┄ ┅ ┆ ┇ ┈ ┉ ┊ ┋ ┌ ┍ ┎ ┏
// U+251x ┐ ┑ ┒ ┓ └ ┕ ┖ ┗ ┘ ┙ ┚ ┛ ├ ┝ ┞ ┟
// U+252x ┠ ┡ ┢ ┣ ┤ ┥ ┦ ┧ ┨ ┩ ┪ ┫ ┬ ┭ ┮ ┯
// U+253x ┰ ┱ ┲ ┳ ┴ ┵ ┶ ┷ ┸ ┹ ┺ ┻ ┼ ┽ ┾ ┿
// U+254x ╀ ╁ ╂ ╃ ╄ ╅ ╆ ╇ ╈ ╉ ╊ ╋ ╌ ╍ ╎ ╏
// U+255x ═ ║ ╒ ╓ ╔ ╕ ╖ ╗ ╘ ╙ ╚ ╛ ╜ ╝ ╞	╟
// U+256x ╠ ╡ ╢ ╣ ╤ ╥ ╦ ╧ ╨ ╩ ╪ ╫ ╬ ╭ ╮ ╯
// U+257x ╰ ╱ ╲ ╳ ╴ ╵ ╶ ╷ ╸ ╹ ╺ ╻ ╼ ╽ ╾ ╿
// U+258x ▀ ▁ ▂ ▃ ▄ ▅ ▆ ▇ █ ▉ ▊ ▋ ▌ ▍ ▎ ▏
// U+259x ▐ ░ ▒ ▓ ▔ ▕ ▖ ▗ ▘ ▙ ▚ ▛ ▜ ▝ ▞ ▟
//
// ∩ \cap

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

export function fixTilesets(rom: Rom) {
  const {desert, grass, sea} = rom.metatilesets;
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
  // not as an alternative).  Move it to ad and get 0a back.
  $.registerFix(ScreenFix.SeaCaveEntrance);
  sea.getTile(0xad).copyFrom(0x0a)
      .replaceIn($.beachExitN, $.lighthouseEntrance, $.oceanShrine);
  sea.getTile(0x0a).copyFrom(0xa2); // don't bother setting an alternative.
  sea.screens.add($.boundaryW_cave);
  sea.screens.add($.desertCaveEntrance);

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

// class LocationsClass extends Array<Location> {
  
//   static get [Symbol.species]() { return Array; }

//   constructor(readonly rom: Rom) {
//     super(0x100);
//     for (let id = 0; id < 0x100; id++) {
//       this[id] = new Location(rom, id);
//     }
//     for (const key of Object.keys(LOCATIONS)) {
//       const [id,] = namesTyped[key];
//       (this as unknown as {[name: string]: Location})[key] = this[id];
//     }
//   }

//   // Find all groups of neighboring locations with matching properties.
//   // TODO - optional arg: check adjacent # IDs...?
//   partition<T>(func: (loc: Location) => T, eq: Eq<T> = (a, b) => a === b, joinNexuses = false): [Location[], T][] {
//     const seen = new Set<Location>();
//     const out: [Location[], T][] = [];
//     for (let loc of this) {
//       if (seen.has(loc) || !loc.used) continue;
//       seen.add(loc);
//       const value = func(loc);
//       const group = [];
//       const queue = [loc];
//       while (queue.length) {
//         const next = queue.pop()!;
//         group.push(next);
//         for (const n of next.neighbors(joinNexuses)) {
//           if (!seen.has(n) && eq(func(n), value)) {
//             seen.add(n);
//             queue.push(n);
//           }
//         }
//       }
//       out.push([[...group], value]);
//     }
//     return out;
//   }
// }

// type Eq<T> = (a: T, b: T) => boolean;

// const namesTyped = LOCATIONS as unknown as {[name: string]: [number, string]};

// export type Locations = LocationsClass & {[T in keyof typeof LOCATIONS]: Location};

// export const Locations: {new(rom: Rom): Locations} = LocationsClass as any;
