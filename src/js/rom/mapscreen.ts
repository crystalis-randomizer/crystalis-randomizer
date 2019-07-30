import {Screen} from './screen.js';
import {TileEffects} from './tileeffects.js';
import {Tileset} from './tileset.js';
import {Random} from '../random.js';
import {UnionFind} from '../unionfind.js';
import {DefaultMap} from '../util.js';

export class MapScreen {

  readonly partition = new Map<number, number>();
  readonly partitions: Array<Set<number>> = [];

  readonly edges: readonly number[]; // 4 elems: top, right, bottom, left

  constructor(readonly screen: Screen, readonly tileset: Tileset) {
    const graph = new UnionFind<number>(); // all tiles
    const effects = tileset.effects().effects;
    const scr = screen.id << 8;
    function walkable(tile: number): boolean {
      const override = OVERRIDE.get(tile | scr);
      if (override != null) return override;
      let mt = screen.tiles[tile];
      let effect = effects[mt];
      if (mt < 0x20 && effect & TileEffects.ALTERNATIVE) {
        effect = effects[mt = tileset.alternates[mt]];
      }
      // NOTE: this includes pits
      return !(effect & (TileEffects.NO_WALK | TileEffects.IMPASSIBLE));
    }
    for (let y = 0; y < 0xf; y++) {
      for (let x = 0; x < 0x10; x++) {
        const t = y << 4 | x;
        if (!walkable(t)) continue;
        if (y && walkable(t - 16)) graph.union([t, t - 16]);
        if (x && walkable(t - 1)) graph.union([t, t - 1]);
      }
    }
    // Look at perimeter and center
    for (const set of graph.sets()) {
      let partition = null;
      for (const t of set) {
        if (!isPerimeter(t) && t !== 0x88) continue;
        if (!partition) this.partitions.push(partition = new Set<number>());
        partition.add(t);
        this.partition.set(t, this.partitions.length - 1);
      }
    }
    const edges = [0, 0, 0, 0];
    for (let i = 15; i >= 0; i--) {
      for (let j = 0; j < 4; j++) {
        edges[j] <<= 1;
        const tile = j < 2 ? (!j ? i : i << 4 | 0xf) : j === 2 ? 0xe0 | i : i << 4;
        if (this.partition.has(tile)) edges[j] |= 1;
      }
    }
    this.edges = edges;
  }
}

function isPerimeter(t: number): boolean {
  const col = t & 0x0f;
  const row = t & 0xf0;
  return !row || row === 0xe0 || !col || col === 0xf;
}

// override the walkable tile mask for the bottom of some screens
const OVERRIDE = new Map<number, boolean>([
  ...rows([
    [0x7200, 0b0000111111110000], // ignore gargoyles
    [0x72e0, 0b0000111111110000], // ignore gargoyles
    [0x73e0, 0b0000111111110000], // kelbesque 2 center dead end
    [0x9b00, 0b0000001111000000], // dead end
    [0x9be0, 0b0000001111000000], // dead end
    [0xfde0, 0b0000111111110000], // ignore stairs
  ]),
  ...cols([
    [0x7c00, 0], // swamp bug screen matches solid wall right/left
    [0x7c0f, 0], // (same)
  ])]);

function* rows(rows: Iterable<readonly [number, number]>): Iterable<[number, boolean]> {
  for (const [base, bits] of rows) {
    for (let i = 0; i < 16; i++) {
      yield [base | i, Boolean(bits & (1 << i))];
    }
  }
}

function* cols(cols: Iterable<readonly [number, number]>): Iterable<[number, boolean]> {
  for (const [base, bits] of cols) {
    for (let i = 0; i < 15; i++) {
      yield [base | i << 4, Boolean(bits & (1 << i))];
    }
  }
}

// // pretend "walkable" tiles on dead end screens
// const OVERRIDE1 = new Map<number, boolean>([
//   // help match narrow door ?
//   [0x9ae6, true],
//   [0x9ae9, true],
//   // vertical dead end
//   [0x9be6, true],
//   [0x9be7, true],
//   [0x9be8, true],
//   [0x9be9, true],
// ]);

export class MapBuilder {
  /** Positive is temporary, ones complement is permanent. */
  screens: Array<number | undefined> = [];
  /** Screen IDs that can be used, by constraint (dir | edge << 2). */
  private readonly edges = new DefaultMap<number, Set<number>>(() => new Set());
  /** Screen indices (pos) that have at least one non-empty constraint. */
  private eligible: number[] = [];
  /** All constraints, indexed by [pos][dir]. */
  private constraints: number[][] = [];
  /** Set of all un-bounds screen positions. */
  private readonly inBounds = new Set<number>();

  constructor(readonly tileset: Tileset,
              availableScreens: number[],
              readonly random: Random,
              readonly height: number,
              readonly width: number) {
    for (const scr of availableScreens) {
      for (let dir = 0; dir < 4; dir++) {
        const edge = tileset.screens[scr].edges[dir];
        this.edges.get(dir | edge << 2).add(scr);
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.inBounds.add(y << 4 | x);
      }
    }
  }

  /** Checks whether the given screen position is included in this map. */
  isInBounds(pos: number): boolean {
    return pos >= 0 && (pos >>> 4) < this.height && (pos & 0xf) < this.width;
  }

  /** Reset screens, eligible, and constraints. */
  reset(): void {
    // Clear everything out except fixed screens.
    this.eligible = [];
    this.constraints = [];
    for (const i of this.inBounds) {
      if (this.screens[i] as number < 0) {
        // fixed, do nothing.
      } else {
        this.screens[i] = undefined;
        delete this.constraints[i];
      }
    }
    // Initialize constraints.
    for (const pos of this.inBounds) {
      this.initConstraints(pos);
    }
  }

  /** Initializes constraints for a single map screen, based on current map. */
  initConstraints(pos: number): void {
    delete this.constraints[pos];
    for (let dir of Dir) {
      const n = pos + DELTA[dir];
      if (this.inBounds.has(n)) {
        let s = this.screens[n];
        if (s == null) continue;
        s = s < 0 ? ~s : s;
        this.addConstraint(pos, dir, this.tileset.screens[s].edges[dir ^ 2]);
      } else {
        // out of boumds
        this.addConstraint(pos, dir, 0);
      }
    }
  }

  // addConstraint

  //   for (let i = 0; i < this.screens.length; i++) {

  //     const y = i >> 4;
  //     const x = i & 0xf;
  //     let s = this.screens[i];
  //     const outOfBounds = !this.isInBounds(i);
  //     if (s < 0 || outOfBounds) {
  //       // Fixed screen or out of bounds.
        
  //     } else {
  //       // In bounds screen, needs to be cleared
  //       this.screens[i] = undefined;
  //       this.constraints[i] = [];
  //       for (let dir = 0; dir < 4; dir++) {
  //         const neighbor = i + DELTA[dir];
  //         if (this.isInBounds(neighbor)) {
  //           const neighborScreen = this.screens[neighbor];
  //           if (neighborScreen != null && neighborScreen < 0) {
  //             const edge = this.tileset.screens[~neighborScreen].edges[dir ^ 2];
  //             this.addConstraint(i, dir as Dir, edge);
  //           }
  //         } else {
  //           this.addConstraint(i, dir as Dir, 0);
  //         }
  //       }
  //     }
  //   }
  // }

  /** Adds a constraint, optionally marking the screen as eligible. */
  addConstraint(scr: number, dir: Dir, edge: number): void {
    if (!this.inBounds.has(scr) || this.screens[scr] != null) return;
    let constraints = this.constraints[scr];
    if (!constraints) {
      this.constraints[scr] = constraints = [];
      this.eligible.push(scr);
    }
    constraints[dir] = edge;
  }

  /** Deletes a constraint, optionally marking the screen as ineligible. */
  deleteConstraint(scr: number, dir: Dir): void {
    let constraints = this.constraints[scr];
    if (!constraints) return;
    // assert(constraints);
    delete constraints[dir];
    for (let i = constraints.length - 1; i >= 0; i--) {
      if (constraints[i] != null) {
        return;
      }
    }
    const index = this.eligible.findIndex(x => x != null);
    if (index >= 0) this.eligible.splice(index, 1);
  }

  /** Returns an array if the fill succeeded. */
  fill(backtracks: number): boolean {
    // Plan: Pick a random unfilled spot, find a screen that fits.
    // If none fits, pick a random one that fits with non-removable
    // neighbors.  Remove any conflicts.  Check for a solution.  If
    // none exists, try again.
    // this.fillConstraints();
    // this.findUnfilled();

    // Now loop while there's anything unfilled, or for W*H*100 iters
    let pos: number | undefined;
    while ((pos = this.findEmpty()) != null /* eligible.length */ && backtracks >= 0) {
      // Each attempt: pick an unfilled tile that neighbors something filled.
      //this.ensureEligible();
      //const index = this.random.nextInt(this.eligible.length);
      //const pos = this.eligible[index];
      const scr = this.pickScreen(pos);
      if (scr != null) {
        // found a screen: set it and splice eligible
        //this.eligible.splice(index);
        this.setScreen(pos, scr);
      } else {
        // no screen fit: remove a neighbor
        this.deleteOneNeighbor(pos);
        backtracks--;
      }
    }

    return pos == null; // !this.eligible.length;
  }

  findEmpty(): number | undefined {
    const screens = this.random.shuffle([...this.inBounds]);
    for (const pos of screens) {
      //if (this.screens[pos] == null && this.constraints[pos]) return pos;
      if (this.screens[pos] == null && (this.constraints[pos] || []).some(x => x != null)) return pos;
    }
    return undefined;
  }

  deleteSomeScreens(): void {
    const filled = [];
    for (const pos of this.inBounds) {
      if (this.screens[pos] as number >= 0) {
        filled.push(pos);
      }
    }
    this.random.shuffle(filled);
    const count = 1 + this.random.nextInt(filled.length - 1);
    for (const pos of filled.slice(0, count)) {
      this.deleteScreen(pos);
    }
    // if (!this.eligible.length) {
    //   // check traversability.  if not traversible then pick one replacement
    //   // based on a single constraint, ignoring the rest and removing any that
    //   // are incompatible.
    //   if (this.canTraverse(tiles)) {
    //     return seq(this.height, y => seq(this.width, x => this.screens[y << 4 | x]!));
    //   }
    // }
    // const bits = this.random.bitGenerator();
    // for (const pos of this.inBounds) {
    //   if (this.screens[pos] as number > 0 && bits()) {
    //     this.deleteScreen(pos);
    //   }
    // }
    // if (!this.eligible.length) this.reset();
  }


  /**
   * Traverses the current map, returning the partition map.  All keys to this
   * map will be either "on" an edge (either sub-screen x or y will be 0, e.g.
   * $430c is an edge, $33ec (the adjacent tile on the bottom edge of the above
   * screen) is not.
   */
  traverse(): Map<number, number> {
    const uf = new UnionFind<number>();
    for (const pos of this.inBounds) {
      let scr = this.screens[pos] as number;
      const parts = this.tileset.screens[scr < 0 ? ~scr : scr].partitions.map(
        part => [...part].map(t =>{
          t = pos << 8 | t;
          if ((t & 0xf0) === 0xe0) t += 0x20;
          if ((t & 0x0f) === 0x0f) t += 0x01;
          return t;
        }));
      for (const part of parts) {
        uf.union(part);
      }
    }
    const sets = uf.sets();
    const map = new Map<number, number>();
    for (let i = 0; i < sets.length; i++) {
      for (const tile of sets[i]) {
        map.set(tile, i);
      }
    }
    return map;
  }

  /** Picks a random neighbor to delete. */
  deleteOneNeighbor(pos: number): void {
    const dirs = this.random.shuffle([...Dir]);
    for (const dir of dirs) {
      const neighbor = pos + DELTA[dir];
      if (!this.inBounds.has(neighbor) ||
          !(this.screens[neighbor] as number >= 0)) continue;
      this.deleteScreen(neighbor);
      return;
    }
    throw new Error(`Could not find a neighbor to delete!`);
  }

  /**
   * Given a screen position with at least one constraint, find a valid screen
   * to fill into it, and fill it in.  Returns true if successful.
   */
  pickScreen(pos: number): number | undefined {
    // Given at least one constraint - find it and store options here.
    // Undefined is unconstrained.
    let screens: Set<number> | undefined;
    // Look at the constraints.
    const constraints = this.constraints[pos];
    for (let dir = 0; dir < constraints.length; dir++) {
      const edge = constraints[dir];
      if (edge == null) continue;
      const set = this.edges.get(dir | edge << 2);;
      screens = !screens ? set : intersect(screens, set);
    }
    // screens now has all possible screen IDs
    if (!screens || !screens.size) return undefined; // unable, need to backtrack?
    const eligible = [...screens];
    return this.random.pick(eligible);
  }

  /** Sets the screen at the given position, updating constraints. */
  setScreen(pos: number, scr: number): void {
    if (this.screens[pos] != null) throw new Error('screen already set');
    this.screens[pos] = scr;
    delete this.constraints[pos];
    const edges = this.tileset.screens[scr].edges;
    // add constraints to neighbors
    for (const dir of Dir) {
      const neighbor = pos + DELTA[dir];
      //if (!this.inBounds.has(neighbor) || this.screens[neighbor] != null) continue;
      this.addConstraint(neighbor, opposite(dir), edges[dir]);
    }
  }

  /** Deletes the screen at the given position. */
  deleteScreen(pos: number): void {
    const previous = this.screens[pos];
    this.screens[pos] = undefined;
    if (previous == null) return;
    if (previous < 0) throw new Error(`Cannot delete fixed screen`);
    for (const dir of Dir) {
      const neighbor = pos + DELTA[dir];
      if (!this.inBounds.has(neighbor)) continue;
      this.deleteConstraint(neighbor, opposite(dir));
    }
    this.initConstraints(pos);
  }

  // private pickEmpty(): number {
  //   while (true) {
  //     let pos;
  //     if (this.unfilled.size > 4) {
  //       const yx = this.random.nextInt(this.width * this.height);
  //       const y = Math.floor(yx / this.width);
  //       const x = yx % this.width;
  //       pos = y << 4 | x;
  //     } else {
  //       pos = this.random.pick([...this.unfilled]);
  //     }
  //     // Check if it's unfilled.
  //     if (!this.unfilled.has(pos)) continue;
  //     // Check that at least one neighbor is filled or we're on the edge.
  //     const row = (pos & 0xf0) >>> 4;
  //     const col = pos & 0x0f;
  //     if (!row || !col) return pos;
  //     if (row === this.height - 1) return pos;
  //     if (col === this.width - 1) return pos;
  //     if (!this.unfilled.has(pos - 1)) return pos;
  //     if (!this.unfilled.has(pos - 16)) return pos;
  //     if (!this.unfilled.has(pos + 1)) return pos;
  //     if (!this.unfilled.has(pos + 16)) return pos;
  //   }
  // }
}

type Dir = 0 | 1 | 2 | 3;
const Dir: readonly Dir[] = [0, 1, 2, 3] as const;
const DELTA = [-16, 1, 16, -1] as const;
// const EDGE: ReadonlyArray<(index: number) => number> = [
//   i => i,
//   i => i << 4 | 0xf,
//   i => 0xe0 | i,
//   i => i << 4,
// ];
function opposite(d: Dir): Dir {
  return (d ^ 2) as Dir;
}
function intersect<T>(xs: Iterable<T>, ys: Set<T>): Set<T> {
  const out = new Set<T>();
  for (const x of xs) {
    if (ys.has(x)) out.add(x);
  }
  return out;
}

