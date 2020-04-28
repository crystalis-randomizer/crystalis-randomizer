import { Grid, GridCoord, GridIndex } from './grid.js';
import { Random } from '../random.js';
import { hex } from '../rom/util.js';
import { Metalocation } from '../rom/metalocation.js';
import { Location } from '../rom/location.js';

const [] = [hex];

type Feature =
    'arena' | 'bridge' | 'over' | 'pit' | 'ramp' | 'river' | 'spike' |
    'statue' | 'under' | 'wall' | 'wide';

export interface Survey {
  readonly id: number;
  readonly meta: Metalocation;
  readonly size: number;
  readonly edges?: number[]; // [top, left, bottom, right]
  readonly stairs?: number[]; // [up, down]
  //poi?: number;
  readonly features?: Record<Feature, number>; // a, r, s, p, b, w
}

export interface Attempt {
  readonly grid: Grid<string>;
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
    newMeta.transferPits(this.loc.meta, this.random);
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
}
