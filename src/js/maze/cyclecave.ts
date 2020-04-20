import { CaveShuffle, CaveShuffleAttempt } from './cave.js';
import { GridCoord } from './grid.js';
import { Result } from './maze.js';

type A = CaveShuffleAttempt;

export class CycleCaveShuffle extends CaveShuffle {
  // Do nothing
  refineEdges() { return true; }

  preinfer(a: A): Result<void> {
    const allTiles: GridCoord[] = [];
    for (let y = 0; y < a.h; y++) {
      for (let x = 0; x < a.w; x++) {
        const c = (y << 12 | x << 4 | 0x808) as GridCoord;
        if (a.grid.get(c)) allTiles.push(c);
      }
    }
    const nonCritical =
        allTiles.filter(t => this.tryClear(a, [t]).length === 1);
    if (!nonCritical.length) {
      // everything is critical
      return {ok: false, fail: 'all critical?'};
    }
    // find two noncritical tiles that together *are* critical
    for (let i = 0; i < nonCritical.length; i++) {
      for (let j = 0; j < i; j++) {
        if (this.tryClear(a, [nonCritical[i], nonCritical[j]]).length > 2) {
          return super.preinfer(a);
        }
      }
    }
    return {ok: false, fail: 'unable to find pair of mutually critical tiles'};
  }
}

export class TightCycleCaveShuffle extends CycleCaveShuffle {
  removeTightLoops() {}
}
