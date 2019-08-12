import {hex, hex5, seq} from "../rom/util.js";
import {Location, Flag} from "../rom/location.js";
import {Random} from "../random.js";
import {DefaultMap, assertNever} from "../util.js";
import {UnionFind} from "../unionfind.js";
import { Monster } from "../rom/monster.js";

export class Maze implements Iterable<[Pos, Scr]> {

  private map: Array<Scr|undefined>;
  //private mapStack: Array<Array<Scr|undefined>> = [];

  private screens: Map<Scr, Spec>;
  private screenExtensions: DefaultMap<number, ReadonlyArray<readonly [Dir, Scr]>>;

  private allPos: Set<Pos>;

  constructor(private readonly random: Random,
              readonly height: number,
              readonly width: number,
              screens: readonly Spec[]) {
    this.map = new Array(height << 4).fill(undefined);
    this.screens = new Map(screens.map(spec => [spec.edges, spec]));
    this.allPos = new Set(
        ([] as Pos[]).concat(
            ...seq(height, y => seq(width, x => (y << 4 | x) as Pos))));

    const extensions = new DefaultMap<number, Array<[Dir, Scr]>>(() => []);
    for (const [screen, spec] of this.screens) {
      if (spec.fixed) continue;
      for (const dir of Dir.ALL) {
        const mask = 0xf << (dir << 2);
        if (screen & mask) {
          extensions.get(screen & ~mask & 0xffff).push([dir, screen]);
        }
      }
    }
    this.screenExtensions = extensions;
  }

  // Higher-level functionality

  * alternates(): IterableIterator<[Pos, number]> {
    for (const pos of this.allPos) {
      const scr = this.map[pos];
      if (scr == null) continue;
      for (let bit = 0x1_0000; bit < 0x10_0000; bit <<= 1) {
        if (!(scr & bit) && this.screens.has((scr | bit) as Scr)) {
          yield [pos, bit];
        }
      }
    }
  }

  saveExcursion(f: () => boolean): boolean {
    let m = [...this.map];
    try {
      if (f()) return true;
    } catch (err) {
      this.map = m;
      throw err;
    }
    this.map = m;
    return false;
  }

  * eligible(pos: Pos, maxExits?: number): IterableIterator<Scr> {
    // Build up the constraint.
    let mask = 0;
    let constraint = 0;
    for (const dir of Dir.ALL) {
      const screen = this.get(Pos.plus(pos, dir));
      if (screen == null) continue;
      const edge = Dir.edgeMask(Dir.inv(dir));
      constraint |= ((screen & edge) >>> 8 | (screen & edge) << 8) & 0xffff;
      mask |= edge;
    }
    // Now iterate over available screens to find matches.
    for (const [screen, spec] of this.screens) {
      if (spec.fixed) continue;
      if ((screen & mask) === constraint &&
          (!maxExits || Scr.numExits(screen) <= maxExits)) {
        yield screen;
      }
    }
  }

  /**
   * Finds all screens that can be extended with an extra exit.
   * Returns an array of quads.
   */
  * extensions(): IterableIterator<[Pos, Scr, Dir, number]> {
    const uf = new UnionFind<Pos>();
    const extensions: Array<[Pos, Scr, Dir, number]> = [];
    for (const pos of this.allPos) {
      const scr = this.map[pos];
      if (scr == null) {
        // Empty: build up the unionfind.
        for (const neighbor of [pos - 1, pos - 16] as Pos[]) {
          if (this.empty(neighbor)) {
            uf.union([pos, neighbor]);
          }
        }
      } else {
        // Filled: find extensions.
        for (const [dir, ext] of this.screenExtensions.get(scr & 0xffff)) {
          // make sure there's space on that side.
          const neighbor = Pos.plus(pos, dir);
          if (this.empty(neighbor)) extensions.push([pos, ext, dir, 0]);
        }
      }
    }
    for (const ext of extensions) {
      const [pos, , dir] = ext;
      ext[3] = uf.find(Pos.plus(pos, dir)) << 4 | Scr.edge(ext[1], ext[2]);
      yield ext;
    }
  }

  fill(pos: Pos, maxExits?: number): boolean {
    const eligible = [...this.eligible(pos, maxExits)];
    if (!eligible.length) {
      console.error(`No eligible tiles for ${hex(pos)}`);
      return false;
    }
    this.set(pos, this.random.pick(eligible));
    return true;
  }

  // pos should be the last already-set tile before the new ones
  // adds N+1 screens where N is length of path
  fillPath(pos: Pos, dir: Dir, path: Path, exitType: number): boolean {
    return this.saveExcursion(() => {
      const pathSaved = [...path];
      for (const step of pathSaved) {
        const nextDir = Dir.turn(dir, step);
        pos = Pos.plus(pos, dir);
        const screen = Scr.fromExits(DirMask.of(Dir.inv(dir), nextDir), exitType);
        if (!this.trySet(pos, screen)) return false;
        dir = nextDir;
      }
      return this.fill(Pos.plus(pos, dir), 2);
    });
  }

  // * openExits(pos: Pos, screen: Scr): IterableIterator<[Dir, number]> {
  //   for (const dir of Dir.ALL) {
  //     const neighbor = Pos.plus(pos, dir);
  //     if (this.inBounds(neighbor) && this.map[neighbor] == null) {
  //       const edge = Scr.edge(screen, dir);
  //       if (edge) yield [dir, edge];
  //     }
  //   }
  // }

  // * eligibleTunnelExits(pos: Pos): IterableIterator<[Scr, Dir, number]> {
  //   for (const eligible of this.eligible(pos, 2)) {
  //     const [exit, ...rest] = this.openExits(pos, eligible);
  //     if (!exit || rest.length) continue;
  //     const [dir, edge] = exit;
  //     yield [eligible, dir, edge];
  //   }
  // }

  addDeadEnd(): boolean {
    // Find an extension point.
    // Find an accessible target.
    // Make the path one screen at a time, with a 1/3 chance of ending in a
    // dead end if one is available.
    return false;
  }

  addLoop(): boolean {
    // Find a start/end pair.
    const exts = new DefaultMap<number, Array<[Pos, Scr, Dir, number]>>(() => []);
    for (const [pos, scr, dir, part] of this.extensions()) {
      exts.get(part).push([pos, scr, dir, part & 0xf]);
    }
    // Make sure there's at least 2 extension points in the same partition.
    const partitions = [...exts.values()];
    this.random.shuffle(partitions);
    let partition;
    do {
      partition = partitions.pop();
      if (!partition) return false;
    } while (partition.length < 2);
    this.random.shuffle(partition);
    const [[pos1, scr1, dir1, exitType], [pos2, scr2, dir2]] = partition;
    return this.saveExcursion(() => {
      this.replace(pos1, scr1);
      this.replace(pos2, scr2);
      //const start = Pos.plus(pos1, dir1);
      const end = Pos.plus(pos2, dir2);
      if (Pos.plus(pos1, dir1) === end) {
        // Trivial case
        return this.fill(end, 2);
      }
      // Find clear path given exit type
      const [forward, right] = relative(pos1, dir1, end);
      let attempts = 0;
      for (const path of generatePaths(this.random, forward, right)) {
        if (this.fillPath(pos1, dir1, path, exitType)) break;
        if (++attempts > 20) return false;
      }
      // return this.fill(end, 2); // handled in fillPath
      return true;
    });
  }

  connect(pos1: Pos, dir1: Dir, pos2: Pos, dir2: Dir): boolean {
    const exitType = Scr.edge(this.map[pos1] || 0 as Scr, dir1);
    if (exitType !== Scr.edge(this.map[pos2] || 0 as Scr, dir2)) {
      throw new Error(`Incompatible exit types`);
    }
    pos2 = Pos.plus(pos2, dir2);
    const [forward, right] = relative(pos1, dir1, pos2);
    //pos1 = Pos.plus(pos1, dir1);
    let attempts = 0;
    for (const path of generatePaths(this.random, forward, right)) {
      if (this.fillPath(pos1, dir1, path, exitType)) break;
      if (++attempts > 20) return false;
    }
    // return this.fill(pos2, 2); // handled in fillPath
    return true;
  }

  fillZeros() {
    // Fill the rest with zero
    for (let i = 0; i < this.map.length; i++) {
      if (this.map[i] == null) this.map[i] = 0 as Scr;
    }
  }

  // // Assumes all 6 tunnel screens are available for each exit type.
  // makeLoop(start: Pos, startDir: Dir, end: Pos): boolean {
  //   return this.saveExcursion(() => {
  //     const [forward, right] = relative(start, startDir, end);

  //     // const vertical = (exitType << 8 | exitType) as Scr;
  //     // const horizontal = (vertical << 4) as Scr;
  //     let attempts = 0;
  //     for (const path of generatePaths(this.random, forward, right)) {
  //       if (this.fillPath(start, startDir, path, exitType)) break;
  //       if (++attempts > 20) return false;
  //       // TODO - how many tries before we give up?
  //     }
  //   });
  // }

  // // Temporarily save the state to try an experimental change.
  // push(): void {
  //   this.mapStack.push([...this.map]);
  // }

  // pop(): void {
  //   const map = this.mapStack.pop();
  //   if (!map) throw new Error(`Cannot pop without push`);
  //   this.map = map;
  // }

  inBounds(pos: Pos): boolean {
    return pos >= 0 && (pos & 0xf) < this.width && (pos >>> 4) < this.height;
  }

  density(): number {
    const count = [...this.allPos].filter(pos => this.map[pos]).length;
    return count / (this.width * this.height);
  }

  * [Symbol.iterator](): IterableIterator<[Pos, Scr]> {
    for (const pos of this.allPos) {
      const scr = this.map[pos];
      if (scr != null) yield [pos, scr];
    }
  }

  get(pos: Pos): Scr | undefined {
    if (!this.inBounds(pos)) return 0 as Scr;
    return this.map[pos];
  }

  // NOTE: it's not required that screen be an element of this.screens.
  set(pos: Pos, screen: Scr, force = false): void {
    // TODO - instead of force, consider allowing OUTSIDE EDGES to be non-zero?
    //      - maybe use the border? or a separate array?
    if (!force && !this.fitsAndEmpty(pos, screen)) {
      const prev = this.map[pos];
      const hexPrev = prev != null ? hex5(prev) : 'empty';
      throw new Error(`Cannot overwrite ${hex(pos)} (${hexPrev}) with ${hex5(screen)}`);
    }
    if (this.inBounds(pos)) this.map[pos] = screen;
  }

  trySet(pos: Pos, screen: Scr): boolean {
    if (!this.fitsAndEmpty(pos, screen)) return false;
    this.map[pos] = screen;
    return true;
  }

  replace(pos: Pos, screen: Scr): void {
    if (!this.fits(pos, screen) || !this.inBounds(pos)) {
      throw new Error(`Cannot place ${hex5(screen)} at ${hex(pos)}`);
    }
    this.map[pos] = screen;
  }

  fitsAndEmpty(pos: Pos, screen: Scr): boolean {
    return this.empty(pos) && this.fits(pos, screen);
  }

  empty(pos: Pos): boolean {
    return this.map[pos] == null && this.inBounds(pos);
  }

  fits(pos: Pos, screen: Scr): boolean {
    for (const dir of Dir.ALL) {
      const neighbor = this.get(Pos.plus(pos, dir));
      if (neighbor == null) continue; // anything is fair game
      if (Scr.edge(screen, dir) !== Scr.edge(neighbor, Dir.inv(dir))) {
        return false;
      }
    }
    return true;
  }

  traverse(): Map<number, Set<number>> {
    // Returns a map from unionfind root to a list of all reachable tiles.
    // All elements of set are keys pointing to the same value ref.
    const uf = new UnionFind<number>();
    for (const pos of this.allPos) {
      const scr = this.map[pos];
      if (scr == null) continue;
      const spec = this.screens.get(scr);
      if (spec == null) continue;
      for (const connection of spec.connections) {
        uf.union(connection.map(c => (pos << 8) + c));
      }
    }

    const map = new Map<number, Set<number>>();
    const sets = uf.sets();
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      for (const elem of set) {
        map.set(elem, set);
      }
    }

    return map;
  }

  // For now, just show broad structure.
  show(): string {
    const header = ' ' + seq(this.width).join('') + '\n';
    const body = seq(this.height, y => y.toString(16) + seq(this.width, x => {
      const pos = y << 4 | x;
      const scr = this.map[pos];
      if (scr == null) return ' ';
      const spec = this.screens.get(scr);
      if (spec) return spec.icon;
      // build it up manually
      let index = 0;
      for (const dir of Dir.ALL) {
        if (scr & (0xf << (dir << 2))) index |= (1 << (dir << 2));
      }
      return UNICODE_TILES[index] || ' ';
    }).join('')).join('\n');
    return header + body;
  }

  write(loc: Location, availableFlags: Set<number>) {
    for (const flag of loc.flags) {
      availableFlags.add(flag.flag);
    }
    loc.flags = [];
    loc.width = this.width;
    loc.height = this.height;
    for (let y = 0; y < this.height; y++) {
      loc.screens[y] = [];
      for (let x = 0; x < this.width; x++) {
        const pos = y << 4 | x;
        const scr = this.map[pos];
        if (scr == null) throw new Error(`Missing screen at pos ${hex(pos)}`);
        const spec = this.screens.get(scr);
        if (!spec) throw new Error(`Missing spec for ${hex5(scr)} at ${hex(pos)}`);
        loc.screens[y].push(spec.tile);
        if (spec.flag) loc.flags.push(Flag.of({screen: pos, flag: 0x2ef}));
        // if (spec.wall) {
        //   // pop an available flag and use that.
        //   loc.flags.push();
        // }
      }
    }
  }

  // Probably this belongs in Location, but we need the boss screen info...?
  moveMonsters(loc: Location, random: Random): void {
    // NOTE: need to use info about screens to exclude boss screens.
    const boss = new Set<number>();
    for (const s of this.screens.values()) {
      if (s.boss) boss.add(s.tile);
    }
    // Start with list of reachable tiles.
    const reachable = loc.reachableTiles(false);
    // Do a breadth-first search of all tiles to find "distance" (1-norm).
    const extended = new Map<number, number>([...reachable.keys()].map(x => [x, 0]));
    const normal = []; // reachable, not slope or water
    const moths = []; // distance ∈ 3..7
    const birds = []; // distance > 12
    const plants = []; // distance ∈ 2..4
    const normalTerrainMask = loc.hasDolphin() ? 0x25 : 0x27;
    for (const [t, distance] of extended) {
      for (const n of neighbors(t, loc.width, loc.height)) {
        if (extended.has(t)) continue;
        extended.set(n, distance + 1);
      }
      if (!distance && !(reachable.get(t)! & normalTerrainMask)) normal.push(t);
      if (distance >= 2 && distance <= 4) plants.push(t);
      if (distance >= 3 && distance <= 7) moths.push(t);
      if (distance >= 12) birds.push(t);
    }
    // We now know all the possible places to place things.
    //  - NOTE: still need to move chests to dead ends, etc?
    for (const spawn of loc.spawns) {
      if (!spawn.isMonster()) continue;
      const monster = loc.rom.objects[spawn.monsterId];
      if (!(monster instanceof Monster)) continue;
      // check for placement.

      // NOTE - boss status is now known to Location, we can move this there.
    }

  }
}

/** Spec for a screen. */
export interface Spec {
  readonly edges: Scr;
  readonly tile: number;
  readonly icon: string;
  readonly connections: Connections;
  readonly fixed: boolean;
  readonly flag: boolean;
  readonly boss: boolean;
}

type Connections = ReadonlyArray<ReadonlyArray<number>>;
type SpecFlag = 'fixed' | 'flag' | 'boss';

export function Spec(edges: number,
                     tile: number,
                     icon: string,
                     ...extra: Array<number|SpecFlag>) {
  const connections = [];
  let fixed = false;
  let flag = false;
  let boss = false;
  for (let data of extra) {
    if (typeof data === 'string') {
      if (data === 'fixed') {
        fixed = true;
      } else if (data === 'flag') {
        flag = true;
      } else if (data === 'boss') {
        boss = true;
      } else {
        assertNever(data);
      }
    } else {
      const connection: number[] = [];
      connections.push(connection);
      while (data) {
        // Each of the four edges has possible exits 1, 2, and 3,
        // represented by that corresponding tile.  The 4 bit is
        // for left/right edge and the 8 bit is for right/bottom.
        const channel = (data & 3) << (data & 4); // 01, 02, 03, 10, 20, or 30
        const offset = data & 8 ? (data & 4 ? 0x0100 : 0x1000) : 0;
        connection.push(channel | offset);
        data >>>= 4;
      }
    }
  }
  return {edges: edges as Scr, tile, icon, connections, fixed, flag, boss};
}
export namespace Spec {
  export function fixed(edges: number, tile: number, ...connections: Connections) {
    return {edges: edges as Scr, tile, connections, fixed: true};
  }
}

// function* intersect<T>(a: Iterable<T>, b: Iterable<T>): IterableIterator<T> {
//   const set = new Set(a);
//   for (const x of b) {
//     if (set.has(x)) yield x;
//   }
// }

// 0 is straight, -1 is left turn, +1 is right turn
type TunnelDirection = 0 | -1 | 1;

// Returns [forward, right]
// e.g. (p1 = 65, d1 = up, p2 = 24) then fwd = 4, rt = -1
// but we need to fill 55, 45, 35, 34, 24 - so 4 rows
function relative(p1: Pos, d1: Dir, p2: Pos): [number, number] {
  const dy = (p2 >>> 4) - (p1 >>> 4);
  const dx = (p2 & 0xf) - (p1 & 0xf);
  if (d1 === 0) return [-dy, dx];
  if (d1 === 1) return [dx, dy];
  if (d1 === 2) return [dy, -dx];
  if (d1 === 3) return [-dx, -dy];
  throw new Error(`impossible: ${d1}`);
}

function* generatePaths(random: Random,
                        forward: number,
                        right: number): IterableIterator<Path> {
  while (true) {
    yield generatePath(random, forward, right);
  }
}

function* generatePath(random: Random, forward: number, right: number): Path {
  function advance(): TunnelDirection {
    forward--;
    return 0;
  }
  function turnLeft(): TunnelDirection {
    [forward, right] = [-right, forward - 1];
    return -1;
  }
  function turnRight(): TunnelDirection {
    [forward, right] = [right, 1 - forward];
    return 1;
  }
  while (forward !== 1 || right !== 0) {
    if (forward > 0 && random.next() < 0.5) {
      yield advance();
      // extra chance of going two
      if (forward > 2 && random.next() < 0.5) yield advance();
      continue;
    }
    // 50% chance of advancing no matter what (unless target behind us)
    if (random.next() < (forward < 0 ? 0.1 : 0.5)) {
      yield advance();
      continue;
    }
    if (right > 0) {
      yield turnRight();
      continue;
    }
    if (right < 0) {
      yield turnLeft();
      continue;
    }
    yield (random.next() < 0.5 ? turnLeft() : turnRight());
  }
}

type Path = IterableIterator<TunnelDirection>;



/** A mask of directions (1 << Dir). */
type DirMask = number & {__dirmask__: never};

namespace DirMask {
  export function of(...dirs: readonly Dir[]): DirMask {
    let mask = 0;
    for (let dir of dirs) {
      mask |= (1 << dir);
    }
    return mask as DirMask;
  }
}

/** A direction: 0 = up, 1 = right, 2 = down, 3 = left. */
export type Dir = number & {__dir__: never};

export namespace Dir {
  export const ALL: readonly Dir[] = [0, 1, 2, 3] as Dir[];
  //export const REVERSE: readonly Dir[] = [3, 2, 1, 0] as Dir[];
  export const DELTA: readonly number[] = [-16, 1, 16, -1];
  export function inv(dir: Dir): Dir {
    return (dir ^ 2) as Dir;
  }
  export function edgeMask(dir: Dir): number {
    return 0xf << (dir << 2);
  }
  export function turn(dir: Dir, change: number): Dir {
    return ((dir + change) & 3) as Dir;
  }
}

/** A position on the map: y in the high nibble, x in the low. */
export type Pos = number & {__pos__: never};

export namespace Pos {
  export function plus(pos: Pos, dir: Dir): Pos {
    return (pos + Dir.DELTA[dir]) as Pos;
  }
}

/**
 * 16 (or more) bit number, in 4 nibbles, where each corresponds
 * to different screen interface types (e.g. closed, open, river,
 * etc).  The higher byte stores any additional information (e.g.
 * flag status, alternatives, etc).  Most nibbles will be 0 or 1
 * but we may use e.g. 'f' for a "fixed" screen that may not be
 * expanded, etc.  The mapping to actual screen (or screen+flag)
 * combinations is up to the caller.  We can also use this to
 * distinguish separate floors under/over a bridge (maybe make a
 * three-level setup??) - e.g. 1212 for the bridge, 1020 for stairs.
 */
export type Scr = number & {__screen__: never};

export namespace Scr {
  export function edge(screen: Scr, dir: Dir): number {
    return (screen >>> (dir << 2)) & 0xf;
  }
  export function numExits(screen: Scr): number {
    let count = 0;
    for (let i = 0; i < 4; i++) {
      if (screen & 0xf) count++;
      screen = (screen >>> 4) as Scr;
    }
    return count;
  }
  export function fromExits(dirMask: DirMask, exitType: number): Scr {
    let screen = 0;
    for (let i = 0; i < 4; i++) {
      screen <<= 4;
      if (dirMask & 8) screen |= exitType;
      dirMask = ((dirMask & 7) << 1) as DirMask;
    }
    return screen as Scr;
  }
}

const UNICODE_TILES: {[exits: number]: string} = {
  0x1010: '\u2500',
  0x0101: '\u2502',
  0x0110: '\u250c',
  0x1100: '\u2510',
  0x0011: '\u2514',
  0x1001: '\u2518',
  0x0111: '\u251c',
  0x1101: '\u2524',
  0x1110: '\u252c',
  0x1011: '\u2534',
  0x1111: '\u253c',
  0x1000: '\u2574',
  0x0001: '\u2575',
  0x0010: '\u2576',
  0x0100: '\u2577',
};

function neighbors(tile: number, width: number, height: number): number[] {
  const out = [];
  const y = tile & 0xf0f0;
  const x = tile & 0x0f0f;
  if (y < ((height - 1) << 12 | 0xe0)) {
    out.push((tile & 0xf0) === 0xe0 ? tile + 32 : tile + 16);
  }
  if (y) {
    out.push((tile & 0xf0) === 0x00 ? tile - 32 : tile - 16);
  }
  if (x < ((width - 1) << 8 | 0x0f)) {
    out.push(tile + 1);
  }
  if (x) {
    out.push(tile - 1);
  }
  return out;
}
