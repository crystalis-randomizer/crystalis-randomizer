import {Metascreen} from './metascreen';
import {ScreenFix} from './screenfix';
import {Metatilesets} from './metatileset';
import {seq} from './util';
import {Rom} from '../rom';

/**
 * Metadata about the metascreen.  Because these are created per Metascreens
 * instance, they can actually be mutated as needed.
 */
export interface MetascreenData {
  /**
   * If the screen exists or is shared with a screen in the vanilla rom, then
   * this is the screen ID (0..102).  Otherwise, it is a sparse negative number
   * shared by all the screens that will ultimately have the same ID.
   */
  readonly id: number;
  /** Representative icon for debug purposes. */
  icon?: Icon;
  /** List of tilesets this screen appears in. */
  tilesets: {[name in keyof Metatilesets]?: {
    /** Fixes needed before screen is usable in the tileset. */
    requires?: ScreenFix[],
    /** ??? */
    type?: string, // for town?
    /** Labyrinth data. */
    addWall?: number[],
    removeWall?: number,
  }};
  /** List of features present. */
  feature?: Feature[];
  /** List of exit specs. */
  exits?: readonly Connection[];
  /**
   * String (length 4) of edge types for matching: up, left, down, right.
   * The following characters are used in various tilesets:
   * General:
   *   * blank = blocked
   *   * star = special case
   * Overworld:
   *   * 'o' = open
   *   * '<', '>', '^', 'v' = open on the (left, right, top, bottom).
   *   * 'l' = long grass
   *   * 's' = short grass
   *   * 'r' = river
   *   * 'n' = narrow edge exit, centered
   *   * 'b' = boat
   *   * '1', '2', '3' = one-off special cases around portoa/oasis
   * Tower:
   *   * 's' = stairs
   *   * 't' = corridor
   * Cave:
   *   * 'c' = corridor
   *   * 'w' = wide
   *   * 'n' = narrow
   *   * 'r' = river
   *   * 'b' = wrong side of bridge
   *   * 's' = spikes
   * Swamp:
   *   * 's' = passage
   * Mountain:
   *   * 'p' = path
   *   * 's' = slope
   *   * 'w' = waterfall
   *   * 'l' = ladder
   */
  edges?: string;
  /**
   * Similar to edges (may supercede?), but 9 instead of 4
   * since it includes corners and center, which each have
   * their own thing.
   * Cave:
   *   c = corridor, ordinary center
   *   w = wide edge, wide center
   *   n = narrow edge
   *   r = river (center of river tiles, and edges)
   *   # = blockage (wall, non-bridged river, extra block)
   *       NOTE: we add walls but _remove_ bridges...
   *       NOTE: no longer used - just fill in normal now...
   *   b = bridge (wrong side??? probably not...)
   *   s = spikes
   *   p = pit
   *   / = ramp
   *   
   * Overworld:
   *   o = open
   *   < = cave or other up exit
   *   > = down exit (i.e. crypt)
   *   x = edge exit (never used interior)
   *   l = long grass/forest
   *   g = short grass
   *   r = river (or bridge if in center and there's an unbridged option)
   *       also used for oasis lake
   *   # = blockage in center (e.g. unbridged river, whirlpool)
   *   b = beach (on sea)
   *   ↓ = slope
   *   [0-9A-F] = off-center edge exits (top:6-7 or left:6-7 is centered)
   *     1 = bridge to portoa 12, 5 = leaf/mezame entrance 2d,
   *     8 = brynmaer exit 1c, boat channel 60, B = lower-left exit 1a
   *     => TODO - consider either deleting these or swapping for just 'x'
   *   W = windmill (also a < exit)
   *   A = altar
   *   L = lighthouse
   *   H = house
   *   F = fortress
   *   C = cabin
   *   P = pyramid
   *   Y = crypt
   */
  tile?: string|string[];
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
   * neighboring screen.  Default dy=70 and dx=78.
   */
  poi?: ReadonlyArray<readonly [number, number?, number?]>,

  /** Updates to apply when applying the given fix. */
  update?: ReadonlyArray<readonly [ScreenFix, ScreenUpdate]>;

  /** Whether a special flag is needed for this screen. */
  flag?: 'always' | 'calm' | 'custom:false' | 'custom:true'; // | 'boss';

  /** Conditions for matching this tile. */
  match?: (reachable: (dy: number, dx: number) => boolean,
           flag: boolean) => boolean;

  /** Whether this screen is _not allowed_ to be placed automatically. */
  placement?: 'manual' | 'mod';
  /**
   * Type of modification this screen is from a same-layout tile.
   * Mod tiles will not be inferred normally, and must be added afterwards.
   * Inferred tiles will be maximally open.  Mods will close paths.  We
   * may need to add a fixed number of walls, and/or remove a fixed nubmer
   * of bridges.  We add as many non-flag blocks as possible.
   */
  mod?: 'block' | 'wall' | 'bridge'; // | 'manual';

  /**
   * Y-coordinate of statues on this map screen.  These may be populated
   * with $3f monster spawns at x=5 and x=a (provided the necessary pattern
   * tables are loaded).  This is only relevant on the fortress tileset.
   */
  statues?: readonly number[];

  /**
   * True if the screen may be deleted entirely from a map (i.e. when trimming
   * unused rows/columns).  This is a subset of empty screens, since some empty
   * screens are important to retain (e.g. dead ends).
   */
  delete?: boolean;

  /**
   * Definition of the screen, in terms of metatile IDs at the time the screen
   * is allocated.  This is only used for screens with a negative sid ('id' in
   * this structure), and only one screen in a group of same-sid screens should
   * specify it.  It must be 240 bytes long.
   */
  definition?: (rom: Rom) => Uint8Array;

  /** Arena type.  This should be preserved when inferring screens. */
  arena?: number;

  /**
   * Screen coordinates of "tall" houses, which do not want a shadow (tile $06)
   * immediately over the door if we remove a shop icon, but rather a solid
   * (tile $21).
   */
  tallHouses?: number[];
}

export type ScreenUpdate = (s: Metascreen, seed: number, rom: Rom) => boolean;

export const featureMask = {
  // TODO - cave? fortress? edge?  we already have connections to tell us...
  'empty': 0x01,
  'pit': 0x02,
  'arena': 0x04,
  'spikes': 0x08,
  'wide': 0x10,
  'river': 0x20,
  'bridge': 0x40,
  'wall': 0x80,
  'ramp': 0x01_00,
  'overpass': 0x02_00,
  'underpass': 0x04_00,
  'whirlpool': 0x08_00,
  'deadend': 0x10_00,

  // Not actually listed as features, but added separately - we could add others
  // (total of 8 available...?)
  'stair:up': 0x01_00_00,
  'stair:down': 0x02_00_00,

  // Unique features: upper bits have various combinations of 3 of 6 bits
  //   7,b,d,e,13,15,16,19,1a,1c,23,25,26,29,2a,2c,31,32,34,38
  // Since they are never shared, we can pack a lot more into the same space.
  'portoa1': 0x07_00_00_00,
  'portoa2': 0x0b_00_00_00,
  'portoa3': 0x0d_00_00_00,
  'lake': 0x0e_00_00_00,
  'lighthouse': 0x13_00_00_00,
  'cabin': 0x15_00_00_00,
  'windmill': 0x16_00_00_00,
  'altar': 0x19_00_00_00,
  'pyramid': 0x1a_00_00_00,
  'crypt': 0x1c_00_00_00,

  // Prevents placing this by hand.
  'manual': 0x40_00_00_00,
  // Indicates we may want to consolidate this screen.
  'consolidate': 0x80_00_00_00,
} as const;

export type Feature = keyof typeof featureMask;
  // 'pit' | 'arena' | 'spikes' | 'bridge' | 'wall' | 'ramp' | 'empty' |
  // 'portoa1' | 'portoa2' | 'portoa3' | // path from sabre to portoa
  // 'lake' | 'overpass' | 'underpass' | 'whirlpool' |
  // 'lighthouse' | 'cabin' | 'windmill' | 'altar' | 'pyramid' | 'crypt' |
  // 'consolidate';

export interface Icon {
  short: string; // single character
  full: readonly [string, string, string]; // 3x3 grid
}

export function icon(arr: TemplateStringsArray): Icon {
  if (arr.length != 1) throw new Error('Bad icon input');
  const str = arr[0];
  // parse the string.
  const lines = str.split('\n');
  // lines 1..3 are the full icon.
  const full = lines.slice(1).map(l => l.replace(/^\s*\||\|\s*$/g, ''));
  const short = /\S/.test(lines[0]) ? lines[0][0] : full[1][1];
  return {short, full: [full[0], full[1], full[2]]};
}

export function readScreen(spec: string,
                           ...replacements: [string, number|Metascreen][]): Uint8Array {
  const s = spec.split(/\s+/g);
  if (!s[0]) s.shift();
  if (!s[s.length - 1]) s.pop();
  if (s.length !== 240) throw new Error(`Bad screen definition: ${s.length}`);
  const map = new Map(replacements);
  return Uint8Array.from(s, (x, i) => {
    const repl = map.get(x);
    if (typeof repl === 'number') return repl;
    if (repl) return repl.screen.tiles[i];
    return parseInt(x, 16);
  });
}

export type StairType = 'stair:up' | 'stair:down';
export type EdgeType = 'edge:top' | 'edge:bottom' | 'edge:left' | 'edge:right';
export type SeamlessType = 'seamless:up' | 'seamless:down';
export type ConnectionType =
    StairType | EdgeType | SeamlessType |
    'cave' | 'crypt' | 'door' | 'door2' | 'door3' | 'fortress' |
    'gate' | 'swamp' | 'teleporter' | 'windmill';
// TODO - is windmill just door2?

// NOTE: swamp connects to edge:bottom for cave or town?

export interface Connection {
  readonly type: ConnectionType;
  readonly manual?: boolean;         // should only be placed manually
  readonly dir: number;              // 0=up, 1=left, 2=down, 3=right
  readonly entrance: number;         // pos YyXx
  readonly exits: readonly number[]; // tile YX
  readonly allowedExits?: readonly number[]; // extra exits to match
  // TODO - singleHeightEntrance - for dir=2 just subtract 0x20 ??
  // TODO - opposite direction? watererfall cave is a right/down matchup...
}

/** @param tile position of lower-left metatile (e.g. 0x42 for 40_30). */
export function upStair(tile: number, width = 2): Connection {
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
      type: 'stair:up',
      dir: 2,
      entrance,
      exits: [tile],
      //allowedExits: [tile - 16, tile + 16],
    };
  }
  // TODO - if y is 0xe then we may need to adjust for screen edge?
  const entrance = y << 12 | ((x << 4) + (width << 3));
  return {
    type: 'stair:up',
    dir: 0,
    entrance,
    exits: seq(width, i => tile - 0x10 + i),
    // TODO - if we set this then we could possibly save some of the
    //        preparse normalization that's currently required.
    //allowedExits: [...seq(width, i => tile - 0x20 + i),
    //               ...seq(width, i => tile + i)],
  };
}

/** @param tile position of upper-left metatile (e.g. 0xa2 for af_30). */
export function downStair(tile: number, width = 2): Connection {
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
      allowedExits: [tile + 16, tile - 16],
    };
  }
  const entrance = y << 12 | 0x0f00 | ((x << 4) + (width << 3));
  return {
    type: 'stair:down',
    dir: 2,
    entrance,
    exits: seq(width, i => tile + 0x10 + i),
    allowedExits: [...seq(width, i => tile + 0x20 + i),
                   ...seq(width, i => tile + i)],
  };
}

export function cave(tile: number, type: ConnectionType = 'cave'): Connection {
  return {...upStair(tile + 16), type};
}

export function door(tile: number, type: ConnectionType = 'door'): Connection {
  return {...upStair(tile, 1), type};
}

/** @param tile bottom-left metatile */
export function waterfallCave(tile: number): Connection {
  const y = tile >>> 4;
  const x = tile & 0xf;
  return {
    type: 'cave',
    dir: 0,
    entrance: y << 12 | x << 4 | 0xf,
    exits: [tile - 0xf, tile + 1],
  };
}

export function topEdge({left = 7, width = 2,
                         top = 2, manual = false} = {}): Connection {
  return {
    type: 'edge:top',
    manual,
    dir: 0,
    entrance: ((top + 1) << 12) | ((left << 4) + (width << 3)),
    exits: seq(width, i => (top << 4) | (i + left)),
  };
}

// TODO - consider separating wide vs narrow edges into separate types???

export function bottomEdge({left = 7, width = 2, shift = 0,
                            type = 'edge:bottom' as ConnectionType,
                            manual = false} = {}): Connection {
  // NOTE: some screens can be used both in normal maps and in single-height
  // maps.  When used in single-height, we need to subtract 2 from the Y tile
  // coordinates of the entrance/exit, clamping to bf (entrance) and c (exit).
  return {
    type, manual,
    dir: 2,
    entrance: 0xdf_00 | ((left << 4) + (width << 3) + 16 * shift),
    exits: seq(width, i => 0xe0 | (i + left)),
  };
}

export function bottomEdgeHouse({left = 7,
                                 width = 2,
                                 shift = 0} = {}): Connection {
  // Unlike "dual-mode" screens, indoors-only screens have their entrance an
  // additional tile up, at af/b.  This hard-codes that.
  return {
    type: 'edge:bottom',
    dir: 2,
    entrance: 0xaf_00 | ((left << 4) + (width << 3) + 16 * shift),
    exits: seq(width, i => 0xb0 | (i + left)),
  };
}

export function leftEdge({top = 7, height = 2, shift = 0} = {}): Connection {
  return {
    type: 'edge:left',
    dir: 1,
    entrance: ((top << 12) + ((16 * shift) << 8) + (height << 11)) | 0x10,
    exits: seq(height, i => (i + top) << 4),
  };
}

export function rightEdge({top = 7, height = 2, shift = 0} = {}): Connection {
  return {
    type: 'edge:right',
    dir: 3,
    entrance: ((top << 12) + ((16 * shift) << 8) + (height << 11)) | 0xef,
    exits: seq(height, i => (i + top) << 4 | 0xf),
  };
}

/** @param tile Top-left tile of transition (height 2) */
export function seamlessUp(tile: number, width = 2): Connection {
  return {
    type: 'seamless:up',
    dir: 0,
    get entrance(): number { throw new Error('does not make sense'); },
    exits: seq(width, i => (tile + i)),
  };
}

export function seamlessDown(tile: number, width = 2): Connection {
  return {
    type: 'seamless:down',
    dir: 2,
    get entrance(): number { throw new Error('does not make sense'); },
    exits: seq(width, i => (tile + i)),
  };
}
