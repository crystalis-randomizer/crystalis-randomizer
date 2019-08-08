import {hex, hex5, seq} from "../rom/util";
import { Random } from "../random";

export class Maze {

  private map: Array<Screen|undefined>;
  //private mapStack: Array<Array<Screen|undefined>> = [];

  private screens: Set<Screen>;

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

  fill(pos: Pos, maxExits?: number): boolean {
    const eligible = [...this.eligible(pos, maxExits)];
    if (!eligible.length) {
      console.error(`No eligible tiles for ${hex(pos)}`);
      return false;
    }
    this.set(pos, this.random.pick(eligible));
    return true;
  }

  * openExits(pos: Pos, screen: Screen): IterableIterator<[Dir, number]> {
    for (const dir of Dir.ALL) {
      const neighbor = Pos.plus(pos, dir);
      if (this.inBounds(neighbor) && this.map[neighbor] == null) {
        const edge = Screen.edge(screen, dir);
        if (edge) yield [dir, edge];
      }
    }
  }

  * eligibleTunnelExits(pos: Pos): IterableIterator<[Screen, Dir, number]> {
    for (const eligible of this.eligible(pos, 2)) {
      const [exit, ...rest] = this.openExits(pos, eligible);
      if (!exit || rest.length) continue;
      const [dir, edge] = exit;
      yield [eligible, dir, edge];
    }
  }

  // Assumes all 6 tunnel screens are available for each exit type.
  makePath(start: Pos, end: Pos): boolean {
    return this.saveExcursion(() => {
      // Trivial case.
      if (start === end) return this.fill(start, 2);

      // Find a clear path.  Start and End should both be constrained but empty.
      // Picks a single edge type and sticks with it.
      const startEligible = [...this.eligibleTunnelExits(start)];
      const endEligible = [...this.eligibleTunnelExits(end)];
      // Figure out what the new exit types are for each.

      const exitType = this.random.pick([...intersect(startEligible.map(x => x[2]),
                                                      endEligible.map(x => x[2]))]);
      const startExit = this.random.pick(startEligible.filter(x => x[2] === exitType));
      const endExit = this.random.pick(endEligible.filter(x => x[2] === exitType));
      this.set(start, startExit[0]);
      this.set(end, endExit[0]);

      // Now we have a pair of (Pos, Dir) for either side.
      // We need to snake out a path between them that does
      // not intersect any other tiles.

      // Two cases: (1) are directions (anti)parallel or (2) perpendicular?
      // Each case has two subcases:
      // (1a) parallel: two turns, same direction, at some point beyond farthest
      // (1b) antiparallel: S-turn, require facing each other
      // (2a) ray intersection in front of both: straight, allow dimple
      // (2b) rays intersect on or behind one: need three same turns

      const startDir = startExit[1];
      const endDir = endExit[1];
      const vertical = (exitType << 8 | exitType) as Screen;
      const horizontal = (vertical << 4) as Screen;
      if (startDir == endDir) { // parallel
        const paths = []; // consider options?!?
        const startCoord = this.coord(start, endDir);
        const endCoord = this.coord(end, endDir);
        const near = Math.min(startCoord, endCoord);
        const far = Math.max(startCoord, endCoord);
        const space = endDir & 1 ? this.width : this.height;
        const extendStraight = endDir & 1 ? horizontal : vertical;
        while (this.coord(start, endDir) < this.coord(end, endDir)) {
          start = Pos.plus(start, endDir);
          this.set(start, extendStraight);
        }
        for (let extent = near + 1; extent <= far; extent++) {

          // TODO - consider a PathBuilder that has a position and
          // a target and can take detours if necessary?
          //   - internal methods like clearAhead(), turnLeft(), etc?

          // Maybe build up a list of possible paths (for all 4 cases?)
          //   - shuffle and test each against the map...


          // find eligible rows? select longer ones sometimes?

        }

      }

      for (const eligible of startEligible) {
        const exitType = this.openExitType(start, eligible);
        startEligibleExits = 
      }


      if (!this.fill(start, 2)) return false;
      if (start === end) return true;
      if (!this.fill(end, 2)) return false;
      // Now look for the single open edge on each, see what direction they go.
      

    });
  }

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

  replace(pos: Pos, screen: Screen): void {
    if (!this.fits(pos, screen)) {
      throw new Error(`Cannot place ${hex5(screen)} at ${hex(pos)}`);
    }
  }

  fitsAndEmpty(pos: Pos, screen: Screen): boolean {
    return this.map[pos] == null && this.fits(pos, screen);
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

function* intersect<T>(a: Iterable<T>, b: Iterable<T>): IterableIterator<T> {
  const set = new Set(a);
  for (const x of b) {
    if (set.has(x)) yield x;
  }
}

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

function* paths(p1: Pos, d1: Dir,
                p2: Pos, d2: Dir,
                w: number, h: number): IterableIterator<TunnelDirection> {
  if (d1 === d2) {
    // Parallel.
    let [forward, right] = relative(p1, d1, p2);
    let [max] = relative(p1, d1, (h << 4 | w) as Pos);
    if (max < 0) [max] = relative(p1, d1, 0 as Pos);

    // Go from forward to max, but also consider detours?
    //  -- dynamic programming?!?

  }

}

function* generatePaths(random: Random,
                        foward: number,
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
 * combinations is up to the caller.
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
}
