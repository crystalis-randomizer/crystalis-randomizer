import {Random} from '../random.js';

// 0 is straight, -1 is left turn, +1 is right turn
export type Turn = 0 | -1 | 1;

export type Path = IterableIterator<Turn>;
export namespace Path {
  export function* generate(random: Random, forward: number, right: number):
                   IterableIterator<Path> {
    while (true) {
      yield generatePath(random, forward, right);
    }
  }
}

function* generatePath(random: Random, forward: number, right: number): Path {
  function advance(): Turn {
    forward--;
    return 0;
  }
  function turnLeft(): Turn {
    [forward, right] = [-right, forward - 1];
    return -1;
  }
  function turnRight(): Turn {
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


/** A mask of directions (1 << Dir). */
export type DirMask = number & {__dirmask__: never};

export namespace DirMask {
  export function of(...dirs: readonly Dir[]): DirMask {
    let mask = 0;
    for (let dir of dirs) {
      mask |= (1 << dir);
    }
    return mask as DirMask;
  }
}

// TODO - invert the rotation direction!  =>  1 = left, 3 = right
// This will be consistent with how we do routes, and is easier to
// work with because dir&2 corresponds to 0/max and dir&1 is h/v

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
  export function shift(dir: Dir): number {
    return dir << 2;
  }
  export function turn(dir: Dir, change: number): Dir {
    return ((dir + change) & 3) as Dir;
  }
  export function* allEdge(dir: Dir,
                           height: number,
                           width: number): IterableIterator<Pos> {
    const extent = dir ? height << 4 : width;
    const incr = dir & 1 ? 16 : 1;
    const start =
        dir === RIGHT ? width - 1 : dir === DOWN ? (height - 1) << 4 : 0;
    for (let i = start; i < extent; i += incr) {
      yield i as Pos;
    }
  }
  export const UP = 0 as Dir;
  export const RIGHT = 1 as Dir;
  export const DOWN = 2 as Dir;
  export const LEFT = 3 as Dir;
}

/** A position on the map: y in the high nibble, x in the low. */
export type Pos = number & {__pos__: never};

export namespace Pos {
  export function plus(pos: Pos, dir: Dir): Pos {
    return (pos + Dir.DELTA[dir]) as Pos;
  }

  // Returns [forward, right]
  // e.g. (p1 = 65, d1 = up, p2 = 24) then fwd = 4, rt = -1
  // but we need to fill 55, 45, 35, 34, 24 - so 4 rows
  export function relative(p1: Pos, d1: Dir, p2: Pos): [number, number] {
    const dy = (p2 >>> 4) - (p1 >>> 4);
    const dx = (p2 & 0xf) - (p1 & 0xf);
    if (d1 === 0) return [-dy, dx];
    if (d1 === 1) return [dx, dy];
    if (d1 === 2) return [dy, -dx];
    if (d1 === 3) return [-dx, -dy];
    throw new Error(`impossible: ${d1}`);
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
