import {Metascreen} from './metascreen.js';
import {ScreenFix} from './screenfix.js';
import {Metatilesets} from './metatileset.js';
import {seq} from './util.js';
import {Rom} from '../rom.js';

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
   * neighboring screen.  Default dy=70 and dx=78.
   */
  poi?: ReadonlyArray<readonly [number, number?, number?]>,

  /** Updates to apply when applying the given fix. */
  update?: ReadonlyArray<readonly [ScreenFix, ScreenUpdate]>;

  /** Whether a special flag is needed for this screen. */
  flag?: 'always' | 'calm' | 'cave' | 'boss';

  /** List of directions the other screen may be in relation to this. */
  allowed?: (s: Metascreen) => Array<0|1|2|3>;
}

export type ScreenUpdate = (s: Metascreen, seed: number, rom: Rom) => boolean;

export type Feature =
  // TODO - cave? fortress? edge?  we already have connections to tell us...
  'pit' | 'arena' | 'spikes' | 'bridge' | 'wall' | 'stairs' | 'empty' |
  'portoa1' | 'portoa2' | 'portoa3' | // path from sabre to portoa
  'lake' | 'overBridge' | 'underBridge' | 'whirlpool' |
  'lighthouse' | 'cabin' | 'windmill' | 'altar' | 'pyramid' | 'crypt';

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


export type StairType = 'stair:up' | 'stair:down';
export type EdgeType = 'edge:top' | 'edge:bottom' | 'edge:left' | 'edge:right';
export type ConnectionType =
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

export function cave(tile: number, type: ConnectionType = 'cave'): Connection {
  return {...upStair(tile), type};
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
    entrance: y << 12 | 0x0f00 | x << 4,
    exits: [tile - 0xf, tile + 1],
  };
}

export function topEdge(left = 7, width = 2): Connection {
  return {
    type: 'edge:top',
    dir: 0,
    entrance: 0x30_00 | ((left << 4) + (width << 3)),
    exits: seq(width, i => 0x20 | (i + left)),
  };
}

export function bottomEdge({left = 7, width = 2, shift = 0} = {}): Connection {
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

export function leftEdge(top = 7, height = 2): Connection {
  return {
    type: 'edge:left',
    dir: 1,
    entrance: ((top << 12) + (height << 11)) | 0x10,
    exits: seq(height, i => (i + top) << 4),
  };
}

export function rightEdge(top = 7, height = 2): Connection {
  return {
    type: 'edge:right',
    dir: 1,
    entrance: ((top << 12) + (height << 11)) | 0xef,
    exits: seq(height, i => (i + top) << 4 | 0xf),
  };
}

/** @param tile Top-left tile of transition (height 2) */
export function seamlessVertical(tile: number, width = 2): Connection {
  return {
    type: 'seamless',
    get dir(): number { throw new Error('not implemented'); },
    get entrance(): number { throw new Error('not implemented'); },
    get exits(): number[] { throw new Error('not implemented'); },
  };
}


