import {Rom} from '../rom';
import { UnionFind } from '../unionfind';
import { Exit } from '../rom/location';

// There's an oddity where map screens that can be fallen into (i.e.
// via a pit) can have their exits skipped over while the screen is
// shaking on impact (the game stops checking exits during that time,
// cf. ff:e8f6, where 7d7 stores the positive screen-shake timer.

// Rather than move various exits, the most elegant fix is to extend
// any exits by an extra tile, but only on screens that can be fallen
// into.  (The vanilla game solves this by moving the Sabera Fortress
// entrance down a tile, but this is ugly and inconsistent).

export function fixSkippableExits(rom: Rom) {
  const targets = new Set<number>(); // stores location << 8 | screen
  for (const location of rom.locations) {
    for (const pit of location.pits ?? []) {
      targets.add(pit.dest << 8 | pit.toScreen);
    }
  }

  for (const target of targets) {
    const location = rom.locations[target >> 8];
    const scr = target & 0xff;
    const exitList = location.exits.filter(e => e.screen === scr);
    const entranceList = location.entrances.filter(e => e.screen === scr);
    const exits = new Map<number, Exit>(exitList.map(e => [e.tile, e]));
    const uf = new UnionFind<number>();
    for (const exit of exits.keys()) {
      for (const dir of DIRS) {
        if (exits.has(exit + dir)) uf.union([exit, exit + dir]);
      }
    }
    const map = uf.map();
    for (const entrance of entranceList) {
      for (const dir of DIRS) {
        const found = map.get(entrance.tile + dir);
        for (const tile of found ?? []) {
          const orig = exits.get(tile)!;
          const exit = Exit.of({screen: target & 0xff, tile: tile + dir,
                                dest: orig.dest, entrance: orig.entrance});
          location.exits.push(exit);
        }
      }
    }
  }
}

const DIRS = [1, -1, 16, -16];
