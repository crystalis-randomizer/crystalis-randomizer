import {EDGE_TYPES, EntranceSpec, Spec, Survey} from './spec.js';
import {Dir, DirMask, Path, Pos, Scr} from './types.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Location, Flag, Spawn, Exit, Entrance} from '../rom/location.js';
import {Monster} from '../rom/monster.js';
import {hex, hex5, seq} from '../rom/util.js';
import {UnionFind} from '../unionfind.js';
import {DefaultMap, Multiset, iters} from '../util.js';

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
      for (let bit = 0x1_0000; bit < 0x20_0000; bit <<= 1) {
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
   * Returns an array of quads.  Fourth element in the quad is
   * a partition index, which includes exit type in the low nibble.
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
    const {allowed, skipAlternates, maxExits, edge, fuzzy, stair} = opts;
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
    const allowedMap: Iterable<readonly [Scr, Spec | undefined]> =
        allowed ?
            iters.map(allowed, s => [s, this.screens.get(s)] as const) :
            this.screens;
    for (const [screen, spec] of allowedMap) {
      if (!spec) throw new Error(`Bad Scr in 'allowed'!`)
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
      if (opts.deleteNeighbors) {
        for (const dir of Dir.ALL) {
          const pos1 = Pos.plus(pos, dir);
          if (!this.isFixed(pos1)) this.setInternal(pos1, null);
        }
      }
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
        let screen = Scr.fromExits(DirMask.of(Dir.inv(dir), nextDir), exitType);
        const alts = opts.pathAlternatives && opts.pathAlternatives.get(screen);
        if (alts) screen = (screen | (this.random.pick(alts) << 16)) as Scr;
        if (!this.trySet(pos, screen, opts)) return false;
        dir = nextDir;
      }
      return this.fill(Pos.plus(pos, dir), {...opts, maxExits: 2});
      // TODO - to fill a path ending in a dead end, we may want to
      // pass a separate "opts" and use maxExits: 1.
    });
  }

  fillAll(opts: FillOpts = {}): boolean {
    const allPos = opts.shuffleOrder ?
        this.random.shuffle([...this.allPos]) : this.allPos;
    // Fill the rest with zero
    for (const pos of allPos) {
      if (this.map[pos] == null) {
        if (!this.fill(pos, opts)) {
          if (opts.print) {
            console.log(`Could not fill ${hex(pos)}\n${this.show()}`);
          }
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

  addLoop(opts: FillOpts = {}): boolean {
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
        return this.fill(end, {...opts, maxExits: 2, replace: true});
      }
      // Find clear path given exit type
      const [forward, right] = Pos.relative(pos1, dir1, end);
      let attempts = 0;
      for (const path of Path.generate(this.random, forward, right)) {
        if (this.fillPath(pos1, dir1, path, exitType, {...opts, replace: true})) break;
        if (++attempts > 20) return false;
      }
      // return this.fill(end, 2); // handled in fillPath
      return true;
    });
  }

  // pos1 and pos2 are pos that have already been filled, with an empty neighbor
  connect(pos1: Pos, dir1?: Dir|null, pos2?: Pos|null, dir2?: Dir|null,
          opts?: FillOpts): boolean {
    // Infer directions if necessary
    if (dir1 == null) dir1 = this.findEmptyDir(pos1);
    if (dir1 == null) return false;
    const exitType = Scr.edge(this.map[pos1] || 0 as Scr, dir1);
    // If only one pos is given, connect to any existing path.
    // TODO - for now we connect at the closest possible point, in an attempt
    //        to avoid ridiculously circuitous paths.  May not be necessary?
    if (pos2 == null) {
      // For each possibility, store the distance to pos1.
      const exts: Array<[Pos, Scr, number]> = [];
      for (const [pos, scr,, exit] of this.extensions()) {
        if ((exit & 0xf) === exitType) {
          //const n = Pos.plus(pos, dir);
          exts.push([pos, scr, 0]); // Pos.hypot(n, pos1)]);
        }
      }
      if (!exts.length) return false;
      const ext = this.random.pick(exts);
      this.replace((pos2 = ext[0]), ext[1]);
    }

    if (dir2 == null) dir2 = this.findEmptyDir(pos2);
    if (dir1 == null || dir2 == null) return false;
    // Now start working
    if (exitType !== Scr.edge(this.map[pos2] || 0 as Scr, dir2)) {
      throw new Error(`Incompatible exit types`);
    }
    pos2 = Pos.plus(pos2, dir2);
    const [forward, right] = Pos.relative(pos1, dir1, pos2);
    //pos1 = Pos.plus(pos1, dir1);
    let attempts = 0;
    for (const path of Path.generate(this.random, forward, right)) {
      if (this.fillPath(pos1, dir1, path, exitType, opts)) break;
      if (++attempts > 20) return false;
    }
    // return this.fill(pos2, 2); // handled in fillPath
    return true;
  }

  private findEmptyDir(pos: Pos): Dir|null {
    const scr = this.map[pos];
    if (scr == null) return null;
    const dirs = [];
    for (const dir of Dir.ALL) {
      if (Scr.edge(scr, dir) && this.empty(Pos.plus(pos, dir))) {
        dirs.push(dir);
      }
    }
    return dirs.length === 1 ? dirs[0] : null;
  }

  // // Assumes all 6 tunnel screens are available for each exit type.
  // makeLoop(start: Pos, startDir: Dir, end: Pos): boolean {
  //   return this.saveExcursion(() => {
  //     const [forward, right] = Pos.relative(start, startDir, end);

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
      const newOpts = typeof opts.fuzzy === 'function' ? opts.fuzzy(opts) : {
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

  delete(pos: Pos): void {
    this.setInternal(pos, null);
  }

  private setInternal(pos: Pos, scr: Scr | null): void {
    const prev = this.map[pos];
    if (scr == null) {
      this.map[pos] = undefined;
      if (this.counts && prev != null) this.counts.delete(prev);
      return;
    }
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
    const flagged = !opts.noFlagged;
    const uf = new UnionFind<number>();
    for (const pos of this.allPos) {
      if (without.has(pos)) continue;
      const scr = this.map[pos];
      if (scr == null) continue;
      const spec = this.screens.get(scr);
      if (spec == null) continue;
      //if (opts.flight && spec.deadEnd) continue;
      for (const connection of spec.connections) {
        // Connect within each segment
        uf.union(connection.map(c => (pos << 8) + c));
      }
      if (spec.wall) {
        for (const connection of spec.wall.connections(flagged)) {
          // Connect the bridged segments
          uf.union(connection.map(c => (pos << 8) + c));
        }
      }
      if (opts.flight && spec.connections.length && !spec.deadEnd) {
        // Connect all the segments to each other
        uf.union(spec.connections.map(c => (pos << 8) + c[0]));
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
  show(hex = false): string {
    const header = ' ' + seq(this.width).join('') + '\n';
    const body = seq(this.height, y => y.toString(16) + seq(this.width, x => {
      const pos = y << 4 | x;
      const scr = this.map[pos];
      if (hex) {
        return ' ' + (scr || 0).toString(16).padStart(5, '0');
      }
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
      //console.log(`adding flag ${hex(flag.flag)}`);
      availableFlags.add(flag.flag);
    }
    let wallElement = 0;
    const wallSpawns = {'wall': [] as Spawn[], 'bridge': [] as Spawn[]};
    for (const spawn of loc.spawns) {
      const type = spawn.wallType();
      if (type) wallSpawns[type].push(spawn);
      if (type === 'wall') wallElement = spawn.wallElement();
    }
    //console.log(`wall spawns:`, wallSpawns, `available flags:`, availableFlags);
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
        if (spec.wall) {
          //console.log(`pos: ${hex(pos)}: ${hex5(scr)}`, spec.wall);
          // pop an available flag and use that.
          loc.flags.push(Flag.of({screen: pos, flag: pop(availableFlags)}));
          const spawn = wallSpawns[spec.wall.type].pop() || (() => {
            const s =
                Spawn.of({screen: pos, tile: spec.wall.tile,
                          type: 3,
                          id: spec.wall.type === 'wall' ? wallElement : 2});
            loc.spawns.push(s); // TODO - check for too many or unused?
            return s;
          })();
          spawn.screen = pos;
          spawn.tile = spec.wall.tile;
        }
      }
    }
  }

  finish(survey: Survey, loc: Location): boolean {
    this.trim();
    const finisher = new MazeFinisher(this, loc, survey, this.random);
    if (!finisher.shuffleFixed()) return fail('could not shuffle fixed', this);
    if (!finisher.placeExits()) return fail('could not place exits', this);
    this.write(loc, new Set()); // TODO - take set from elsewhere?
    // After this point, do nothing that could fail!
    // Clear exits: we need to re-add them later.
    finisher.placeNpcs();
    if (loc.rom.spoiler) {
      loc.rom.spoiler.addMaze(loc.id, loc.name, this.show());
    }
    return true;
  }
}

const DEBUG: boolean = false;
function fail(msg: string, maze?: Maze): false {
  if (DEBUG) console.error(`Reroll: ${msg}`);
  if (maze && DEBUG) console.log(maze.show());
  return false;
}

class MazeFinisher {

  readonly poi =
      new DefaultMap<number, Array<readonly [number, number]>>(() => []);
  readonly fixedPos = new DefaultMap<Scr, Pos[]>(() => []);
  readonly posMapping = new Map<Pos, Pos>();
  // positions of edge screens ([dir][ordinal]) that aren't fixed screens
  readonly allEdges: Array<Array<Pos>> = [[], [], [], []];
  // positions of edge screens ([dir][ordinal]) that are fixed screens
  readonly fixedEdges: Array<Array<Pos>> = [[], [], [], []];
  // positions and directions of all stairs
  readonly allStairs: Array<Array<readonly [Pos, EntranceSpec]>> =
      [[], [], [], []]; // NOTE: 1 and 3 unused
  // stairs may move to a different coordinate: map the delta so that we
  // can place triggers/NPCs in the right spot relative to it.
  readonly stairDisplacements = new Map<Pos, [number, number]>();

  constructor(readonly maze: Maze,
              readonly loc: Location,
              readonly survey: Survey,
              readonly random: Random) {
    // Initialize poi and fixedPos
    for (const [pos, scr] of maze) {
      const spec = this.maze.getSpec(pos)!;
      if (spec.fixed) this.fixedPos.get(scr).push(pos);
      for (const {priority, dy, dx} of spec.poi) {
        this.poi.get(priority)
            .push([((pos & 0xf0) << 4) + dy, ((pos & 0xf) << 8) + dx]);
      }
    }
    // Initialize allEdges and fixedEdges
    for (const dir of Dir.ALL) {
      for (const pos of Dir.allEdge(dir, maze.height, maze.width)) {
        const scr = maze.get(pos);
        if (!scr) continue;
        const edgeType = Scr.edge(scr, dir);
        if (edgeType && edgeType != 7) {
          // if (survey.specSet.fixedTiles.has(loc.screens[pos >> 4][pos & 0xf])) {
          // if (survey.specSet.fixedTiles.has(maze.getSpec(pos))) {
          if (survey.specSet.fixedTiles.has(
              (loc.screens[pos >> 4] || [])[pos & 0xf])) {
            this.fixedEdges[dir].push(pos);
          } else {
            this.allEdges[dir].push(pos);
          }
        }
      }
    }
    for (const [pos, scr] of maze) {
      // TODO - should no longer need STAIR_SCREENS w/ Maze#getSpec
      const dir = survey.specSet.stairScreens.get(scr);
      if (dir != null) this.allStairs[dir[0]].push([pos, dir[1]]);
    }
  }

  // Shuffles the fixed screens, updating posMapping
  shuffleFixed(): boolean {
    for (const fixed of this.fixedPos.values()) this.random.shuffle(fixed);
    for (const [pos0, spec] of this.survey.fixed) {
      const pos = this.fixedPos.get(spec.edges).pop();
      if (pos == null) return false; // throw new Error(`Unreplaced fixed screen`);
      this.posMapping.set(pos0, pos);
    }
    return true;
  }

  // Further updates posMapping as needed
  placeExits(): boolean {
    // First work on entrances, exits, and NPCs.
    // loc.entrances = [];
    this.loc.exits = [];
    for (const dir of Dir.ALL) {
      this.random.shuffle(this.allEdges[dir]);
      this.random.shuffle(this.fixedEdges[dir]);
    }
    this.random.shuffle(this.allStairs[Dir.UP]);
    this.random.shuffle(this.allStairs[Dir.DOWN]);
    // Shuffle first, then place stuff
    for (const [pos0, exit] of this.survey.edges) {
      const edgeList =
          this.survey.fixed.has(pos0) ? this.fixedEdges : this.allEdges;
      const edge: Pos | undefined = edgeList[exit.dir].pop();
      if (edge == null) return false; // throw new Error('missing edge');
      this.posMapping.set(pos0, edge);
      //mover(pos0, edge); // move spawns??
      const edgeType = Scr.edge(this.maze.get(edge)!, exit.dir);
      const edgeData = EDGE_TYPES[edgeType][exit.dir];
      this.loc.entrances[exit.entrance] =
          Entrance.of({screen: edge, coord: edgeData.entrance});
      for (const tile of edgeData.exits) {
        this.loc.exits.push(
            Exit.of({screen: edge, tile,
                     dest: exit.exit >>> 8, entrance: exit.exit & 0xff}));
      }
    }
    for (const [pos0, exit] of this.survey.stairs) {
      const stair: readonly [Pos, EntranceSpec] | undefined =
          this.allStairs[exit.dir].pop();
      if (stair == null) throw new Error('missing stair');
      this.posMapping.set(pos0, stair[0]);
      const entrance = this.loc.entrances[exit.entrance];
      const x0 = entrance.tile & 0xf;
      const y0 = entrance.tile >>> 4;
      entrance.screen = stair[0];
      entrance.coord = stair[1].entrance;
      const x1 = entrance.tile & 0xf;
      const y1 = entrance.tile >>> 4;
      this.stairDisplacements.set(pos0, [y1 - y0, x1 - x0]);
      for (const tile of stair[1].exits) {
        this.loc.exits.push(Exit.of({
          screen: stair[0], tile,
          dest: exit.exit >>> 8, entrance: exit.exit & 0xff}));
      }
    }
    return true;
  }

  placeMonster(spawn: Spawn, monsterPlacer: (m: Monster) => number|undefined) {
    const monster = this.loc.rom.objects[spawn.monsterId];
    if (!(monster instanceof Monster)) return;
    const pos = monsterPlacer(monster);
    if (pos == null) {
      console.error(
          `no valid location for ${hex(monster.id)} in ${hex(this.loc.id)}`);
      spawn.used = false;
    } else {
      spawn.screen = pos >>> 8;
      spawn.tile = pos & 0xff;
    }
  }

  // Move other NPCs.  Wall spawns have already been handled by Maze#write()
  placeNpcs(): void {
    // Keep track of spawns that may be on top of each other (e.g. people)
    const spawnMap = new Map<number, number>(); // map of old -> new yyyxxx
    const monsterPlacer = this.loc.monsterPlacer(this.random);
    for (const spawn of this.loc.spawns) {
      // Walls already moved (by maze#write).
      if (spawn.type === 3) continue;
      if (spawn.isMonster()) {
        this.placeMonster(spawn, monsterPlacer);
        continue;
      }
      // Check if there's a paired spawn at the same position already moved?
      const sameSpawn = spawnMap.get(spawn.y << 12 | spawn.x);
      if (sameSpawn != null) {
        spawn.y = sameSpawn >>> 12;
        spawn.x = sameSpawn & 0xfff;
        continue;
      }
      // Check if this screen is fixed and has been moved somewhere?
      const pos0 = spawn.screen as Pos;
      const mapped = this.posMapping.get(pos0);
      if (mapped != null) {
        spawn.screen = mapped;
        // If the remapping was a stairs, then we may have more work to do...
        // Specifically - if a trigger or NPC was next to a stair, make sure
        // it stays next to the stair.
        const displacement = this.stairDisplacements.get(pos0);
        if (displacement != null) {
          const [dy, dx] = displacement;
          spawn.yt += dy;
          spawn.xt += dx;
        }
      } else if (spawn.isTrigger()) {
        // Can't move triggers, need a way to handle them.
        if (spawn.id === 0x8c) {
          // Handle leaf abduction trigger behind zebu
          spawn.screen = this.posMapping.get(0x21 as Pos)! - 16;
        } else {
          console.error(`unhandled trigger: ${spawn.id}`);
        }
      } else {
        // NPCs, chests - pick a POI
        const keys = [...this.poi.keys()].sort((a, b) => a - b);
        if (!keys.length) throw new Error(`no poi`);
        for (const key of keys) {
          const displacements = this.poi.get(key)!;
          if (!displacements.length) continue;
          const oldSpawn = spawn.y << 12 | spawn.x;
          const i = this.random.nextInt(displacements.length);
          [[spawn.y, spawn.x]] = displacements.splice(i, 1);
          spawnMap.set(oldSpawn, spawn.y << 12 | spawn.x);
          if (!displacements.length) this.poi.delete(key);
          break;
        }
      }      
    }
  }
}

function pop<T>(set: Set<T>): T {
  for (const elem of set) {
    set.delete(elem);
    return elem;
  }
  throw new Error(`cannot pop from empty set`);
}

interface TraverseOpts {
  // Do not pass certain tiles in traverse
  readonly without?: readonly Pos[];
  // Whether to break walls/form bridges
  readonly noFlagged?: boolean;
  // Whether to assume flight
  readonly flight?: boolean;
}

export interface FillOpts {
  // Max number of exits
  readonly maxExits?: number;
  // Edge type to use when unconstrained
  readonly edge?: number;
  // Required stair direction
  readonly stair?: Dir;
  // Whether to force the set
  readonly force?: boolean;
  // If we're fuzzy then allow a non-fixed edge to not match
  readonly fuzzy?: number | ((opts: FillOpts) => FillOpts);
  // Shuffle the order of the tiles to fill
  readonly shuffleOrder?: boolean;
  // Do not pick alternate tiles (>ffff)
  readonly skipAlternates?: boolean;
  // Set of allowed screens to pick from
  readonly allowed?: Scr[];
  // Allowed alternatives for filling paths
  readonly pathAlternatives?: Map<Scr, readonly number[]>;
  // Allow replacing
  readonly replace?: boolean;
  // Delete neighboring tiles on failure
  readonly deleteNeighbors?: boolean;
  // // Try to avoid making "fake" tiles when possible, by
  // // looking for a non-fake neighbor to replace with.
  // readonly tryAvoidFakes?: boolean;
  // Debugging: print why we stopped
  readonly print?: boolean;
}


// function* intersect<T>(a: Iterable<T>, b: Iterable<T>): IterableIterator<T> {
//   const set = new Set(a);
//   for (const x of b) {
//     if (set.has(x)) yield x;
//   }
// }


// NOTE: Screens 93, 9d are UNUSED!

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
