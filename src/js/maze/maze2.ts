import { Metascreen } from "../rom/metascreen";

// Need a cache of neighbors?
class NeighborCache {
  // [vertical, horizontal], indexed by dir & 1
  readonly neighbors = [new Set<number>(), new Set<number>()] as const;
  constructor(screens: Iterable<Metascreen>) {
    for (const s1 of screens) {
      for (const s2 of screens) {
        // Basic idea: compare the edges.  But we need a way to override?
        // Specifically, if there's a * then call a method?  What about
        // allowing (say) normal cave w/ narrow?
        const e1 = s1.data.edges || '****';
        const e2 = s2.data.edges || '****';
        if (e1[2] !== '*' && e1[2] === e2[0]) {
          this.neighbors[0].add(s1.uid << 16 | s2.uid);
        }
        if (e1[3] !== '*' && e1[3] === e2[1]) {
          this.neighbors[1].add(s1.uid << 16 | s2.uid);
        }
        // Maybe call a method if it's there?
        for (const dir of (s1.neighbors ? s1.neighbors(s2) : [])) {
          this.neighbors[dir & 1]
              .add(dir & 2 ? s1.uid << 16 | s2.uid : s2.uid << 16 | s1.uid);
        }
      }
    }
  }
  // TODO - what to do with borders?!? Can we treat them like a screen?
}

const [] = [NeighborCache];

export class Maze {

  map: Array<number> = [];

}
