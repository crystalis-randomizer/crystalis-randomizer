import {Location} from '../rom/location.js';
import {UnionFind} from '../unionfind.js';
import {iters} from '../util.js';

// Implemented by Entrance, Exit, Spawn, etc...
interface Coordinate {
  x: number;
  y: number;
}

// 24-bit unique ID for a single tile:
//   LLLLLLLL YYYYXXXX yyyyxxxx
// where L is 8-bit location ID, (Y, X) is screen, and (y, x) is tile.
export type TileId = number & {__tileId__: never};
export function TileId(x: number): TileId { return x as TileId; }
export namespace TileId {
  export function from({id}: Location, {x, y}: Coordinate): TileId {
    const xs = x >>> 8;
    const xt = (x >>> 4) & 0xf;
    const ys = y >>> 8;
    const yt = (y >>> 4) & 0xf;
    return (id << 16 | ys << 12 | xs << 8 | yt << 4 | xt) as TileId;
  }
  export function add(tile: TileId, dy: number, dx: number): TileId {
    let t: number = tile;
    if (dy) {
      let y = (t & 0xf0) + (dy << 4);
      while (y >= 0xf0) {
        if ((t & 0xf000) >= 0xf000) return -1 as TileId;
        y -= 0xf0;
        t += 0x1000;
      }
      while (y < 0) {
        if (!(t & 0xf000)) return -1 as TileId;
        y += 0xf0
        t -= 0x1000;
      }
      t = t & ~0xf0 | y;
    }
    if (dx) {
      let x = (t & 0xf) + dx;
      while (x >= 0x10) {
        if ((t & 0xf00) >= 0x700) return -1 as TileId;
        x -= 0x10;
        t += 0x100;
      }
      while (x < 0) {
        if (!(t & 0xf00)) return -1 as TileId;
        x += 0x10
        t -= 0x100;
      }
      t = t & ~0xf | x;
    }
    return t as TileId;
  }
}

// 16-bit unique ID for a single screen:
//   LLLLLLLL YYYYXXXX
// where L is 8-bit location ID, (Y, X) is screen.
export type ScreenId = number & {__screenId__: never};
export function ScreenId(x: number): ScreenId { return x as ScreenId; }
export namespace ScreenId {
  export const from: {(tile: TileId): ScreenId;
                      (loc: Location, coordin: Coordinate): ScreenId} =
    (tileOrLoc: TileId | Location, coord?: Coordinate): ScreenId => {
      if (typeof tileOrLoc === 'number' || !coord) {
        return (Number(tileOrLoc) >>> 8) as ScreenId;
      }
      const loc = tileOrLoc as Location;
      return (loc.id << 8 | (coord.y >>> 8) << 4 | coord.x >>> 8) as ScreenId;
    };
  export function fromTile(tile: TileId): ScreenId {
    return (tile >>> 8) as ScreenId;
  }
}

// 48-bit connection between two tiles.
export type TilePair = number & {__tilePair__: never};
export function TilePair(x: number): TilePair { return x as TilePair; }
export namespace TilePair {
  export function of(from: TileId, to: TileId): TilePair {
    return (from * (1 << 24) + to) as TilePair;
  }
  export function split(pair: TilePair): [TileId, TileId] {
    return [Math.floor(pair / (1 << 24)) as TileId,
            pair % (1 << 24) as TileId];
  }
}

export class Neighbors {
  // high 24 = from, low 24 = to
  private readonly south = new Set<TilePair>();
  private readonly other = new Set<TilePair>();
  constructor(private readonly tiles: UnionFind<TileId>, private readonly exits: Set<TileId>) {}

  // NOTE: lo < hi is required, so that lo->hi is south if vertical
  addAdjacent(lo: TileId, hi: TileId, vertical: boolean): void {
    const lo1 = this.tiles.find(lo);
    const hi1 = this.tiles.find(hi);
    if (!this.exits.has(hi)) {
      this.other.add(TilePair.of(hi1, lo1));
    }
    if (!this.exits.has(lo)) {
      (vertical ? this.south : this.other).add(TilePair.of(lo1, hi1));
    }
  }

  addExit(from: TileId, to: TileId): void {
    from = this.tiles.find(from);
    to = this.tiles.find(to);
    this.other.add(TilePair.of(from, to));
  }

  * [Symbol.iterator](): IterableIterator<{from: TileId, to: TileId, south: boolean}> {
    const seen = new Set();
    let south = true;
    for (const exit of iters.concat(this.south, [-1 as TilePair], this.other)) {
      if (exit === -1) {
        south = false;
        continue;
      }
      let [from, to] = TilePair.split(exit);
      from = this.tiles.find(from);
      to = this.tiles.find(to);
      const normalized = TilePair.of(from, to);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      yield {from, to, south};
    }
  }
}

// Flag, item, or condition.
export type Condition = number & {__condition__: never};
export namespace Condition {
  export const OPEN: Requirement = [[]];
}

export function and(...cs: (readonly [readonly Condition[]])[]): Requirement {
  // TODO - this was a destructuring function ([c]) => c but Closure is destroying
  // it into (c) => [c] = c.
  //return [([] as Condition[]).concat(...cs.map(([c]) => c))];
  return [([] as Condition[]).concat(...cs.map((c) => c[0]))];
}
export function or(...cs: Requirement[]): Requirement {
  return ([] as Requirement).concat(...cs);
}

export function meet(left: Requirement, right: Requirement): Requirement {
  const out = new MutableRequirement();
  for (const ls of left) {
    for (const rs of right) {
      out.addList([...ls, ...rs]);
    }
  }
  return out.freeze();
}

// An immutable DNF expression.  All exported constants are in this form.
export type Requirement = readonly (readonly Condition[])[];

// Slot for an item or flag to get.  Almost the same thing as a single
// condition, but used in different contexts.
export type Slot = number & {__slot__: never};

export function Slot(x: number | readonly [readonly [Condition]]): Slot {
  if (typeof x === 'number') return x as Slot;
  return x[0][0] as any;
}
export namespace Slot {
  export function item(x: number): Slot {
    return (x | 0x200) as Slot;
  }
  // export function boss(x: number): Slot {
  //   return (~(x | 0x100)) as Slot;
  // }
}


// Metadata about getting slots.
export interface Check {
  condition?: Requirement;
  slot: Slot;
}
// export namespace Check {
//   export function chest(id: number): Check {
//     return {slot: Slot(0x200 | id)};
//   }
// }

// alias for use in Terrain.meet
const meetReq = meet;

// Class for keeping track of a disjunctive normal form expression
export class MutableRequirement {
  private readonly map = new Map<string, Set<Condition>>();

  [Symbol.iterator](): Iterator<Iterable<Condition>> {
    return this.map.values();
  }

  add(newLabel: string, newDeps: Set<Condition>): boolean {
    for (const c of newDeps) if (Array.isArray(c)) throw new Error();

    if (this.map.has(newLabel)) return false;
    for (const [curLabel, curDeps] of this.map) {
      if (containsAll(newDeps, curDeps)) return false;
      if (containsAll(curDeps, newDeps)) this.map.delete(curLabel);
    }
    this.map.set(newLabel, newDeps);
    return true;
  }

  addAll(requirement: Requirement): void {
    for (const conditions of requirement) {
      this.addList(conditions);
    }
  }

  addList(conditions: readonly Condition[]): void {
    const sorted = [...new Set(conditions)].sort();
    const deps = new Set(sorted);
    this.add(sorted.join(' '), deps);
  }

  /** Appends the given requirement to all routes. */
  restrict(r: Requirement): void {
    const l = [...this.map.values()];
    this.map.clear();
    for (const ls of l) {
      for (const rs of r) {
        this.addList([...ls, ...rs]);
      }
    }
  }

  freeze(): Requirement {
    return [...this].map(cs => [...cs]);
  }
}

function containsAll<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size < right.size) return false;
  for (const d of right) {
    if (!left.has(d)) return false;
  }
  return true;
}


export interface Terrain {
  // Requirement to enter tile, defaults to OPEN
  enter?: Requirement;
  // Requirement to exit any direction other than south
  exit?: Requirement;
  // Requirement to exit south
  exitSouth?: Requirement;
}

export namespace Terrain {
  // Positive numbers represent flags, items, etc.
  // // Negative numbers represent composite conditions.
  // export const CROSS_RIVERS = -1;
  // export const CROSS_SEA = -2;

  // TODO - how to handle dolphin?!?
  //   -- it's possible we could hard-code that anything connected
  //      to angry sea is enterable w/ dolphin as well?
  //   -- requires land bridge in underground channel...
  //      - could also just use summon points?
  // What about flags over water - not impassable? shouldn't matter?

  /** Makes a single extra copy of a terrain for seamless exits. */
  // Seamless exits: same effect as OPEN but a different object so it
  // doesn't get unioned together.  This way we can distinguish the
  // exits clearly.
  export const seamless = memoize((t: Terrain): Terrain => ({...t}));

  // export function flag(id: number, flight?: boolean) {
  //   return {enter: flight ? [[id], [~0x248]] : [[id]]};
  // }

  export function meet(left: Terrain, right: Terrain): Terrain {
    const out: Terrain = {};
    if (left.enter || right.enter) {
      out.enter = meetReq(left.enter || [[]], right.enter || [[]]);
    }
    if (left.exit || right.exit) {
      out.exit = meetReq(left.exit || [[]], right.exit || [[]]);
    }
    if (left.exitSouth || right.exitSouth) {
      out.exitSouth = meetReq(left.exitSouth || [[]], right.exitSouth || [[]]);
    }
    return out;
  }

  export function join(left: Terrain, right: Terrain): Terrain {
    const out: Terrain = {};
    if (left.enter || right.enter) {
      out.enter = (left.enter || [[]]).concat(right.enter || [[]]);
    }
    if (left.exit || right.exit) {
      out.exit = (left.exit || [[]]).concat(right.exit || [[]]);
    }
    if (left.exitSouth || right.exitSouth) {
      out.exitSouth = (left.exitSouth || [[]]).concat(right.exitSouth || [[]]);
    }
    return out;
  }

  export function flag(id: number) {
    return {enter: Condition(id)};
  }
}

export function memoize<T extends object, U>(f: (x: T) => U): (x: T) => U {
  const map = new WeakMap<T, U>();
  const undef = {} as U;
  return (x: T): U => {
    let y = map.get(x);
    if (y === undefined) {
      y = f(x);
      map.set(x, y === undefined ? undef : y);
    } else if (y === undef) {
      y = undefined;
    }
    return y as U;
  };
}

export function memoize2<T extends object, U extends object, V>(
    f: (x: T, y: U) => V): (x: T, y: U) => V {
  const map = new WeakMap<T, WeakMap<U, V>>();
  const undef: V = {} as V;
  return (x: T, y: U): V => {
    let ys = map.get(x);
    if (ys == undefined) map.set(x, ys = new WeakMap());
    let z = ys.get(y);
    if (z === undefined) {
      z = f(x, y);
      ys.set(y, z === undefined ? undef : z);
    } else if (z === undef) {
      z = undefined;
    }
    return z as V;
  };
}

export enum WallType {
  WIND = 0,
  FIRE = 1,
  WATER = 2,
  THUNDER = 3,
}


// Static map of terrains.
export const TERRAINS: Array<Terrain | undefined> = (() => {
  const out = [];
  for (let effects = 0; effects < 256; effects++) {
    out[effects] = terrain(effects);
  }
  // console.log('TERRAINS', out);
  return out;

  /**
   * @param effects The $26 bits of tileeffects, plus $08 for swamp, $10 for dolphin,
   * $01 for shooting statues, $40 for short slope
   * @return undefined if the terrain is impassable.
   */
  function terrain(effects: number): Terrain | undefined {
    if (effects & 0x04) return undefined; // impassible
    const terrain: Terrain = {};
    if ((effects & 0x12) === 0x12) { // dolphin or fly
      if (effects & 0x20) terrain.exit = Capability.CLIMB_WATERFALL;
      terrain.enter = or(Event.RIDE_DOLPHIN, Magic.FLIGHT);
    } else {
      if (effects & 0x40) { // short slope
        terrain.exit = Capability.CLIMB_SLOPE;
      } else if (effects & 0x20) { // slope
        terrain.exit = Magic.FLIGHT;
      }
      if (effects & 0x02) terrain.enter = Magic.FLIGHT; // no-walk
    }
    if (effects & 0x08) { // swamp
      terrain.enter = (terrain.enter || [[]]).map(cs => Capability.TRAVEL_SWAMP[0].concat(cs));
    }
    if (effects & 0x01) { // shooting statues
      terrain.enter = (terrain.enter || [[]]).map(cs => Capability.SHOOTING_STATUE[0].concat(cs));
    }
    return terrain;
  }
})();
