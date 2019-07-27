import {Screen} from './screen.js';
import {TileEffects} from './tileeffects.js';
import {Tileset} from './tileset.js';
import {UnionFind} from '../unionfind.js';
import { seq } from './util.js';
import { Random } from '../random.js';

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
    // Look at perimeter
    for (const set of graph.sets()) {
      let partition = null;
      for (const t of set) {
        if (!isPerimeter(t)) continue;
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

export class Layout {
  /** Positive is temporary, ones complement is permanent. */
  screens: Array<number | undefined> = [];
  /** Screen indices that have at least one constraint. */
  private eligible: number[] = [];
  /** Screen IDs that can be used, by constraint. */
  private readonly available: ReadonlyArray<Map<number, Set<number>>> = [];
  /** All constraints. */
  private constraints: number[][] = [];

  constructor(readonly tileset: Tileset,
              availableScreens: number[],
              readonly random: Random,
              readonly height: number,
              readonly width: number) {
    const avail = [new Map(), new Map(), new Map(), new Map()];
    for (const s of availableScreens) {
      for (let i = 0; i < 4; i++) {
        const e = tileset.screens[s].edges[i];
        let set = avail[i].get(e);
        if (!set) avail[i].set(e, set = new Set());
        set.add(s);        
      }
    }
    this.available = avail;
  }

  /** Returns true if the fill succeeded. */
  fill(): number[][] | undefined {
    // Plan: Pick a random unfilled spot, find a screen that fits.
    // If none fits, pick a random one that fits with non-removable
    // neighbors.  Remove any conflicts.  Check for a solution.  If
    // none exists, try again.
    this.fillConstraints();
    this.findUnfilled();
    // Now loop while there's anything unfilled, or for W*H*100 iters
    for (let attempts = this.width * this.height * 100; attempts; attempts--) {
      // Each attempt: pick an unfilled tile that neighbors something filled.
      this.ensureEligible();
      const index = this.random.nextInt(this.eligible.length);
      const yx = this.eligible[index];
      this.pickScreen(yx);

      if (!this.eligible.length) {
        // check traversability.  if not traversible then pick one replacement
        // based on a single constraint, ignoring the rest and removing any that
        // are incompatible.
        if (this.canTraverse()) {
          return seq(this.height, y => seq(this.width, x => this.screens[y << 4 | x]!));
        }
        const tile = this.pickRandomTile();
        //this.random;

      }


    }
  }

  private pickEmpty(): number {
    while (true) {
      let pos;
      if (this.unfilled.size > 4) {
        const yx = this.random.nextInt(this.width * this.height);
        const y = Math.floor(yx / this.width);
        const x = yx % this.width;
        pos = y << 4 | x;
      } else {
        pos = this.random.pick([...this.unfilled]);
      }
      // Check if it's unfilled.
      if (!this.unfilled.has(pos)) continue;
      // Check that at least one neighbor is filled or we're on the edge.
      const row = (pos & 0xf0) >>> 4;
      const col  pos & 0x0f;
      if (!row || !col) return pos;
      if (row === this.height - 1) return pos;
      if (col === this.width - 1) return pos;
      if (!this.unfilled.has(pos - 1)) return pos;
      if (!this.unfilled.has(pos - 16)) return pos;
      if (!this.unfilled.has(pos + 1)) return pos;
      if (!this.unfilled.has(pos + 16)) return pos;
    }
  }

  private pickScreen(yx: number) {
    // Find an available screen to put here.
    const tried = new Set();
    
  }

  private findUnfilled() {
    this.unfilled.clear();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = y << 4 | x;
        if (this.screens[tile] == null) {
          this.unfilled.add(tile);
        } else {
          // TODO - fill in constraints.
          const scr = this.tileset.screens[this.screens[tile]];
          
          this.rows[y]

        }
      }
    }
  }
}

type Dir = 0 | 1 | 2 | 3;
const DELTA = [-16, 1, 16, -1] as const;
const EDGE: ReadonlyArray<(index: number) => number> = [
  i => i,
  i => i << 4 | 0xf,
  i => 0xe0 | i,
  i => i << 4,
];
