import {Metatileset} from '../rom/metatileset.js';
import {Random} from '../random.js';
import {DefaultMap} from '../util.js';
import {ConnectionType} from '../rom/metascreendata.js';

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

type Dir = 0|1|2|3;
type Uid = number;
type UidPair = number;

// fake UIDs for the two border options.
const BORDER = 0xffff as Uid;
const EDGE_EXIT = 0xfffe as Uid;

// Need a cache of neighbors?
class NeighborCache {
  // [vertical, horizontal], indexed by dir & 1
  readonly neighbors = [new Set<UidPair>(), new Set<UidPair>()] as const;

  private add(dir: Dir, s1: Uid, s2: Uid) {
    this.neighbors[dir & 1].add(dir & 2 ? s1 << 16 | s2 : s2 << 16 | s1);
  }

  constructor({screens}: Metatileset) {
    for (const s1 of screens) {
      // Register the screen pairs
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
          this.add(dir, s1.uid, s2.uid);
        }
      }
      // Register borders
      const edges = [BORDER, BORDER, BORDER, BORDER];
      for (const {type} of s1.data.exits || []) {
        const dir = edgeTypeMap[type];
        if (dir != null) edges[dir] = EDGE_EXIT;
      }
      for (let dir = 0 as Dir; dir < 4; dir++) {
        this.add(dir, s1.uid, edges[dir]);
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

const edgeTypeMap: {[C in ConnectionType]?: number} = {
  'edge:top': 0,
  'edge:left': 1,
  'edge:bottom': 2,
  'edge:right': 3,
};
  

const caches =
    new DefaultMap<Metatileset, NeighborCache>(t => new NeighborCache(t));

export class Maze {

  readonly neighbors = caches.get(this.tileset);
  map: Array<number>;

  constructor(readonly random: Random,
              public width: number,
              public height: number,
              readonly tileset: Metatileset) {
    this.map = new Array((height + 2) << 4).fill(undefined);
    // Initialize an empty map with closed borders all around.
    for (let x = 0; x < width; x++) {
      this.map[ind(-1, x)] = this.map[ind(height, x)] = BORDER;
    }
    for (let y = 0; y < width; y++) {
      this.map[ind(y, -1)] = this.map[ind(y, width)] = BORDER;
    }
  }

  inBounds(pos: number): boolean {
    return (pos & 15) < this.width && pos > 15 && pos >>> 4 <= this.height;
  }
}

// Map (y, x) screen position to an index.  Note that we use padding for
// borders.  In-bound checking is trivial.
function ind(y: number, x: number): number {
  return ((y + 1) << 4) + x;
}
