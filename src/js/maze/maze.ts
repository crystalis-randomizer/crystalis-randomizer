import { Grid, GridCoord, GridIndex } from './grid.js';
import { Random } from '../random.js';
import { hex } from '../rom/util.js';
import { Metalocation, Pos } from '../rom/metalocation.js';
import { Location } from '../rom/location.js';

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

export interface Attempt {
  readonly grid: Grid<string>;
  readonly fixed: Set<GridCoord>;
  readonly w: number;
  readonly h: number;
  readonly size: number;
  count: number;
}

//type SurveyType<T extends MazeShuffle> = ReturnType<T['survey']>;
//type AttemptType<T extends MazeShuffle> = ReturnType<T['attempt']>;

export type Result<T> = {ok: true, value: T} | {ok: false, fail: string};
export const OK: Result<void> = {ok: true, value: undefined};

export abstract class MazeShuffle {

  random!: Random; // set in shuffle() for better API.
  orig: Metalocation;
  attempts = 0;
  maxAttempts = 100;
  params: Survey;

  constructor(readonly loc: Location, params?: Survey) {
    this.orig = loc.meta;
    this.params = params ?? this.survey(this.orig);
  }

  shuffle(random: Random) {
    if (!this.loc.used) return;
    this.random = random;
    while (++this.attempts <= this.maxAttempts) {
      const result = this.build();
      if (result.ok) {
        this.finish(result.value);
        return;
      }
      console.log(`Shuffle failed ${this.loc}: ${result.fail}`);
    }
    this.reportFailure();
  }

  reportFailure() {
    //throw new Error(`Completely failed to map shuffle ${loc}`);
    console.error(`Completely failed to map shuffle ${this.loc}`);
  }

  abstract survey(meta: Metalocation): Survey;

  abstract build(): Result<Metalocation>;

  finish(newMeta: Metalocation) {
    newMeta.transferFlags(this.loc.meta, this.random);
    newMeta.transferExits(this.loc.meta, this.random);
    newMeta.transferSpawns(this.loc.meta, this.random);
    newMeta.transferPits(this.loc.meta);
    //newMeta.replaceMonsters(this.random);
    this.loc.meta = newMeta;
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

  insertTile(a: Attempt, pos: Pos, tile: string): boolean {
    const s = this.posToGrid(pos);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const g = s + r * 0x800 + c * 8 as GridCoord;
        if (a.fixed.has(g)) return false;
        const v = a.grid.get(g);
        if (v && v !== tile[r * 3 + c]) return false;
      }
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const g = s + r * 0x800 + c * 8 as GridCoord;
        a.grid.set(g, tile[r * 3 + c]);
      }
    }
    return true;
  }

  posToGrid(pos: Pos, offset: number = 0): GridCoord {
    const y = pos >>> 4;
    const x = pos & 0xf;
    return (y << 12 | x << 4) + offset as GridCoord;
  }

  insertPattern(a: Attempt, pattern: readonly string[],
                {top = 0, bottom = 0, left = 0, right = 0} = {}): Result<void> {
    const ph = (pattern.length - 1) >>> 1;
    const pw = (pattern[0].length - 1) >>> 1;
    const dh = top + bottom;
    const dw = left + right;
    if (a.h < ph + dh) return {ok: false, fail: `too short`};
    if (a.w < pw + dw) return {ok: false, fail: `too narrow`};
    const y0 = this.random.nextInt(a.h - ph - 1 - dh) + top;
    const x0 = this.random.nextInt(a.w - pw - 1 - dh) + left;
    const c0 = (y0 + 1) << 12 | (x0 + 1) << 4;
    Grid.writeGrid2d(a.grid, c0 as GridCoord, pattern);
    for (let y = 0x3000; y <= 0x5000; y += 0x800) {
      for (let x = 0x30; x <= 0x40; x += 0x8) {
        a.fixed.add(c0 + (y | x) as GridCoord);
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

  canSet(a: Attempt, c: GridCoord, v: string): boolean {
    return this.canSetAll(a, new Map([[c, v]]));
  }

  canSetAll(a: Attempt, replace: Map<GridCoord, string>): boolean {
    const screens = new Set<GridCoord>();
    for (const c of replace.keys()) {
      if (a.fixed.has(c)) return false;
      const s = (c & ~0x808) as GridCoord;
      const y = s >>> 12;
      const x = (s >>> 4) & 0xf;
      if (x < a.w && y < a.h) screens.add(s);
      if (!(c & 8) && y < a.h && x) screens.add(s - 0x10 as GridCoord);
      if (!(c & 0x800) && x < a.w && y) screens.add(s - 0x1000 as GridCoord);
      if (!(c & 0x808) && x && y) screens.add(s - 0x1010 as GridCoord);
    }
    for (const s of screens) {
      const tile = this.extract(a.grid, s, {replace});
      if (!this.orig.tileset.getMetascreensFromTileString(tile).length) {
        return false;
      }
    }
    return true;
  }

  addAllFixed(a: Attempt) {
    for (let i = 0; i < a.grid.data.length; i++) {
      if (a.grid.data[i]) a.fixed.add(a.grid.coord(i as GridIndex));
    }
  }
}
