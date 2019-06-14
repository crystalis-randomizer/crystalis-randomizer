import {Check, Condition, MutableRequirement, Requirement, Slot, Terrain} from './condition.js';
import {TileId, TilePair} from './geometry.js';
import {Routes} from './routes.js';
import {Bits} from '../bits.js';
import {DefaultMap} from '../util.js';

const {} = {Check, TilePair, Bits} as any;

// Specifies a location list.
// Helps to build it up incrementally.

export class LocationListBuilder {

  readonly routes = new Routes();
  private readonly reqs = new BiMap<Condition>();
  private readonly slots = new BiMap<Slot>();

  private readonly out = new DefaultMap<Slot, MutableRequirement>(() => new MutableRequirement());

  // TODO - instead of storing terrains, change them all to Req ???
  //      - compress first?!?

  // NOTE - should probabbly just copy SparseGraph and use it
  //      ==> self-consistent, minimal work?
  //          addRoute should just move the destination to the end of the queue
  //          with an updated list of source tiles => breadth first

  constructor(private readonly terrains: Map<TileId, Terrain>) {}

  // addTerrain(tile: TileId, terrain: Terrain): void {
  //   this.terrains.set(index, terrain);
  //   this.addRequirement(terrain.exit || []);
  //   this.addRequirement(terrain.exitSouth || []);
  //   this.addRequirement(terrain.enter || []);
  // }

  addEdge(from: TileId, to: TileId, south: boolean): void {
    // all terrains added, so can connect.
    const f = this.terrains.get(from);
    const t = this.terrains.get(to);
    if (!f || !t) throw new Error(`missing terrain ${f ? to : from}`);
    for (const exit of (south ? f.exitSouth : f.exit) || [[]]) {
      for (const entrance of t.enter || [[]]) {
        this.routes.addEdge(to, from, [...entrance, ...exit]);
      }
    }
  }

  addRequirement(req: Requirement): void {
    for (const opt of req) {
      for (const cond of opt) {
        this.reqs.add(cond);
      }
    }
  }

  // must be called AFTER all calls to addEdge?
  addSlot(slot: Slot, tile: TileId, route: readonly Condition[]) {
    this.slots.add(slot);
    const slotRoute = this.out.get(slot);
    for (const r of this.routes.routes.get(tile)) {
      const deps = new Set([...r, ...route].sort());
      const label = [...deps].join(' ');
      slotRoute.add(label, deps);
    }
  }

  build(): LocationList {
    // process the bimaps to translate everything down to a compact format?
    return new LocationList();
  }
}


interface Compression<T> {
  readonly size: number;
  get(index: number): T;
  name(index: number): string;
  index(item: T): number;
}

// TODO - two-way? need to get "unused"
type Fill = ReadonlyArray<number|undefined>;



export class LocationList {
  

}


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
