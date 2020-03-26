import {Exit, Location} from './location.js';
import {Metascreen, Uid} from './metascreen.js';
import {Dir, Metatileset} from './metatileset.js';
import {hex} from './util.js';
import {Rom} from '../rom.js';
import {Multiset, Table, iters} from '../util.js';
import {UnionFind} from '../unionfind.js';
import {ConnectionType, Feature, featureMask} from './metascreendata.js';

const [] = [hex];

// Model of a location with metascreens, etc.

// Trick: we need something to own the neighbor cache.
//  - probably this belongs in the Metatileset.
//  - method to regenerate, do it after the screen mods?
// Data we want to keep track of:
//  - given two screens and a direction, can they abut?
//  - given a screen and a direction, what screens open/close that edge?
//    - which one is the "default"?

// TODO - consider abstracting exits here?
//  - exits: Array<[ExitSpec, number, ExitSpec]>
//  - ExitSpec = {type?: ConnectionType, scr?: number}
// How to handle connecting them correctly?
//  - simply saying "-> waterfall valley cave" is not helpful since there's 2
//    or "-> wind valley cave" when there's 5.
//  - use scrId as unique identifier?  only problem is sealed cave has 3...
//  - move to different screen as necessary...
//    (could also just ditch the other two and treat windmill entrance as
//     a down entrance - same w/ lighthouse?)
//  - only a small handfull of locations have disconnected components:
//      windmill, lighthouse, pyramid, goa backdoor, sabera, sabre/hydra ledges
//  - we really do care which is in which component.
//    but map edits may change even the number of components???
//  - do we do entrance shuffle first or map shuffle first?
//    or are they interleaved?!?
//    if we shuffle sabre overworld then we need to know which caves connect
//    to which... and possibly change the connections?
//    - may need leeway to add/subtract cave exits??
// Problem is that each exit is co-owned by two metalocations.


export type Pos = number;
export type ExitSpec = readonly [Pos, ConnectionType];

export class Metalocation {

  readonly rom: Rom;
  private readonly _empty: Uid;

  private _height: number;
  private _width: number;

  /** Key: ((y+1)<<4)|x; Value: Uid */
  private _screens: Uid[];
  private _pos: Pos[]|undefined = undefined;
  /** Count of consolidateable screen tile IDs. */
  private _counts?: Multiset<number>;
  /** Maps UID to ID of counted metascreens. */
  private readonly _counted = new Map<number, number>();

  private _filled = 0;
  private _features = new Map<Pos, number>(); // maps to required mask
  private _exits = new Table<Pos, ConnectionType, ExitSpec>();

  private _monstersInvalidated = false;

  constructor(readonly id: number, readonly tileset: Metatileset,
              height: number, width: number) {
    this.rom = tileset.rom;
    this._empty = tileset.empty.uid;
    this._height = height;
    this._width = width;
    this._screens = new Array((height + 2) << 4).fill(this._empty);
    this._counts = tileset.data.consolidated ? new Multiset() : undefined;
    if (this._counts) {
      for (const screen of tileset) {
        if (screen.hasFeature('consolidate')) {
          this._counted.set(screen.uid, screen.id);
        }
      }
    }
  }

  /**
   * Parse out a metalocation from the given location.  Infer the
   * tileset if possible, otherwise it must be explicitly specified.
   */
  static of(location: Location, tileset?: Metatileset): Metalocation {
    const {rom, width, height} = location;
    if (!tileset) {
      // Infer the tileset.  Start by adding all compatible metatilesets.
      const {fortress, labyrinth} = rom.metatilesets;
      const tilesets = new Set<Metatileset>();
      for (const ts of rom.metatilesets) {
        if (location.tileset === ts.tileset.id) tilesets.add(ts);
      }
      // It's impossible to distinguish fortress and labyrinth, so we hardcode
      // it based on location: only $a9 is labyrinth.
      tilesets.delete(location.id === 0xa9 ? fortress : labyrinth);
      // Filter out any tilesets that don't include necessary screen ids.
      for (const screen of new Set(iters.concat(...location.screens))) {
        for (const tileset of tilesets) {
          if (!tileset.getMetascreens(screen).size) tilesets.delete(tileset);
          if (!tilesets.size) {
            throw new Error(`No tileset for ${hex(screen)} in ${location}`);
          }
        }
      }
      if (tilesets.size !== 1) {
        throw new Error(`Non-unique tileset for ${location}: [${
                         Array.from(tilesets, t => t.name).join(', ')}]`);
      }
      tileset = [...tilesets][0];
    }

    // Traverse the location for all tiles reachable from an entrance.
    // This is used to inform which metascreen to select for some of the
    // redundant ones (i.e. double dead ends).  This is a simple traversal
    const reachable = location.reachableTiles(true); // traverseReachable(0x04);
    const exit = tileset.exit.uid;
    const screens = new Array<Uid>((height + 2) << 4).fill(tileset.empty.uid);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const metascreens = tileset.getMetascreens(location.screens[y][x]);
        let metascreen: Metascreen|undefined = undefined;
        if (metascreens.size === 1) {
          [metascreen] = metascreens;
        } else if (!metascreens.size) {
          throw new Error('impossible');
        } else {
          // TOOD - filter based on who has a match function, or matching flags
          const flag = location.flags.find(f => f.screen === ((y << 4) | x));
          const matchers: Metascreen[] = [];
          const best: Metascreen[] = [];
          for (const s of metascreens) {
            if (s.data.match) {
              matchers.push(s);
            } else if (s.data.flag === 'always' && flag?.flag === 0x2fe ||
                       !s.data.flag && !s.data.wall && !flag) {
              best.unshift(s); // front-load matching flags
            } else {
              best.push(s);
            }
          }
          if (matchers.length) {
            function reach(dy: number, dx: number) {
              const x0 = (x << 8) + dx;
              const y0 = (y << 8) + dy;
              const t =
                  (y0 << 4) & 0xf000 | x0 & 0xf00 | y0 & 0xf0 | (x0 >> 4) & 0xf;
              return reachable.has(t);
            }
            for (const matcher of matchers) {
              if (!matcher.data.match!(reach, flag != null)) continue;
              metascreen = matcher;
              break;
            }
          }
          if (!metascreen) metascreen = best[0];
        }
        if (!metascreen) throw new Error('impossible');
        const t0 = (y + 1) << 4 | x;
        screens[t0] = metascreen.uid;
        // If we're on the border and it's an edge exit then change the border
        // screen to reflect an exit.
        const edges = metascreen.edgeExits();
        if (y === 0 && (edges & 1)) screens[t0 - 16] = exit;
        if (x === 0 && (edges & 2)) screens[t0 - 1] = exit;
        if (y === height && (edges & 4)) screens[t0 + 16] = exit;
        if (x === width && (edges & 8)) screens[t0 + 1] = exit;
      }
    }

    // Figure out exits
    const exits = new Table<Pos, ConnectionType, ExitSpec>();
    for (const exit of location.exits) {
      const srcPos = exit.screen;
      const srcScreen = rom.metascreens[screens[srcPos + 16]];
      const srcType = srcScreen.findExitType(exit.tile, height === 1,
                                             !!(exit.entrance & 0x20));
      if (!srcType) {
        const id = location.id << 16 | srcPos << 8 | exit.tile;
        if (unknownExitWhitelist.has(id)) continue;
        const all = srcScreen.data.exits?.map(
            e => e.type + ': ' + e.exits.map(hex).join(', ')).join('\n  ');
        console.warn(`Unknown exit ${hex(exit.tile)}: ${srcScreen.name} in ${
                      location} @ ${hex(srcPos)}:\n  ${all}`);
        continue;
      }
      if (exits.has(srcPos, srcType)) continue; // already handled
      const dest = rom.locations[exit.dest];
      if (srcType.startsWith('seamless')) {
        const down = srcType === 'seamless:down';
        const destPos = srcPos + (down ? 16 : -16);
        const destType = down ? 'seamless:up' : 'seamless:down';
        exits.set(srcPos, srcType, [dest.id << 8 | destPos, destType]);
        continue;
      }
      const entrance = dest.entrances[exit.entrance & 0x1f];
      let destPos = entrance.screen;
      let destCoord = entrance.coord;
      if (srcType === 'door' && (entrance.y & 0xf0) === 0) {
        // NOTE: The item shop door in Oak straddles two screens (exit is on
        // the NW screen while entrance is on SW screen).  Do a quick hack to
        // detect this (proxying "door" for "upward exit") and adjust search
        // target accordingly.
        destPos -= 0x10;
        destCoord += 0x10000;
      }
      // Figure out the connection type for the destTile.
      const destScrId = dest.screens[destPos >> 4][destPos & 0xf];
      const destType = findEntranceType(dest, destScrId, destCoord);
      // NOTE: initial spawn has no type...?
      if (!destType) {
        const lines = [];
        for (const destScr of rom.metascreens.getById(destScrId, dest.tileset)) {
          for (const exit of destScr.data.exits ?? []) {
            if (exit.type.startsWith('seamless')) continue;
            lines.push(`  ${destScr.name} ${exit.type}: ${hex(exit.entrance)}`);
          }
        }
        console.warn(`Bad entrance ${hex(destCoord)}: raw ${hex(destScrId)
                      } in ${dest} @ ${hex(destPos)}\n${lines.join('\n')}`);
        continue;
      }
      exits.set(srcPos, srcType, [dest.id << 8 | destPos, destType]);
      // if (destType) exits.set(srcPos, srcType, [dest.id << 8 | destPos, destType]);
    }

    const metaloc = new Metalocation(location.id, tileset, height, width);
    for (let i = 0; i < screens.length; i++) {
      metaloc.setInternal(i, screens[i]);
    }
    metaloc._screens = screens;
    metaloc._exits = exits;
    // TODO - store reachability map?
    return metaloc;

    function findEntranceType(dest: Location, scrId: number, coord: number) {
      for (const destScr of rom.metascreens.getById(scrId, dest.tileset)) {
        const type = destScr.findEntranceType(coord, dest.height === 1);
        if (type != null) return type;
      }
      return undefined;
    }
  }

  get size(): number {
    return this._filled;
  }

  // Readonly accessor.
  get screens(): readonly Uid[] {
    return this._screens;
  }

  get width(): number {
    return this._width;
  }
  set width(width: number) {
    this._width = width;
    this._pos = undefined;
  }

  get height(): number {
    return this._height;
  }
  set height(height: number) {
    if (this._height > height) {
      this._screens.splice((height + 2) << 4, (this._height - height) << 4);
    } else if (this._height < height) {
      this._screens.length = (height + 2) << 4;
      this._screens.fill(this._empty,
                         (this.height + 2) << 4, this._screens.length);
    }
    this._height = height;
    this._pos = undefined;
  }

  // TODO - resize function?

  allPos(): readonly Pos[] {
    if (this._pos) return this._pos;
    const p: number[] = this._pos = [];
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        p.push(y << 4 | x);
      }
    }
    return p;
  }

  private setInternal(pos: Pos, uid: Uid | null) {
    const inBounds = this.inBounds(pos);
    const t0 = pos + 16;
    if (inBounds && this._screens[t0] !== this._empty) this._filled--;
    if (inBounds && uid !== this._empty) this._filled++;
    const prev = this._counted.get(this._screens[t0]);
    if (uid == null) uid = this._empty;
    this._screens[t0] = uid;
    if (this._counts) {
      if (prev != null) this._counts.delete(prev);
      const next = this._counted.get(uid);
      if (next != null) this._counts.add(next);
    }
  }

  invalidateMonsters() { this._monstersInvalidated = true; }

  inBounds(pos: Pos): boolean {
    // return inBounds(pos, this.height, this.width);
    return (pos & 15) < this.width && pos >= 0 && pos >>> 4 < this.height;
  }

  setFeature(pos: Pos, feature: Feature) {
    this._features.set(pos, this._features.get(pos)! | featureMask[feature]);
  }

  // isFixed(pos: Pos): boolean {
  //   return this._fixed.has(pos);
  // }

  /**
   * Force-overwrites the given range of screens.  Does validity checking
   * only at the end.  Does not do anything with features, since they're
   * only set in later passes (i.e. shuffle, which is last).
   */
  set2d(pos: Pos, screens: ReadonlyArray<ReadonlyArray<Metascreen|null>>) {
    this.saveExcursion(() => {
      const pos0 = pos;
      for (const row of screens) {
        let dx = 0;
        for (const scr of row) {
          if (scr) this.setInternal(pos + dx++, scr.uid);
        }
        pos += 16;
      }
      // Now check everything, throw if failed.
      for (let dy = screens.length; dy >= 0; dy--) {
        const width = Math.max(screens[dy]?.length || 0,
                               screens[dy - 1]?.length || 0);
        pos = pos0 + (dy << 4);
        for (let dx = 0; dx <= width; dx++) {
          const index = pos + dx;
          const above = this._screens[index - 16];
          const left = this._screens[index - 1];
          const scr = this._screens[index];
          if (!this.tileset.check(above, scr, 16)) {
            const aboveName = this.rom.metascreens[above].name;
            const scrName = this.rom.metascreens[scr].name;
            throw new Error(`bad neighbor ${aboveName} above ${scrName}`);
          }
          if (!this.tileset.check(left, scr, 1)) {
            const leftName = this.rom.metascreens[left].name;
            const scrName = this.rom.metascreens[scr].name;
            throw new Error(`bad neighbor ${leftName} left of ${scrName}`);
          }
        }
      }
      return true;
    });
  }

  // Options for setting:
  set(pos: Pos, uid: Uid): boolean {
    const scr = this.rom.metascreens[uid];
    const features = this._features.get(pos);
    if (features != null && !scr.hasFeatures(features)) return false;
    for (let dir = 0; dir < 4; dir++) {
      const delta = DPOS[dir];
      const other = pos + delta;
      if (!this.tileset.check(uid, this._screens[other], delta)) return false;
    }
    this.setInternal(pos, uid);
    return true;
  }

  setExit(pos: Pos, type: ConnectionType, spec: ExitSpec) {
    const other = this.rom.locations[spec[0] >>> 8].meta;
    if (!other) throw new Error(`Cannot set two-way exit without meta`);
    this.setExitOneWay(pos, type, spec);
    other.setExitOneWay(spec[0] & 0xff, spec[1], [this.id << 8 | pos, type]);
  }
  setExitOneWay(pos: Pos, type: ConnectionType, spec: ExitSpec) {
    // const prev = this._exits.get(pos, type);
    // if (prev) {
    //   const other = this.rom.locations[prev[0] >>> 8].meta;
    //   if (other) other._exits.delete(prev[0] & 0xff, prev[1]);
    // }
    this._exits.set(pos, type, spec);
  }

  // TODO - counted candidates?
  exitCandidates(type: ConnectionType): number[] {
    // TODO - figure out a way to use the double-staircase?  it won't
    // happen currently because it's fixed, so it's excluded....?
    const hasExit: number[] = [];
    for (const scr of this.tileset) {
      if (scr.data.exits?.some(e => e.type === type)) hasExit.push(scr.id);
    }
    return hasExit;
  }

  // NOTE: candidates pre-shuffled?
  tryAddOneOf(pos: Pos, candidates: Uid[]): boolean {
    // check neighbors... - TODO - need to distinguish empty from unset... :-(
    // alternatively, we could _FIX_ the mandatory empties...?

    // BUT... where do we even keep track of it?
    //  - is fixed the concern of cave or metaloc?
    // const feature = this._features.get(pos);
    

    // const scr = this.rom.metascreens[uid];
    // if (feature != null && !scr.hasFeature(feature)) return false;
    
    for (const candidate of candidates) {
      if (this.set(pos, candidate)) return true;
    }
    return false;


  }

  // TODO - short vs full?
  show(): string {
    const lines = [];
    let line = [];
    for (let x = 0; x < this.width; x++) {
      line.push(x.toString(16));
    }
    lines.push('   ' + line.join('  '));
    for (let y = 0; y < this.height; y++) {
      for (let r = 0; r < 3; r++) {
        line = [r === 1 ? y.toString(16) : ' ', ' '];
        for (let x = 0; x < this.width; x++) {
          const screen = this.rom.metascreens[this.screens[(y + 1) << 4 | x]];
          line.push(screen?.data.icon?.full[r] ?? (r === 1 ? ' ? ' : '   '));
        }
        lines.push(line.join(''));
      }
    }
    return lines.join('\n');
  }

  saveExcursion(f: () => boolean): boolean {
    let screens = [...this._screens];
    let counts = this._counts && [...this._counts];
    let filled = this._filled;
    let features = [...this._features];
    let ok = false;
    try {
      ok = f();
    } finally {
      if (ok) return true;
      this._screens = screens;
      if (counts) this._counts = new Multiset(counts);
      this._filled = filled;
      this._features = new Map(features);
    }
    return false;
  }

  traverse(opts: TraverseOpts = {}): Map<number, Set<number>> {
    // Returns a map from unionfind root to a list of all reachable tiles.
    // All elements of set are keys pointing to the same value ref.
    const without = new Set(opts.without || []);
    const uf = new UnionFind<number>();
    const connectionType = (opts.flight ? 2 : 0) | (opts.noFlagged ? 1 : 0);
    for (const pos of this.allPos()) {
      if (without.has(pos)) continue;
      const scr = this._screens[pos + 16];
      const ms = this.rom.metascreens[scr];
      //if (opts.flight && spec.deadEnd) continue;
      for (const segment of ms.connections[connectionType]) {
        // Connect within each segment
        uf.union(segment.map(c => (pos << 8) + c));
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

  /** @return [position, direction of edge, screen at edge, true if exit. */
  * borders(): IterableIterator<[Pos, Dir, Uid, boolean]> {
    const exit = this.tileset.exit.uid;
    for (let x = 0; x < this.width; x++) {
      const top = x;
      const bottom = this.height << 4 | x;
      yield [top, Dir.N, this._screens[top + 16], this._screens[top] === exit];
      yield [bottom, Dir.S, this._screens[bottom + 16],
             this._screens[bottom + 32] === exit];
    }
    for (let y = 1; y <= this.height; y++) {
      const left = y << 4;
      const right = left | (this.width - 1);
      yield [left, Dir.W, this._screens[left + 16],
             this._screens[left + 15] === exit];
      yield [right, Dir.E, this._screens[right + 16],
             this._screens[right + 17] === exit];
    }
  }

  /**
   * Attach an exit/entrance pair in two directions.
   * Also reattaches the former other ends of each to each other.
   */
  attach(pos: Pos, type: ConnectionType,
         dest: Metalocation, destPos: number, destType: ConnectionType) {
    const destTile = dest.id << 8 | destPos;
    const prevDest = this._exits.get(pos, type)!;
    const [prevDestTile, prevDestType] = prevDest;
    if (prevDestTile === destTile && prevDestType === destType) return;
    const prevSrc = dest._exits.get(destPos, destType)!;
    const [prevSrcTile, prevSrcType] = prevSrc;
    this._exits.set(pos, type, [destTile, destType]);
    dest._exits.set(destPos, destType, [this.id << 8 | pos, type]);
    // also hook up previous pair
    const prevSrcMeta = this.rom.locations[prevSrcTile >> 8].meta!;
    const prevDestMeta = this.rom.locations[prevDestTile >> 8].meta!;
    prevSrcMeta._exits.set(prevSrcTile & 0xff, prevSrcType, prevDest);
    prevDestMeta._exits.set(prevDestTile & 0xff, prevDestType, prevSrc);
  }

  /**
   * Moves an exit from one pos/type to another.
   * Also updates the metalocation on the other end of the exit.
   * This should typically be done atomically if rebuilding a map.
   */
  // TODO - rebuilding a map involves moving to a NEW metalocation...
  //      - given this, we need a different approach?
  moveExits(...moves: Array<[Pos, ConnectionType, Pos, ConnectionType]>) {
    const newExits: Array<[Pos, ConnectionType, ExitSpec]> = [];
    for (const [oldPos, oldType, newPos, newType] of moves) {
      const destExit = this._exits.get(oldPos, oldType)!;
      const [destTile, destType] = destExit;
      const dest = this.rom.locations[destTile >> 8].meta!;
      dest._exits.set(destTile & 0xff, destType,
                      [this.id << 8 | newPos, newType]);
      newExits.push([newPos, newType, destExit]);
      this._exits.delete(oldPos, oldType);
    }
    for (const [pos, type, exit] of newExits) {
      this._exits.set(pos, type, exit);
    }
  }

  /**
   * Saves the current state back into the underlying location.
   * Currently this only deals with entrances/exits.
   */
  write() {
    const srcLoc = this.rom.locations[this.id];
    for (const [srcPos, srcType, [destTile, destType]] of this._exits) {
      const srcScreen = this.rom.metascreens[this._screens[srcPos + 0x10]];
      const dest = destTile >> 8;
      const destLoc = this.rom.locations[dest];
      const destMeta = destLoc.meta!;
      const destScreen =
          this.rom.metascreens[destMeta._screens[(destTile & 0xff) + 0x10]];
      const srcExit = srcScreen.data.exits?.find(e => e.type === srcType);
      const destExit = destScreen.data.exits?.find(e => e.type === destType);
      if (!srcExit || !destExit) throw new Error(`Missing exit`); // TODO ... ?
      // See if the dest entrance exists yet...
      let destPos = destTile & 0xff;
      let destCoord = destExit.entrance;
      if (destCoord > 0xefff) { // handle special case in Oak
        destPos += 0x10;
        destCoord -= 0x10000;
      }
      const entrance = destLoc.findOrAddEntrance(destPos, destCoord);
      for (const tile of srcExit.exits) {
        srcLoc.exits.push(Exit.of({screen: srcPos, tile, dest, entrance}));
      }
    }
    srcLoc.width = this._width;
    srcLoc.height = this._height;
    srcLoc.screens = [];
    for (let y = 0; y < this._width; y++) {
      const row: number[] = [];
      srcLoc.screens.push(row);
      for (let x = 0; x < this._height; x++) {
        row.push(this.rom.metascreens[this._screens[(y + 1) << 4 | x]].id);
      }
    }
    srcLoc.tileset = this.tileset.tilesetId;
    srcLoc.tileEffects = this.tileset.effects().id;

    if (this._monstersInvalidated) {
      // TODO - if monsters invalidated, then replace them...
    }
  }
}

interface TraverseOpts {
  // Do not pass certain tiles in traverse
  readonly without?: readonly Pos[];
  // Whether to break walls/form bridges
  readonly noFlagged?: boolean;
  // Whether to assume flight
  readonly flight?: boolean;
}


const unknownExitWhitelist = new Set([
  0x01003a, // top part of cave outside start
  0x01003b,
  0x010070, // beneath entrance to leaf
  0x02115f, // leaf side of the above
  0x1440a0, // beneath entrance to brynmaer
  0x1540a0, // " " seamless equivalent " "
  0x1a3060, // swamp exit
  0x1a30a0,
  0x402000, // bridge to fisherman island
  0x402030,
  0x4180d0, // below exit to lime tree valley
  0x6087bf, // below boat channel
  0xa10326, // crypt 2 arena north edge
  0xa10329,
  0xa90626, // stairs above kelby 2
  0xa90629,
]);

const DPOS = [-16, -1, 16, 1];
