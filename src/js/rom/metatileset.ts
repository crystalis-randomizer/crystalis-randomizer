import {Rom} from '../rom';
import {Metascreen} from './metascreen';
import {Metatile} from './metatile';
import {TileEffects} from './tileeffects';
import {Tileset} from './tileset';
import {DefaultMap} from '../util';
import {ConnectionType, Feature, featureMask,
        MetascreenData} from './metascreendata.js';

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

  readonly lime = this.tileset(0x94, {}); // primarily tiles 60..7f

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
      if (value instanceof Metatileset) value.name = key;
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

  name?: string;
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
    if (!e) throw new Error(`No empty screen for ${this.name}`);
    return e;
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

  getMetascreens(screenId: number): ReadonlyArray<Metascreen> {
    return this.cache.fromId.get(screenId) ?? [];
  }

  getExits(type: ConnectionType): ReadonlyArray<Metascreen> {
    return this.cache.exits.get(type);
  }

  getMetascreensFromTileString(tile: string): readonly Metascreen[] {
    return this.cache.tiles.has(tile) ? this.cache.tiles.get(tile) : [];
  }

  getScreensWithOnlyFeatures(...features: Feature[]): Metascreen[] {
    let mask = 0;
    for (const feature of features) {
      mask |= featureMask[feature];
    }
    const screens: Metascreen[] = [];
    for (const s of this) {
      if (!(s.features & ~mask)) screens.push(s);
    }
    return screens;
  }

  withMod(tile: string, mod: MetascreenData['mod']): Metascreen[] {
    const out: Metascreen[] = [];
    for (const s of this.cache.tiles.get(tile)) {
      if (s.data.mod === mod) out.push(s);
    }
    return out;
  }

  unreachableVariant(screen: Metascreen): Metascreen {
    for (const s of this) {
      if (s.sid === screen.sid && s.isEmpty()) return s;
    }
    return screen;
  }

  isBannedVertical(above: Metascreen, below: Metascreen): boolean {
    return this.cache.bannedNeighbors[0].has(above.uid << 16 | below.uid);
  }

  isBannedHorizontal(left: Metascreen, right: Metascreen): boolean {
    return this.cache.bannedNeighbors[1].has(left.uid << 16 | right.uid);
  }

  /**
   * Invalidate the neighbor cache.  This is necessary any time the
   * screens change.
   */
  invalidate() {
    this._cache = undefined;
  }

  // check(s1: Uid, s2: Uid, delta: number): boolean {
  //   const cache = this.cache.allowed[delta & 1];  // vertical = 0, horiz = 1
  //   const index = delta > 0 ? s1 << 16 | s2 : s2 << 16 | s1;
  //   return cache.has(index);
  // }
}

interface MetatilesetData {
  patterns?: readonly [number, number];
  animated?: readonly number[];
  consolidated?: boolean;
}

// const EMPTY_SET: Set<any> = new class extends Set {
//   add(): this { throw new Error(); }
// }

////////////////////////////////////////////////////////////////
// Specialized cache of neighbors/relationships in a tileset.
////////////////////////////////////////////////////////////////
 
export type Dir = 0|1|2|3;

export namespace Dir {
  export const N: Dir = 0;
  export const W: Dir = 1;
  export const S: Dir = 2;
  export const E: Dir = 3;
}

class NeighborCache {
  // [vertical, horizontal], indexed by dir & 1
  // readonly allowed = [new Set<UidPair>(), new Set<UidPair>()] as const;
  // readonly neighbors = new DefaultMap<UidDir, Set<Uid>>(() => new Set());
  readonly fromId = new DefaultMap<number, Metascreen[]>(() => []);
  readonly exits = new DefaultMap<ConnectionType, Metascreen[]>(() => []);
  readonly empty: Metascreen;
  readonly tiles = new DefaultMap<string, Metascreen[]>(() => []);
  // above << 16 | below, left << 16 | right
  readonly bannedNeighbors = [new Set<number>(), new Set<number>()];
  // private readonly toggles = new DefaultMap<UidDir, Set<Uid>>(() => new Set);

  constructor(readonly tileset: Metatileset) {
    let empty: Metascreen|undefined = undefined;
    for (const s of tileset) {
      // Register in the fromId multimap
      if (s.sid >= 0) this.fromId.get(s.sid).push(s);
      // Check for empty
      if (!empty &&
          s.data.edges === '    ' &&
          s.data.placement !== 'manual' &&
          s.hasFeature('empty') &&
          !s.data.exits?.length) {
        empty = s;
      }
      for (const exit of s.data.exits ?? []) {
        this.exits.get(exit.type).push(s);
      }
      // Add to tiles
      const tiles =
          typeof s.data.tile === 'string' ? [s.data.tile] : s.data.tile;
      for (const tile of tiles ?? []) {
        this.tiles.get(tile.replace(/\|/g, '')).push(s);
      }
      // Check for banned verticals
      if (/*s.hasFeature('spikes') ||*/ s.hasFeature('ramp') ||
          s.hasFeature('overpass') || s.hasFeature('pit') ||
          s.isEmpty()) {
        this.banDeadEndNeighbor(s);
      }
      // Add a bunch of fixed bans
      const ms = tileset.rom.metascreens;
      this.banDeadEndNeighbor(ms.branchNWE_wall, 1);
      this.banNeighbor(ms.deadEndS_stairs, ms.deadEndN_stairs, 2);
      this.banNeighbor(ms.deadEndNS_stairs, ms.deadEndN_stairs, 2);
      this.banNeighbor(ms.deadEndS_stairs, ms.deadEndNS_stairs, 2);
      this.banNeighbor(ms.deadEndNS_stairs, ms.deadEndNS_stairs, 2);
    }
    this.empty = empty ?? tileset.rom.metascreens.caveEmpty;
  }

  banDeadEndNeighbor(s: Metascreen, dirs = 15) {
    for (const t of this.tileset) {
      if (!t.hasFeature('deadend')) continue;
      for (let dir = 0; dir < 4; dir++) {
        const mask = 1 << dir;
        if (!(dirs & mask)) continue;
        if (s.data.edges?.[dir] !== ' ' && t.data.edges?.[dir ^ 2] !== ' ') {
          this.banNeighbor(s, t, dir);
        }
      }
    }
  }

  banNeighbor(s: Metascreen, t: Metascreen, dir: number) {
    this.bannedNeighbors[dir & 1]
        .add((dir & 2 ? s : t).uid << 16 | (dir & 2 ? t : s).uid);
  }

  // TODO - what to do with borders?!? Can we treat them like a screen?
  // The main thing that matters for borders is whether it's an edge exit
  // or not.  We can already track this a bit - we could have a list of
  // acceptable edge types for each tileset - " n" most likely, except for
  // swamp (" ns"?)  We should go thru and make sure there's no reuse of
  // edge types in inconsistent ways (e.g. 'v' for both grass and boundary)
}
