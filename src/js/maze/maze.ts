import {hex, hex5, seq} from "../rom/util.js";
import {Location, Flag} from "../rom/location.js";
import {Random} from "../random.js";
import {DefaultMap, Multiset, assertNever} from "../util.js";
import {UnionFind} from "../unionfind.js";
import { Rom } from "../rom.js";

export class Maze implements Iterable<[Pos, Scr]> {

  private map: Array<Scr|undefined>;
  private counts?: Multiset<Scr>;
  private border: Array<Scr>;
  //private mapStack: Array<Array<Scr|undefined>> = [];

  private screens: Map<Scr, Spec>;
  private screenExtensions: DefaultMap<number, ReadonlyArray<readonly [Dir, Scr]>>;

  private allPos: Set<Pos>;
  private allPosArray: readonly Pos[];
  // Mapping to actual tile slots, from consolidate
  private extraTilesMap: number[] = [];

  constructor(private readonly random: Random,
              public height: number,
              public width: number,
              screens: readonly Spec[],
              private readonly extraTiles?: Array<readonly number[]>) {
    this.map = new Array(height << 4).fill(undefined);
    this.screens = new Map(screens.map(spec => [spec.edges, spec]));
    this.allPos = new Set(
        ([] as Pos[]).concat(
            ...seq(height, y => seq(width, x => (y << 4 | x) as Pos))));
    this.allPosArray = [...this.allPos];

    const extensions = new DefaultMap<number, Array<[Dir, Scr]>>(() => []);
    for (const [screen, spec] of this.screens) {
      if (spec.fixed) continue;
      for (const dir of Dir.ALL) {
        const mask = 0xf << (dir << 2);
        if (screen & mask) {
          extensions.get(screen & ~mask & 0xffff).push([dir, screen]);
        }
      }
    }
    this.screenExtensions = extensions;
    this.border = new Array(height << 4).fill(0 as Scr);
    if (extraTiles) this.counts = new Multiset();
  }

  // Higher-level functionality

  * alternates(): IterableIterator<[Pos, number, Scr, Spec]> {
    for (const pos of this.allPos) {
      const scr = this.map[pos];
      if (scr == null) continue;
      for (let bit = 0x1_0000; bit < 0x10_0000; bit <<= 1) {
        const newScr = (scr | bit) as Scr;
        const spec = this.screens.get(newScr);
        if (!(scr & bit) && spec) {
          yield [pos, bit, newScr, spec];
        }
      }
    }
  }

  saveExcursion(f: () => boolean): boolean {
    let m = [...this.map];
    let c = this.counts ? [...this.counts] : null;
    let b = [...this.border];
    try {
      if (f()) return true;
    } catch (err) {
      this.map = m;
      this.border = b;
      if (c) this.counts = new Multiset(c);
      throw err;
    }
    this.map = m;
    this.border = b;
    if (c) this.counts = new Multiset(c);
    return false;
  }

  /**
   * Finds all screens that can be extended with an extra exit.
   * Returns an array of quads.
   */
  * extensions(): IterableIterator<[Pos, Scr, Dir, number]> {
    const uf = new UnionFind<Pos>();
    const extensions: Array<[Pos, Scr, Dir, number]> = [];
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
          if (!this.map[neighbor] && this.inBounds(neighbor)) {
            extensions.push([pos, ext, dir, 0]);
          }
        }
      }
    }
    for (const ext of extensions) {
      const [pos, , dir] = ext;
      ext[3] = uf.find(Pos.plus(pos, dir)) << 4 | Scr.edge(ext[1], ext[2]);
      yield ext;
    }
  }

  * eligible(pos: Pos, opts: FillOpts = {}): IterableIterator<Scr> {
    // Build up the constraint.
    const {skipAlternates, maxExits, edge, fuzzy, stair} = opts;
    const defaultScreen =
        edge != null ? edge | edge << 4 | edge << 8 | edge << 12 : undefined;
    let mask = 0;
    let fuzzyMask = 0;
    let constraint = 0;
    for (const dir of Dir.ALL) {
      const edgeMask = Dir.edgeMask(dir);
      const invMask = Dir.edgeMask(Dir.inv(dir));
      let screen = this.get(pos, dir);
      if (screen == null) screen = defaultScreen as Scr | undefined;
      if (screen == null) continue;
      constraint |= ((screen & invMask) >>> 8 | (screen & invMask) << 8) & 0xffff;
      mask |= edgeMask;
      if (fuzzy && this.isFixed(Pos.plus(pos, dir))) fuzzyMask |= edgeMask;
    }
    if (!fuzzy) fuzzyMask = mask;
    const fuzzyConstraint = constraint & fuzzyMask;
    let screens: Scr[] = [];
    let fuzziness = Infinity;

    // Now iterate over available screens to find matches.
    for (const [screen, spec] of this.screens) {
      if (spec.fixed) continue;
      if (skipAlternates && (spec.edges & ~0xffff)) continue;
      if (stair != null && !spec.stairs.some(s => s.dir === stair)) continue;
      if (stair == null && spec.stairs.length) continue;
      if ((screen & fuzzyMask) !== fuzzyConstraint) continue;
      if (maxExits && Scr.numExits(screen) > maxExits) continue;
      if (!fuzzy) {
        yield screen;
      } else {
        let fuzz = 0;
        const cmp = (screen & mask) ^ constraint;
        for (const d of Dir.ALL) {
          if (cmp & (0xf << Dir.shift(d))) fuzz++;
        }
        if (fuzz < fuzziness) {
          fuzziness = fuzz;
          screens = [screen];
        } else if (fuzz === fuzziness) {
          screens.push(screen);
        }
      } 
    }
    if (fuzzy) yield* screens;
  }

  fill(pos: Pos, opts: FillOpts = {}): boolean {
    // if (opts.edge != null) {
    //   const {edge, ...rest} = opts;
    //   if (Object.keys(rest).length) {
    //     throw new Error(`edge option incompatible with rest`);
    //   }
    // }
    if (opts.force && opts.fuzzy) throw new Error(`invalid`);
    const eligible = [...this.eligible(pos, opts)];
    if (!eligible.length) {
      //console.error(`No eligible tiles for ${hex(pos)}`);
      return false;
    }
    if (opts.fuzzy) {
      return this.setAndUpdate(pos, this.random.pick(eligible), opts);
    }
    this.set(pos, this.random.pick(eligible), opts);
    return true;
  }

  // pos should be the last already-set tile before the new ones
  // adds N+1 screens where N is length of path
  fillPath(pos: Pos, dir: Dir, path: Path, exitType: number, opts: FillOpts = {}): boolean {
    return this.saveExcursion(() => {
      const pathSaved = [...path];
      for (const step of pathSaved) {
        const nextDir = Dir.turn(dir, step);
        pos = Pos.plus(pos, dir);
        const screen = Scr.fromExits(DirMask.of(Dir.inv(dir), nextDir), exitType);
        if (!this.trySet(pos, screen, opts)) return false;
        dir = nextDir;
      }
      return this.fill(Pos.plus(pos, dir), {...opts, maxExits: 2});
    });
  }

  fillAll(opts: FillOpts = {}): boolean {
    const allPos = opts.shuffleOrder ?
        this.random.shuffle([...this.allPos]) : this.allPos;
    // Fill the rest with zero
    for (const pos of allPos) {
      if (this.map[pos] == null) {
        if (!this.fill(pos, opts)) {
          if (opts.fuzzy) return false;
          //   console.log(`failed at ${hex(pos)}`); return false;
          // }
          throw new Error(`Could not fill ${hex(pos)}`);
        }
      }
    }
    return true;
  }

  randomPos(): Pos {
    return this.random.pick(this.allPosArray);
  }

      // TODO - percolation!
      // back off on "fixed", just have an "arrange" method for
      // each cave, and then percolate() takes a set of fixed pos
      // that it won't touch.
      //  - maybe percolateEdges(edge#) vs percolateScreen(scr#)
      //  - each step updates neighbors (until it reaches a cycle?)


  // }

  // Maybe try to "upgrade" a plain screen?
  addScreen(scr: Scr): Pos | undefined {
    for (const pos of this.random.shuffle([...this.allPos])) {
      if (this.map[pos] != null) continue;
      if (this.trySet(pos, scr)) {
        return pos;
      }
    }
    return undefined;
  }

  

  // * openExits(pos: Pos, screen: Scr): IterableIterator<[Dir, number]> {
  //   for (const dir of Dir.ALL) {
  //     const neighbor = Pos.plus(pos, dir);
  //     if (this.inBounds(neighbor) && this.map[neighbor] == null) {
  //       const edge = Scr.edge(screen, dir);
  //       if (edge) yield [dir, edge];
  //     }
  //   }
  // }

  // * eligibleTunnelExits(pos: Pos): IterableIterator<[Scr, Dir, number]> {
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
    const exts = new DefaultMap<number, Array<[Pos, Scr, Dir, number]>>(() => []);
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
      //const start = Pos.plus(pos1, dir1);
      const end = Pos.plus(pos2, dir2);
      if (Pos.plus(pos1, dir1) === end) {
        // Trivial case
        return this.fill(end, {maxExits: 2, replace: true});
      }
      // Find clear path given exit type
      const [forward, right] = relative(pos1, dir1, end);
      let attempts = 0;
      for (const path of generatePaths(this.random, forward, right)) {
        if (this.fillPath(pos1, dir1, path, exitType, {replace: true})) break;
        if (++attempts > 20) return false;
      }
      // return this.fill(end, 2); // handled in fillPath
      return true;
    });
  }

  connect(pos1: Pos, dir1: Dir, pos2: Pos, dir2: Dir): boolean {
    const exitType = Scr.edge(this.map[pos1] || 0 as Scr, dir1);
    if (exitType !== Scr.edge(this.map[pos2] || 0 as Scr, dir2)) {
      throw new Error(`Incompatible exit types`);
    }
    pos2 = Pos.plus(pos2, dir2);
    const [forward, right] = relative(pos1, dir1, pos2);
    //pos1 = Pos.plus(pos1, dir1);
    let attempts = 0;
    for (const path of generatePaths(this.random, forward, right)) {
      if (this.fillPath(pos1, dir1, path, exitType)) break;
      if (++attempts > 20) return false;
    }
    // return this.fill(pos2, 2); // handled in fillPath
    return true;
  }

  // // Assumes all 6 tunnel screens are available for each exit type.
  // makeLoop(start: Pos, startDir: Dir, end: Pos): boolean {
  //   return this.saveExcursion(() => {
  //     const [forward, right] = relative(start, startDir, end);

  //     // const vertical = (exitType << 8 | exitType) as Scr;
  //     // const horizontal = (vertical << 4) as Scr;
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

  isFixed(pos: Pos): boolean {
    if (!this.inBounds(pos)) return true;
    const scr = this.map[pos];
    if (scr == null) return false;
    const spec = this.screens.get(scr);
    return !!(spec != null && (spec.fixed || spec.stairs.length))
  }

  density(): number {
    const count = this.allPosArray.filter(pos => this.map[pos]).length;
    return count / (this.width * this.height);
  }

  size(): number {
    return this.allPosArray.filter(pos => this.map[pos]).length;
  }

  /** Trim the size of the map by removing empty rows/columns. */
  trim(): void {
    // First figure out which screens are actually "empty".
    const empty = new Set<number>();
    for (const spec of this.screens.values()) {
      if (!spec.edges) empty.add(spec.tile);
    }
    const isEmpty = (pos: number) =>
        !this.map[pos] || empty.has(this.screens.get(this.map[pos]!)!.tile);
    // Now go through rows and columns from the edges to find empties.
    for (const y = 0;;) {
      if (!seq(this.width, x => y << 4 | x).every(isEmpty)) break;
      this.map.splice(0, 16)
      this.border.splice(0, 16);
      this.height--;
    }
    for (let y = this.height - 1; y >= 0; y--) {
      if (!seq(this.width, x => y << 4 | x).every(isEmpty)) break;
      this.map.splice((this.height - 1) << 4, 16);
      this.border.splice((this.height - 1) << 4, 16);
      this.height--;
    }
    for (const x = 0;;) {
      if (!seq(this.height, y => y << 4 | x).every(isEmpty)) break;
      for (let y = this.height - 1; y >= 0; y--) {
        delete this.map[y << 4 | x];
        this.border[y << 4 | x] = 0 as Scr;
      }
      this.map.push(this.map.shift());
      this.width--;
    }
    for (let x = this.width - 1; x >= 0; x--) {
      if (!seq(this.height, y => y << 4 | x).every(isEmpty)) break;
      for (let y = this.height - 1; y >= 0; y--) {
        delete this.map[y << 4 | x];
        this.border[y << 4 | x] = 0 as Scr;
      }
      this.width--;
    }
  }

  * [Symbol.iterator](): IterableIterator<[Pos, Scr]> {
    for (const pos of this.allPos) {
      const scr = this.map[pos];
      if (scr != null) yield [pos, scr];
    }
  }

  get(pos: Pos, dir?: Dir): Scr | undefined {
    const pos2 = dir != null ? Pos.plus(pos, dir) : pos;
    if (!this.inBounds(pos2)) {
      return (this.border[pos] & (0xf << ((dir! ^ 2) << 2))) as Scr;
    }
    return this.map[pos2];
  }

  getEdge(pos: Pos, dir: Dir): number | undefined {
    const scr = this.map[pos];
    if (scr == null) return undefined;
    return (scr >> Dir.shift(dir)) & 0xf;
  }

  getSpec(pos: Pos): Spec | undefined {
    const scr = this.map[pos];
    return scr != null ? this.screens.get(scr) : scr;
  }

  setBorder(pos: Pos, dir: Dir, edge: number): void {
    if (!this.inBounds(pos) || this.inBounds(Pos.plus(pos, dir))) {
      throw new Error(`Not on border: ${hex(pos)}, ${dir}`); // `
    }
    if (this.map[pos] != null) throw new Error(`Must set border first.`);
    const shift = (dir ^ 2) << 2;
    if (this.border[pos] & (0xf << shift)) throw new Error(`Border already set`);
    (this.border[pos] as number) |= (edge << shift);
  }

  replaceEdge(pos: Pos, dir: Dir, edge: number): boolean {
    const pos2 = Pos.plus(pos, dir);
    if (!this.inBounds(pos)) throw new Error(`Out of bounds ${hex(pos)}`);
    if (!this.inBounds(pos2)) throw new Error(`Out of bounds ${hex(pos2)}`);
    let scr1 = this.map[pos];
    let scr2 = this.map[pos2];
    if (scr1 == null) throw new Error(`No screen for ${hex(pos)}`);
    if (scr2 == null) throw new Error(`No screen for ${hex(pos2)}`);
    const mask1 = Dir.edgeMask(dir);
    const edge1 = edge << Dir.shift(dir);
    const mask2 = Dir.edgeMask(Dir.inv(dir));
    const edge2 = edge << Dir.shift(Dir.inv(dir));
    scr1 = ((scr1 & ~mask1) | edge1) as Scr;
    scr2 = ((scr2 & ~mask2) | edge2) as Scr;
    if (!this.screens.has(scr1)) return false;
    if (!this.screens.has(scr2)) return false;
    this.setInternal(pos, scr1);
    this.setInternal(pos2, scr2);
    return true;
  }

  setAndUpdate(pos: Pos, scr: Scr, opts: FillOpts = {}): boolean {
    return this.saveExcursion(() => {
      const newOpts = {
        ...opts,
        fuzzy: opts.fuzzy && opts.fuzzy - 1,
        replace: true,
      };
      this.setInternal(pos, scr);
      for (const dir of Dir.ALL) {
        if (!this.checkFit(pos, dir)) {
          const pos2 = Pos.plus(pos, dir);
          if (this.isFixed(pos2)) return false;
          if (!this.fill(pos2, newOpts)) return false;
        }
      }
      return true;
    });
  }

  // NOTE: it's not required that screen be an element of this.screens.
  set(pos: Pos, screen: Scr, opts: FillOpts = {}): void {
    // TODO - instead of force, consider allowing OUTSIDE EDGES to be non-zero?
    //      - maybe use the border? or a separate array?
    const ok = opts.force ? true :
        opts.replace ? this.fits(pos, screen) :
        this.fitsAndEmpty(pos, screen);
    if (!ok) {
      const prev = this.map[pos];
      const hexPrev = prev != null ? hex5(prev) : 'empty';
      throw new Error(`Cannot overwrite ${hex(pos)} (${hexPrev}) with ${hex5(screen)}`);
    }
    if (!this.screens.has(screen)) throw new Error(`No such screen ${hex5(screen)}`);
    if (this.inBounds(pos)) this.setInternal(pos, screen);
  }

  trySet(pos: Pos, screen: Scr, opts: FillOpts = {}): boolean {
    const ok = opts.force ? true :
        opts.replace ? this.fits(pos, screen) :
        this.fitsAndEmpty(pos, screen);
    if (!ok) return false;
    if (!this.screens.has(screen)) throw new Error(`No such screen ${hex5(screen)}`);
    this.setInternal(pos, screen);
    return true;
  }

  replace(pos: Pos, screen: Scr): void {
    if (!this.fits(pos, screen) || !this.inBounds(pos)) {
      throw new Error(`Cannot place ${hex5(screen)} at ${hex(pos)}`); // `
    }
    if (!this.screens.has(screen)) throw new Error(`No such screen ${hex5(screen)}`); // `
    this.setInternal(pos, screen);
  }

  private setInternal(pos: Pos, scr: Scr): void {
    const prev = this.map[pos];
    this.map[pos] = scr;
    if (this.counts) {
      if (prev != null) this.counts.delete(prev);
      this.counts.add(scr);
    }
  }

  fitsAndEmpty(pos: Pos, screen: Scr): boolean {
    return this.empty(pos) && this.fits(pos, screen);
  }

  empty(pos: Pos): boolean {
    return this.map[pos] == null && this.inBounds(pos);
  }

  fits(pos: Pos, screen: Scr): boolean {
    for (const dir of Dir.ALL) {
      const neighbor = this.get(pos, dir);
      if (neighbor == null) continue; // anything is fair game
      if (Scr.edge(screen, dir) !== Scr.edge(neighbor, Dir.inv(dir))) {
        return false;
      }
    }
    return true;
  }

  checkFit(pos: Pos, dir: Dir): boolean {
    const scr = this.get(pos);
    const neighbor = this.get(pos, dir);
    if (scr == null || neighbor == null) return true; // anything is fair game
    if (Scr.edge(scr, dir) !== Scr.edge(neighbor, Dir.inv(dir))) {
      return false;
    }
    return true;
  }

  traverse(opts: TraverseOpts = {}): Map<number, Set<number>> {
    // Returns a map from unionfind root to a list of all reachable tiles.
    // All elements of set are keys pointing to the same value ref.
    const without = new Set(opts.without || []);
    const uf = new UnionFind<number>();
    for (const pos of this.allPos) {
      if (without.has(pos)) continue;
      const scr = this.map[pos];
      if (scr == null) continue;
      const spec = this.screens.get(scr);
      if (spec == null) continue;
      for (const connection of spec.connections) {
        uf.union(connection.map(c => (pos << 8) + c));
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

  /** Adjust screens until we fit. */
  consolidate(available: number[], check: () => boolean, rom: Rom): boolean {
    if (!this.counts || !this.extraTiles) {
      throw new Error(`Cannot run consolidate without counts.`);
    }
    // tile slots we can actually use
    const availableSet = new Set(available);
    // screens that are "in play"
    const mutableScreens = new Set<Scr>();
    for (const spec of this.screens.values()) {
      if (spec.fixed) continue;
      if (spec.tile < 0 || availableSet.has(spec.tile)) {
        mutableScreens.add(spec.edges);
      }
    }

    // Count extra tiles in the map that are not mutable
    // Target: this.counts.unique() === extra + screens.size
    const extra = new Set<Scr>();
    for (const [scr] of this.counts) {
      if (!mutableScreens.has(scr)) extra.add(scr);
    }
    const target = extra.size + available.length;

    // Try to turn a bad screen into a good screen
    let attempts = 1000;
    while (this.counts.unique() > target && --attempts) {
      const sorted =
          [...this.counts]
              .filter((x) => mutableScreens.has(x[0]))
              .sort((a, b) => b[1] - a[1])
              .map(x => x[0]);
      const good = new Set(sorted.slice(0, available.length));
      const bad = new Set(sorted.slice(available.length));
      const shuffled = this.random.shuffle([...this.allPos]);
      for (const pos of shuffled) {
        if (!bad.has(this.map[pos]!)) continue;
        if (this.tryConsolidate(pos, good, bad, check)) break;
      }
    }
    if (!attempts) return false;

    // Consolidation succeeded - fix up the screens
    const used = new Set(
        [...this.counts]
            .filter((x) => mutableScreens.has(x[0]))
            .map(x => x[0]));

    const freed = []; // tiles
    for (const scr of mutableScreens) {
      const spec = this.screens.get(scr);
      if (!spec) throw new Error('missing spec');
      if (spec.tile >= 0) {
        if (used.has(scr)) {
          // If it has a tile and is used, then nothing to do.
          used.delete(scr);
        } else {
          // If it's not used then make it available.
          freed.push(spec.tile);
        }
      }
    }
    for (const scr of used) {
      // At this point it's guaranteed not to have a tile, but one's available.
      const next = freed.pop();
      const spec = this.screens.get(scr);
      if (next == null || !spec) throw new Error(`No available screen`);
      rom.screens[next].tiles.splice(0, 0xf0, ...this.extraTiles[~spec.tile]);
      this.extraTilesMap[~spec.tile] = next;
    }
    return true;
  }

  /** Try to make a bad screen into a good screen. */
  tryConsolidate(pos: Pos, good: Set<Scr>, bad: Set<Scr>,
                 check: () => boolean): boolean {
    const scr = this.map[pos];
    if (scr == null) throw new Error(`Expected defined`);
    for (const newScr of this.random.shuffle([...good])) {
      // is g a single edge off?
      const diff = scr ^ newScr;
      for (const dir of Dir.ALL) {
        const mask = Dir.edgeMask(dir);
        if (diff & ~mask) continue;
        // dir is the only difference.  Look at neighbor
        const pos2 = Pos.plus(pos, dir); 
        const scr2 = this.map[pos2];
        if (scr2 == null) break;
        if (!bad.has(scr2) && !good.has(scr2)) break;
        const edge = (newScr >>> Dir.shift(dir)) & 0xf;
        const dir2 = Dir.inv(dir);
        const mask2 = Dir.edgeMask(dir2);
        const newScr2 = ((scr2 & ~mask2) | (edge << Dir.shift(dir2))) as Scr;
        if (bad.has(newScr2) && !bad.has(scr2)) break;
        const ok = this.saveExcursion(() => {
          this.setInternal(pos, newScr);
          this.setInternal(pos2, newScr2);
          return check();
        });
        if (ok) return true;
      }
    }
    return false;
  }

  // For now, just show broad structure.
  show(): string {
    const header = ' ' + seq(this.width).join('') + '\n';
    const body = seq(this.height, y => y.toString(16) + seq(this.width, x => {
      const pos = y << 4 | x;
      const scr = this.map[pos];
      if (scr == null) return ' ';
      const spec = this.screens.get(scr);
      if (spec) return spec.icon;
      // build it up manually
      let index = 0;
      for (const dir of Dir.ALL) {
        if (scr & (0xf << (dir << 2))) index |= (1 << (dir << 2));
      }
      return UNICODE_TILES[index] || ' ';
    }).join('')).join('\n');
    return header + body;
  }

  write(loc: Location, availableFlags: Set<number>) {
    for (const flag of loc.flags) {
      availableFlags.add(flag.flag);
    }
    loc.flags = [];
    loc.width = this.width;
    loc.height = this.height;
    for (let y = 0; y < this.height; y++) {
      loc.screens[y] = [];
      for (let x = 0; x < this.width; x++) {
        const pos = y << 4 | x;
        const scr = this.map[pos];
        if (scr == null) throw new Error(`Missing screen at pos ${hex(pos)}`);
        const spec = this.screens.get(scr);
        if (!spec) throw new Error(`Missing spec for ${hex5(scr)} at ${hex(pos)}`);
        const tile = spec.tile < 0 ? this.extraTilesMap[~spec.tile] : spec.tile;
        loc.screens[y].push(tile);
        if (spec.flag) loc.flags.push(Flag.of({screen: pos, flag: 0x2ef}));
        // if (spec.wall) {
        //   // pop an available flag and use that.
        //   loc.flags.push();
        // }
      }
    }
  }
}

interface TraverseOpts {
  // Do not pass certain tiles in traverse
  readonly without?: readonly Pos[];
}

interface FillOpts {
  // Max number of exits
  readonly maxExits?: number;
  // Edge type to use when unconstrained
  readonly edge?: number;
  // Required stair direction
  readonly stair?: Dir;
  // Whether to force the set
  readonly force?: boolean;
  // If we're fuzzy then allow a non-fixed edge to not match
  readonly fuzzy?: number;
  // Shuffle the order of the tiles to fill
  readonly shuffleOrder?: boolean;
  // Do not pick alternate tiles (>ffff)
  readonly skipAlternates?: boolean;
  // Allow replacing
  readonly replace?: boolean;
}

  
/** Spec for a screen. */
export interface Spec {
  readonly edges: Scr;
  readonly tile: number;
  readonly icon: string;
  readonly connections: Connections;
  readonly fixed: boolean;
  readonly flag: boolean;
  readonly wall: boolean;
  readonly stairs: Stair[];
  readonly pit: boolean;
}

// pixel is four nibbles: YyXx of exact pixel on screen.
declare const STAIR_NOMINAL: unique symbol;
export class Stair {
  [STAIR_NOMINAL]: never;
  private constructor(readonly dir: Dir, readonly entrance: number,
                      readonly exit: number) {}
  static up(entrance: number, exit: number): Stair {
    return new Stair(Dir.UP, entrance, exit);
  }
  static down(entrance: number, exit: number): Stair {
    return new Stair(Dir.DOWN, entrance, exit);
  }
}

export function wall(a: number, b: number): Array<'wall'|number> {
  let count = b;
  while (count) {
    count >>= 4;
    a <<= 4;
  }
  return ['wall', a | b];
}

type Connections = ReadonlyArray<ReadonlyArray<number>>;
type SpecFlag = 'fixed' | 'flag' | 'pit' | 'wall';
type ExtraArg = number | Stair | SpecFlag;

export function Spec(edges: number,
                     tile: number,
                     icon: string,
                     ...extra: Array<ExtraArg>): Spec {
  const connections = [];
  let fixed = false;
  let flag = false;
  let wall = false;
  let pit = false;
  let stairs = [];
  for (let data of extra) {
    if (typeof data === 'string') {
      if (data === 'fixed') {
        fixed = true;
      } else if (data === 'flag') {
        flag = true;
      } else if (data === 'wall') {
        wall = true;
      } else if (data === 'pit') {
        pit = true;
      } else {
        assertNever(data);
      }
    } else if (typeof data === 'number') {
      const connection: number[] = [];
      connections.push(connection);
      while (data) {
        // Each of the four edges has possible exits 1, 2, and 3,
        // represented by that corresponding tile.  The 4 bit is
        // for left/right edge and the 8 bit is for right/bottom.
        const channel = (data & 3) << (data & 4); // 01, 02, 03, 10, 20, or 30
        const offset = data & 8 ? (data & 4 ? 0x0100 : 0x1000) : 0;
        connection.push(channel | offset);
        data >>>= 4;
      }
    } else if (data instanceof Stair) {
      stairs.push(data);
    } else {
      assertNever(data);
    }
  }
  return {edges: edges as Scr,
          tile, icon, connections,
          fixed, flag, wall, pit, stairs};
}

// function* intersect<T>(a: Iterable<T>, b: Iterable<T>): IterableIterator<T> {
//   const set = new Set(a);
//   for (const x of b) {
//     if (set.has(x)) yield x;
//   }
// }

// 0 is straight, -1 is left turn, +1 is right turn
type Turn = 0 | -1 | 1;

// Returns [forward, right]
// e.g. (p1 = 65, d1 = up, p2 = 24) then fwd = 4, rt = -1
// but we need to fill 55, 45, 35, 34, 24 - so 4 rows
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

type Path = IterableIterator<Turn>;



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

const UNICODE_TILES: {[exits: number]: string} = {
  0x1010: '\u2500',
  0x0101: '\u2502',
  0x0110: '\u250c',
  0x1100: '\u2510',
  0x0011: '\u2514',
  0x1001: '\u2518',
  0x0111: '\u251c',
  0x1101: '\u2524',
  0x1110: '\u252c',
  0x1011: '\u2534',
  0x1111: '\u253c',
  0x1000: '\u2574',
  0x0001: '\u2575',
  0x0010: '\u2576',
  0x0100: '\u2577',
};

// NOTE: Screens 93, 9d are UNUSED!

/** Writes 2d data into a an Nx16 (flattened) array. */
export function write<T>(arr: T[], corner: number,
                         repl: ReadonlyArray<ReadonlyArray<T|undefined>>) {
  for (let i = 0; i < repl.length; i++) {
    for (let j = 0; j < repl[i].length; j++) {
      const x = repl[i][j];
      if (x != null) arr[corner + (i << 4 | j)] = x;
    }
  }
}

export function readScreen(str: string): number[] {
  const scr = str.split(/ +/g).map(x => parseInt(x, 16));
  for (const x of scr) {
    if (typeof x != 'number' || isNaN(x)) {
      throw new Error(`Bad screen: ${x} in ${str}`);
    }
  }
  return scr;
}
