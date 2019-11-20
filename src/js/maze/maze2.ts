//import {Metascreen} from '../rom/metascreen.js';
import {ConnectionType} from '../rom/metascreendata.js';
import {Metatileset} from '../rom/metatileset.js';
import {Random} from '../random.js';
import {DefaultMap} from '../util.js';

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
const BORDER = {uid: 0xffff};
const EDGE_EXIT = {uid: 0xfffe};

// Need a cache of neighbors?
class NeighborCache {
  // [vertical, horizontal], indexed by dir & 1
  readonly allowed = [new Set<UidPair>(), new Set<UidPair>()] as const;
  readonly neighbors = new DefaultMap<number, Set<Uid>>(() => new Set());

  private add(dir: Dir, s1: {uid: number}, s2: {uid: number}) {
    const u1 = s1.uid;
    const u2 = s2.uid;
    this.allowed[dir & 1].add(dir & 2 ? u2 << 16 | u1 : u1 << 16 | u2);
    this.neighbors.get(u1 << 2 | dir).add(u2);
    this.neighbors.get(u2 << 2 | (dir ^ 2)).add(u1);
  }

  constructor(tileset: Metatileset) {
    for (const s1 of tileset) {
      const e1 = s1.data.edges || '****';
      // Register the screen pairs
      for (const s2 of tileset) {
        // Basic idea: compare the edges.  But we need a way to override?
        // Specifically, if there's a * then call a method?  What about
        // allowing (say) normal cave w/ narrow?
        const e2 = s2.data.edges || '****';
        if (e1[2] !== '*' && e1[2] === e2[0]) {
          this.add(0, s1, s2);
        }
        if (e1[3] !== '*' && e1[3] === e2[1]) {
          this.add(1, s1, s2);
        }
        // Maybe call a method if it's there?
        for (const dir of (s1.data.allowed ? s1.data.allowed(s2) : [])) {
          this.add(dir, s1, s2);
        }
      }
      // Register borders
      const edges: Array<{uid: number}> = [];
      for (const {type} of s1.data.exits || []) {
        const dir = edgeTypeMap[type];
        if (dir != null) edges[dir] = EDGE_EXIT;
      }
      for (let dir = 0 as Dir; dir < 4; dir++) {
        // Edges may be allowed as either exits, non-exits, or not at all.
        let edge = edges[dir];
        if (edge == null) edge = borderMap[e1[dir]];
        if (edge != null) this.add(dir, s1, edge);
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

const borderMap: {[c: string]: {uid: number}} = {
  '*': EDGE_EXIT,
  ' ': EDGE_EXIT,
};
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
      this.map[ind(-1, x)] = this.map[ind(height, x)] = BORDER.uid;
    }
    for (let y = 0; y < width; y++) {
      this.map[ind(y, -1)] = this.map[ind(y, width)] = BORDER.uid;
    }
  }

  inBounds(pos: number): boolean {
    return (pos & 15) < this.width && pos > 15 && pos >>> 4 <= this.height;
  }

  static from(location: Location): Maze {
    // Pick out the metatileset, figure out metascreens.
    throw new Error('not implemented');

  }

}

// Map (y, x) screen position to an index.  Note that we use padding for
// borders.  In-bound checking is trivial.
function ind(y: number, x: number): number {
  return ((y + 1) << 4) + x;
}


// TODO - find a place for a Map<number, Metascreen> but what to do with borders?
