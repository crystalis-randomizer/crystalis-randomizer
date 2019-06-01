import {TileId, TilePair} from './geometry.js';
import {Condition, Requirement, Terrain, Trigger} from './condition.js';
import {Bits} from '../bits.js';

// Specifies a location list.
// Helps to build it up incrementally.

export class LocationListBuilder {

  private locations = new BiMap<TileId>();
  private reqs = new BiMap<Condition>();
  private slots = new BiMap<Condition>();

  // TODO - instead of storing terrains, change them all to Req ???
  //      - compress first?!?

  // NOTE - should probabbly just copy SparseGraph and use it
  //      ==> self-consistent, minimal work?
  //          addRoute should just move the destination to the end of the queue
  //          with an updated list of source tiles => breadth first

  private terrains = new Array<Terrain>();
  private exits = new Array<Map<number, boolean>>();

  private changed = new Set<number>();
  private routes: Bits[][] = [];
  private queue = new Set<number>();

  constructor() {}

  addTerrain(tile: TileId, terrain: Terrain): void {
    const index = this.locations.add(tile);
    this.terrains[index] = terrain;
    this.addRequirement(terrain.exit || []);
    this.addRequirement(terrain.exitSouth || []);
    this.addRequirement(terrain.enter || []);
  }

  addEdge(from: TileId, to: TileId, south: boolean): void {
    const fromIndex = this.locations.add(from);
    const toIndex = this.locations.add(to);
    this.exits[fromIndex] || (this.exits[fromIndex] = new Map()).set(toIndex, south);
  }

  addRequirement(req: Requirement): void {
    for (const opt of req) {
      for (const cond of opt) {
        this.reqs.add(cond);
      }
    }
  }

  build(): LocationList {
    return new LocationList();
  }
}

interface GeneralReq {
  values(): IterableIterator<Iterable<Condition>>;
}

class Req extends Map<string, Set<Condition>> implements GeneralReq {

  add(...others: ReadonlyArray<GeneralReq>): boolean {
    // add the ANDs of a bunch of other reqs in-place
    // return true if this has changed

    // 1. build cross product of all others
    let all: Condition[][] = [[]];
    for (const other of others) {
      const newAll = [];
      for (const req of other.values()) {
        for (const current of all) {
          newAll.push([...req, ...current]);
        }
        all = newAll;
      }
    }

    // 2. collapse 'all' into a map
    const map = new Map<string, Set<Condition>>();
    for (let conds of all) {
      conds = [...new Set(conds)].sort();
      const label = conds.join(' ');
      map.set(label, new Set(conds));      
    }

    // 2. merge it into this
    let changed = false;
    OUTER:
    for (const [newLabel, conds] of map) {
      for (const [label, has] of this) {
        if (containsAll(conds, has)) {
          continue OUTER;
        } else if (containsAll(has, conds)) {
          this.delete(label);
          changed = true; // probably redundant
        }
      }
      this.set(newLabel, conds);
      changed = true;
    }

    return changed;
  }

}


function containsAll<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size < right.size) return false;
  for (const d of right) {
    if (!left.has(d)) return false;
  }
  return true;
};


class LocationList {}


class BiMap<T> {
  private forward: T[] = [];
  private reverse = new Map<T, number>();

  add(elem: T): number {
    let result = this.reverse.get(elem);
    if (!result) this.reverse.set(elem, result = this.forward.push(elem) - 1);
    return result;
  }

  get(index: number): T {
    return this.forward[index];
  }
}
