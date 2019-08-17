import {Dir, Maze, Pos, Scr, Spec, Stair, readScreen, wall, write} from './maze.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';
import {Monster} from '../rom/monster.js';
import {hex} from '../rom/util.js';
import {iters} from '../util.js';

// invariants for shuffling caves:
//  - dead ends
//  - doors (types/directions)
//  - walls (number, not necessarily direction)
//  - "big rooms"
//  - treasure chests, etc.

// Exit types:
//  0: blocked
//  1: normal narrow passage
//  2: wide passage
//  3: river
//  4: spikes
//  6: narrow exit
//  7: blocked next to wide room
//  8|x: lower level (under bridge)

const BASIC_SCREENS = [
  // Normal cave screens
  Spec(0x0_0000, 0x80, ' '),
  Spec(0x0_0101, 0x81, '│', 0x2a),
  Spec(0x0_1010, 0x82, '─', 0x6e),
  Spec(0x0_0110, 0x83, '┌', 0xae),
  Spec(0x0_1100, 0x84, '┐', 0x6a),
  Spec(0x0_0011, 0x85, '└', 0x2e),
  Spec(0x0_1001, 0x86, '┘', 0x26),
  Spec(0x0_0111, 0x87, '├', 0x2ae),
  Spec(0x0_1111, 0x88, '┼', 0x26ae),
  Spec(0x0_1101, 0x89, '┤', 0x26a),
  Spec(0x0_1110, 0x8a, '┬', 0x6ae),
  Spec(0x0_1011, 0x8b, '┴', 0x26e),

  // Doors, walls, dead ends, etc
  Spec(0x8_0101, 0x8c, '┋', 'fixed', 0x2a), // full-screen stair hallway
  Spec(0x1_0101, 0x8f, '┆', ...wall(0x2, 0xa)),
  Spec(0x1_1010, 0x90, '┄', ...wall(0x2, 0xa)),
  Spec(0x1_1011, 0x94, '┴', ...wall(0x2, 0x6e)),
  Spec(0x2_1010, 0x95, '┸', 0x6e, Stair.up(0x40_80)),
  Spec(0x1_1000, 0x96, '┚', 0x6, Stair.up(0x40_30)),
  Spec(0x2_1000, 0x97, '┒', 0x6, Stair.down(0xaf_30)),
  Spec(0x1_0010, 0x98, '┖', 0xe, Stair.up(0x40_d0)),
  Spec(0x2_0010, 0x99, '┎', 0xe, Stair.down(0xaf_d0)),
  Spec(0x2_0001, 0x9a, '╹', 0x2, Stair.down(0x1f_80)),
  Spec(0x2_0100, 0x9a, '╻', 0xa, Stair.up(0xd0_80)),
  Spec(0x4_0101, 0x9b, ' ', 0x2, 0xa), // vertical dead ends
  Spec(0x0_0001, 0x9b, '╵', 0x2), // vertical dead end (one side)
  Spec(0x0_0100, 0x9b, '╷', 0xa), // vertical dead end (one side)
  Spec(0x4_1010, 0x9c, ' ', 0x6, 0xe), // horizontal dead ends
  Spec(0x0_0010, 0x9c, '╶', 0x6), // horizontal dead end (one side)
  Spec(0x0_1000, 0x9c, '╴', 0xe), // horizontal dead end (one side)
  Spec(0x0_0601, 0x9e, '╽', 0x2a), // narrow bottom entrance
] as const;

const BRIDGE_SCREENS = [
  Spec(0x0_9191, 0x8d, '╫', 'fixed', 0x2a, 0x6e), // over bridge
  Spec(0xf_9191, 0x8e, '╫', 'fixed', 0x2a, 0x6e), // under bridge
  // only use both stairs in bridge rooms
  Spec(0x2_0901, 0x9a, '╪', 'fixed', 0x2, 0xa,
       Stair.down(0x1f_80), Stair.up(0xd0_80)),
] as const;

const BOSS_SCREENS = [
  Spec(0x0_7176, 0x91, '╤', 'fixed', 0x2a), // boss room
  Spec(0x0_0070, 0x80, '╘'), // empty spot to left of boss room
  Spec(0x0_7000, 0x80, '╛'), // empty spot to right of boss room
  Spec(0x1_7176, 0x92, '╤', 'fixed', ...wall(0x2, 0xa)), // boss room with wall
  // TODO - f9... for various more boss rooms (but non-cave)
] as const;

const RIVER_SCREENS = [
  Spec(0x0_3333, 0xd3, '╬', 0x15, 0x3d, ...wall(0x79, 0xbf)),
  Spec(0x0_0303, 0xd4, '║', 0x19, 0x3b),
  Spec(0x0_3030, 0xd5, '═', 0x5d, 0x7f),
  Spec(0x1_0303, 0xd6, '║', ...wall(0x19, 0x3b)),
  Spec(0x1_3030, 0xd7, '═', ...wall(0x5d, 0x7f)),
  Spec(0x0_0330, 0xd8, '╔', 0x9d, 0xbf),
  Spec(0x0_3300, 0xd9, '╗', 0x5b, 0x79),
  Spec(0x0_0033, 0xda, '╚', 0x1f, 0x3d),
  Spec(0x0_3003, 0xdb, '╝', 0x15, 0x37),
  Spec(0x0_3031, 0xdc, '╧', 0x25d, 0x7f),
  Spec(0x0_3130, 0xdd, '╤', 0x5d, 0x7af),
  Spec(0x0_1303, 0xde, '╢', 0x169, 0x3b),
  Spec(0x0_0313, 0xdf, '╟', 0x19, 0x3be),
  Spec(0x8_0303, 0xf0, ' ', 0x1, 0x3, 0x9, 0xb), // vertical dead ends
  Spec(0x0_0003, 0xf0, ' ', 0x1, 0x3), // vertical dead end (one side)
  Spec(0x0_0300, 0xf0, ' ', 0x9, 0xb), // vertical dead end (one side)
  Spec(0x8_3030, 0xf1, ' ', 0x5, 0x7, 0xd, 0xf), // horizontal dead ends
  Spec(0x0_0030, 0xf1, ' ', 0xd, 0xf), // horizontal dead end (one side)
  Spec(0x0_3000, 0xf1, ' ', 0x5, 0x7), // horizontal dead end (one side)
  Spec(0x0_0003, 0xf2, '╨', ...wall(0x1, 0x3)), // top/bottom bridge (top)
  Spec(0x0_0300, 0xf2, '╥', ...wall(0x9, 0xb)), // top/bottom bridge (bottom)
  Spec(0x0_3330, 0xf3, '╦', 0x5d, 0x79, 0xbf),
  Spec(0x0_3033, 0xf4, '╩', 0x15, 0x3d, 0x7f),
  Spec(0x2_0303, 0xf5, '╠', 0x19, 0x3, 0xb), // notched vertical hall
  Spec(0x4_0303, 0xf6, '╣', 0x1, 0x9, 0x3b), // notched vertical hall
] as const;

const WIDE_SCREENS = [
  Spec(0x0_0002, 0x71, '┻', 0x2, Stair.down(0xcf_80)),
  Spec(0x0_0202, 0x72, '┃', 0x2a),
  Spec(0x0_0012, 0xe0, '┖', 0x2e),
  Spec(0x0_1002, 0xe1, '┚', 0x26),
  Spec(0x0_1200, 0xe2, '┒', 0x6a),
  Spec(0x0_0210, 0xe3, '┎', 0xae),
  Spec(0x0_1212, 0xe6, '╂', 0x26ae),
  Spec(0x0_1012, 0xe7, '┸', 0x26e),
  Spec(0x0_1210, 0xe8, '┰', 0x6ae),
  Spec(0x0_0201, 0xe9, '╽', ...wall(0x2, 0xa)),
] as const;

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

const ALL_SCREENS = [BASIC_SCREENS, BOSS_SCREENS, RIVER_SCREENS,
                     WIDE_SCREENS, PIT_SCREENS, SPIKE_SCREENS,
                     BRIDGE_SCREENS];

// Maps a 4-bit mask to a count
const BITCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4] as const;
// Masks (1=up, 2=right, 4=down, 8=left) by tile
const EDGES_BY_TILE = new Map<number, number>();
// tile << 8 | YX (tile) for entrance => dir
const STAIRS_BY_TILE = new Map<number, Dir>();
// Which tiles have walls
const WALLS = new Set<number>();
// Which tiles are fixed
const FIXED_TILES = new Map<number, Scr>();

// TODO - do a single top-level for-loop to populate these!
for (const spec of iters.concat(...ALL_SCREENS)) {
  for (const dir of Dir.ALL) {
    const edge = (spec.edges >> Dir.shift(dir)) & 0xf;
    if (edge && (edge & 7) != 7) {
      EDGES_BY_TILE.set(spec.tile,
                        (EDGES_BY_TILE.get(spec.tile) || 0) | (1 << dir));
    }
  }
  for (const stair of spec.stairs) {
    const pos = (stair.pixel & 0xf000) >> 8 | (stair.pixel & 0xf0) >> 4;
    STAIRS_BY_TILE.set(spec.tile << 8 | pos, stair.dir);
  }
  if (spec.wall) WALLS.add(spec.tile);
  if (spec.tile != 0x80 && spec.fixed) FIXED_TILES.set(spec.tile, spec.edges);
}

function exitCount(tile: number): number {
  return BITCOUNT[EDGES_BY_TILE.get(tile) || 0];
}

function addBridges(screens: readonly Spec[]): Spec[] {
  const out = [...screens];
  for (const scr of screens) {
    // Are there any 8-bits in edges?  If so, then quit.
    let edges = scr.edges;
    for (const dir of Dir.ALL) {
      const shift = Dir.shift(dir);
      const edge = (edges >>> shift) & 0xf;
      if (edge & 8) continue;
      if (edge) (edges as number) |= (8 << shift);
    }
    if (edges != scr.edges) out.push({...scr, edges});
  }
  out.push(...BRIDGE_SCREENS);
  return out;
}

function detectScreenSet(loc: Location): Spec[] {
  const out: Spec[] = [];
  const screens = new Set(([] as number[]).concat(...loc.screens));
  // NOTE: no bridges yet.
  for (const set of ALL_SCREENS) {
    if (set === BRIDGE_SCREENS) continue;
    for (const scr of set) {
      if (scr.tile === 0x80) continue;
      if (screens.has(scr.tile)) {
        out.push(...set);
        break;
      }
    }
  }
  return out;
}

interface Exit {
  entrance: number; // index into the entrance table
  exit: number; // location << 8 | target
  dir: Dir; // 0 (up) or 2 (down)
}  

interface Survey {
  size: number;
  deadEnds: number;
  branches: number;
  stairs: Exit[];
  walls: number;
  edges: Map<Pos, Exit>;
  fixed: Map<Pos, Scr>;
}
function surveyMap(loc: Location): Survey {
  let size = 0;
  let deadEnds = 0;
  let branches = 0;
  let walls = 0;
  const stairs: Exit[] = [];
  const edges = new Map<Pos, Exit>();
  const fixed = new Map<Pos, Scr>();

  for (let y = 0; y < loc.height; y++) {
    let edgeMask = 0;
    if (!y) edgeMask |= 0;
    if (y === loc.height - 1) edgeMask |= 4;
    for (let x = 0; x < loc.width; x++) {
      const pos = (y << 4 | x) as Pos;
      edgeMask &= ~0xa;
      if (!x) edgeMask |= 8;
      if (x === loc.width - 1) edgeMask |= 2;
      const tile = loc.screens[y][x];
      if (tile === 0x80) continue;
      size++;
      // Look for exits on the edge of the map
      let edgeExits = EDGES_BY_TILE.get(tile)
      if (edgeExits == null) throw new Error(`Bad tile: ${hex(tile)}`);
      const edgeCount = BITCOUNT[edgeExits];
      if (edgeCount === 1) deadEnds++;
      if (edgeCount > 2) branches += (edgeCount - 2);
      if (WALLS.has(tile)) walls++;
      let fixedScr = FIXED_TILES.get(tile);
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
          if (entrance == null) throw new Error(`Could not find entrance for edge`);
          const entrancePos = loc.entrances[entrance];
          let exit = null;
          for (const e of loc.exits) {
            if (Math.abs(e.x - entrancePos.x) < 20 &&
                Math.abs(e.y - entrancePos.y) < 20) {
              exit = e.dest << 8 | e.entrance;
            }
          }
          if (exit == null) throw new Error(`Could not find exit for edge`);
          edges.set(pos, {entrance, exit, dir});
          fixedScr = undefined;
        }
      }
      if (fixedScr != null) fixed.set(pos, fixedScr);
    }
  }
  return {size, deadEnds, branches, walls, stairs, edges, fixed};
}

function matchesDir(tile: number, dir: Dir): boolean {
  if (dir === 0) return (tile >>> 4) < 0x2;
  if (dir === 1) return (tile & 0xf) > 0xd;
  if (dir === 2) return (tile >>> 4) > 0xc;
  if (dir === 3) return (tile & 0xf) < 0x2;
  return false;
}

export function shuffleBridgeCave(upper: Location, lower: Location,
                                  random: Random, {attempts = 100} = {}) {
  // TODO - doesn't work yet.
  const [] = [addBridges];
  shuffleCave(upper, random, {attempts});
  shuffleCave(lower, random, {attempts});
}

export function shuffleCave(loc: Location, random: Random, {attempts = 100} = {}) {
  // Want a general-purpose algorithm.
  // Analyze the current location.
  const screens = detectScreenSet(loc);
  const w0 = loc.width;
  const h0 = loc.height;

  // Count entrances and exits.
  const survey = surveyMap(loc);

  OUTER:
  for (let attempt = 0; attempt < attempts; attempt++) {
    // Grow the width/height just a little.  We still try to keep roughly
    // the same number of screens, so we may not use the full size, but
    // it's here in case it helps.
    //const maze = new Maze(random, h0 + 2, Math.min(8, w0 + 2), screens);

    const maze = new Maze(random, h0, w0, screens);
    //maze.trackOpenEdges();

    //const mapping: Array<[Pos, Pos]> = []; // NOTE: may need to xform if shrink
    //const poi: Array<[Pos, Dir]> = [];
    //let {branches, deadEnds, size, walls} = survey;

    const density = survey.size / w0 / h0;

    

    // // Possible approach:
    // //  1. seed a bunch of initial screens
    // //  2. check step: traverse the map with
    // //     missing items treated as connecting everything
    // //  3. add random screens, biasing toward fewer exits
    // //     based on branching factor?
    // // This should ensure we don't do anything too stupid to
    // // paint ourselves into a corner.

    // Place (1) edge exits, (2) fixed screens, (3) stairs.
    const setEdges = new Set<Pos>();
    for (const [, edge] of survey.edges) {
      while (true) {
        const tile = /*1 +*/ random.nextInt(edge.dir & 1 ? h0 : w0);
        const other =
            edge.dir === Dir.RIGHT ? /*1 +*/ w0 :
            edge.dir === Dir.DOWN ? /*1 +*/ h0 : 0;
        const pos = (edge.dir & 1 ? tile << 4 | other : other << 4 | tile) as Pos;
        if (setEdges.has(pos)) continue;
        maze.setBorder(pos, edge.dir, 6);
        break;
      }
      // if (!maze.fill(moved, {maxExits: 2 + branches})) continue OUTER;
      // const filled = maze.get(moved)!;
      // mapping.push([pos, moved]);
      // let exits = 0;
      // for (const dir of Dir.ALL) {
      //   if (dir != edge.dir && (filled & Dir.edgeMask(dir))) {
      //     // poi.push([moved, dir]);
      //     exits++;
      //   }
      // }
      // size--;
      // if (exits > 1) branches -= (exits - 1);
    }

    for (const [, scr] of survey.fixed) {
      if (maze.addScreen(scr) == null) continue OUTER;
    }

    for (const stair of survey.stairs) {
      const eligible = [];
      for (const spec of screens) {
        if (spec.stairs.some(s => s.dir === stair.dir)) eligible.push(spec.edges);
      }
      if (maze.addScreen(random.pick(eligible)) == null) continue OUTER;
    }

    // // Now fill out a basic structure by walking random paths.
    // while (maze.density() < density) {
    //   if (maze.randomExtension(branches / size)) branches--;
    //   size--;
    // }


    //   for (let i = 0; i < 10; i++) {
    //     const tile0 = random.nextInt(h0 * w0);
    //     const x = tile0 % w0;
    //     const y = (tile0 - x) / w0;
    //     if (!maze.trySet(pos, 
    // }


    // for (const stair of survey.stairs) {
    //   // Find a random location for a correct-direction stair.
    //   const pos = maze.randomUnfilledPos();
    // }

    console.log(maze.show());
  }
}
