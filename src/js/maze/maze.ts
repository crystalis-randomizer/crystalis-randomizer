import { Grid, GridCoord, GridIndex } from './grid';
import { Random } from '../random';
import { hex } from '../rom/util';
import { Metalocation, Pos, ExitSpec } from '../rom/metalocation';
import { Location } from '../rom/location';
import { ConnectionType } from '../rom/metascreendata';
import { Rom } from '../rom';

const [] = [hex];

type Feature =
    // caves
    'arena' | 'bridge' | 'over' | 'pit' | 'ramp' | 'river' | 'spike' |
    'statue' | 'under' | 'wall' | 'wide' |
    // overworld
    'cave' | 'shortGrass' | 'longGrass' | 'iceBridge' | 'woodBridge' | 'canyon';

export interface Survey {
  readonly id: number;
  readonly meta: Metalocation;
  readonly size: number;
  readonly edges?: number[]; // [top, left, bottom, right]
  readonly stairs?: number[]; // [up, down]
  //poi?: number;
  readonly features?: {[f in Feature]?: number}; // a, r, s, p, b, w
}

export type Result<T> = {ok: true, value: T} | {ok: false, fail: string};
export const OK: Result<void> = {ok: true, value: undefined};

export class MazeShuffles {
  readonly shuffles: MazeShuffle[] = [];
  constructor(readonly rom: Rom, readonly random: Random) {}

  add(...shuffles: MazeShuffle[]) {
    this.shuffles.push(...shuffles);
  }

  // Shuffles all the mazes.
  shuffleAll() {
    for (const shuffle of this.shuffles) {
      shuffle.shuffle(this.random);
    }
    for (const shuffle of this.shuffles) {
      if (shuffle.meta) shuffle.finish();
    }
    // Shuffle the pits at the end...
    for (const loc of this.rom.locations) {
      loc.meta.shufflePits(this.random);
    }
  }

  toString() {
    return [...this.shuffles].sort((a,b) => ((a.badness||0) - (b.badness||0))).join('\n');
  }
}

export interface MazeShuffle {
  readonly badness?: number;
  meta: Metalocation|undefined;
  shuffle(random: Random): void;
  finish(): void;
}

export abstract class AbstractMazeShuffle {
  // Shuffle-level constants.
  readonly loc: Location;
  readonly random!: Random;
  readonly orig: Metalocation;
  readonly maxAttempts: number = 250;
  readonly params: Survey;

  toString() {
    return `${this.constructor.name}(${this.loc}): ${this.attempt}/${this.maxAttempts}`;
  }

  get badness(): number {
    return this.attempt / this.maxAttempts;
  }

  // Shuffle state.
  attempt = 0;

  // Output.  Can be cleared to force a reshuffle.
  meta: Metalocation|undefined = undefined;

  // Attempt state variables.
  // NOTE: These are marked as readonly, but they are cleared by reset().  The
  // benefit of marking them readonly outweighs the ugliness of mutating them.
  readonly grid = new Grid<string>(1, 1);
  readonly fixed = new Set<GridCoord>();
  readonly w: number = 0;
  readonly h: number = 0;
  readonly size: number = 0;
  count = 0;
  // Entries are [predicate for orig exit, new pos, new type] - if a matching
  // exit is found in the original metalocation, it's moved to the new position.
  readonly exitMap: Array<readonly [(p: Pos, t: ConnectionType) => boolean,
                                    // TODO - add dest to predicate?
                                    Pos, ConnectionType]> = [];

  constructor(loc: Location, params?: Survey) {
    this.loc = loc;
    this.orig = loc.meta;
    this.params = params ?? this.survey(this.orig);
  }

  /** Resets the attempt state. */
  reset() {
    this.meta = undefined;
    const h = this.pickHeight();
    const w = this.pickWidth();
    const size = this.pickSize();
    const grid = new Grid(h, w);
    grid.data.fill('');
    // NOTE: violates readonly
    Object.assign(this, {h, w, size, grid, fixed: new Set(),
                         count: 0, exitMap: []});
  }

  shuffle(random: Random) {
    if (!this.loc.used || this.meta || this.attempt > this.maxAttempts) return;
    Object.assign(this, {random});
    while (++this.attempt <= this.maxAttempts) {
      this.reset();
      const result = this.build();
      if (result.ok) return;
      console.log(`Shuffle failed ${this.loc}: ${result.fail}`);
    }
    //throw new Error(`Completely failed to map shuffle ${loc}`);
    console.error(`Completely failed to map shuffle ${this.loc}`);
  }

  abstract survey(meta: Metalocation): Survey;

  abstract build(): Result<void>;

  finish() { // final
    if (!this.meta || this.meta === this.loc.meta) return;
    this.finishInternal();
  }

  finishInternal() {
    if (!this.meta) throw new Error(`impossible`);
    this.meta.transferFlags(this.loc.meta, this.random);
    const mappedExits: Array<[Pos, ConnectionType, ExitSpec]> = [];
    for (const [pred, pos, type] of this.exitMap) {
      for (const [opos, otype, spec] of mappedExits) {
        if (pred(opos, otype)) {
          mappedExits.push([pos, type, spec]);
          break;
        }
      }
    }
    this.meta.transferExits(this.loc.meta, this.random);
    for (const [srcPos, srcType, spec] of mappedExits) {
      const dest = this.meta.rom.locations[spec[0] >>> 8].meta;
      const destPos = spec[0] & 0xff;
      const destType = spec[1];
      this.meta.attach(srcPos, dest, destPos, srcType, destType);
    }
    this.meta.transferSpawns(this.loc.meta, this.random);
    this.meta.transferPits(this.loc.meta);
    //newMeta.replaceMonsters(this.random);
    this.loc.meta = this.meta;
  }

  pickHeight(): number {
    return Math.max(1, Math.min(16, this.orig.height +
                                Math.floor((this.random.nextInt(6) - 1) / 3)));
  }

  pickWidth(): number {
    return Math.max(1, Math.min(8, this.orig.width +
                                Math.floor((this.random.nextInt(6) - 1) / 3)));
  }

  pickSize(): number {
    // 40% chance of +1 size
    return this.params.size + (this.random.nextInt(5) < 2 ? 1 : 0);
  }

  insertTile(pos: Pos, tile: string): boolean {
    const s = this.posToGrid(pos);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const g = s + r * 0x800 + c * 8 as GridCoord;
        if (this.fixed.has(g)) return false;
        const v = this.grid.get(g);
        if (v && v !== tile[r * 3 + c]) return false;
      }
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const g = s + r * 0x800 + c * 8 as GridCoord;
        this.grid.set(g, tile[r * 3 + c]);
      }
    }
    return true;
  }

  posToGrid(pos: Pos, offset: number = 0): GridCoord {
    const y = pos >>> 4;
    const x = pos & 0xf;
    return (y << 12 | x << 4) + offset as GridCoord;
  }

  insertPattern(pattern: readonly string[],
                {top = 0, bottom = 0, left = 0, right = 0} = {}): Result<void> {
    const ph = (pattern.length - 1) >>> 1;
    const pw = (pattern[0].length - 1) >>> 1;
    const dh = top + bottom;
    const dw = left + right;
    if (this.h < ph + dh) return {ok: false, fail: `too short`};
    if (this.w < pw + dw) return {ok: false, fail: `too narrow`};
    const y0 = this.random.nextInt(this.h - ph - 1 - dh) + top;
    const x0 = this.random.nextInt(this.w - pw - 1 - dh) + left;
    const c0 = (y0 + 1) << 12 | (x0 + 1) << 4;
    Grid.writeGrid2d(this.grid, c0 as GridCoord, pattern);
    for (let y = 0x3000; y <= 0x5000; y += 0x800) {
      for (let x = 0x30; x <= 0x40; x += 0x8) {
        this.fixed.add(c0 + (y | x) as GridCoord);
      }
    }
    return {ok: true, value: undefined};
  }

  /** Extract a 3x3 section into a (h×w)-character string. */
  extract(g: Grid<any>, c: GridCoord,
          {h = 3, w = 3,
           replace = undefined as Map<GridCoord, string>|undefined,
          } = {}): string {
    const index = g.index(c);
    let out = '';
    const end = index + h * g.row;
    const {row} = g;
    for (let r = index as number; r < end; r += row) {
      for (let i = r; i < r + w; i++) {
        if (replace) {
          const s = replace.get(g.coord(i as GridIndex));
          if (s != null) {
            out += (s || ' ');
            continue;
          }
        }
        out += (g.data[i] || ' ');
      }
    }
    return out;
  }

  canSet(c: GridCoord, v: string): boolean {
    return this.canSetAll(new Map([[c, v]]));
  }

  canSetAll(replace: Map<GridCoord, string>): boolean {
    const screens = new Set<GridCoord>();
    for (const c of replace.keys()) {
      if (this.fixed.has(c)) return false;
      const s = (c & ~0x808) as GridCoord;
      const y = s >>> 12;
      const x = (s >>> 4) & 0xf;
      if (x < this.w && y < this.h) screens.add(s);
      if (!(c & 8) && y < this.h && x) screens.add(s - 0x10 as GridCoord);
      if (!(c & 0x800) && x < this.w && y) screens.add(s - 0x1000 as GridCoord);
      if (!(c & 0x808) && x && y) screens.add(s - 0x1010 as GridCoord);
    }
    for (const s of screens) {
      const tile = this.extract(this.grid, s, {replace});
      if (!this.orig.tileset.getMetascreensFromTileString(tile).length) {
        return false;
      }
    }
    return true;
  }

  addAllFixed() {
    for (let i = 0; i < this.grid.data.length; i++) {
      if (this.grid.data[i]) this.fixed.add(this.grid.coord(i as GridIndex));
    }
  }
}
