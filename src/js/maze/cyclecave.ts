import { CaveShuffle } from './cave';
import { GridCoord } from './grid';
import { Result } from './maze';

export class CycleCaveShuffle extends CaveShuffle {
  maxAttempts = 400;

  // Do nothing
  refineEdges() { return true; }

  preinfer(): Result<void> {
    const allTiles: GridCoord[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = (y << 12 | x << 4 | 0x808) as GridCoord;
        if (this.grid.get(c)) allTiles.push(c);
      }
    }
    const nonCritical = allTiles.filter(t => this.tryClear([t]).length === 1);
    if (!nonCritical.length) {
      // everything is critical
      return {ok: false, fail: 'all critical?'};
    }
    // find two noncritical tiles that together *are* critical
    for (let i = 0; i < nonCritical.length; i++) {
      for (let j = 0; j < i; j++) {
        if (this.tryClear([nonCritical[i], nonCritical[j]]).length > 2) {
          return super.preinfer();
        }
      }
    }
    return {ok: false, fail: 'unable to find pair of mutually critical tiles'};
  }
}

export class TightCycleCaveShuffle extends CycleCaveShuffle {
  removeTightLoops() {}
}
