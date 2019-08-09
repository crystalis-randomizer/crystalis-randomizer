import {hex, hex5, seq} from "../rom/util";
import { Random } from "../random";
import { DefaultMap } from "../util";
import { UnionFind } from "../unionfind";

export class Maze {

  private map: Array<Screen|undefined>;
  //private mapStack: Array<Array<Screen|undefined>> = [];

  private screens: Set<Screen>;
  private screenExtensions: DefaultMap<number, ReadonlyArray<readonly [Dir, Screen]>>;

  private allPos: Set<Pos>;

  constructor(private readonly random: Random,
              readonly height: number,
              readonly width: number,
              screens: readonly number[]) {
    this.map = new Array(height << 4).fill(undefined);
    this.screens = new Set(screens as Screen[]);
    this.allPos = new Set(
        ([] as Pos[]).concat(
            ...seq(height, y => seq(width, x => (y << 4 | x) as Pos))));

    const extensions = new DefaultMap<number, Array<[Dir, Screen]>>(() => []);
    for (const screen of this.screens) {
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

  * eligible(pos: Pos, maxExits?: number): IterableIterator<Screen> {
    // Build up the constraint.
    let mask = 0;
    let constraint = 0;
    for (const dir of Dir.ALL) {
      const screen = this.get(Pos.plus(pos, dir));
      if (screen == null) continue;
      const edge = Dir.edgeMask(dir);
      constraint |= (screen & edge);
      mask |= edge;
    }
    // Now iterate over available screens to find matches.
    for (const screen of this.screens) {
      if ((screen & mask) === constraint &&
          (!maxExits || Screen.numExits(screen) <= maxExits)) {
        yield screen;
      }
    }
  }

  /**
   * Finds all screens that can be extended with an extra exit.
   * Returns an array of quads.
   */
  * extensions(): IterableIterator<[Pos, Screen, Dir, number]> {
    const uf = new UnionFind<Pos>();
    const extensions: Array<[Pos, Screen, Dir, number]> = [];
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
      ext[3] = uf.find(Pos.plus(pos, dir)) << 4 | Screen.edge(ext[1], ext[2]);
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

  fillPath(pos: Pos, dir: Dir, path: Path, exitType: number): boolean {
    return this.saveExcursion(() => {
      for (const step of path) {
        pos = Pos.plus(pos, dir);
        const nextDir = Dir.turn(dir, step);
        const screen = Screen.fromExits(DirMask.of(Dir.inv(dir), nextDir), exitType);
        if (!this.trySet(pos, screen)) return false;
        dir = nextDir;
      }
      return this.fill(Pos.plus(pos, dir), 2);
    });
  }

  // * openExits(pos: Pos, screen: Screen): IterableIterator<[Dir, number]> {
  //   for (const dir of Dir.ALL) {
  //     const neighbor = Pos.plus(pos, dir);
  //     if (this.inBounds(neighbor) && this.map[neighbor] == null) {
  //       const edge = Screen.edge(screen, dir);
  //       if (edge) yield [dir, edge];
  //     }
  //   }
  // }

  // * eligibleTunnelExits(pos: Pos): IterableIterator<[Screen, Dir, number]> {
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
    const exts = new DefaultMap<number, Array<[Pos, Screen, Dir, number]>>(() => []);
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
      const start = Pos.plus(pos1, dir1);
      const end = Pos.plus(pos2, dir2);
      if (start === end) {
        // Trivial case
        return this.fill(end, 2);
      }
      // Find clear path given exit type
      const [forward, right] = relative(start, dir1, end);
      let attempts = 0;
      for (const path of generatePaths(this.random, forward, right)) {
        if (this.fillPath(start, dir1, path, exitType)) break;
        if (++attempts > 20) return false;
      }
      return this.fill(end, 2);
    });
  }

  // // Assumes all 6 tunnel screens are available for each exit type.
  // makeLoop(start: Pos, startDir: Dir, end: Pos): boolean {
  //   return this.saveExcursion(() => {
  //     const [forward, right] = relative(start, startDir, end);

  //     // const vertical = (exitType << 8 | exitType) as Screen;
  //     // const horizontal = (vertical << 4) as Screen;
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

  get(pos: Pos): Screen | undefined {
    if (!this.inBounds(pos)) return 0 as Screen;
    return this.map[pos];
  }

  // NOTE: it's not required that screen be an element of this.screens.
  set(pos: Pos, screen: Screen): void {
    if (!this.fitsAndEmpty(pos, screen)) {
      const prev = this.map[pos];
      throw new Error(`Cannot overwrite ${hex(pos)} (${
                       prev != null ? hex5(prev) : 'empty'}) with ${
                       hex5(screen)}`);
    }
    this.map[pos] = screen;
  }

  trySet(pos: Pos, screen: Screen): boolean {
    if (!this.fitsAndEmpty(pos, screen)) return false;
    this.map[pos] = screen;
    return true;
  }

  replace(pos: Pos, screen: Screen): void {
    if (!this.fits(pos, screen)) {
      throw new Error(`Cannot place ${hex5(screen)} at ${hex(pos)}`);
    }
  }

  fitsAndEmpty(pos: Pos, screen: Screen): boolean {
    return this.empty(pos) && this.fits(pos, screen);
  }

  empty(pos: Pos): boolean {
    return this.map[pos] == null && this.inBounds(pos);
  }

  fits(pos: Pos, screen: Screen): boolean {
    for (const dir of Dir.ALL) {
      const neighbor = this.get(Pos.plus(pos, dir));
      if (neighbor == null) continue; // anything is fair game
      if (Screen.edge(screen, dir) !== Screen.edge(neighbor, Dir.inv(dir))) {
        return false;
      }
    }
    return true;
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
    if (forward < 0 && random.next() < 0.05) {
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
type Dir = number & {__dir__: never};

namespace Dir {
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
type Pos = number & {__pos__: never};

namespace Pos {
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
type Screen = number & {__screen__: never};

namespace Screen {
  export function edge(screen: Screen, dir: Dir): number {
    return (screen >>> (dir << 2)) & 0xf;
  }
  export function numExits(screen: Screen): number {
    let count = 0;
    for (let i = 0; i < 4; i++) {
      if (screen & 0xf) count++;
      screen = (screen >>> 4) as Screen;
    }
    return count;
  }
  export function fromExits(dirMask: DirMask, exitType: number): Screen {
    let screen = 0;
    for (let i = 0; i < 4; i++) {
      screen <<= 4;
      if (dirMask & 8) screen |= exitType;
      dirMask = ((dirMask & 7) << 1) as DirMask;
    }
    return screen as Screen;
  }
}
