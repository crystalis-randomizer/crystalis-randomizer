import {Location} from './location.js'; // import type
import {Exit, Flag as LocationFlag} from './locationtables.js';
import {Flag} from './flags.js';
import {Metascreen, Uid} from './metascreen.js';
import {Dir, Metatileset} from './metatileset.js';
import {hex} from './util.js';
import {Failure, Ok, ok} from '../failure.js';
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

  // TODO - store metadata about windmill flag?  two metalocs will need a pos to
  // indicate where that flag should go...?  Or store it in the metascreen?

  // Caves are assumed to be always open unless there's a flag set here...
  customFlags = new Map<Pos, Flag>();
  freeFlags = new Set<Flag>();

  readonly rom: Rom;
  private readonly _empty: Metascreen;

  private _height: number;
  private _width: number;

  private _pos: Pos[]|undefined = undefined;

  /** Metascreens that need to be consolidated, mapped to a unique tile ID. */
  private readonly _counted = new Map<Metascreen, number>();

  private _exits = new Table<Pos, ConnectionType, ExitSpec>();

  private _monstersInvalidated = false;

  ////////////////////////////////////////////////////////////////
  // The following are all backed up by saveExcursion
  /** Key: ((y+1)<<4)|x; Value: Uid */
  private _screens: Metascreen[];
  /** Count of consolidateable screen tile IDs. */
  private _counts?: Multiset<number>;
  /** Current number of filled tiles. */
  private _filled = 0;
  /** Fixed feature constraints. */
  private _features = new Map<Pos, number>(); // maps to required mask
  /** Edges that need to be validated: pos << 1 | (0 if above, 1 if left). */
  private _invalidated = new Set<number>(); // edges needing validation
  /** Whether the map has been found to be invalid. */
  private _invalid = false;
  ////////////////////////////////////////////////////////////////

  constructor(readonly id: number, readonly tileset: Metatileset,
              height: number, width: number) {
    this.rom = tileset.rom;
    this._empty = tileset.empty;
    this._height = height;
    this._width = width;
    this._screens = new Array((height + 2) << 4).fill(this._empty);
    this._counts = tileset.data.consolidated ? new Multiset() : undefined;
    if (this._counts) {
      for (const screen of tileset) {
        if (screen.hasFeature('consolidate')) {
          this._counted.set(screen, screen.sid);
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
          if (!tileset.getMetascreens(screen).length) tilesets.delete(tileset);
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
    const exit = tileset.exit;
    const screens = new Array<Metascreen>((height + 2) << 4).fill(tileset.empty);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const metascreens = tileset.getMetascreens(location.screens[y][x]);
        let metascreen: Metascreen|undefined = undefined;
        if (metascreens.length === 1) {
          metascreen = metascreens[0];
        } else if (!metascreens.length) {
          throw new Error('impossible');
        } else {
          // TOOD - filter based on who has a match function, or matching flags
          const flag = location.flags.find(f => f.screen === ((y << 4) | x));
          const matchers: Metascreen[] = [];
          const best: Metascreen[] = [];
          for (const s of metascreens) {
            if (s.data.match) {
              matchers.push(s);
            } else if (s.flag === 'always' && flag?.flag === 0x2fe ||
                       !s.flag && !s.data.wall && !flag) {
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
        screens[t0] = metascreen;
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
      const srcScreen = screens[srcPos + 16];
      const srcExit = srcScreen.findExitType(exit.tile, height === 1,
                                             !!(exit.entrance & 0x20));
      const srcType = srcExit?.type;
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
        // NOTE: this seems wrong - the down exit is BELOW the up exit...?
        const tile = srcExit!.exits[0] + (down ? -16 : 16);
        const destPos = srcPos + (tile < 0 ? -16 : tile >= 0xf0 ? 16 : -0);
        const destType = down ? 'seamless:up' : 'seamless:down';
        //console.log(`${srcType} ${hex(location.id)} ${down} ${hex(tile)} ${hex(destPos)} ${destType} ${hex(dest.id)}`);
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
    // for (let i = 0; i < screens.length; i++) {
    //   metaloc.setInternal(i, screens[i]);
    // }
    metaloc._screens = screens;
    metaloc._exits = exits;
    metaloc.bookkeep();

    // Fill in custom flags
    for (const f of location.flags) {
      const scr = metaloc._screens[f.screen + 16];
      if (scr.flag?.startsWith('custom')) {
        metaloc.customFlags.set(f.screen, rom.flags[f.flag]);
      } else if (!scr.flag) {
        metaloc.freeFlags.add(rom.flags[f.flag]);
      }
    }
    // for (const pos of metaloc.allPos()) {
    //   const scr = rom.metascreens[metaloc._screens[pos + 16]];
    //   if (scr.flag === 'custom') {
    //     const f = location.flags.find(f => f.screen === pos);
    //     if (f) metaloc.customFlags.set(pos, rom.flags[f.flag]);
    //   }
    // }

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

  getUid(pos: Pos): Uid {
    return this._screens[pos + 16].uid;
  }

  get(pos: Pos): Metascreen {
    return this._screens[pos + 16];
  }

  get size(): number {
    return this._filled;
  }

  // Readonly accessor.
  // get screens(): readonly Uid[] {
  //   return this._screens;
  // }

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

  set(pos: Pos, scr: Metascreen | null) {
    // TODO - merge?
    this.setInternal(pos, scr, true);
  }

  private setInternal(pos: Pos, scr: Metascreen | null, invalidate: boolean) {
    if (!scr) scr = this._empty;
    const inBounds = this.inBounds(pos);
    const t0 = pos + 16;
    if (inBounds && !this._screens[t0].isEmpty()) this._filled--;
    if (inBounds && !scr.isEmpty()) this._filled++;
    const prev = this._counted.get(this._screens[t0]);
    this._screens[t0] = scr;
    if (this._counts) {
      if (prev != null) this._counts.delete(prev);
      const next = this._counted.get(scr);
      if (next != null) this._counts.add(next);
    }
    if (!invalidate) return;
    const i0 = pos << 1;
    this._invalidated.add(i0);
    this._invalidated.add(i0 + 1);
    this._invalidated.add(i0 + 3);
    this._invalidated.add(i0 + 32);
  }

  invalidateMonsters() { this._monstersInvalidated = true; }

  inBounds(pos: Pos): boolean {
    // return inBounds(pos, this.height, this.width);
    return (pos & 15) < this.width && pos >= 0 && pos >>> 4 < this.height;
  }

  setFeature(pos: Pos, feature: Feature) {
    this._features.set(pos, this._features.get(pos)! | featureMask[feature]);
  }
  getFeatures(pos: Pos): number {
    return this._features.get(pos) || 0;
  }
  setFeatures(pos: Pos, features: number) {
    this._features.set(pos, features);
  }
  isConstrained(pos: Pos): boolean {
    return !!this._features.get(pos);
  }

  // isFixed(pos: Pos): boolean {
  //   return this._fixed.has(pos);
  // }

  /**
   * Force-overwrites the given range of screens.  Does validity checking
   * only at the end.  Does not do anything with features, since they're
   * only set in later passes (i.e. shuffle, which is last).
   */
  set2d(pos: Pos, screens: ReadonlyArray<ReadonlyArray<Metascreen|null>>): Ok {
    return this.saveExcursion(() => {
      for (const row of screens) {
        let dx = 0;
        for (const scr of row) {
          if (scr) this.setInternal(pos + dx++, scr, true);
        }
        pos += 16;
      }
      // return this.verify(pos0, screens.length,
      //                    Math.max(...screens.map(r => r.length)));
      return this.validate();
    });
  }

  /** Check all the currently invalidated edges, then clears it. */
  validate(): Ok {
    const failures: Failure[] = [];
    const seen = new Set<Pos>();
    for (const edge of this._invalidated) {
      // Check each pair.  Unconstrained empties get a pass.
      const dir = edge & 1;
      const pos0: Pos = edge >>> 1;
      const scr0 = this._screens[pos0 + 16];
      const feat0 = this._features.get(pos0) || 0;
      const pos1: Pos = pos0 - (dir ? 16 : 1);
      const scr1 = this._screens[pos1 + 16];
      const feat1 = this._features.get(pos1) || 0;
      if (feat0 & ~scr0.features && !seen.has(pos0)) {
        failures.push(Failure.of('missing feature %x: %s (%02x)',
                                 feat0, scr0.name, pos0));
        seen.add(pos0);
      }
      if (feat1 & ~scr1.features && !seen.has(pos1)) {
        failures.push(Failure.of('missing feature %x: %s (%02x)',
                                 feat1, scr1.name, pos1));
        seen.add(pos1);
      }
      if (!feat0 && scr0.isEmpty()) continue;
      if (!feat1 && scr1.isEmpty()) continue;
      if (!scr0.checkNeighbor(scr1, dir)) {
        failures.push(Failure.of('bad neighbor %s (%02x) %s %s (%02x)',
                                 scr1, pos1, DIR_NAME[dir], scr0, pos0));
      }
    }
    if (!failures.length) return;
    this._invalid = true;
    return Failure.all(failures, 'validation failed');
  }

  /** Check all screens in the given rectangle. Throw if invalid. */
  verifyRect(pos0: Pos, height: number, width: number): Ok {
    const maxY = (this.height + 1) << 4;
    for (let dy = 0; dy <= height; dy++) {
      const pos = pos0 + 16 + (dy << 4);
      for (let dx = 0; dx <= width; dx++) {
        const index = pos + dx;
        const scr = this._screens[index];
        if (scr == null) break; // happens when setting border screens via set2d
        const above = this._screens[index - 16];
        const left = this._screens[index - 1];
        if ((index & 0xf) < this.width && !scr.checkNeighbor(above, 0)) {
          return Failure.of('bad neighbor %s above %s at %s @ %x',
                            above.name, scr.name,
                            this.rom.locations[this.id], index - 32);
        }
        if (index < maxY && !scr.checkNeighbor(left, 1)) {
          return Failure.of('bad neighbor %s left of %s at %s @ %x',
                            left.name, scr.name,
                            this.rom.locations[this.id], index - 17);
        }
      }
    }
  }

  // Recomputes all the memoized data (e.g. after a large change).
  bookkeep() {
    this._pos = undefined;
    this._filled = 0;
    if (this._counts) this._counts = new Multiset();
    for (const pos of this.allPos()) {
      const scr = this._screens[pos + 16];
      if (this._counts) {
        const counted = this._counted.get(scr);
        if (counted != null) this._counts.add(counted);
      }
      if (!scr.isEmpty()) this._filled++;
    }
  }

  spliceColumns(left: number, deleted: number, inserted: number,
                screens: ReadonlyArray<ReadonlyArray<Metascreen>>) {
    if (this._features.size) throw new Error(`bad features`);
    this.saveExcursion(() => {
      // First adjust the screens.
      for (let p = 0; p < this._screens.length; p += 16) {
        this._screens.copyWithin(p + left + inserted, p + left + deleted, p + 10);
        this._screens.splice(p + left, inserted, ...screens[p >> 4]);
      }
      return true;
    });
    // Update dimensions and accounting
    const delta = inserted - deleted;
    this.width += delta;
    this._pos = undefined;
    this.bookkeep();
    // Move relevant exits
    const move: [Pos, ConnectionType, Pos, ConnectionType][] = [];
    for (const [pos, type] of this._exits) {
      const x = pos & 0xf;
      if (x < left + deleted) {
        if (x >= left) this._exits.delete(pos, type);
        continue;
      }
      move.push([pos, type, pos + delta, type]);
    }
    this.moveExits(...move);
    // Move flags and spawns in parent location
    const parent = this.rom.locations[this.id];
    const xt0 = (left + deleted) << 4;
    for (const spawn of parent.spawns) {
      if (spawn.xt < xt0) continue;
      spawn.xt -= (delta << 4);
    }
    for (const flag of parent.flags) {
      if (flag.xs < left + deleted) {
        if (flag.xs >= left) flag.screen = 0xff;
        continue;
      }
      flag.xs -= delta;
    }
    parent.flags = parent.flags.filter(f => f.screen !== 0xff);

    // TODO - move pits??

  }

  // Options for setting: ???
  trySet(pos: Pos, scr: Metascreen): Ok {
    const features = this._features.get(pos);
    if (features != null && !scr.hasFeatures(features)) {
      return Failure.of('missing required features %x in %s at %x',
                        features, scr.name, pos);
    }
    for (let dir = 0; dir < 4; dir++) {
      const delta = DPOS[dir];
      const other = pos + delta;
      const neighbor = this._screens[other + 16];
      if (!scr.checkNeighbor(neighbor, dir)) {
        return Failure.of('bad neighbor %s %s %s', neighbor.name,
                          DIR_NAME[dir], scr.name);
      }
    }
    this.setInternal(pos, scr, false);
  }

  ////////////////////////////////////////////////////////////////
  // Exit handling

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
  exitCandidates(type: ConnectionType): Metascreen[] {
    // TODO - figure out a way to use the double-staircase?  it won't
    // happen currently because it's fixed, so it's excluded....?
    const hasExit: Metascreen[] = [];
    for (const scr of this.tileset) {
      if (scr.data.exits?.some(e => e.type === type)) hasExit.push(scr);
    }
    return hasExit;
  }

  // NOTE: candidates pre-shuffled?
  tryAddOneOf(pos: Pos, candidates: readonly Metascreen[]): Ok {
    // check neighbors... - TODO - need to distinguish empty from unset... :-(
    // alternatively, we could _FIX_ the mandatory empties...?

    // BUT... where do we even keep track of it?
    //  - is fixed the concern of cave or metaloc?
    // const feature = this._features.get(pos);
    

    // const scr = this.rom.metascreens[uid];
    // if (feature != null && !scr.hasFeature(feature)) return false;
    
    const failures: Failure[] = [];
    for (const candidate of candidates) {
      const result = this.trySet(pos, candidate);
      if (ok(result)) return;
      failures.push(result);
    }
    return Failure.all(failures, 'No candidate could be added at %02x', pos);
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
          const screen = this._screens[(y + 1) << 4 | x];
          line.push(screen?.data.icon?.full[r] ?? (r === 1 ? ' ? ' : '   '));
        }
        lines.push(line.join(''));
      }
    }
    return lines.join('\n');
  }

  screenNames(): string {
    const lines = [];
    for (let y = 0; y < this.height; y++) {
      let line = [];
      for (let x = 0; x < this.width; x++) {
        const screen = this._screens[(y + 1) << 4 | x];
        line.push(screen?.name);
      }
      lines.push(line.join(' '));
    }
    return lines.join('\n');
  }

  /** If T is Failure then revert. */
  saveExcursion<T>(f: () => T): T|Failure {
    const screens = [...this._screens];
    const counts = this._counts && [...this._counts];
    const filled = this._filled;
    const features = [...this._features];
    const invalidated = [...this._invalidated];
    const invalid = this._invalid;
    let result: T|Failure;
    try {
      result = f();
    } catch (err) {
      result = Failure.of(err.stack);
    } finally {
      if (ok(result!)) return result;
      this._screens = screens;
      if (counts) this._counts = new Multiset(counts);
      this._filled = filled;
      this._features = new Map(features);
      this._invalidated = new Set(invalidated);
      this._invalid = invalid;
    }
    return result;
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
      //if (opts.flight && spec.deadEnd) continue;
      for (const segment of scr.connections[connectionType]) {
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

  /** @return [position, direction of edge, screen inside edge, true if exit. */
  * borders(): IterableIterator<[Pos, Dir, Metascreen, boolean]> {
    const exit = this.tileset.exit;
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
  attach(srcPos: Pos, dest: Metalocation, destPos: Pos,
         srcType?: ConnectionType, destType?: ConnectionType) {
    if (!srcType) srcType = this.pickTypeFromExits(srcPos);
    if (!destType) destType = dest.pickTypeFromExits(destPos);

    // TODO - what if multiple reverses?  e.g. cordel east/west?
    //      - could determine if this and/or dest has any seamless.
    // No: instead, do a post-process.  Only cordel matters, so go
    // through and attach any redundant exits.

    const destTile = dest.id << 8 | destPos;
    const prevDest = this._exits.get(srcPos, srcType)!;
    if (prevDest) {
      const [prevDestTile, prevDestType] = prevDest;
      if (prevDestTile === destTile && prevDestType === destType) return;
    }
    const prevSrc = dest._exits.get(destPos, destType)!;
    this._exits.set(srcPos, srcType, [destTile, destType]);
    dest._exits.set(destPos, destType, [this.id << 8 | srcPos, srcType]);
    // also hook up previous pair
    if (prevSrc && prevDest) {
      const [prevDestTile, prevDestType] = prevDest;
      const [prevSrcTile, prevSrcType] = prevSrc;
      const prevSrcMeta = this.rom.locations[prevSrcTile >> 8].meta!;
      const prevDestMeta = this.rom.locations[prevDestTile >> 8].meta!;
      prevSrcMeta._exits.set(prevSrcTile & 0xff, prevSrcType, prevDest);
      prevDestMeta._exits.set(prevDestTile & 0xff, prevDestType, prevSrc);
    } else if (prevSrc || prevDest) {
      const [prevTile, prevType] = prevSrc || prevDest;
      const prevMeta = this.rom.locations[prevTile >> 8].meta!;
      prevMeta._exits.delete(prevTile & 0xff, prevType);      
    }
  }

  pickTypeFromExits(pos: Pos): ConnectionType {
    const types = [...this._exits.row(pos).keys()];
    if (!types.length) return this.pickTypeFromScreens(pos);
    if (types.length > 1) {
      throw new Error(`No single type for ${hex(pos)}: [${types.join(', ')}]`);
    }
    return types[0];
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

  moveExit(prev: Pos, next: Pos,
           prevType?: ConnectionType, nextType?: ConnectionType) {
    if (!prevType) prevType = this.pickTypeFromExits(prev);
    if (!nextType) nextType = this.pickTypeFromScreens(next);
    const destExit = this._exits.get(prev, prevType)!;
    const [destTile, destType] = destExit;
    const dest = this.rom.locations[destTile >> 8].meta!;
    dest._exits.set(destTile & 0xff, destType,
                    [this.id << 8 | next, nextType]);
    this._exits.set(next, nextType, destExit);
    this._exits.delete(prev, prevType);
  }  

  pickTypeFromScreens(pos: Pos): ConnectionType {
    const exits = this._screens[pos + 16].data.exits;
    const types = (exits ?? []).map(e => e.type);
    if (types.length !== 1) {
      throw new Error(`No single type for ${hex(pos)}: [${types.join(', ')}]`);
    }
    return types[0];
  }

  /**
   * Given a seamless pair location, sync up the exits.  For each exit of
   * either, check if it's symmetric, and if so, copy it over to the other side.
   */
  reconcileExits(that: Metalocation) {
    const add: [Metalocation, Pos, ConnectionType, ExitSpec][] = [];
    const del: [Metalocation, Pos, ConnectionType][] = [];
    for (const loc of [this, that]) {
      for (const [pos, type, [destTile, destType]] of loc._exits) {
        if (destType.startsWith('seamless')) continue;
        const dest = this.rom.locations[destTile >>> 8];
        const reverse = dest.meta._exits.get(destTile & 0xff, destType);
        if (reverse) {
          const [revTile, revType] = reverse;
          if ((revTile >>> 8) === loc.id && (revTile & 0xff) === pos &&
              revType === type) {
            add.push([loc === this ? that : this, pos, type,
                      [destTile, destType]]);
            continue;
          }
        }
        del.push([loc, pos, type]);
      }
    }
    for (const [loc, pos, type] of del) {
      loc._exits.delete(pos, type);
    }
    for (const [loc, pos, type, exit] of add) {
      loc._exits.set(pos, type, exit);
    }
    // this._exits = new Table(exits);
    // that._exits = new Table(exits);
  }

  /**
   * Saves the current state back into the underlying location.
   * Currently this only deals with entrances/exits.
   */
  write() {
    const srcLoc = this.rom.locations[this.id];
    for (const [srcPos, srcType, [destTile, destType]] of this._exits) {
      const srcScreen = this._screens[srcPos + 0x10];
      const dest = destTile >> 8;
      let destPos = destTile & 0xff;
      const destLoc = this.rom.locations[dest];
      const destMeta = destLoc.meta!;
      const destScreen = destMeta._screens[(destTile & 0xff) + 0x10];
      const srcExit = srcScreen.data.exits?.find(e => e.type === srcType);
      const destExit = destScreen.data.exits?.find(e => e.type === destType);
      if (!srcExit || !destExit) {
        throw new Error(`Missing exit:
  From: ${srcLoc} @ ${hex(srcPos)}:${srcType} ${srcScreen.name}
  To:   ${destLoc} @ ${hex(destPos)}:${destType} ${destScreen.name}`);
      }
      // See if the dest entrance exists yet...
      let entrance = 0x20;
      if (!destExit.type.startsWith('seamless')) {
        let destCoord = destExit.entrance;
        if (destCoord > 0xefff) { // handle special case in Oak
          destPos += 0x10;
          destCoord -= 0x10000;
        }
        entrance = destLoc.findOrAddEntrance(destPos, destCoord);
      }
      for (let tile of srcExit.exits) {
        //if (srcExit.type === 'edge:bottom' && this.height === 1) tile -= 0x20;
        srcLoc.exits.push(Exit.of({screen: srcPos, tile, dest, entrance}));
      }
    }
    srcLoc.width = this._width;
    srcLoc.height = this._height;
    srcLoc.screens = [];
    for (let y = 0; y < this._height; y++) {
      const row: number[] = [];
      srcLoc.screens.push(row);
      for (let x = 0; x < this._width; x++) {
        row.push(this._screens[(y + 1) << 4 | x].sid);
      }
    }
    srcLoc.tileset = this.tileset.tilesetId;
    srcLoc.tileEffects = this.tileset.effects().id;

    // write flags
    srcLoc.flags = [];
    const freeFlags = [...this.freeFlags];
    for (const screen of this.allPos()) {
      const scr = this._screens[screen + 16];
      let flag: number|undefined;
      if (scr.data.wall != null) {
        flag = freeFlags.pop()?.id ?? this.rom.flags.alloc(0x200);
      } else if (scr.flag === 'always') {
        flag = this.rom.flags.AlwaysTrue.id;
      } else if (scr.flag === 'calm') {
        flag = this.rom.flags.CalmedAngrySea.id;
      } else if (scr.flag === 'custom:false') {
        flag = this.customFlags.get(screen)?.id;
      } else if (scr.flag === 'custom:true') {
        flag = this.customFlags.get(screen)?.id ?? this.rom.flags.AlwaysTrue.id;
      }
      if (flag != null) {
        srcLoc.flags.push(LocationFlag.of({screen, flag}));
      }
    }

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
const DIR_NAME = ['above', 'left of', 'below', 'right of'];
