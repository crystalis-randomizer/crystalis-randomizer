import { CaveShuffle, CaveShuffleAttempt } from './cave.js';
import { Survey } from './maze.js';
import { Random } from '../random.js';
import { GridCoord } from './grid.js';

export class CycleCaveShuffle extends CaveShuffle {
  attempt(h: number, w: number, s: Survey, r: Random): CycleCaveShuffleAttempt {
    const size = s.size + (r.nextInt(5) < 2 ? 1 : 0); // 40% chance of +1 size
    return new CycleCaveShuffleAttempt(h, w, {...s, size}, r);
  }
}

class CycleCaveShuffleAttempt extends CaveShuffleAttempt {
  // Do nothing
  refineEdges() { return true; }

  build(): string {
    const result = super.build();
    if (result) return result;

    const allTiles: GridCoord[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = (y << 12 | x << 4 | 0x808) as GridCoord;
        if (this.grid.get(c)) allTiles.push(c);
      }
    }
    const nonCritical = allTiles.filter(t => this.tryClear([t]).length === 1);
    if (!nonCritical.length) return 'all critical?'; // everything is critical
    // find two noncritical tiles that together *are* critical
    for (let i = 0; i < nonCritical.length; i++) {
      for (let j = 0; j < i; j++) {
        if (this.tryClear([nonCritical[i], nonCritical[j]]).length > 2) {
          return '';
        }
      }
    }
    return 'unable to find pair of mutually critical tiles';
  }
}

export class TightCycleCaveShuffle extends CycleCaveShuffle {
  attempt(h: number, w: number,
          s: Survey, r: Random): TightCycleCaveShuffleAttempt {
    const size = s.size + (r.nextInt(5) < 2 ? 1 : 0); // 40% chance of +1 size
    return new TightCycleCaveShuffleAttempt(h, w, {...s, size}, r);
  }
}

class TightCycleCaveShuffleAttempt extends CycleCaveShuffleAttempt {
  removeTightLoops() {}
}
