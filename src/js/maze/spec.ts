import {Dir, Pos, Scr} from './types.js';
import {Location} from '../rom/location.js';
import {hex} from '../rom/util.js';
import {assertNever} from '../util.js';
import {iters, isNonNull, Multiset} from '../util.js';

////////////////////////////////////////////////////////////////
//
// Intersections are a problem - Tiles in multiple specs,
// spec in multiple spec sets, etc.  When we want to change
// a tile, we need to make sure to update all the specs.
//
////////////////////////////////////////////////////////////////

/** Spec for a screen. */
export interface Spec {
  readonly edges: Scr;
  readonly tile: number;
  readonly icon: string;
  readonly connections: Connections;
  readonly fixed: boolean;
  readonly flag: boolean;
  readonly pit: boolean;
  readonly deadEnd: boolean;
  readonly stairs: Stair[];
  readonly wall: Wall | undefined;
  readonly poi: Poi[];
}

export function Spec(edges: number,
                     tile: number,
                     icon: string,
                     ...extra: Array<ExtraArg>): Spec {
  const connections = [];
  const poi = [];
  const stairs = [];
  let deadEnd = false;
  let fixed = false;
  let flag = false;
  let wall: Wall | undefined = undefined;
  let pit = false;
  for (let data of extra) {
    if (typeof data === 'string') {
      if (data === 'fixed') {
        fixed = true;
      } else if (data === 'flag') {
        flag = true;
      } else if (data === 'pit') {
        pit = true;
      } else if (data === 'deadend') {
        deadEnd = true;
      } else {
        assertNever(data);
      }
    } else if (typeof data === 'number') {
      connections.push(connection(data));
    } else if (data instanceof Stair) {
      stairs.push(data);
    } else if (data instanceof Wall) {
      wall = data;
    } else if (data instanceof Poi) {
      poi.push(data);
    } else {
      assertNever(data);
    }
  }
  return {edges: edges as Scr,
          tile, icon, connections, deadEnd,
          fixed, flag, wall, pit, poi, stairs};
}

// entrance is four nibbles: YyXx of exact pixel on screen.
export class Stair {
  [STAIR_NOMINAL]: never;
  private constructor(readonly dir: Dir, readonly entrance: number,
                      readonly exit: number) {}
  static up(entrance: number, exit: number): Stair {
    return new Stair(Dir.UP, entrance, exit);
  }
  static down(entrance: number, exit: number): Stair {
    return new Stair(Dir.DOWN, entrance, exit);
  }
}
declare const STAIR_NOMINAL: unique symbol;

export class Wall {
  [WALL_NOMINAL]: never;
  constructor(readonly type: 'wall' | 'bridge', readonly tile: number,
              readonly a: number, readonly b: number) {}
  connections(flagged: boolean): Connections {
    if (!flagged) return [connection(this.a), connection(this.b)];
    let count = this.b;
    let a = this.a;
    while (count) {
      count >>= 4;
      a <<= 4;
    }
    return [connection(a | this.b)];
  }
}
declare const WALL_NOMINAL: unique symbol;

export function wall(tile: number, [a, b]: readonly [number, number]): Wall {
  return new Wall('wall', tile, a, b);
}

export function bridge(tile: number, [a, b]: readonly [number, number]): Wall {
  return new Wall('bridge', tile, a, b);
}

export class Poi {
  [POI_NOMINAL]: never;
  constructor(readonly priority: number,
              readonly dy: number, readonly dx: number) {}
}
declare const POI_NOMINAL: unique symbol;

/**
 * @param priority Starting at zero for best spots
 * @param dy Pixel position from (0, 0) of screen
 * @param dx Pixel position from (0, 0) of screen
 */
export function poi(priority: number, dy = 0x70, dx = 0x78) {
  return new Poi(priority, dy, dx);
}

type Connections = ReadonlyArray<ReadonlyArray<number>>;

type SpecFlag = 'fixed' | 'flag' | 'pit' | 'deadend';

type ExtraArg = number | Stair | Wall | Poi | SpecFlag;

function connection(data: number): number[] {
  const connection = [];
  while (data) {
    // Each of the four edges has possible exits 1, 2, and 3,
    // represented by that corresponding tile.  The 4 bit is
    // for left/right edge and the 8 bit is for right/bottom.
    const channel = (data & 3) << (data & 4); // 01, 02, 03, 10, 20, or 30
    const offset = data & 8 ? (data & 4 ? 0x0100 : 0x1000) : 0;
    connection.push(channel | offset);
    data >>>= 4;
  }
  return connection;
}


////////////////////////////////////////////////////////////////

// Exit types:
//  0: blocked
//  1: normal narrow passage
//  2: wide passage
//  3: river
//  4: spikes
//  6: narrow exit
//  7: blocked next to wide room

export interface EntranceSpec {
  // entrance.coord
  entrance: number;
  // exit.tile
  exits: number[];
}

// TODO - this seems like it should be on a per-specset basis?
export const EDGE_TYPES: {[edge: number]: {[dir: number]: EntranceSpec}} = {
  1: {
    [Dir.DOWN]: {
      // NOTE: These are incorrect for non-vertical-scrolling screens...
      // That case needs to move up by two tiles for the HUD.  We correct
      // for this case in Location.prototype.write.
      entrance: 0xdf80,
      exits: [0xe6, 0xe7, 0xe8, 0xe9],
    },
    [Dir.UP]: {
      // NOTE: again, for single-height screens these need to move UP
      // a single tile, to 2080 and 16..19
      entrance: 0x3080,
      exits: [0x26, 0x27, 0x28, 0x29],
    },
  },
  6: {
    [Dir.DOWN]: {
      entrance: 0xdf80,
      exits: [0xe7, 0xe8],
    },
    [Dir.UP]: {
      entrance: 0x3080,
      exits: [0x27, 0x28],
    },
  },
};

const EMPTY_CAVE_SCREEN = Spec(0, 0x80, ' ');

const BASIC_CAVE_SCREENS = [
  // Normal cave screens
  Spec(0x0_0101, 0x81, '│', 0x2a, poi(4)),
  Spec(0x0_1010, 0x82, '─', 0x6e, poi(4)),
  Spec(0x0_0110, 0x83, '┌', 0xae, poi(2)),
  Spec(0x0_1100, 0x84, '┐', 0x6a, poi(2)),
  Spec(0x0_0011, 0x85, '└', 0x2e, poi(2)),
  Spec(0x0_1001, 0x86, '┘', 0x26, poi(2)),
  Spec(0x0_0111, 0x87, '├', 0x2ae, poi(3)),
  Spec(0x0_1111, 0x88, '┼', 0x26ae, poi(3)),
  Spec(0x0_1101, 0x89, '┤', 0x26a, poi(3)),
  Spec(0x0_1110, 0x8a, '┬', 0x6ae, poi(3)),
  Spec(0x0_1011, 0x8b, '┴', 0x26e, poi(3)),

  // Doors, walls, dead ends, etc
  Spec(0x2_0101, 0x8c, '┋', 0x2a), // full-screen stair hallway
  Spec(0x10_0101, 0x8d, '╫', 'fixed', 0x2a), // over bridge
  Spec(0x10_1010, 0x8e, '╫', 'fixed', 0x6e), // under bridge
  Spec(0x1_0101, 0x8f, '┆', wall(0x87, [0x2, 0xa])),
  Spec(0x1_1010, 0x90, '┄', wall(0x67, [0x2, 0xa])),
  Spec(0x1_1011, 0x94, '┸'/*┴*/, wall(0x37, [0x2, 0x6e])),
  Spec(0x2_1010, 0x95, '┸', 0x6e, Stair.up(0x40_80, 0x37)),
  Spec(0x1_1000, 0x96, '┚', 0x6, Stair.up(0x40_30, 0x32)),
  Spec(0x2_1000, 0x97, '┒', 0x6, Stair.down(0xaf_30, 0xb2)),
  Spec(0x1_0010, 0x98, '┖', 0xe, Stair.up(0x40_d0, 0x3c)),
  Spec(0x2_0010, 0x99, '┎', 0xe, Stair.down(0xaf_d0, 0xbc)),
  Spec(0x2_0001, 0x9a, '╹', 0x2, Stair.down(0x1f_80, 0x27)),
  Spec(0x2_0100, 0x9a, '╻', 0xa, Stair.up(0xd0_80, 0xc7)),
  // vertical dead ends
  Spec(0x4_0101, 0x9b, ' ', 0x2, 0xa, 'deadend'), // double
  Spec(0x0_0001, 0x9b, '╵', 0x2, poi(0, -0x30, 0x78), 'deadend'),
  Spec(0x0_0100, 0x9b, '╷', 0xa, poi(0, 0x110, 0x78), 'deadend'),
  // horizontal dead ends
  Spec(0x4_1010, 0x9c, ' ', 0x6, 0xe, 'deadend'),
  Spec(0x0_0010, 0x9c, '╶', 0xe, poi(0, 0x70, 0x108), 'deadend'),
  Spec(0x0_1000, 0x9c, '╴', 0x6, poi(0, 0x70, -0x28), 'deadend'),
  //
  Spec(0x0_0601, 0x9e, '╽', 0x2a), // narrow bottom entrance
] as const;

const BOSS_CAVE_SCREENS = [
  Spec(0x0_7176, 0x91, '╤', 'fixed', 0x2a, poi(1, 0x60, 0x78)),
  Spec(0x7_0101, 0x91, '╤', 'fixed', 0x2a, poi(1, 0x60, 0x78)),
  Spec(0x1_7176, 0x92, '╤', 'fixed',
       wall(0x27, [0x2, 0xa]), poi(1, 0x60, 0x78)),
  Spec(0x0_0070, 0x80, '╘'), // empty spot to left of boss room
  Spec(0x0_7000, 0x80, '╛'), // empty spot to right of boss room
  // TODO - f9... for various more boss rooms (but non-cave)
] as const;

const RIVER_SCREENS = [
  Spec(0x0_3333, 0xd3, '╬', 0x15, 0x3d,
       bridge(0xb6, [0x79, 0xbf]), poi(4, 0x00, 0x98)),
  Spec(0x0_0303, 0xd4, '║', 0x19, 0x3b),
  Spec(0x0_3030, 0xd5, '═', 0x5d, 0x7f),
  Spec(0x1_0303, 0xd6, '║', bridge(0x87, [0x19, 0x3b])),
  Spec(0x1_3030, 0xd7, '═', bridge(0x86, [0x5d, 0x7f])),
  Spec(0x0_0330, 0xd8, '╔', 0x9d, 0xbf),
  Spec(0x0_3300, 0xd9, '╗', 0x5b, 0x79),
  Spec(0x0_0033, 0xda, '╚', 0x1f, 0x3d),
  Spec(0x0_3003, 0xdb, '╝', 0x15, 0x37),
  Spec(0x0_3031, 0xdc, '╧', 0x25d, 0x7f),
  Spec(0x0_3130, 0xdd, '╤', 0x5d, 0x7af),
  Spec(0x0_1303, 0xde, '╢', 0x169, 0x3b),
  Spec(0x0_0313, 0xdf, '╟', 0x19, 0x3be),
  // vertical dead ends
  Spec(0x8_0303, 0xf0, ' ', 0x1, 0x3, 0x9, 0xb, 'deadend'), // double
  Spec(0x0_0003, 0xf0, ' ', 0x1, 0x3,
       poi(1, -0x30, 0x48), poi(1, -0x30, 0x98), 'deadend'),
  Spec(0x0_0300, 0xf0, ' ', 0x9, 0xb,
       poi(1, 0x110, 0x48), poi(1, 0x110, 0x98), 'deadend'),
  // horizontal dead ends
  Spec(0x8_3030, 0xf1, ' ', 0x5, 0x7, 0xd, 0xf, 'deadend'), // double
  Spec(0x0_0030, 0xf1, ' ', 0xd, 0xf,
       poi(1, 0x60, 0x108), poi(1, 0xa0, 0x108), 'deadend'),
  Spec(0x0_3000, 0xf1, ' ', 0x5, 0x7,
       poi(1, 0x60, -0x28), poi(1, 0xa0, -0x28), 'deadend'),
  //
  Spec(0x1_0003, 0xf2, '╨', bridge(0x17, [0x1, 0x3])), // top/bottom bridge (top)
  Spec(0x1_0300, 0xf2, '╥', bridge(0xc6, [0x9, 0xb])), // top/bottom bridge (bot)
  Spec(0x0_3330, 0xf3, '╦', 0x5d, 0x79, 0xbf),
  Spec(0x0_3033, 0xf4, '╩', 0x15, 0x3d, 0x7f),
  Spec(0x2_0303, 0xf5, '╠', 0x19, 0x3, 0xb, // notched vertical hall
       poi(1, 0xc0, 0x98), poi(1, 0x40, 0x98)),
  Spec(0x4_0303, 0xf6, '╣', 0x1, 0x9, 0x3b, // notched vertical hall
       poi(1, 0xb0, 0x48), poi(1, 0x30, 0x48)),
  // Made-up tiles to help bootstrapping
  //Spec(0x0_0333, ~6, '╠', 0x19, 0x3d, 0xbf), // made-up tile w/ right branch
  //Spec(0x0_3303, ~7, '╣', 0x3b, 0x79, 0x15), // made-up tile w/ left branch
] as const;

const WIDE_SCREENS = [
  Spec(0x0_0002, 0x71, '┻', 0x2, Stair.down(0xcf_80, 0xd7)),
  Spec(0x0_0202, 0x72, '┃', 0x2a),
  Spec(0x0_0022, 0xe0, '┖', 0x2e),
  Spec(0x0_2002, 0xe1, '┚', 0x26),
  Spec(0x0_0220, 0xe2, '┎', 0xae),
  Spec(0x0_2200, 0xe3, '┒', 0x6a),
  // NOTE: Currently these aren't viable, using a path-based
  // strategy for these rooms, since we can't place this safely.
  // Marking it 'fixed' prevents trying to place them randomly.
  Spec(0x1_0202, 0xe5, '╏', 'fixed', 0x2, 0xa),
  Spec(0x0_2222, 0xe6, '╂', 0x26ae),
  Spec(0x0_2022, 0xe7, '┸', 0x26e),
  Spec(0x0_2220, 0xe8, '┰', 0x6ae),
  Spec(0x0_0201, 0xe9, '╽', 'fixed', wall(0x37, [0x2, 0xa])),
  Spec(0x0_2020, 0xea, '─', 0x6e),
  Spec(0x1_0201, 0xfd, '╽', 'fixed', 0x2a), // burt room
] as const;
const WIDE_SET = new Set([0x80, ...WIDE_SCREENS.map(spec => spec.tile)]);

const PIT_SCREENS = [
  Spec(0x8_1010, 0xeb, '┈', 'pit', 0x6e),
  Spec(0x8_0101, 0xec, '┊', 'pit', 0x2a),
] as const;

const SPIKE_SCREENS = [
  Spec(0x0_0104, 0xed, '╿', 0x2a),
  Spec(0x0_0401, 0xee, '╽', 0x2a),
  Spec(0x0_1414, 0xef, '╂', 0x26ae),
  Spec(0x0_0404, 0xf7, '┃', 0x2a),
] as const;

// NOTE: These should not mix with caves or overworld.
// TODO - how to keep them separate?!?
export const SWAMP_SCREENS = [
  Spec(0x0000, 0x7f, ' '),
  Spec(0x0001, ~0,   '╵', 0x1),
  Spec(0x0010, 0x76, '╶', 0xd),
  Spec(0x0011, 0x79, '└', 0x1d),
  Spec(0x0100, ~1,   '╷', 0x9),
  Spec(0x0101, ~2,   '│', 0x19),
  Spec(0x0110, ~3,   '┌', 0x9d),
  Spec(0x0111, ~4,   '├', 0x19d),
  Spec(0x1000, 0x7b, '╴', 0x5),
  Spec(0x1001, 0x75, '┘', 0x15),
  Spec(0x1010, ~5,   '─', 0x5d),
  Spec(0x1011, 0x7d, '┴', 0x15d),
  Spec(0x1100, 0x7e, '┐', 0x59),
  Spec(0x1101, 0x78, '┤', 0x159),
  Spec(0x1110, 0x7a, '┬', 0x59d),
  Spec(0x1111, 0x77, '┼', 0x159d),
  // Boss
  Spec(0xf1f0, 0x7c, '╤', 'fixed', 0x9),
  Spec(0xf000, 0x7f, '╝', 'fixed'),
  Spec(0x00f0, 0x7f, '╚', 'fixed'),
  // Doors (via flag)
  Spec(0x1_0010, 0x76, '╶', 'fixed', 'flag', 0xd),
  Spec(0x1_0100, ~1,   '╷', 'fixed', 'flag', 0x9),
  Spec(0x1_0110, ~3,   '┌', 'fixed', 'flag', 0x9d),
  Spec(0x1_1000, 0x7b, '╴', 'fixed', 'flag', 0x5),
  Spec(0x1_1010, ~5,   '─', 'fixed', 'flag', 0x5d),
  Spec(0x1_1100, 0x7e, '┐', 'fixed', 'flag', 0x59),
  Spec(0x1_1110, 0x7a, '┬', 'fixed', 'flag', 0x59d),
] as const;

// NOTE: These should not mix with other screens.
export const GOA1_SCREENS = [
  // Clear screens
  Spec(0x0000, 0x80, ' '),
  Spec(0x0011, 0xe0, '└', 'flag', 0x1f, 0x2e, 0x3d),
  Spec(0x0101, 0xe4, '│', 'flag', 0x1239ab),
  Spec(0x0110, 0xe2, '┌', 'flag', 0x9d, 0xae, 0xbf),
  Spec(0x1001, 0xe1, '┘', 'flag', 0x15, 0x26, 0x37),
  Spec(0x1010, 0xea, '─',         0x5d, 0x6e, 0x7f),
  Spec(0x1011, 0xe7, '┴', 'flag', 0x15, 0x26e, 0x3d, 0x7f),
  Spec(0x1100, 0xe3, '┐', 'flag', 0x5b, 0x6a, 0x79),
  Spec(0x1110, 0xe8, '┬', 'flag', 0x5d, 0x6ae, 0x79, 0xbf),
  Spec(0x1111, 0xe6, '┼', 'flag', 0x15, 0x26ae, 0x3d, 0x79, 0xbf),
  // Simple flagged screens (don't generate these!)
  Spec(0x1_0011, 0xe0, '└', 'fixed', 0x2e, 0x3d),
  Spec(0x1_0101, 0xe4, '│', 'fixed', 0x12ab),
  Spec(0x1_0110, 0xe2, '┌', 'fixed', 0xae, 0xbf),
  Spec(0x1_1001, 0xe1, '┘', 'fixed', 0x15, 0x26),
  Spec(0x1_1011, 0xe7, '┴', 'fixed', 0x26e, 0x7f),
  Spec(0x1_1100, 0xe3, '┐', 'fixed', 0x6a, 0x79),
  Spec(0x1_1110, 0xe8, '┬', 'fixed', 0x5d, 0x6ae),
  Spec(0x1_1111, 0xe6, '┼', 'fixed', 0x15, 0x26ae, 0xbf),
  // Dead ends
  Spec(0x2_0101, 0xe5, '┊', 'fixed', 'flag', 0x139b), // dead end
  Spec(0x3_0101, 0xe5, '┊', 'fixed', 0x39), // dead end
  // Fixed screens (entrance)
  Spec(0xf0f1, 0x71, '╽', 'fixed', 0x2a),
  Spec(0x00f0, 0x80, '█', 'fixed'),
  Spec(0xf000, 0x80, '█', 'fixed'),
  // Fixed screens (boss)
  Spec(0xfff0, 0x73, '═', 'fixed'), // , 0x2a),
  Spec(0xf1ff, 0x72, '╤', 'fixed'), // , 0x29b),
  Spec(0x0ff0, 0x80, '╔', 'fixed'),
  Spec(0xff00, 0x80, '╗', 'fixed'),
  Spec(0x00ff, 0x80, '╚', 'fixed'),
  Spec(0xf00f, 0x80, '╝', 'fixed'),
] as const;

const ALL_CAVE_SCREENS = [
  BASIC_CAVE_SCREENS,
  BOSS_CAVE_SCREENS,
  RIVER_SCREENS,
  WIDE_SCREENS,
  PIT_SCREENS,
  SPIKE_SCREENS,
];

// Tiles with water on them.
const RIVER_TILES = new Set(RIVER_SCREENS.map(s => s.tile));

// const ALL_SCREENS = [
//   ...ALL_CAVE_SCREENS,
//   SWAMP_SCREENS,
//   GOA1_SCREENS,
// ];

// Maps a 4-bit mask to a count
const BITCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4] as const;

export class SpecSet {
  // Which tiles are fixed -> maps tile to spec
  readonly fixedTiles = new Map<number, Spec>();
  // Dead end tiles
  readonly deadEndTiles = new Set<number>();
  // Mask of open edges (1=up, 2=right, 4=down, 8=left) by 8-bit tile id
  readonly edgesByTile = new Map<number, number>();
  // Maps (8-bit tile << 8 | YX (tile) for entrance) => dir (up/down)
  readonly stairsByTile = new Map<number, Dir>();
  // Maps Scr to direction and entrance
  readonly stairScreens = new Map<Scr, readonly [Dir, EntranceSpec]>();
  // Maps of 8-bit tile IDs to wall type
  readonly walls = new Map<number, 'wall' | 'bridge'>();

  constructor(readonly specSets: ReadonlyArray<ReadonlyArray<Spec>>,
              readonly empty?: Spec) {
    for (const spec of iters.concat(...specSets)) {
      for (const dir of Dir.ALL) {
        const edge = (spec.edges >> Dir.shift(dir)) & 0xf;
        if (edge && (edge & 7) != 7) {
          this.edgesByTile.set(
              spec.tile,
              (this.edgesByTile.get(spec.tile) || 0) | (1 << dir));
        }
      }
      for (const stair of spec.stairs) {
        const pos = (stair.entrance & 0xf000) >> 8 |
                    (stair.entrance & 0xf0) >> 4;
        this.stairsByTile.set(spec.tile << 8 | pos, stair.dir);
        this.stairScreens.set(spec.edges, [
            stair.dir,
            {entrance: stair.entrance, exits: [stair.exit, stair.exit + 1]}]);
      }
      if (spec.wall) this.walls.set(spec.tile, spec.wall.type);
      if (spec.tile != 0x80 && spec.fixed) {
        if (!this.fixedTiles.has(spec.tile)) {
          // tile 91 has two options - use the first one.
          this.fixedTiles.set(spec.tile, spec);
        }
      }
      if (spec.deadEnd) this.deadEndTiles.add(spec.tile);
    }
  }

  survey(loc: Location): Survey {
    let size = 0;
    let deadEnds = 0;
    let branches = 0;
    let walls = 0;
    let bridges = 0;
    let rivers = 0;
    let wide = true;
    let anyWide = false;
    const stairs = new Map<Pos, ExitSpec>();
    const edges = new Map<Pos, ExitSpec>();
    const fixed = new Map<Pos, Spec>();
    const tiles = new Multiset<number>();
    const specs: Spec[] = [];

    // Collect all specs.
    if (this.empty) specs.push(this.empty);
    const allTiles = new Set(([] as number[]).concat(...loc.screens));
    for (const set of this.specSets) {
      for (const scr of set) {
        if (scr.tile === 0x80) continue;
        if (allTiles.has(scr.tile)) {
          specs.push(...set);
          break;
        }
      }
    }

    // Special case: tileset a4 cannot handle horizontal wall corridors
    if (loc.tileset === 0xa4) {
      for (let i = specs.length - 1; i >= 0; i--) {
        if (specs[i].edges === 0x1_1010) specs.splice(i, 1);
      }
    }

    // Set of Pos values of reachable screens.  Allows removing the
    // "wrong side" of bridges.
    const reachable =
        new Set([...loc.reachableTiles(true).keys()].map(t => t >>> 8));

    // Maps entrance number to LLEE where LL is 8-bit location id, EE is
    // 8-bit entrance number (really 5-bit, but we don't compress).
    const entranceToExit = new Map<number, number>(loc.entrances.map(
        (entrance, num): [number, number]|null => {
          for (const exit of loc.exits) {
            if (Math.abs(exit.x - entrance.x) < 20 &&
                Math.abs(exit.y - entrance.y) < 20) {
              return [num, exit.dest << 8 | exit.entrance];
            }
          }
          return null;
        }).filter(isNonNull));

    for (let i = 0; i < loc.entrances.length; i++) {
      const entrance = loc.entrances[i];
      const scr = loc.screens[entrance.screen >>> 4][entrance.screen & 0xf];
      const dir = this.stairsByTile.get(scr << 8 | entrance.tile);
      if (dir != null) {
        const exit = entranceToExit.get(i);
        if (exit == null) throw new Error(`Could not find exit`);
        stairs.set(entrance.screen as Pos,
                   {entrance: i, exit, dir});
      }
    }
    for (let y = 0; y < loc.height; y++) {
      let edgeMask = 0;
      if (!y) edgeMask |= 1;
      if (y === loc.height - 1) edgeMask |= 4;
      for (let x = 0; x < loc.width; x++) {
        const pos = (y << 4 | x) as Pos;
        if (!reachable.has(pos)) continue;
        edgeMask &= ~0xa;
        if (!x) edgeMask |= 8;
        if (x === loc.width - 1) edgeMask |= 2;
        const tile = loc.screens[y][x];
        tiles.add(tile);
        if (tile === 0x80) continue;
        if (WIDE_SET.has(tile)) {
          anyWide = true;
        } else {
          wide = false;
        }
        size++;
        if (RIVER_TILES.has(tile)) rivers++;
        // Look for exits on the edge of the map
        let edgeExits = this.edgesByTile.get(tile)
        if (edgeExits == null) throw new Error(`Bad tile: ${hex(tile)}`);
        // NOTE: special-case the two-stair and dead-end cases.
        let edgeCount = BITCOUNT[edgeExits] + (stairs.has(pos) ? 1 : 0);
        if (tile === 0x9a) edgeCount = 2;
        if (tile === 0x9b || tile == 0x9c || tile == 0xf0 || tile == 0xf1) {
          edgeCount = 1;
        }
        if (edgeCount === 1) deadEnds++;
        if (edgeCount > 2) branches += (edgeCount - 2);
        const wall = this.walls.get(tile);
        if (wall === 'wall') walls++;
        if (wall === 'bridge') bridges++;
        let fixedScr = this.fixedTiles.get(tile);
        if (this.deadEndTiles.has(tile)) edgeExits = 0;
        for (const dir of Dir.ALL) {
          if (edgeExits & edgeMask & (1 << dir)) {
            let entrance = null;
            for (let i = 0; i < loc.entrances.length; i++) {
              if (loc.entrances[i].screen === pos &&
                  matchesDir(loc.entrances[i].tile, dir)) {
                entrance = i;
                break;
              }
            }
            if (entrance == null) continue;
            //if (entrance == null) throw new Error(`Could not find entrance for edge`);
            //const entrancePos = loc.entrances[entrance];
            const exit = entranceToExit.get(entrance);
            if (exit == null) throw new Error(`Could not find exit`);
            edges.set(pos, {entrance, exit, dir});
          }
        }
        if (fixedScr != null) fixed.set(pos, fixedScr);
      }
    }
    if (rivers) {
      // river screens can't easily support blanks on either side of the boss
      // room so instead replace 0_7176 with 7_0101.
      for (const [pos, scr] of fixed) {
        if (scr.edges !== 0x7176) continue;
        const spec = specs.find(s => s.edges === 0x7_0101);
        if (spec) fixed.set(pos, spec);
      }
    }
    if (wide != anyWide) throw new Error(`Found inconsistent use of wide tiles`);
    return {size, rivers, deadEnds, branches, walls, bridges, stairs,
            edges, fixed, tiles, wide, specs, specSet: this};
  }

   static readonly CAVE = new SpecSet(ALL_CAVE_SCREENS, EMPTY_CAVE_SCREEN);
}

interface ExitSpec {
  entrance: number; // index into the entrance table
  exit: number; // location << 8 | target
  dir: Dir; // 0 (up) or 2 (down)
}  

export interface Survey {
  size: number;
  rivers: number;
  deadEnds: number;
  branches: number;
  bridges: number;
  walls: number;
  wide: boolean;
  stairs: Map<Pos, ExitSpec>;
  edges: Map<Pos, ExitSpec>;
  fixed: Map<Pos, Spec>;
  tiles: Multiset<number>;
  specs: Spec[];
  specSet: SpecSet;
}

function matchesDir(tile: number, dir: Dir): boolean {
  if (dir === 0) return (tile >>> 4) < 0x4;
  if (dir === 1) return (tile & 0xf) > 0xd;
  if (dir === 2) return (tile >>> 4) > 0xc;
  if (dir === 3) return (tile & 0xf) < 0x2;
  return false;
}

/** Parse a string of hex digits. */
export function readScreen(str: string): number[] {
  const scr = str.split(/ +/g).map(x => parseInt(x, 16));
  for (const x of scr) {
    if (typeof x != 'number' || isNaN(x)) {
      throw new Error(`Bad screen: ${x} in ${str}`);
    }
  }
  return scr;
}

/** Writes 2d data into a an Nx16 (flattened) array. */
export function write2d<T>(arr: T[], corner: number,
                           repl: ReadonlyArray<ReadonlyArray<T|undefined>>) {
  for (let i = 0; i < repl.length; i++) {
    for (let j = 0; j < repl[i].length; j++) {
      const x = repl[i][j];
      if (x != null) arr[corner + (i << 4 | j)] = x;
    }
  }
}
