import {Rom} from '../rom.js';
import {Metascreen} from './metascreen.js';
import {TileEffects} from './tileeffects.js';
import {Tileset} from './tileset.js';
import {DefaultMap, iters} from '../util.js';
import { Metatile } from './metatile.js';

// NOTE: Must be initialized BEFORE Metascreens
export class Metatilesets implements Iterable<Metatileset> {

  private _all: Metatileset[] = [];

  readonly grass = this.tileset(0x80, {
    patterns: [0x00, 0x0c],
  });

  readonly town = this.tileset(0x84, {});

  // supports water, but has ugly wall
  readonly cave = this.tileset(0x88, {});

  readonly dolphinCave = this.tileset(0x88, {});

  readonly pyramid = this.tileset(0x8c, {});

  readonly river = this.tileset(0x90, {
    animated: [0, 1],
    patterns: [0x14, 0x00], // TODO - animated clobbers 2nd entry anyway
  });

  readonly sea = this.tileset(0x94, {}); // primarily tiles 80..ff

  // parts with "features": arches and houses
  readonly mountain = this.tileset(0x94, {}); // primarily tiles 0..5f

  // NOTE: free space from 90..ff
  readonly shrine = this.tileset(0x98, {});

  readonly desert = this.tileset(0x9c, {}); // primarily tiles 50..ff

  // trades features for crossable river
  readonly mountainRiver = this.tileset(0x9c, {}); // primarily tiles 00..4f

  readonly swamp = this.tileset(0xa0, {
    consolidated: true,
  }); // tiles a0..ff

  readonly house = this.tileset(0xa0, {}); // tiles 00..9f

  readonly fortress = this.tileset(0xa4, {});

  // variant of the fortress metatileset, but makes use of the parapets
  readonly labyrinth = this.tileset(0xa4, {});

  // same as 88, but trades rivers for prettier ice wall
  readonly iceCave = this.tileset(0xa8, {});

  readonly tower = this.tileset(0xac, {});

  constructor(private readonly rom: Rom) {
    // Tag names for debugging...
    for (const key in this as object) {
      const value = (this as any)[key] as unknown;
      if (value instanceof Metatileset) (value as any).name = key;
    }
  }

  private tileset(id: number, opts: MetatilesetData): Metatileset {
    const ts = new Metatileset(this.rom, id, opts);
    this._all.push(ts);
    return ts;
  }

  [Symbol.iterator]() {
    return this._all[Symbol.iterator]();
  }
}

// Mappping from metatile ID to tile quads and palette number.
export class Metatileset implements Iterable<Metascreen> {

  // TODO - maintain an invariant Map<screen-id, Set<Metascreen>>,
  //        will need to lock down (meta)screen ID field to ensure
  //        invariant is kept.

  // TODO - permanently attach behavior
  // Store more information, such as screen types, edge types, etc.
  // Names...
  // Does palette info belong here?  Maybe...

  private readonly _screens = new Set<Metascreen>();
  private _cache?: NeighborCache = undefined;

  constructor(readonly rom: Rom,
              readonly tilesetId: number,
              readonly data: MetatilesetData) {}

  [Symbol.iterator]() {
    return this._screens[Symbol.iterator]();
  }

  private get cache(): NeighborCache {
    if (!this._cache) this._cache = new NeighborCache(this);
    return this._cache;
  }

  /**
   * Returns the underlying physical tileset.  Multiple Metatilesets
   * may share the same physical tileset.
   */
  get tileset(): Tileset {
    return this.rom.tilesets[this.tilesetId];
  }

  get empty(): Metascreen {
    const e = this.cache.empty;
    if (!e) throw new Error(`No empty screen for ${this}`);
    return e;
  }

  get exit(): Metascreen {
    return this.rom.metascreens.exit;
  }

  // TODO - use EMPTY as a border square... also need
  // an EXIT border square?  How to link this into
  // "allowed"?  needs to link to check exits on edge.
  //   - so still probably want an EXIT metascreen?

  effects(): TileEffects {
    return this.tileset.effects();
  }

  // Forward to the underlying Tileset.
  getTile(id: number): Metatile {
    return this.tileset.getTile(id);
  }

  addScreen(screen: Metascreen) {
    this._screens.add(screen);
    screen.unsafeAddTileset(this);
    this.invalidate();
  }

  deleteScreen(screen: Metascreen) {
    this._screens.delete(screen);
    screen.unsafeRemoveTileset(this);
    this.invalidate();
  }

  getMetascreens(screenId: number): ReadonlySet<Metascreen> {
    return this.cache.fromId.get(screenId) ?? EMPTY_SET;
  }

  invalidate() {
    this._cache = undefined;
  }
}

interface MetatilesetData {
  patterns?: readonly [number, number];
  animated?: readonly number[];
  consolidated?: boolean;
}

const EMPTY_SET: Set<any> = new class extends Set {
  add(): this { throw new Error(); }
}

////////////////////////////////////////////////////////////////
// Specialized cache of neighbors/relationships in a tileset.
////////////////////////////////////////////////////////////////
 
type Dir = 0|1|2|3;
// must be <= 0xffff
type Uid = number;
// (a, b) -> (a << 16 | b)
type UidPair = number;
// (uid, dir) -> (uid << 2 | dir)
type UidDir = number;

class NeighborCache {
  // [vertical, horizontal], indexed by dir & 1
  readonly allowed = [new Set<UidPair>(), new Set<UidPair>()] as const;
  readonly neighbors = new DefaultMap<UidDir, Set<Uid>>(() => new Set());
  readonly fromId = new DefaultMap<number, Set<Metascreen>>(() => new Set());
  readonly empty?: Metascreen;
  // private readonly toggles = new DefaultMap<UidDir, Set<Uid>>(() => new Set);

  constructor(readonly tileset: Metatileset) {
    let empty: Metascreen|undefined = undefined;
    for (const s1 of iters.concat(tileset, [tileset.exit])) {
      // Register in the fromId multimap
      if (s1.id >= 0) this.fromId.get(s1.id).add(s1);
      // Check for empty
      if (!empty &&
          s1.data.edges === '    ' &&
          s1.hasFeature('empty') &&
          !s1.data.exits?.length) {
        empty = s1;
      }
      // Register the screen pairs
      const e1 = s1.data.edges || '****';
      for (const s2 of iters.concat(tileset, [tileset.exit])) {
        // Basic idea: compare the edges.  But we need a way to override?
        // Specifically, if there's a * then call a method?  What about
        // allowing (say) normal cave w/ narrow?
        const e2 = s2.data.edges || '****';
        if (e1[2] !== '*' && e1[2] === e2[0]) {
          this.add(2, s1, s2);
        }
        if (e1[3] !== '*' && e1[3] === e2[1]) {
          this.add(3, s1, s2);
        }
        // Maybe call a method if it's there?
        for (const dir of (s1.data.allowed ? s1.data.allowed(s2) : [])) {
          this.add(dir, s1, s2);
        }
      }
    }
    this.empty = empty;
  }

  private add(dir: Dir, s1: Metascreen, s2: Metascreen) {
    const u1 = s1.uid;
    const u2 = s2.uid;
    this.allowed[dir & 1].add(dir & 2 ? u1 << 16 | u2 : u2 << 16 | u1);
    this.neighbors.get(u1 << 2 | dir).add(u2);
    this.neighbors.get(u2 << 2 | (dir ^ 2)).add(u1);
  }

  check(s1: number, s2: number, delta: number): boolean {
    const cache = this.allowed[delta & 1];  // vertical = 0, horiz = 1
    const index = delta > 0 ? s1 << 16 | s2 : s2 << 16 | s1;
    return cache.has(index);
  }

  // TODO - what to do with borders?!? Can we treat them like a screen?
  // The main thing that matters for borders is whether it's an edge exit
  // or not.  We can already track this a bit - we could have a list of
  // acceptable edge types for each tileset - " n" most likely, except for
  // swamp (" ns"?)  We should go thru and make sure there's no reuse of
  // edge types in inconsistent ways (e.g. 'v' for both grass and boundary)
}
