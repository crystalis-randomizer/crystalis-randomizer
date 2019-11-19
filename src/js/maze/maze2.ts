import { Metascreen } from "../rom/metascreen";

const MapTypes = {
  Overworld: {
    ' ': 'blocked',
    '*': 'unmatched', // must be on an edge
    '1': 'waterfall valley slope',
    '2': 'waterfall valley bridge to portoa ',
    '3': 'desert oasis ',
    '>': 'open right',
    '<': 'open left',
    '^': 'open top',
    'v': 'open bottom',
    'o': 'open',
    'l': 'long grass',
    's': 'short grass',
    'r': 'river',
    'n': 'narrow edge exit, centered',
    'b': 'boat',
  },
  Tower: {
    ' ': 'blocked',
    's': 'stairs',
    't': 'corridor',
  },
  Cave: {
    ' ': 'blocked',
    'w': 'wide',
    'c': 'corridor',
    'n': 'narrow',
    'r': 'river',
    'b': 'wrong side of bridge',
    's': 'spikes',
  },
  Swamp: {
    ' ': 'blocked',
    's': 'passage',
  },
  Mountain: {
    ' ': 'blocked',
    'p': 'path',
    's': 'slope',
    'w': 'waterfall',
    'l': 'ladder',
  },
  // Other types we don't handle: House, Channel
};
const [] = [MapTypes];

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
        for (const dir of (s1.data.neighbors ? s1.data.neighbors(s2) : [])) {
          this.neighbors[dir & 1]
              .add(dir & 2 ? s1.uid << 16 | s2.uid : s2.uid << 16 | s1.uid);
        }
      }
    }
  }
  // TODO - what to do with borders?!? Can we treat them like a screen?
  // The main thing that matters for borders is whether it's an edge exit
  // or not.  We can already track this a bit - we could have a list of
  // acceptable edge types for each tileset - " n" most likely, except for
  // swamp (" ns"?)  We should go thru and make sure there's no reuse of
  // edge types in inconsistent ways (e.g. 'v' for both grass and boundary)
}

const [] = [NeighborCache];

export class Maze {

  map: Array<number> = [];

}
