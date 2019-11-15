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
     StairType | EdgeType | 'cave' | 'door' | 'fortress' | 'gate' | 'swamp' |
     'seamless';

// NOTE: swamp connects to edge:bottom for cave or town?

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
    // TODO - what does it mean for entrance to be > 0xffff...?
    //      - screen 6c (oak NW) has this
    const dy = y === 0xe ? 0x2800 : 0x1800;
    const entrance = ((y << 12) + dy) | ((x << 4) + 0x0008);
    return {
      type: 'stair:down',
      dir: 2,
      entrance,
      exits: [tile],
    };
  }
  // TODO - if y is 0xe then we may need to adjust for screen edge?
  const entrance = y << 12 | ((x << 4) + (width << 3));
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
  const entrance = y << 12 | 0x0f00 | ((x << 4) + (width << 3));
  return {
    type: 'stair:down',
    dir: 2,
    entrance,
    exits: seq(width, i => tile + 0x10 + i),
  };
}

function cave(tile: number, type: ConnectionType = 'cave'): Connection {
  return {...upStair(tile), type};
}

function door(tile: number, type: ConnectionType = 'door'): Connection {
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
    entrance: 0x30_00 | ((left << 4) + (width << 3)), // TODO - do single-height maps differ?
    exits: seq(width, i => 0x20 | (i + left)),
  };
}

function bottomEdge({left = 7, width = 2, shift = 0} = {}): Connection {
  // NOTE: some screens can be used both in normal maps and in single-height
  // maps.  When used in single-height, we need to subtract 2 from the Y tile
  // coordinates of the entrance/exit, clamping to bf (entrance) and c (exit).
  return {
    type: 'edge:bottom',
    dir: 2,
    entrance: 0xdf_00 | ((left << 4) + (width << 3) + 16 * shift),
    exits: seq(width, i => 0xe0 | (i + left)),
  };
}

function bottomEdgeHouse({left = 7, width = 2, shift = 0} = {}): Connection {
  // Unlike "dual-mode" screens, indoors-only screens have their entrance an
  // additional tile up, at af/b.  This hard-codes that.
  return {
    type: 'edge:bottom',
    dir: 2,
    entrance: 0xaf_00 | ((left << 4) + (width << 3) + 16 * shift),
    exits: seq(width, i => 0xb0 | (i + left)),
  };
}

function leftEdge(top = 7, height = 2): Connection {
  return {
    type: 'edge:left',
    dir: 1,
    entrance: ((top << 12) + (height << 11)) | 0x10,
    exits: seq(height, i => (i + top) << 4),
  };
}

function rightEdge(top = 7, height = 2): Connection {
  return {
    type: 'edge:right',
    dir: 1,
    entrance: ((top << 12) + (height << 11)) | 0xef,
    exits: seq(height, i => (i + top) << 4 | 0xf),
  };
}

/** @param tile Top-left tile of transition (height 2) */
function seamlessVertical(tile: number, width = 2): Connection {
  return {
    type: 'seamless',
    get dir(): number { throw new Error('not implemented'); },
    get entrance(): number { throw new Error('not implemented'); },
    get exits(): number[] { throw new Error('not implemented'); },
  };
}

export class Metascreen {
  readonly screen?: number;

  used = false;

  flag?: 'always' | 'calm';

  constructor(readonly rom: Rom, readonly data: MetascreenData) {
    this.screen = data.id;
    for (const tileset of Object.values(data.tilesets)) {
      if (!tileset!.requires) this.used = true;
    }
  }

  /**
   * TODO - what does this do?
   */
  replace(from: number, to: number): Metascreen {
    if (this.screen == null) throw new Error(`cannot replace unused screen`);
    const scr = this.rom.screens[this.screen];
    for (let i = 0; i < scr.tiles.length; i++) {
      if (scr.tiles[i] === from) scr.tiles[i] = to;
    }
    return this;
  }

  remove() {
    // Remove self from all metatilesets.
    for (const key in this.data.tilesets) {
      const tileset =
          this.rom.metatilesets[key as keyof Metatilesets] as Metatileset;
      tileset.screens.delete(this);
    }
  }
}

/**
 * Metadata about the metascreen.  Because these are created per Metascreens
 * instance, they can actually be mutated as needed.
 */
interface MetascreenData {
  /**
   * If the screen exists or is shared with a screen in the vanilla rom, then
   * this is the screen ID (0..102).  Otherwise, it is a sparse negative number
   * shared by all the screens that will ultimately have the same ID.
   */
  id: number;
  /** Representative icon for debug purposes. */
  icon?: Icon;
  /** List of tilesets this screen appears in. */
  tilesets: {[name in keyof Metatilesets]?: {
    /** Fixes needed before screen is usable in the tileset. */
    requires?: ScreenFix[],
    /** ??? */
    type?: string, // for town?
  }};
  /** List of features present. */
  feature?: Feature[];
  /** List of exit specs. */
  exits?: readonly Connection[];
  /** String (length 4) of edge types for matching: up, left, down, right. */
  edges?: string;
  /**
   * String of connected access points for routing, grouped by connection type.
   * Points are hex digits [123] for top edge, [567] for left, [9ab] for bottom,
   * or [def] for right edge.  Separators are '|' for impassible, '=' for wall,
   * ':' for water (i.e. flight required), and '-' for bridge.  Generally only
   * the middle number is used for each edge (26ae) but for rivers and labyrinth
   * tilesets, the other numbers are used as well, covering the edges like so
   * ```
   *     .123.
   *     5   d
   *     6   e
   *     7   f
   *     .9ab.
   * ```
   * Thus the 4 bit indicates a vertical edge and the 8 bit indicates that it's
   * the corresponding edge on the next tile.
   */
  connect?: string;
  /** Tile (yx) to place the wall/bridge hitbox, if present. */
  wall?: number;
  /** Information about any moving platform platform. */
  platform?: {
    /** Type of platform. */
    type: 'horizontal' | 'vertical',
    /** 16-bit screen coordinates (yyxx) of platform spawn position. */
    coord: number,
  };
  /**
   * Points of interest on this screen.  Each entry is a priority (1 is most
   * relevant, 5 is least), followed by a delta-y and a delta-x in pixels
   * measured from the top-left corner of the screen.  The deltas may be
   * negative or greater than 0xff, indicating that the POI is actually on a
   * neighboring screen.
   */
  poi?: ReadonlyArray<readonly [number, number?, number?]>,

  /** Updates to apply when applying the given fix. */
  update?: ReadonlyArray<readonly [ScreenFix, ScreenUpdate]>;

  /** Whether a special flag is needed for this screen. */
  flag?: 'always' | 'calm' | 'cave' | 'boss';
}

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

type ScreenUpdate = (s: Metascreen, seed: number, rom: Rom) => boolean;

type Feature =
  // TODO - cave? fortress? edge?  we already have connections to tell us...
  'pit' | 'arena' | 'spikes' | 'bridge' | 'wall' | 'stairs' |
  'portoa1' | 'portoa2' | 'portoa3' | // path from sabre to portoa
  'lake' | 'overBridge' | 'underBridge' | 'whirlpool' |
  'lighthouse' | 'cabin' | 'windmill' | 'altar' | 'pyramid' | 'crypt';

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
  Unknown,
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
  // Labyrinth parapets can be blocked/unblocked with a flag.
  LabyrinthParapets,
  // Adds flaggable doors to various screens.
  SwampDoors,
  // // Adds ability to close caves.
  // CloseCaves,
}

/**
 * Adds a flag-togglable wall into a labyrinth screen.
 * @param bit     Unique number for each choice. Use -1 for unconditional.
 * @param variant 0 or 1 for each option. Use 0 with bit=-1 for unconditional.
 * @param flag    Position(s) of flag wall.
 * @param unflag  Position(s) of an existing wall to remove completely.
 * @return A function to generate the variant.
 */
function labyrinthVariant(parentFn: (s: Metascreens) => Metascreen,
                          bit: number, variant: 0|1,
                          flag: number|number[], unflag?: number|number[]) {
  return (s: Metascreen, seed: number, rom: Rom): boolean => {
    // check variant
    if (((seed >>> bit) & 1) !== variant) return false;
    const parent = parentFn(rom.metascreens);
    for (const pos of typeof flag === 'number' ? [flag] : flag) {
      rom.screens[s.data.id].set2d(pos, [[0x19, 0x19], [0x1b, 0x1b]]);
    }
    for (const pos of typeof unflag === 'number' ? [unflag] : unflag || []) {
      rom.screens[s.data.id].set2d(pos, [[0xc5, 0xc5], [0xd0, 0xc5]]);
    }
    if (s.flag !== 'always') {
      // parent is a normally-open screen and we're closing it.
      parent.flag = 'always';
    } else if (unflag != null) {
      // parent is the other alternative - delete it.
      parent.remove();
    }
    return true;    
  };
}

// /** Adds a 'CloseCaves' requirement on all the properties. */
// function closeCaves<T extends Record<any, {requires: ScreenFix[]}>>(props: T) {
//   for (const key in props) {
//     props[key].requires = [ScreenFix.CloseCaves];
//   }
//   return props;
// }
      
export class Metascreens { // extends Set<Metascreen> {

  screens = new Set<Metascreen>();
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

  registerFix(fix: ScreenFix, seed?: number) {
    for (const screen of this.screensByFix.get(fix)) {
      // Look for an update script and run it first.  If it returns false then
      // cancel the operation on this screen.
      const update =
          (screen.data.update || []).find((update) => update[0] === fix);
      if (update) {
        if (seed == null) throw new Error(`Seed required for update`);
        if (!update[1](screen, seed, this.rom)) continue;
      }
      // For each tileset, remove the requirement, and if it's empty, add the
      // screen to the tileset.
      for (const tilesetName in screen.data.tilesets) {
        const key = tilesetName as keyof Metatilesets;
        const data = screen.data.tilesets[key]!;
        if (!data.requires) continue;
        const index = data.requires.indexOf(fix);
        if (index < 0) continue;
        data.requires.splice(index, 1);
        if (!data.requires.length) {
          (this.rom.metatilesets[key] as Metatileset).screens.add(screen);
        }
      }
    }
  }

  readonly mountain = $({
    id: 0x00,
    icon: icon`
      |███|
      |███|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '    ',
  });
  // boundaryW_trees: ???
  readonly boundaryW_trees = $({
    id: 0x01,
    icon: icon`
      |█▌ |
      |█▌^|
      |█▌ |`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               sea: {requires: [ScreenFix.SeaTrees]}},
    edges: '> >o', // o = open
  });
  readonly boundaryW = $({
    id: 0x02,
    icon: icon`
      |█▌ |
      |█▌ |
      |█▌ |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '> >o',
  });
  readonly boundaryE_rocks = $({
    id: 0x03,
    icon: icon`
      |.▐█|
      | ▐█|
      |.▐█|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               sea: {requires: [ScreenFix.SeaRocks]}},
    edges: '<o< ',
  });
  readonly boundaryE = $({
    id: 0x04,
    icon: icon`
      | ▐█|
      | ▐█|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '<o< ',
  });
  readonly longGrassS = $({
    id: 0x05,
    icon: icon`
      |vv |
      | vv|
      |   |`,
    tilesets: {river: {},
               grass: {requires: [ScreenFix.GrassLongGrass]}},
    edges: 'looo', // l = long grass
  });
  readonly longGrassN = $({
    id: 0x06,
    icon: icon`
      |   |
      | vv|
      |vv |`,
    tilesets: {river: {},
               grass: {requires: [ScreenFix.GrassLongGrass]}},
    edges: 'oolo',
  });
  readonly boundaryS_rocks = $({
    id: 0x07,
    icon: icon`
      | . |
      |▄▄▄|
      |███|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               sea: {requires: [ScreenFix.SeaRocks]}},
    edges: 'o^ ^',
  });
  readonly fortressTownEntrance = $({ // goa
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
    edges: ' vov',
    exits: [cave(0xa7, 'fortress')],
  });
  readonly bendSE_longGrass = $({
    id: 0x09,
    icon: icon`▗
      | v |
      |vv▄|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: 'oo<^',
  });
  readonly exitW_cave = $({ // near sahara, fog lamp
    id: 0x0a,
    icon: icon`∩
      |█∩█|
      |  █|
      |███|`,
    tilesets: {grass: {}, river: {}, desert: {},
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    edges: ' n  ', // n = narrow
    exits: [cave(0x48), leftEdge(6)],
  });
  readonly bendNE_grassRocks = $({
    id: 0x0b,
    icon: icon`▝
      |.▐█|
      |  ▀|
      |;;;|`,
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass]},
               desert: {requires: [ScreenFix.DesertShortGrass,
                                   ScreenFix.DesertRocks]}},
    edges: '<osv', // s = short grass
  });
  readonly cornerNW = $({
    id: 0x0c,
    icon: icon`▛
      |███|
      |█ ▀|
      |█▌ |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '  >v',
  });
  readonly cornerNE = $({
    id: 0x0d,
    icon: icon`▜
      |███|
      |▀██|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: ' v< ',
  });
  readonly cornerSW = $({
    id: 0x0e,
    icon: icon`▙
      |█▌ |
      |██▄|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '>  ^',
  });
  readonly cornerSE = $({
    id: 0x0f,
    icon: icon`▟
      | ▐█|
      |▄██|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '<^  ',
  });
  readonly exitE = $({
    id: 0x10,
    icon: icon`╶
      | ▐█|
      |   |
      | ▐█|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]}},
    edges: '<o<n',
    exits: [rightEdge(6)],
    // TODO - edge
  });
  readonly boundaryN_trees = $({
    id: 0x11,
    icon: icon`
      |███|
      |▀▀▀|
      | ^ |`,
    tilesets: {grass: {}, river: {}, desert: {},
               sea: {requires: [ScreenFix.SeaTrees]}},
    edges: ' vov',
  });
  readonly bridgeToPortoa = $({
    id: 0x12,
    icon: icon`╴
      |═  |
      |╞══|
      |│  |`,
    tilesets: {river: {}},
    // TODO - this is super custom, no edges for it?
    // It needs special handling, at least.
    feature: ['portoa3'],
    edges: '**>r',
    exits: [leftEdge(1)],
  });
  readonly slopeAbovePortoa = $({
    id: 0x13,
    icon: icon`
      |█↓█|
      |█↓▀|
      |│  |`,
    tilesets: {river: {}},
    feature: ['portoa2'],
    edges: '***v',
  });
  readonly riverBendSE = $({
    id: 0x14,
    icon: icon`
      |w  |
      | ╔═|
      | ║ |`,
    tilesets: {river: {}},
    edges: 'oorr',
  });
  readonly boundaryW_cave = $({
    id: 0x15,
    icon: icon`
      |█▌ |
      |█∩ |
      |█▌ |`,
    tilesets: {grass: {}, river: {}, desert: {},
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    edges: '> >o',
    exits: [cave(0x89)],
    // TODO - flaggable?
  });
  readonly exitN = $({
    id: 0x16,
    icon: icon`╵
      |█ █|
      |▀ ▀|
      | ^ |`,
    tilesets: {grass: {}, river: {}, desert: {}}, // sea has no need for exits?
    edges: 'nvov',
    exits: [topEdge()],
    // TODO - edge
  });
  readonly riverWE_woodenBridge = $({
    id: 0x17,
    icon: icon`═
      |   |
      |═║═|
      |   |`,
    tilesets: {river: {}},
    edges: 'oror',
    exits: [seamlessVertical(0x77)],
  });
  readonly riverBoundaryE_waterfall = $({
    id: 0x18,
    icon: icon`╡
      | ▐█|
      |══/|
      | ▐█|`,
    tilesets: {river: {}},
    edges: '<r< ',
  });
  readonly boundaryE_cave = $({
    id: 0x19,
    icon: icon`
      | ▐█|
      |v∩█|
      |v▐█|`,
    tilesets: {river: {},
               grass: {requires: [ScreenFix.GrassLongGrass]},
               desert: {requires: [ScreenFix.DesertLongGrass]}},
    edges: '<o< ',
    exits: [cave(0x58)],
  });
  readonly exitW_southwest = $({
    id: 0x1a,
    icon: icon`╴
      |█▌ |
      |▀ ▄|
      |▄██|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks]},
               // Sea has no need for this screen?  Go to some other beach?
               sea: {requires: [ScreenFix.SeaRocks]}},
    edges: '>* ^',
    exits: [leftEdge(0xb)],
  });
  readonly nadare = $({
    id: 0x1b,
    //icon: '?',
    //migrated: 0x2000,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse(), door(0x23), door(0x25), door(0x2a)],
  });
  readonly townExitW = $({
    id: 0x1c,
    icon: icon`╴
      |█▌ |
      |▀ ^|
      |█▌ |`,
    tilesets: {grass: {}, river: {}},
    edges: '>n>o',
    exits: [leftEdge(8)],
  });
  readonly shortGrassS = $({
    id: 0x1d,
    icon: icon` |
      |;;;|
      | v |
      |   |`,
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass,
                                  ScreenFix.GrassLongGrassRemapping]}},
    edges: 'sooo',
  });
  readonly townExitS = $({
    id: 0x1e,
    icon: icon`╷
      | ^ |
      |▄ ▄|
      |█ █|`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertRocks,
                                   ScreenFix.DesertTownEntrance]}},
    edges: 'o^n^',
    exits: [bottomEdge()],
  });
  readonly swanGate = $({
    id: 0x1f,
    //icon: '?',
    tilesets: {town: {}},
    exits: [leftEdge(3), rightEdge(9)],
  }); 

  readonly riverBranchNSE = $({
    id: 0x20,
    icon: icon`
      | ║ |
      | ╠═|
      | ║ |`,
    tilesets: {river: {}},
    edges: 'rorr',
  });
  readonly riverWE = $({
    id: 0x21,
    icon: icon`
      |   |
      |═══|
      |   |`,
    tilesets: {river: {}},
    edges: 'oror',
  });
  readonly riverBoundaryS_waterfall = $({
    id: 0x22,
    icon: icon`╨
      | ║ |
      |▄║▄|
      |█/█|`,
    tilesets: {river: {}},
    edges: 'r^ ^',
  });
  readonly shortGrassSE = $({
    id: 0x23,
    icon: icon`
      |;;;|
      |;  |
      |; ^|`,
    tilesets: {grass: {}},
    edges: 'ssoo',
  });
  readonly shortGrassNE = $({
    id: 0x24,
    icon: icon` |
      |;  |
      |;v |
      |;;;|`,
    tilesets: {grass: {}},
    edges: 'osso',
  });
  readonly stomHouseOutside = $({
    id: 0x25,
    icon: icon`∩
      |███|
      |▌∩▐|
      |█ █|`,
    tilesets: {grass: {}},
    // NOTE: bottom edge entrance is cleverly shifted to align with the door.
    exits: [door(0x68), bottomEdge({shift: 0.5})],
  });
  readonly bendNW_trees = $({
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
    edges: '>voo',
  });
  readonly shortGrassSW = $({
    id: 0x27,
    icon: icon`
      |;;;|
      |  ;|
      |^ ;|`,
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass]}},
    edges: 'soos',
  });
  readonly riverBranchNWS = $({
    id: 0x28,
    icon: icon`
      | ║ |
      |═╣ |
      | ║ |`,
    tilesets: {river: {}},
    edges: 'rrro',
  });
  readonly shortGrassNW = $({
    id: 0x29,
    icon: icon`
      |  ;|
      | v;|
      |;;;|`,
    tilesets: {grass: {},
               river: {requires: [ScreenFix.RiverShortGrass,
                                  ScreenFix.GrassLongGrassRemapping]}},
    edges: 'ooss',
  });
  readonly valleyBridge = $({
    id: 0x2a,
    icon: icon` |
      |▛║▜|
      | ║ |
      |▙║▟|`,
    tilesets: {grass: {}, river: {}},
    edges: 'n n ',
    exits: [seamlessVertical(0x77)],
  });
  readonly exitS_cave = $({
    id: 0x2b,
    icon: icon`∩
      |█∩█|
      |▌ ▐|
      |█ █|`,
    tilesets: {grass: {}, river: {}, desert: {},
               // Not particularly useful since no connector on south end?
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    edges: '  n ',
    exits: [cave(0x67), bottomEdge()]
  });
  readonly outsideWindmill = $({
    id: 0x2c,
    icon: icon`╳
      |██╳|
      |█∩█|
      |█ █|`,
    tilesets: {grass: {}},
    // TODO - annotate 3 exits, spawn for windmill blade
    feature: ['windmill'],
    edges: '  n ',
    exits: [cave(0x63), bottomEdge(), door(0x89), door(0x8c)],
  });
  readonly townExitW_cave = $({ // outside leaf (TODO - consider just deleting?)
    id: 0x2d,
    icon: icon`∩
      |█∩█|
      |▄▄█|
      |███|`,
    tilesets: {grass: {}}, // cave entrance breaks river and others...
    edges: ' n  ',
    exits: [cave(0x4a), leftEdge(5)],
  });
  readonly riverNS = $({
    id: 0x2e,
    icon: icon`
      | ║ |
      | ║ |
      | ║ |`,
    tilesets: {river: {}},
    edges: 'roro',
  });
  readonly riverNS_bridge = $({
    id: 0x2f,
    icon: icon`
      | ║ |
      |w╏w|
      | ║ |`,
    tilesets: {river: {}},
    feature: ['bridge'],
    edges: 'roro',
    wall: 0x77,
  });
  readonly riverBendWS = $({
    id: 0x30,
    icon: icon`
      | w▜|
      |═╗w|
      | ║ |`,
    tilesets: {river: {}},
    edges: '<rrv',
  });
  readonly boundaryN_waterfallCave = $({
    id: 0x31,
    icon: icon`
      |▛║█|
      |▘║▀|
      | ║ |`,
    tilesets: {river: {}},
    // TODO - flag version without entrance?
    //  - will need a tileset fix
    edges: ' vrv',
    exits: [waterfallCave(0x75)],
  });
  readonly open_trees = $({
    id: 0x32,
    icon: icon`
      | ^ |
      |^ ^|
      | ^ |`,
    tilesets: {grass: {}, river: {},
               desert: {requires: [ScreenFix.DesertTrees,
                                   ScreenFix.DesertRocks]}},
    edges: 'oooo',
  });
  readonly exitS = $({
    id: 0x33,
    icon: icon`╷
      | w |
      |▄ ▄|
      |█ █|`,
    tilesets: {grass: {}, river: {},
               // NOTE: These fixes are not likely to ever land.
               desert: {requires: [ScreenFix.DesertMarsh]},
               sea: {requires: [ScreenFix.SeaMarsh]}},
    edges: 'o^n^',
    exits: [bottomEdge()],
  });
  readonly bendNW = $({
    id: 0x34,
    icon: icon`▘
      |█▌ |
      |▀▀ |
      |   |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '>voo',
  });
  readonly bendNE = $({
    id: 0x35,
    icon: icon`▝
      | ▐█|
      |  ▀|
      |   |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '<oov',
  });
  readonly bendSE = $({
    id: 0x36,
    icon: icon`▗
      |   |
      | ▄▄|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: 'oo<^',
  });
  readonly bendWS = $({
    id: 0x37,
    icon: icon`▖
      |   |
      |▄▄ |
      |█▌ |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: 'o^>o',
  });
  readonly towerPlain = $({
    id: 0x38,
    icon: icon`┴
      | ┊ |
      |─┴─|
      |   |`,
    tilesets: {tower: {}},
    edges: 'st t',
    // TODO - annotate possible stairway w/ flag?
  });
  readonly towerRobotDoor_downStair = $({
    id: 0x39,
    icon: icon`┬
      | ∩ |
      |─┬─|
      | ┊ |`,
    tilesets: {tower: {}},
    edges: ' tst',
    // TODO - connections
  });
  readonly towerDynaDoor = $({
    id: 0x3a,
    icon: icon`∩
      | ∩ |
      |└┬┘|
      | ┊ |`,
    tilesets: {tower: {}},
    edges: '  s ',
    // TODO - connections
  });
  readonly towerLongStairs = $({
    id: 0x3b,
    icon: icon`
      | ┊ |
      | ┊ |
      | ┊ |`,
    tilesets: {tower: {}},
    edges: 's s ',
    // TODO - connections
  });
  readonly towerMesiaRoom = $({
    id: 0x3c,
    tilesets: {tower: {}},
    // TODO - connections (NOTE: uses bottomEdgeHouse)
  });
  readonly towerTeleporter = $({
    id: 0x3d,
    tilesets: {tower: {}},
    // TODO - connections (NOTE: uses bottomEdgeHouse)
  });
  readonly caveAbovePortoa = $({
    id: 0x3e,
    icon: icon`
      |███|
      |█∩█|
      |█↓█|`,
    tilesets: {river: {}},
    edges: '  * ',
    exits: [cave(0x66)],
  });
  readonly cornerNE_flowers = $({
    id: 0x3f,
    icon: icon`▜
      |███|
      |▀*█|
      | ▐█|`,
    tilesets: {grass: {}},
    // NOTE: could extend this to desert/etc by swapping the 7e/7f tiles
    // with e.g. a windmill or castle tile that's not used in 9c, but
    // we still don't have a good sprite to use for it...
    edges: ' v< ',
  });
  readonly towerEdge = $({
    id: 0x40,
    icon: icon` |
      |   |
      |┤ ├|
      |   |`,
    tilesets: {tower: {}},
    edges: ' t t',
  });
  readonly towerEdgeW = $({
    id: 0x40,
    icon: icon` |
      |   |
      |┤  |
      |   |`,
    tilesets: {tower: {}},
    edges: ' t  ',
  });
  readonly towerEdgeE = $({
    id: 0x40,
    icon: icon` |
      |   |
      |  ├|
      |   |`,
    tilesets: {tower: {}},
    edges: '   t',
  });
  readonly towerRobotDoor = $({
    id: 0x41,
    icon: icon`─
      | O |
      |───|
      |   |`,
    tilesets: {tower: {}},
    edges: ' t t',
  });
  readonly towerDoor = $({
    id: 0x42,
    icon: icon`∩
      | ∩ |
      |─┴─|
      |   |`,
    tilesets: {tower: {}},
    edges: ' t t',
    exits: [cave(0x68)],
    // TODO - connections
  });
  readonly house_bedroom = $({
    id: 0x43,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly shed = $({
    id: 0x44,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  // TODO - separate metascreen for shedWithHiddenDoor
  readonly tavern = $({
    id: 0x45,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly house_twoBeds = $({
    id: 0x46,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly throneRoom_amazones = $({
    id: 0x47,
    tilesets: {house: {}},
    // TODO - need to fix the single-width stair!
    exits: [bottomEdgeHouse({width: 3}), downStair(0x4c, 1)],
  });
  readonly house_ruinedUpstairs = $({
    id: 0x48,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse(), downStair(0x9c, 1)],
  });
  readonly house_ruinedDownstairs = $({
    id: 0x49,
    tilesets: {house: {}},
    exits: [upStair(0x56, 1)],
  });
  readonly foyer = $({
    id: 0x4a,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse(), door(0x28), door(0x53), door(0x5c)],
  });
  readonly throneRoom_portoa = $({
    id: 0x4b,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse(), door(0x2b)],
  });
  readonly fortuneTeller = $({
    id: 0x4c,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse(), door(0x56), door(0x59)],
  });
  readonly backRoom = $({
    id: 0x4d,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly stomHouseDojo = $({
    id: 0x4e,
    tilesets: {house: {}},
    // Edge entrance shifted to properly line up at start of fight.
    exits: [bottomEdgeHouse({shift: -0.5})],
  });
  readonly windmillInside = $({
    id: 0x4f,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse({left: 9, width: 1})],
  });
  readonly horizontalTownMiddle = $({
    // brynmaer + swan (TODO - split so we can move exits)
    id: 0x50,
    tilesets: {town: {}},
    exits: [door(0x4c), door(0x55)],
  });
  readonly brynmaerRight_exitE = $({
    // brynmaer
    id: 0x51,
    tilesets: {town: {type: 'horizontal'}},
    exits: [rightEdge(8), door(0x41)],
  });
  readonly brynmaerLeft_deadEnd = $({
    // brynmaer
    id: 0x52,
    tilesets: {town: {type: 'horizontal'}},
    exits: [door(0x49), door(0x4c)],
  });
  readonly swanLeft_exitW = $({
    // swan
    id: 0x53,
    tilesets: {town: {type: 'horizontal'}},
    exits: [leftEdge(9), door(0x49), door(0x5e)],
  });
  readonly swanRight_exitS = $({
    // swan
    id: 0x54,
    tilesets: {town: {type: 'horizontal'}},
    exits: [bottomEdge({left: 3}), door(0x41), door(0x43), door(0x57)],
  });
  readonly horizontalTownLeft_exitN = $({
    // sahara, amazones (TODO - split so we can move exits)
    id: 0x55,
    tilesets: {town: {type: 'horizontal'}},
    exits: [topEdge(0xd), door(0x46), door(0x4b)],
  });
  readonly amazonesRight_deadEnd = $({
    // amazones
    id: 0x56,
    tilesets: {town: {type: 'horizontal'}},
    exits: [door(0x40), door(0x58)],
  });
  readonly saharaRight_exitE = $({
    // sahara
    id: 0x57,
    tilesets: {town: {type: 'horizontal'}},
    exits: [rightEdge(7), door(0x40), door(0x66)],
  });
  readonly portoaNW = $({
    // portoa
    id: 0x58,
    tilesets: {town: {type: 'square'}},
    exits: [cave(0x47, 'fortress'), bottomEdge()], // bottom just in case?
  });
  readonly portoaNE = $({
    // portoa
    id: 0x59,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x63), door(0x8a), bottomEdge({left: 3, width: 4})],
  });
  readonly portoaSW_exitW = $({
    // portoa
    id: 0x5a,
    tilesets: {town: {type: 'square'}},
    exits: [leftEdge(9), door(0x86), topEdge()],
  });
  readonly portoaSE_exitE = $({
    // portoa
    id: 0x5b,
    tilesets: {town: {type: 'square'}},
    exits: [rightEdge(9), door(0x7a), door(0x87)],
  });
  readonly dyna = $({
    id: 0x5c,
    tilesets: {tower: {}},
  });
  readonly portoaFisherman = $({
    // portoa
    id: 0x5d,
    tilesets: {town: {type: 'square'}},
    exits: [rightEdge(6), leftEdge(4, 6), door(0x68)],
  });
  readonly verticalTownTop_fortress = $({
    // shyron, zombie town (probably not worth splitting this one)
    id: 0x5e,
    tilesets: {town: {type: 'vertical'}},
    exits: [cave(0x47), bottomEdge()],
  });
  readonly shyronMiddle = $({
    // shyron
    id: 0x5f,
    tilesets: {town: {type: 'vertical'}},
    exits: [door(0x54), door(0x5b), topEdge()],
  });
  readonly shyronBottom_exitS = $({
    // shyron
    id: 0x60,
    tilesets: {town: {type: 'vertical'}},
    exits: [bottomEdge({left: 3}), door(0x04), door(0x06), door(0x99)],
  });
  readonly zombieTownMiddle = $({
    // zombie town
    id: 0x61,
    tilesets: {town: {type: 'vertical'}},
    exits: [door(0x99), topEdge()],
  });
  readonly zombieTownBottom_caveExit = $({
    // zombie town
    id: 0x62,
    tilesets: {town: {type: 'vertical'}},
    exits: [cave(0x92), door(0x23), door(0x4d)],
  });
  readonly leafNW_houseShed = $({
    // leaf
    id: 0x63,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x8c), door(0x95)],
  });
  readonly squareTownNE_house = $({
    // leaf, goa (TODO - split)
    id: 0x64,
    tilesets: {town: {type: 'square'}},
    exits: [topEdge(1), door(0xb7)],
  });
  readonly leafSW_shops = $({
    // leaf
    id: 0x65,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x77), door(0x8a)],
  });
  readonly leafSE_exitE = $({
    // leaf
    id: 0x66,
    tilesets: {town: {type: 'square'}},
    exits: [rightEdge(3), door(0x84)],
  });
  readonly goaNW_tavern = $({
    // goa
    id: 0x67,
    tilesets: {town: {type: 'square'}},
    exits: [door(0xba)],
  });
  readonly squareTownSW_exitS = $({
    // goa, joel (TODO - split)
    id: 0x68,
    tilesets: {town: {type: 'square'}},
    exits: [bottomEdge({left: 8}), door(0x84)],
  });
  readonly goaSE_shop = $({
    // goa
    id: 0x69,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x82)],
  });
  readonly joelNE_shop = $({
    // joel
    id: 0x6a,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x47)],
  });
  readonly joelSE_lake = $({
    // joel
    id: 0x6b,
    tilesets: {town: {type: 'square'}},
  });
  readonly oakNW = $({
    // oak
    id: 0x6c,
    tilesets: {town: {type: 'square'}},
    exits: [door(0xe7)],
  });
  readonly oakNE = $({
    // oak
    id: 0x6d,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x60)],
  });
  readonly oakSW = $({
    // oak
    id: 0x6e,
    tilesets: {town: {type: 'square'}},
    exits: [door(0x7c)],
  });
  readonly oakSE = $({
    // oak
    id: 0x6f,
    tilesets: {town: {type: 'square'}},
    // Edge entrance shifted for child animation
    exits: [bottomEdge({left: 0, shift: 0.5}), door(0x97)],
  });
  readonly temple = $({
    // shyron
    id: 0x70,
    tilesets: {house: {}},
    exits: [bottomEdgeHouse()],
  });
  readonly wideDeadEndN = $({
    id: 0x71,
    icon: icon`
      | ┃ |
      | > |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'w   ',
    connect: '2',
    exits: [downStair(0xc7)],
  });
  readonly goaWideDeadEndN = $({
    id: 0x71,
    icon: icon`
      |╵┃╵|
      | > |
      |   |`,
    tilesets: {labyrinth: {}},
    edges: 'w   ',
    connect: '1|2|3',
    exits: [downStair(0xc7)],
  });
  readonly wideHallNS = $({
    id: 0x72,
    icon: icon`
      | ┃ |
      | ┃ |
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'w w ',
    connect: '2a',
  });
  readonly goaWideHallNS = $({
    id: 0x72,
    icon: icon`
      |│┃│|
      |│┃│|
      |│┃│|`,
    tilesets: {labyrinth: {}},
    edges: 'w w ',
    connect: '19|2a|3b',
  });
  readonly goaWideHallNS_blockedRight = $({
    id: 0x72,
    icon: icon`
      |│┃│|
      |│┃ |
      |│┃│|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNS, 0, 0, 0x9d)]],
    edges: 'w w ',
    connect: '19|2a|3|b',
  });
  readonly goaWideHallNS_blockedLeft = $({
    id: 0x72,
    icon: icon`
      |│┃│|
      | ┃│|
      |│┃│|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNS, 0, 1, 0x51)]],
    edges: 'w w ',
    connect: '1|9|2a|3b',
  });
  readonly goaWideArena = $({
    id: 0x73,
    icon: icon`<
      |╻<╻|
      |┡━┩|
      |│╻│|`,
    tilesets: {labyrinth: {}},
    edges: 'w w ',
    connect: '9b|a',
    exits: [upStair(0x27)],
  });
  readonly limeTreeLake = $({
    id: 0x74,
    tilesets: {}, // sea or mountain (94) - but not really
    exits: [bottomEdgeHouse(), cave(0x47)],
    // TODO - bridge
  });
  // Swamp screens
  readonly swampNW = $({
    id: 0x75,
    icon: icon`
      | │ |
      |─┘ |
      |   |`,
    tilesets: {swamp: {}},
    // TODO - do we actually want to put all these edges in?
    edges: 'ss  ',
    connect: '26',
    exits: [topEdge(6, 4), leftEdge(7, 3)],
  });
  readonly swampE = $({
    id: 0x76,
    icon: icon`
      |   |
      | ╶─|
      |   |`,
    tilesets: {swamp: {}},
    edges: '   s',
    connect: 'e',
    exits: [],
  });
  readonly swampE_door = $({
    id: 0x76,
    icon: icon`∩
      | ∩ |
      | ╶─|
      |   |`,
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    flag: 'always',
    edges: '   s',
    connect: 'e',
    exits: [cave(0x6c, 'swamp')],
  });
  readonly swampNWSE = $({
    id: 0x77,
    icon: icon`
      | │ |
      |─┼─|
      | │ |`,
    tilesets: {swamp: {}},
    edges: 'ssss',
    connect: '26ae',
    exits: [topEdge(6, 4),
            leftEdge(7, 3),
            bottomEdge({left: 6, width: 4}),
            rightEdge(7, 3)],
  });
  readonly swampNWS = $({
    id: 0x78,
    icon: icon`
      | │ |
      |─┤ |
      | │ |`,
    tilesets: {swamp: {}},
    edges: 'sss ',
    connect: '26a',
    exits: [topEdge(6, 4), leftEdge(7, 3), bottomEdge({left: 6, width: 4})],
  });
  readonly swampNE = $({
    id: 0x79,
    icon: icon`
      | │ |
      | └─|
      |   |`,
    tilesets: {swamp: {}},
    edges: 's  s',
    connect: '2e',
    exits: [topEdge(6, 4), rightEdge(7, 3)],
  });
  readonly swampWSE = $({
    id: 0x7a,
    icon: icon`
      |   |
      |─┬─|
      | │ |`,
    tilesets: {swamp: {}},
    edges: ' sss',
    connect: '6ae',
    exits: [leftEdge(7, 3), bottomEdge({left: 6, width: 4}), rightEdge(7, 3)],
  });
  readonly swampWSE_door = $({
    id: 0x7a,
    icon: icon`∩
      | ∩  |
      |─┬─|
      | │ |`,
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    flag: 'always',
    edges: ' sss',
    connect: '6ae',
    // NOTE: door screens should not be on an exit edge!
    exits: [cave(0x66, 'swamp')],
  });
  readonly swampW = $({
    id: 0x7b,
    icon: icon`
      |   |
      |─╴ |
      |   |`,
    tilesets: {swamp: {}},
    edges: ' s  ',
    connect: '6',
    // TODO - flaggable
  });
  readonly swampW_door = $({
    id: 0x7b,
    icon: icon`∩
      | ∩ |
      |─╴ |
      |   |`,
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    flag: 'always',
    edges: ' s  ',
    connect: '6',
    exits: [cave(0x64, 'swamp')],
    // TODO - flaggable
  });
  readonly swampArena = $({
    id: 0x7c,
    icon: icon`
      |   |
      |┗┯┛|
      | │ |`,
    tilesets: {swamp: {}},
    feature: ['arena'],
    edges: '  s ',
    connect: 'a',
    // NOTE: no edge exit since we don't want to go straight here...
    // TODO - constraint that we put solids on either side?
    // TODO - undo the attempt to allow this not on the right edge,
    //        maybe make a few custom combinations? (is it still broken?)
    //        --> looks like we did fix that earlier somehow?  maybe by moving
    //            the whole screen a column over, or else by changing the tiles?
    // TODO - NOTE SWAMP GRAPHICS STILL BROKEN!!
  });
  readonly swampNWE = $({
    id: 0x7d,
    icon: icon`
      | │ |
      |─┴─|
      |   |`,
    tilesets: {swamp: {}},
    edges: 'ss s',
    connect: '26e',
    exits: [topEdge(6, 4), leftEdge(7, 3), rightEdge(7, 3)],
  });
  readonly swampSW = $({
    id: 0x7e,
    icon: icon`
      |   |
      |─┐ |
      | │ |`,
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    update: [[ScreenFix.SwampDoors, (s, seed, rom) => {
      rom.metascreens.swampSW_door.flag = 'always';
      return true;
    }]],
    edges: ' ss ',
    connect: '6a',
    exits: [leftEdge(7, 3), bottomEdge({left: 6, width: 4})],
  });
  readonly swampSW_door = $({
    id: 0x7e,
    icon: icon`∩
      | ∩ |
      |─┐ |
      | │ |`,
    tilesets: {swamp: {}},
    edges: ' ss ',
    connect: '6a',
    exits: [cave(0x67, 'swamp')],
  });
  readonly swampEmpty = $({
    id: 0x7f,
    icon: icon`
      |   |
      |   |
      |   |`,
    tilesets: {swamp: {}},
    edges: '    ',
    connect: '',
  });
  // Missing swamp screens
  readonly swampN = $({
    id: ~0x70,
    icon: icon`
      | │ |
      | ╵ |
      |   |`,
    tilesets: {swamp: {}},
    edges: 's   ',
    connect: '2',
  });
  readonly swampS = $({
    id: ~0x71,
    icon: icon`
      |   |
      | ╷ |
      | │ |`,
    tilesets: {swamp: {}},
    edges: '  s ',
    connect: 'a',
  });
  readonly swampNS = $({
    id: ~0x72,
    icon: icon`
      | │ |
      | │ |
      | │ |`,
    tilesets: {swamp: {}},
    edges: 's s ',
    connect: '2a',
    exits: [topEdge(6, 4), bottomEdge({left: 6, width: 4})],
  });
  readonly swampWE = $({
    id: ~0x72,
    icon: icon`
      |   |
      |───|
      |   |`,
    tilesets: {swamp: {}},
    edges: ' s s',
    connect: '6e',
    exits: [leftEdge(7, 3), rightEdge(7, 3)],
  });
  readonly swampWE_door = $({
    id: ~0x72,
    icon: icon`∩
      | ∩ |
      |───|
      |   |`,
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    flag: 'always',
    edges: ' s s',
    connect: '6e',
    exits: [upStair(0x66)],
    // TODO - how to link to swampWE to indicate flag=false?
  });
  readonly swampSE = $({
    id: ~0x73,
    icon: icon`
      |   |
      | ┌─|
      | │ |`,
    tilesets: {swamp: {}},
    edges: '  ss',
    connect: 'ae',
    exits: [leftEdge(7, 3), bottomEdge({left: 6, width: 4})],
  });
  readonly swampSE_door = $({
    id: ~0x73,
    icon: icon`∩
      | ∩ |
      | ┌─|
      | │ |`,
    tilesets: {swamp: {requires: [ScreenFix.SwampDoors]}},
    flag: 'always',
    edges: '  ss',
    connect: 'ae',
    exits: [cave(0x6a, 'swamp')],
  });
  readonly swampNSE = $({
    id: ~0x74,
    icon: icon`
      | │ |
      | ├─|
      | │ |`,
    tilesets: {swamp: {}},
    edges: 's ss',
    connect: '2ae',
    exits: [topEdge(6, 4), bottomEdge({left: 6, width: 4}), rightEdge(7, 3)],
  });
  // Cave screens
  readonly empty = $({
    id: 0x80,
    icon: icon`
      |   |
      |   |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: '    ',
  });
  readonly hallNS = $({
    id: 0x81,
    icon: icon`
      | │ |
      | │ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'c c ',
    connect: '2a',
  });
  readonly hallWE = $({
    id: 0x82,
    icon: icon`
      |   |
      |───|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: ' c c',
    connect: '6e',
  });
  readonly hallSE = $({
    id: 0x83,
    icon: icon`
      |   |
      | ┌─|
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: '  cc',
    connect: 'ae',
  });
  readonly hallWS = $({
    id: 0x84,
    icon: icon`
      |   |
      |─┐ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: ' cc ',
    connect: '6a',
  });
  readonly hallNE = $({
    id: 0x85,
    icon: icon`
      | │ |
      | └─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'c  c',
    connect: '2e',
  });
  readonly hallNW = $({
    id: 0x86,
    icon: icon`
      | │ |
      |─┘ |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'cc  ',
    connect: '26',
  });
  readonly branchNSE = $({
    id: 0x87,
    icon: icon`
      | │ |
      | ├─|
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'c cc',
    connect: '2ae',
  });
  readonly branchNWSE = $({
    id: 0x88,
    icon: icon`
      | │ |
      |─┼─|
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'cccc',
    connect: '26ae',
  });
  readonly branchNWS = $({
    id: 0x89,
    icon: icon`
      | │ |
      |─┤ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'ccc ',
    connect: '26a',
  });
  readonly branchWSE = $({
    id: 0x8a,
    icon: icon`
      |   |
      |─┬─|
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: ' ccc',
    connect: '6ae',
  });
  readonly branchNWE = $({
    id: 0x8b,
    icon: icon`
      | │ |
      |─┴─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'cc c',
    connect: '26e',
  });
  readonly hallNS_stairs = $({
    id: 0x8c,
    icon: icon`
      | ┋ |
      | ┋ |
      | ┋ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    feature: ['stairs'],
    edges: 'c c ',
    connect: '2a',
  });
  readonly hallSN_overBridge = $({
    id: 0x8d,
    icon: icon`
      | ╽ |
      |─┃─|
      | ╿ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    feature: ['overBridge'],
    edges: 'cbcb', // TODO - 'b' for other side of bridge??
    connect: '2a',
  });
  readonly hallWE_underBridge = $({
    id: 0x8e,
    icon: icon`
      | ╽ |
      |───|
      | ╿ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    feature: ['underBridge'],
    edges: 'bcbc',
    connect: '6e',
  });
  readonly hallNS_wall = $({
    id: 0x8f,
    icon: icon`
      | │ |
      | ┆ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'c c ',
    feature: ['wall'],
    // TODO - can we just detect the connections?
    //      - for each tileset, map 1..f to various edge pos?
    //      - e.g. cave: 0x02 = 1, 0x08 = 2, 0x0c = 3,
    //                   0x20 = 5, 0x80 = 6, 0xc0 = 7, ...
    //        need to be WALKABLE
    //        may need to reevaluate each screen for each tileset...
    //        and need to wait until the screen is BUILT!
    connect: '2=a', // wall will always connect the first two?
    wall: 0x87, 
    // TODO - record the wall
  });
  readonly hallWE_wall = $({
    id: 0x90,
    icon: icon`
      |   |
      |─┄─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    feature: ['wall'],
    edges: ' c c',
    connect: '6=e',
    wall: 0x67
  });
  readonly hallNS_arena = $({
    id: 0x91,
    icon: icon`
      |┌┸┐|
      |│&│|
      |└┬┘|`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    feature: ['arena'],
    edges: 'n c ', // 'n' for 'narrow'
    connect: '2a',
  });
  readonly hallNS_arenaWall = $({
    id: 0x92,
    icon: icon`
      |┌┄┐|
      |│&│|
      |└┬┘|`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    feature: ['arena', 'wall'],
    edges: 'n c ',
    connect: '2=a',
  });
  // NOTE: screen 93 is missing!
  readonly branchNWE_wall = $({
    id: 0x94,
    icon: icon`
      | ┆ |
      |─┴─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'cc c',
    connect: '2=6e',
  });
  readonly branchNWE_upStair = $({
    id: 0x95,
    icon: icon`<
      | < |
      |─┴─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: ' c c',
    connect: '6e',
    exits: [upStair(0x47)],
  });
  readonly deadEndW_upStair = $({
    id: 0x96,
    icon: icon`<
      | < |
      |─┘ |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: ' c  ',
    connect: '6',
    exits: [upStair(0x42)],
  });
  readonly deadEndW_downStair = $({
    id: 0x97,
    icon: icon`>
      |   |
      |─┐ |
      | > |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: ' c  ',
    connect: '6',
    exits: [downStair(0xa2)],
  });
  readonly deadEndE_upStair = $({
    id: 0x98,
    icon: icon`<
      | < |
      | └─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: '   c',
    connect: 'e',
    exits: [upStair(0x4c)],
  });
  readonly deadEndE_downStair = $({
    id: 0x99,
    icon: icon`>
      |   |
      | ┌─|
      | > |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: '   c',
    connect: 'e',
    exits: [downStair(0xac)],
  });
  readonly deadEndNS_stairs = $({
    id: 0x9a,
    icon: icon`
      | > |
      |   |
      | < |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'c c ',
    connect: '2|a',
    exits: [downStair(0x17), upStair(0xd7)],
  });
  readonly deadEndN_stairs = $({
    id: 0x9a,
    icon: icon`
      | > |
      |   |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'c   ',
    connect: '2',
    exits: [downStair(0x17)],
  });
  readonly deadEndS_stairs = $({
    id: 0x9a,
    icon: icon`
      |   |
      |   |
      | < |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: '  c ',
    connect: 'a',
    exits: [upStair(0xd7)],
  });
  readonly deadEndNS = $({
    id: 0x9b,
    icon: icon`
      | ╵ |
      |   |
      | ╷ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'c c ',
    connect: '2|a',
  });
  readonly deadEndN = $({
    id: 0x9b,
    icon: icon`
      | ╵ |
      |   |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'c   ',
    connect: '2',
  });
  readonly deadEndS = $({
    id: 0x9b,
    icon: icon`
      |   |
      |   |
      | ╷ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: '  c ',
    connect: 'a',
  });
  readonly deadEndWE = $({
    id: 0x9c,
    icon: icon`
      |   |
      |╴ ╶|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: ' c c',
    connect: '6|e',
  });
  readonly deadEndW = $({
    id: 0x9c,
    icon: icon`
      |   |
      |╴  |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: ' c  ',
    connect: '6',
  });
  readonly deadEndE = $({
    id: 0x9c,
    icon: icon`
      |   |
      |  ╶|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: '   c',
    connect: 'e',
  });
  // NOTE: 9d missing
  readonly hallNS_entrance = $({
    id: 0x9e,
    icon: icon`╽
      | │ |
      | │ |
      | ╽ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    edges: 'c n ',
    connect: '2a',
    exits: [bottomEdge()],
  });
  readonly channelExitSE = $({
    id: 0x9f,
    icon: icon`
      |   |
      | ╔═|
      | ║ |`,
    tilesets: {dolphinCave: {}},
    //edges: '  rr',
    //connect: '9d:bf',  // : means water - flight needed
  });
  readonly channelBendWS = $({
    id: 0xa0,
    icon: icon`
      |█  |
      |═╗ |
      |█║ |`,
    tilesets: {dolphinCave: {}},
    //edges: ' rr ',
  });
  readonly channelHallNS = $({
    id: 0xa1,
    icon: icon`
      | ║ |
      | ╠┈|
      | ║ |`,
    tilesets: {dolphinCave: {}},
  });
  readonly channelEntranceSE = $({
    id: 0xa2,
    icon: icon`
      |   |
      | ╔┈|
      |╷║ |`,
    tilesets: {dolphinCave: {}},
    // NOTE: This would ALMOST work as a connection to the
    // normal river cave tiles, but the river is one tile
    // taller at the top, so there's no match!
  });
  readonly channelCross = $({
    id: 0xa3,
    icon: icon`
      | ║ |
      |═╬═|
      |╷║╷|`,
    tilesets: {dolphinCave: {}},
  });
  readonly channelDoor = $({
    id: 0xa4,
    icon: icon`∩
      | ∩█|
      |┈══|
      |  █|`,
    tilesets: {dolphinCave: {}},
  });
  readonly mountainFloatingIsland = $({
    id: 0xa5,
    icon: icon`*
      |═╗█|
      |*║ |
      |═╣█|`,
    tilesets: {mountainRiver: {}},
    edges: '  wp',  // w = waterfall, p = path
    connect: 'e',
  });
  readonly mountainPathNE_stair = $({
    id: 0xa6,
    icon: icon`└
      |█┋█|
      |█  |
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: 'l  p',  // l = ladder (stairs)
    connect: '2e',
    exits: [topEdge()], // never used as an exit in vanilla
  });
  readonly mountainBranchNWE = $({
    id: 0xa7,
    icon: icon`┴
      |█ █|
      |   |
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: 'pp p',
    connect: '26e',
  });
  readonly mountainPathWE_iceBridge = $({
    id: 0xa8,
    icon: icon`╫
      |█║█|
      | ┆ |
      |█║█|`,
    tilesets: {mountainRiver: {}},
    feature: ['bridge'],
    edges: 'wpwp',
    connect: '6-e:2a',
    wall: 0x87,
  });
  readonly mountainPathSE = $({
    id: 0xa9,
    icon: icon`┌
      |███|
      |█  |
      |█ █|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: '  pp',
    connect: 'ae',
  });
  readonly mountainDeadEndW_caveEmpty = $({
    id: 0xaa,
    icon: icon`∩
      |█∩█|
      |▐ ▐|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' p  ',
    connect: '6',
    exits: [cave(0x5a)],
  });
  readonly mountainPathNE = $({
    id: 0xab,
    icon: icon`└
      |█ █|
      |█  |
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: 'p  p',
    connect: '2e',
  });
  readonly mountainBranchWSE = $({
    id: 0xac,
    icon: icon`┬
      |███|
      |   |
      |█ █|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' ppp',
    connect: '6ae',
  });
  readonly mountainPathW_cave = $({
    id: 0xad,
    icon: icon`∩
      |█∩█|
      |  ▐|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' p  ',
    connect: '6',
    exits: [cave(0x55)],
  });
  readonly mountainPathE_slopeS = $({
    id: 0xae,
    icon: icon`╓
      |███|
      |█  |
      |█↓█|`,
    tilesets: {mountain: {}},
    edges: '  sp', // s = slope
    connect: 'ae',
  });
  readonly mountainPathNW = $({
    id: 0xaf,
    icon: icon`┘
      |█ █|
      |  █|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: 'pp  ',
    connect: '26',
  });
  readonly mountainCave_empty = $({
    id: 0xb0,
    icon: icon`∩
      |█∩█|
      |▌ ▐|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: '    ',
    connect: '',
    exits: [cave(0x58)],
  });
  readonly mountainPathE_cave = $({
    id: 0xb1,
    icon: icon`∩
      |█∩█|
      |█  |
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: '   p',
    connect: 'e',
    exits: [cave(0x57)],
  });
  readonly mountainPathWE_slopeN = $({
    id: 0xb2,
    icon: icon`╨
      |█↓█|
      |   |
      |███|`,
    tilesets: {mountain: {}},
    edges: 'sp p',
    connect: '26e',
  });
  readonly mountainDeadEndW = $({
    id: 0xb3,
    icon: icon`╴
      |███|
      |  █|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' p  ',
    connect: '6',
  });
  readonly mountainPathWE = $({
    id: 0xb4,
    icon: icon`─
      |███|
      |   |
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' p p',
    connect: '6e',
  });
  readonly mountainArena_gate = $({
    id: 0xb5,
    icon: icon`#
      |█#█|
      |▌ ▐|
      |█┋█|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    feature: ['arena'],
    edges: '  l ',
    connect: 'a',
    exits: [{...upStair(0x37, 3), type: 'cave'}],
  });
  readonly mountainPathN_slopeS_cave = $({
    id: 0xb6,
    icon: icon`∩
      |█┋∩|
      |▌  |
      |█↓█|`,
    tilesets: {mountain: {}},
    edges: 'l s ',
    connect: '2a',
    exits: [cave(0x5a), topEdge()],
  });
  readonly mountainPathWE_slopeNS = $({
    id: 0xb7,
    icon: icon`╫
      |█↓█|
      |   |
      |█↓█|`,
    tilesets: {mountain: {}},
    edges: 'spsp',
    connect: '26ae',
  });
  readonly mountainPathWE_slopeN_cave = $({
    id: 0xb8,
    icon: icon`∩
      |█↓∩|
      |   |
      |███|`,
    tilesets: {mountain: {}},
    edges: 'sp p',
    connect: '26e',
    exits: [cave(0x5c)],
  });
  readonly mountainPathWS = $({
    id: 0xb9,
    icon: icon`┐
      |███|
      |  █|
      |█ █|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: ' pp ',
    connect: '6a',
  });
  readonly mountainSlope = $({
    id: 0xba,
    icon: icon`↓
      |█↓█|
      |█↓█|
      |█↓█|`,
    tilesets: {mountain: {}},
    edges: 's s ',
    connect: '2a',
  });
  readonly mountainRiver = $({
    id: 0xba,
    icon: icon`║
      |█║█|
      |█║█|
      |█║█|`,
    tilesets: {mountainRiver: {}},
    edges: 'w w ',
    connect: '2:e',
  });
  readonly mountainPathE_gate = $({
    id: 0xbb,
    icon: icon`∩
      |█∩█|
      |█  |
      |███|`,
    tilesets: {mountain: {}},
    edges: '   p',
    connect: 'e',
    exits: [cave(0x57, 'gate')],
  });
  readonly mountainPathWE_inn = $({
    id: 0xbc,
    icon: icon`∩
      |█∩█|
      |   |
      |███|`,
    tilesets: {mountain: {}},
    edges: ' p p',
    connect: '6e',
    exits: [door(0x76)],
  });
  readonly mountainPathWE_bridgeOverSlope = $({
    id: 0xbd,
    icon: icon`═
      |█↓█|
      | ═ |
      |█↓█|`,
    tilesets: {mountain: {}},
    edges: 'spsp',
    connect: '6e', // '2a|6e',
  });
  readonly mountainPathWE_bridgeOverRiver = $({
    id: 0xbd,
    icon: icon`═
      |█║█|
      | ═ |
      |█║█|`,
    tilesets: {mountainRiver: {}},
    edges: 'wpwp',
    connect: '6e|2|a',
  });
  readonly mountainSlope_underBridge = $({
    id: 0xbe,
    icon: icon`↓
      |█↓█|
      | ═ |
      |█↓█|`,
    tilesets: {mountain: {}},
    // TODO - could fly under bridge on mountainRiver
    edges: 'spsp',
    connect: '2a', // '2a|6e',
  });
  readonly mountainSolid = $({
    id: 0xbf,
    icon: icon`
      |███|
      |███|
      |███|`,
    tilesets: {mountain: {}, mountainRiver: {}},
    edges: '    ',
  });
  readonly boundaryS = $({
    id: 0xc0,
    icon: icon`
      |   |
      |▄▄▄|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    // TODO - grass/river should maybe use rocks instead?
    edges: 'o^ ^', // o = open, ^ = open up
    //connect: '26e',
  });
  readonly boundaryN_cave = $({
    id: 0xc1,
    icon: icon`
      |███|
      |▀∩▀|
      |   |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: ' vov', // o = open, v = open down
    exits: [cave(0x49)],
  });
  readonly boundarySE_cave = $({
    id: 0xc2,
    icon: icon`
      | ▐█|
      |▄∩█|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    edges: '<^  ',
    exits: [cave(0x5a)],
  });
  readonly waterfall = $({
    id: 0xc3,
    icon: icon`
      |   |
      |↓↓↓|
      |   |`,
    tilesets: {sea: {}},
    edges: 'oooo',
  });
  readonly whirlpoolBlocker = $({
    id: 0xc4,
    icon: icon`
      |   |
      |█╳█|
      |   |`,
    tilesets: {sea: {}},
    // TODO - indicate flag
    feature: ['whirlpool'],
    flag: 'calm', // calmed sea
    edges: 'oooo',
  });
  readonly beachExitN = $({
    id: 0xc5,
    icon: icon`
      |█ █|
      |█╱▀|
      |█▌ |`,
    tilesets: {sea: {}},
    edges: 'n >v', // n = "narrow"
    exits: [topEdge(0xa, 1)],
  });
  readonly whirlpoolOpen = $({
    id: 0xc6,
    icon: icon`
      |   |
      | ╳ |
      |   |`,
    tilesets: {sea: {}},
    feature: ['whirlpool'],
    edges: 'oooo',
    flag: 'calm', // but only if on angry sea - not desert...
  });
  readonly lighthouseEntrance = $({
    id: 0xc7,
    icon: icon`
      |▗▟█|
      |▐∩▛|
      |▝▀▘|`,
    tilesets: {sea: {}},
    // TODO - indicate uniqueness?
    feature: ['lighthouse'],
    edges: '<oov',
    exits: [cave(0x2a), door(0x75)],
  });
  readonly beachCave = $({
    id: 0xc8,
    icon: icon`
      |█∩█|
      |▀╲█|
      |   |`,
    tilesets: {sea: {}},
    edges: ' vov',
    exits: [cave(0x28)],
  });
  readonly beachCabinEntrance = $({
    id: 0xc9,
    icon: icon`
      | ∩█|
      | ╲▀|
      |█▄▄|`,
    tilesets: {sea: {}},
    feature: ['cabin'],
    edges: '<^ b', // b = "boat"
    exits: [door(0x55), rightEdge(8, 3)],
  });
  readonly oceanShrine = $({
    id: 0xca,
    icon: icon`
      |▗▄▖|
      |▐*▌|
      |▝ ▘|`,
    tilesets: {sea: {}},
    // TODO - indicate uniqueness?
    feature: ['altar'],
    edges: 'oooo',
  });
  readonly pyramidEntrance = $({
    id: 0xcb,
    icon: icon`
      | ▄ |
      |▟∩▙|
      | ╳ |`,
    tilesets: {desert: {}},
    // TODO - indicate uniqueness?
    feature: ['pyramid'],
    edges: 'oooo',
    exits: [cave(0xa7)],
  });
  readonly cryptEntrance = $({
    id: 0xcc,
    icon: icon`
      | ╳ |
      |▐>▌|
      |▝▀▘|`,
    tilesets: {desert: {}},
    feature: ['crypt'],
    edges: 'oooo',
    exits: [downStair(0x67)],
  });
  readonly oasisLake = $({
    id: 0xcd,
    icon: icon`
      | ^ |
      |vOv|
      | vv|`,
    tilesets: {desert: {}},
    feature: ['lake'],
    edges: 'oolo',
  });
  readonly desertCaveEntrance = $({
    id: 0xce,
    icon: icon`
      |▗▄▖|
      |▜∩▛|
      | ╳ |`,
    tilesets: {desert: {},
               // TODO - probably need to pull this out since flags differ
               sea: {requires: [ScreenFix.SeaCaveEntrance]}},
    edges: 'oooo',
    exits: [cave(0xa7)],
  });
  readonly oasisCave = $({
    id: 0xcf,
    icon: icon`
      | vv|
      |▄∩v|
      |█▌ |`,
    tilesets: {desert: {}},
    edges: 'l^>o',
    exits: [upStair(0x47)],
  });
  readonly channelEndW_cave = $({
    id: 0xd0,
    icon: icon`
      |██∩|
      |══ |
      |███|`,
    tilesets: {dolphinCave: {}},
  });
  readonly boatChannel = $({
    id: 0xd1,
    icon: icon`
      |███|
      |▀▀▀|
      |▄▄▄|`,
    tilesets: {sea: {}},
    edges: ' b b',
    exits: [rightEdge(8, 3), leftEdge(8, 3)],
  });
  readonly channelWE = $({
    id: 0xd2,
    icon: icon`
      |███|
      |═══|
      |███|`,
    tilesets: {dolphinCave: {}},
  });
  readonly riverCaveNWSE = $({
    id: 0xd3,
    icon: icon`
      |┘║└|
      |═╬═|
      |┬┇┬|`,
      // |▘║▝|
      // |═╬═|
      // |▖┆▗|`,
    // TODO - consider using solids for the corners instead?
    tilesets: {cave: {}, fortress: {}},
    feature: ['bridge'],
    edges: 'rrrr',
    connect: '15:3d:79-af',
    wall: 0xb6,
  });
  readonly riverCaveNS = $({
    id: 0xd4,
    icon: icon`
      |│║│|
      |│║│|
      |│║│|`,
      // |▌║▐|
      // |▌║▐|
      // |▌║▐|`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'r r ',
    connect: '19:3a',
  });
  readonly riverCaveWE = $({
    id: 0xd5,
    icon: icon`
      |───|
      |═══|
      |───|`,
    tilesets: {cave: {}, fortress: {}},
    edges: ' r r',
    connect: '5d:7f',
  });
  readonly riverCaveNS_bridge = $({
    id: 0xd6,
    icon: icon`
      |│║│|
      |├┇┤|
      |│║│|`,
    tilesets: {cave: {}, fortress: {}},
    feature: ['bridge'],
    edges: 'r r ',
    connect: '19-3a',
    wall: 0x87,
  });
  readonly riverCaveWE_bridge = $({
    id: 0xd7,
    icon: icon`
      |─┬─|
      |═┅═|
      |─┴─|`,
    tilesets: {cave: {}, fortress: {}},
    feature: ['bridge'],
    edges: ' r r',
    connect: '5d-7f',
    wall: 0x86,
  });
  readonly riverCaveSE = $({
    id: 0xd8,
    icon: icon`
      |┌──|
      |│╔═|
      |│║┌|`,
    tilesets: {cave: {}, fortress: {}},
    edges: '  rr',
    connect: '9d:af',
  });
  readonly riverCaveWS = $({
    id: 0xd9,
    icon: icon`
      |──┐|
      |═╗│|
      |┐║│|`,
    tilesets: {cave: {}, fortress: {}},
    edges: ' rr ',
    connect: '5a:79',
  });
  readonly riverCaveNE = $({
    id: 0xda,
    icon: icon`
      |│║└|
      |│╚═|
      |└──|`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'r  r',
    connect: '1f:3d',
  });
  readonly riverCaveNW = $({
    id: 0xdb,
    icon: icon`
      |┘║│|
      |═╝│|
      |──┘|`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'rr  ',
    connect: '15:37',
  });
  readonly riverCaveWE_passageN = $({
    id: 0xdc,
    icon: icon`╧
      |─┴─|
      |═══|
      |───|`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'cr r',
    connect: '25d:7f',
  });
  readonly riverCaveWE_passageS = $({
    id: 0xdd,
    icon: icon`╤
      |───|
      |═══|
      |─┬─|`,
    tilesets: {cave: {}, fortress: {}},
    edges: ' rcr',
    connect: '5d:7af',
  });
  readonly riverCaveNS_passageW = $({
    id: 0xde,
    icon: icon`╢
      |│║│|
      |┤║│|
      |│║│|`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'rcr ',
    connect: '169:3b',
  });
  readonly riverCaveNS_passageE = $({
    id: 0xdf,
    icon: icon`╟
      |│║│|
      |│║├|
      |│║│|`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'r rc',
    connect: '19:3be',
  });
  readonly wideHallNE = $({
    id: 0xe0,
    icon: icon`
      | ┃ |
      | ┗━|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'w  w',
    connect: '2e',
  });
  readonly goaWideHallNE = $({
    id: 0xe0,
    icon: icon`
      |│┃└|
      |│┗━|
      |└──|`,
    tilesets: {labyrinth: {}},
    edges: 'w  w',
    connect: '1f|2e|3d',
  });
  readonly goaWideHallNE_blockedLeft = $({
    id: 0xe0,
    icon: icon`
      |│┃└|
      | ┗━|
      |└──|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNE, 1, 0, 0x61)]],
    edges: 'w  w',
    connect: '1|f|2e|3d',
  });
  readonly goaWideHallNE_blockedRight = $({
    id: 0xe0,
    icon: icon`
      |│┃ |
      |│┗━|
      |└──|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNE, 1, 1, 0x0d)]],
    edges: 'w  w',
    connect: '1f|2e|3|d',
  });
  readonly wideHallNW = $({
    id: 0xe1,
    icon: icon`
      | ┃ |
      |━┛ |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'ww  ',
    connect: '26',
  });
  readonly goaWideHallNW = $({
    id: 0xe1,
    icon: icon`
      |┘┃│|
      |━┛│|
      |──┘|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNW_blockedRight,
                               -1, 0, 0x6d)]],
    flag: 'always',
    edges: 'ww  ',
    connect: '15|26|37',
  });
  readonly goaWideHallNW_blockedRight = $({
    id: 0xe1,
    icon: icon`
      |┘┃│|
      |━┛ |
      |──┘|`,
    tilesets: {labyrinth: {}},
    edges: 'ww  ',
    connect: '15|26|3|7',
  });
  readonly goaWideHallNW_blockedLeft = $({
    id: 0xe1,
    icon: icon`
      | ┃│|
      |━┛│|
      |──┘|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNW_blockedRight,
                               2, 1, 0x01, 0x6d)]],
    edges: 'ww  ',
    connect: '1|5|26|37',
  });
  readonly wideHallSE = $({
    id: 0xe2,
    icon: icon`
      |   |
      | ┏━|
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: '  ww',
    connect: 'ae',
  });
  readonly goaWideHallSE = $({
    id: 0xe2,
    icon: icon`
      |┌──|
      |│┏━|
      |│┃┌|`,
    tilesets: {labyrinth: {}},
    edges: '  ww',
    connect: '9d|ae|bf',
  });
  readonly goaWideHallSE_blockedLeft = $({
    id: 0xe2,
    icon: icon`
      |┌──|
      | ┏━|
      |│┃┌|`,
    tilesets: {labyrinth: {}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallSE, 3, 0, 0x61)]],
    edges: '  ww',
    connect: '9|d|ae|bf',
  });
  readonly goaWideHallSE_blockedRight = $({
    id: 0xe2,
    icon: icon`
      |┌──|
      |│┏━|
      |│┃ |`,
    tilesets: {labyrinth: {}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallSE, 3, 1, 0xdd)]],
    edges: '  ww',
    connect: '9d|ae|b|f',
  });
  readonly wideHallWS = $({
    id: 0xe3,
    icon: icon`
      |   |
      |━┓ |
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: ' ww ',
    connect: '6a',
  });
  readonly goaWideHallWS = $({
    id: 0xe3,
    icon: icon`
      |──┐|
      |━┓│|
      |┐┃│|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallWS_blockedRight,
                               -1, 0, 0x9d)]],
    flag: 'always',
    edges: ' ww ',
    connect: '5b|6a|79',
  });
  readonly goaWideHallWS_blockedRight = $({
    id: 0xe3,
    icon: icon`
      |──┐|
      |━┓ |
      |┐┃│|`,
    tilesets: {labyrinth: {}},
    edges: ' ww ',
    connect: '5|b|6a|79',
  });
  readonly goaWideHallWS_blockedLeft = $({
    id: 0xe3,
    icon: icon`
      |──┐|
      |━┓│|
      | ┃│|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallWS_blockedRight,
                               4, 0, 0xd1, 0x9d)]],
    edges: ' ww ',
    connect: '5b|6a|7|9',
  });
  readonly goaWideHallNS_stairs = $({
    id: 0xe4,
    icon: icon`
      |├┨│|
      |│┃│|
      |│┠┤|`,
    tilesets: {labyrinth: {}},
    edges: 'w w ',
    connect: '1239ab',
  });
  readonly goaWideHallNS_stairsBlocked13 = $({
    id: 0xe4,
    icon: icon`
      |└┨│|
      |╷┃╵|
      |│┠┐|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNS_stairs,
                               5, 0, [0x41, 0x8d])]],
    edges: 'w w ',
    connect: '12ab|3|9',
  });
  readonly goaWideHallNS_stairsBlocked24 = $({
    id: 0xe4,
    icon: icon`
      |┌┨│|
      |│┃│|
      |│┠┘|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNS_stairs,
                               5, 1, [0x01, 0xcd])]],
    edges: 'w w ',
    connect: '1|239a|b',
  });
  // TODO - custom inverted version of e4 with the top stair on the right
  readonly wideHallNS_deadEnds = $({
    id: 0xe5,
    icon: icon`
      | ╹ |
      |   |
      | ╻ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'w w ',
    connect: '2|a',
  });
  // TODO - add one-way views of this?!?
  readonly goaWideHallNS_deadEnd = $({
    id: 0xe5,
    icon: icon`
      |│╹│|
      |├─┤|
      |│╻│|`,
    tilesets: {labyrinth: {}},
    edges: 'w w ',
    connect: '139b|2|a',
  });
  readonly goaWideHallNS_deadEndBlocked24 = $({
    id: 0xe5,
    icon: icon`
      |╵╹│|
      |┌─┘|
      |│╻╷|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNS_deadEnd,
                               6, 0, [0x61, 0xad])]],
    edges: 'w w ',
    connect: '1|2|39|a|b',
  });
  readonly goaWideHallNS_deadEndBlocked13 = $({
    id: 0xe5,
    icon: icon`
      |│╹╵|
      |└─┐|
      |╷╻│|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNS_deadEnd,
                               6, 1, [0x6d, 0xa1])]],
    edges: 'w w ',
    connect: '1b|2|3|9|a',
  });
  readonly wideHallNWSE = $({
    id: 0xe6,
    icon: icon`
      | ┃ |
      |━╋━|
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'wwww',
    connect: '26ae',
  });
  readonly goaWideHallNWSE = $({
    id: 0xe6,
    icon: icon`
      |┘┃└|
      |━╋━|
      |┐┃┌|`,
    tilesets: {labyrinth: {}},
    edges: 'wwww',
    connect: '26ae|15|3d|79|bf',
  });
  readonly goaWideHallNWSE_blocked13 = $({
    id: 0xe6,
    icon: icon`
      |┘┃ |
      |━╋━|
      | ┃┌|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNWSE, 7, 0, [0x0d, 0xd1])]],
    edges: 'wwww',
    connect: '26ae|15|3|d|7|9|bf',
  });
  readonly goaWideHallNWSE_blocked24 = $({
    id: 0xe6,
    icon: icon`
      | ┃└|
      |━╋━|
      |┐┃ |`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNWSE, 7, 1, [0x01, 0xdd])]],
    edges: 'wwww',
    connect: '26ae|1|5|3d|79|b|f',
  });
  readonly wideHallNWE = $({
    id: 0xe7,
    icon: icon`
      | ┃ |
      |━┻━|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'ww w',
    connect: '26e',
  });
  readonly goaWideHallNWE = $({
    id: 0xe7,
    icon: icon`
      |┘┃└|
      |━┻━|
      |───|`,
    tilesets: {labyrinth: {}},
    edges: 'ww w',
    connect: '26e|15|3d|7f',
  });
  readonly goaWideHallNWE_blockedTop = $({
    id: 0xe7,
    icon: icon`
      | ┃ |
      |━┻━|
      |───|`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallNWE, -1, 0, [0x01, 0x0d])]],
    edges: 'ww w',
    connect: '26e|1|5|3|d|7f',
  });
  readonly wideHallWSE = $({
    id: 0xe8,
    icon: icon`
      |   |
      |━┳━|
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: ' www',
    connect: '6ae',
  });
  readonly goaWideHallWSE = $({
    id: 0xe8,
    icon: icon`
      |───|
      |━┳━|
      |┐┃┌|`,
    tilesets: {labyrinth: {}},
    edges: ' www',
    connect: '6ae|5d|79|bf',
  });
  readonly goaWideHallWSE_blockedBottom = $({
    id: 0xe8,
    icon: icon`
      |───|
      |━┳━|
      | ┃ |`,
    tilesets: {labyrinth: {requires: [ScreenFix.LabyrinthParapets]}},
    update: [[ScreenFix.LabyrinthParapets,
              labyrinthVariant(s => s.goaWideHallWSE, -1, 0, [0xd1, 0xdd])]],
    edges: ' www',
    connect: '6ae|5d|7|9|b|f',
  });
  readonly wideHallNS_wallTop = $({
    id: 0xe9,    // NOTE: the passage narrows at the top
    icon: icon`
      | ┆ |
      | ┃ |
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: 'c w',
    connect: '2a',
    exits: [topEdge(6, 4)],
  });
  readonly goaWideHallNS_wallTop = $({
    id: 0xe9,    // NOTE: the passage narrows at the top
    icon: icon`
      | ┆ |
      |╷┃╷|
      |│┃│|`,
    tilesets: {labyrinth: {}},
    edges: 'c w ',
    connect: '2a|9|b',
    exits: [topEdge(6, 4)],
  });
  readonly wideHallWE = $({
    id: 0xea,
    icon: icon`
      |   |
      |━━━|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    edges: ' w w',
    connect: '6e',
  });
  readonly goaWideHallWE = $({
    id: 0xea,
    icon: icon`
      |───|
      |━━━|
      |───|`,
    tilesets: {labyrinth: {}},
    edges: ' w w',
    connect: '5d|6e|7f',
  });
  readonly pitWE = $({
    id: 0xeb,
    icon: icon`
      |   |
      |─╳─|
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the pit
    feature: ['pit'],
    edges: 'c c',
    connect: '6e',
    platform: {type: 'horizontal', coord: 0x70_38},
  });
  readonly pitNS = $({
    id: 0xec,
    icon: icon`
      | │ |
      | ╳ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the pit
    feature: ['pit'],
    edges: ' c c',
    connect: '2a',
    platform: {type: 'vertical', coord: 0x40_78},
  });
  readonly spikesNS_hallS = $({
    id: 0xed,
    icon: icon`
      | ░ |
      | ░ |
      | │ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the spikes?
    feature: ['spikes'],
    edges: 's c ', // s = spikes
    connect: '2a',
  });
  readonly spikesNS_hallN = $({
    id: 0xee,
    icon: icon`
      | │ |
      | ░ |
      | ░ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the spikes?
    feature: ['spikes'],
    edges: 'c s ',
    connect: '2a',
  });
  readonly spikesNS_hallWE = $({
    id: 0xef,
    icon: icon`
      | ░ |
      |─░─|
      | ░ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    // TODO - annotate the spikes?
    feature: ['spikes'],
    edges: 'scsc',
    connect: '26ae',
  });
  readonly riverCave_deadEndsNS = $({
    id: 0xf0,
    icon: icon`
      | ╨ |
      |   |
      | ╥ |`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'r r ',
    connect: '1:3|9:b',
  });
  readonly riverCave_deadEndsN = $({
    id: 0xf0,
    icon: icon`
      | ╨ |
      |   |
      |   |`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'r   ',
    connect: '1:3',
  });
  readonly riverCave_deadEndsS = $({
    id: 0xf0,
    icon: icon`
      |   |
      |   |
      | ╥ |`,
    tilesets: {cave: {}, fortress: {}},
    edges: '  r ',
    connect: '9:b',
  });
  readonly riverCave_deadEndsWE = $({
    id: 0xf1,
    icon: icon`
      |   |
      |╡ ╞|
      |   |`,
    tilesets: {cave: {}, fortress: {}},
    edges: ' r r',
    connect: '5:7|d:f',
  });
  readonly riverCave_deadEndsW = $({
    id: 0xf1,
    icon: icon`
      |   |
      |╡  |
      |   |`,
    tilesets: {cave: {}, fortress: {}},
    edges: ' r  ',
    connect: '5:7',
  });
  readonly riverCave_deadEndsE = $({
    id: 0xf1,
    icon: icon`
      |   |
      |  ╞|
      |   |`,
    tilesets: {cave: {}, fortress: {}},
    edges: '   r',
    connect: 'd:f',
  });
  readonly riverCaveN_bridge = $({
    id: 0xf2,
    icon: icon`
      | ┇ |
      | ╨ |
      |   |`,
    tilesets: {cave: {}, fortress: {}},
    feature: ['bridge'],
    edges: 'r   ',
    connect: '1-3',
    wall: 0x17,
  });
  readonly riverCaveS_bridge = $({
    id: 0xf2,
    icon: icon`
      |   |
      | ╥ |
      | ┇ |`,
    tilesets: {cave: {}, fortress: {}},
    feature: ['bridge'],
    edges: '  r ',
    connect: '9-b',
    wall: 0xc6,
  });
  readonly riverCaveWSE = $({
    id: 0xf3,
    icon: icon`
      |───|
      |═╦═|
      |┐║┌|`,
    tilesets: {cave: {}, fortress: {}},
    edges: ' rrr',
    connect: '5d:79:bf',
  });
  readonly riverCaveNWE = $({
    id: 0xf4,
    icon: icon`
      |┘║└|
      |═╩═|
      |───|`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'rr r',
    connect: '15:3d:7f',
  });
  readonly riverCaveNS_blockedRight = $({
    id: 0xf5,
    icon: icon`
      |│║│|
      |│║ |
      |│║│|`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'r r ',
    connect: '19:3:b',
  });
  readonly riverCaveNS_blockedLeft = $({
    id: 0xf6,
    icon: icon`
      |│║│|
      | ║│|
      |│║│|`,
    tilesets: {cave: {}, fortress: {}},
    edges: 'r r ',
    connect: '1:3b:9',
  });
  readonly spikesNS = $({
    id: 0xf7,
    icon: icon`
      | ░ |
      | ░ |
      | ░ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
    feature: ['spikes'],
    edges: 's s ',
    connect: '2a',
  });
  readonly cryptArena_statues = $({
    id: 0xf8,
    icon: icon`<
      |&<&|
      |│ │|
      |└┬┘|`,
    tilesets: {pyramid: {}},
    feature: ['arena'],
    edges: '  c ',
    connect: 'a',
    exits: [upStair(0x47)]
  });
  readonly pyramidArena_draygon = $({
    id: 0xf9,
    icon: icon`
      |┌─┐|
      |│╳│|
      |└┬┘|`,
    tilesets: {pyramid: {}},
    feature: ['arena', 'pit'],
    edges: '  w ',
    connect: 'a',
  });
  readonly cryptArena_draygon2 = $({
    id: 0xfa,
    icon: icon`
      |┏┷┓|
      |┃&┃|
      |┗┳┛|`,
    tilesets: {pyramid: {}},
    feature: ['arena'],
    edges: 'c w ',
    connect: '2a',
    exits: [topEdge(6, 4)],
  });
  readonly cryptArena_entrance = $({
    id: 0xfb,
    icon: icon`
      | ┃ |
      | ┃ |
      | ╿ |`,
    tilesets: {pyramid: {}},
    edges: 'w n ',
    connect: '2a',
    exits: [bottomEdge()],
  });
  readonly cryptTeleporter = $({
    id: 0xfc,
    tilesets: {pyramid: {}},
    // NOTE - uses bottomEdge (NOT the house version)
  });
  readonly fortressArena_through = $({
    id: 0xfd,
    icon: icon`╽
      |┌┴┐|
      |│ │|
      |┕┳┙|`,
    tilesets: {pyramid: {}},
    // NOTE: we could use this for a pit that requires flight to cross?
    feature: ['arena'],
    edges: 'n w ',
    connect: '2a',
    exits: [topEdge()],
  });
  // readonly fortressArena_pit = $({
  //   id: 0xfd,
  //   icon: icon`╽
  //     |┌┴┐|
  //     |│ │|
  //     |┕┳┙|`,
  //   tilesets: {pyramid: {}},
  //   feature: ['arena', 'pit'],
  //   edges: 'n w ',
  //   connect: '2a', // TODO - no way yet to notice flagged and have
  //   exits: [topEdge()],   // logic require flight...
  //   flagged: true,
  // });
  readonly fortressTrap = $({
    id: 0xfe,
    icon: icon`
      |└─┘|
      | ╳ |
      |╶┬╴|`,
    tilesets: {pyramid: {}},
    feature: ['pit'],
    edges: '  n ',
    connect: 'a',
    exits: [bottomEdge()],
  });
  readonly shrine = $({
    id: 0xff,
    tilesets: {shrine: {}},
    exits: [bottomEdge({left: 6, width: 5})],
  });
  readonly inn = $({
    id: 0x100,
    tilesets: {house: {}},
    exits: [door(0x86)],
  });
  readonly toolShop = $({
    id: 0x101,
    tilesets: {house: {}},
    exits: [door(0x86)],
  });
  readonly armorShop = $({
    id: 0x102,
    tilesets: {house: {}},
    exits: [door(0x86)],
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
