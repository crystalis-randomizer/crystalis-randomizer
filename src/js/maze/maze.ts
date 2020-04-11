import { Grid, GridCoord } from './grid.js';
import { Random } from '../random.js';
import { hex } from '../rom/util.js';
import { Metatileset } from '../rom/metatileset.js';
import { Metalocation } from '../rom/metalocation.js';
import { Location } from '../rom/location.js';

const [] = [hex];

export interface Survey {
  readonly id: number;
  readonly tileset: Metatileset;
  readonly size: number;
  readonly edges?: number[]; // [top, left, bottom, right]
  readonly stairs?: number[]; // [up, down]
  //poi?: number;
  readonly features?: Record<string, number>; // a, r, s, p, b, w
}

export abstract class MazeShuffle {

  shuffle(loc: Location, random: Random) {
    const meta = loc.meta;
    const survey = this.survey(meta);
    for (let attempt = 0; attempt < 100; attempt++) {
      const width =
          Math.max(1, Math.min(8, loc.meta.width +
                               Math.floor((random.nextInt(6) - 1) / 3)));
      const height =
          Math.max(1, Math.min(16, loc.meta.height +
                               Math.floor((random.nextInt(6) - 1) / 3)));
      const shuffle = this.attempt(height, width, survey, random);
      const result = shuffle.build();
      if (result) {
        if (loc.id === 0x31) console.error(`Shuffle failed: ${result}`);
      } else {
        this.finish(loc, shuffle.meta, random);
        return;
      }
    }
    //throw new Error(`Completely failed to map shuffle ${loc}`);
    console.error(`Completely failed to map shuffle ${loc}`);
  }

  finish(loc: Location, newMeta: Metalocation, random: Random) {
    newMeta.transferFlags(loc.meta, random);
    newMeta.transferExits(loc.meta, random);
    newMeta.transferSpawns(loc.meta, random);
    newMeta.replaceMonsters(random);
    loc.meta = newMeta;
  }

  abstract attempt(height: number, width: number,
                   survey: Survey, random: Random): MazeShuffleAttempt;

  abstract survey(meta: Metalocation): Survey;
}

export abstract class MazeShuffleAttempt {

  abstract grid: Grid<string>;
  abstract meta: Metalocation;

  abstract build(): string; // error message or none

  /** Extract a 3x3 section into a 9-character string. */
  extract(c: GridCoord): string {
    const index = this.grid.index(c);
    let out = '';
    const end = index + 3 * this.grid.row;
    const {row} = this.grid;
    for (let r = index as number; r < end; r += row) {
      for (let i = r; i < r + 3; i++) {
        out += (this.grid.data[i] || ' ');
      }
    }
    return out;
  }
}

