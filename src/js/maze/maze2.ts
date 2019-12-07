//import {Metascreen} from '../rom/metascreen.js';
import {Location} from '../rom/location.js';
import {ConnectionType} from '../rom/metascreendata.js';
import {Metatileset} from '../rom/metatileset.js';
import {Rom} from '../rom.js';
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
          this.add(2, s1, s2);
        }
        if (e1[3] !== '*' && e1[3] === e2[1]) {
          this.add(3, s1, s2);
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

  private add(dir: Dir, s1: {uid: number}, s2: {uid: number}) {
    const u1 = s1.uid;
    const u2 = s2.uid;
    this.allowed[dir & 1].add(dir & 2 ? u1 << 16 | u2 : u2 << 16 | u1);
    this.neighbors.get(u1 << 2 | dir).add(u2);
    this.neighbors.get(u2 << 2 | (dir ^ 2)).add(u1);
  }

  check(s1: number, s2: number, delta: number): boolean {
    const cache = this.allowed[delta & 1];  // vertical = 0, horiz = 1
    const index = delta > 0 ? s1 << 16 | s2 : s2 << 16 | s1;
    return cache.has(index);
  }

  // TODO - what to do with borders?!? Can we treat them like a screen?
  // The main thing that matters for borders is whether it's an edge exit
  // or not.  We can already track this a bit - we could have a list of
  // acceptable edge types for each tileset - " n" most likely, except for
  // swamp (" ns"?)  We should go thru and make sure there's no reuse of
  // edge types in inconsistent ways (e.g. 'v' for both grass and boundary)
}

const borderMap: {[c: string]: {uid: number}} = {
  '*': BORDER,
  ' ': BORDER,
};
const edgeTypeMap: {[C in ConnectionType]?: number} = {
  'edge:top': 0,
  'edge:left': 1,
  'edge:bottom': 2,
  'edge:right': 3,
};


const caches =
    new DefaultMap<Metatileset, NeighborCache>(t => new NeighborCache(t));

function inBounds(pos: number, height: number, width: number): boolean {
  return (pos & 15) < width && pos > 15 && pos >>> 4 <= height;
}

export class Maze {

  readonly rom: Rom;
  readonly neighbors = caches.get(this.tileset);
  // map from index (y+1<<4|x) to metascreen uid
  // metascreens.getById() will map uid to metadata
  map: Array<number>;

  constructor(readonly random: Random,
              public height: number,
              public width: number,
              readonly tileset: Metatileset) {
    this.rom = tileset.rom;
    this.map = new Array((height + 2) << 4).fill(-1);
    // Initialize an empty map with closed borders all around.
    for (let x = 0; x < width; x++) {
      this.map[ind(-1, x)] = this.map[ind(height, x)] = BORDER.uid;
    }
    for (let y = 0; y < width; y++) {
      this.map[ind(y, -1)] = this.map[ind(y, width)] = BORDER.uid;
    }
  }

  inBounds(pos: number): boolean {
    // return inBounds(pos, this.height, this.width);
    return (pos & 15) < this.width && pos > 15 && pos >>> 4 <= this.height;
  }

  static from(location: Location, random: Random, tileset?: Metatileset): Maze {
    // Narrow down the list of possible metatilesets.
    const {rom, width, height} = location;
    if (!tileset) {
      const tilesets = new Set(rom.metatilesets);
      for (const screen of location.allScreens()) {
        for (const tileset of tilesets) {
          if (!tileset.getMetascreens(screen.id).size) tilesets.delete(tileset);
        }
      }
      // Fortress and labyrinth are indistinguishable, so use location id.
      if (location.id === 0xa9) {
        tilesets.delete(rom.metatilesets.fortress);
      } else {
        tilesets.delete(rom.metatilesets.labyrinth);
      }
      // Ensure uniqueness.
      if (!tilesets.size) throw new Error(`No tileset had all screens.`);
      if (tilesets.size > 1) throw new Error(`Nonunique tileset.`);
      tileset = [...tilesets][0];
    }
    const cache = caches.get(tileset);

    // Figure out possible screens.
    const map: Array<Array<number>> =
        new Array((height + 2) << 4).fill(undefined);
    const ambiguous = new Set<number>();
    function addBorder(y: number, x: number) {
      const pos = ind(y, x);
      map[pos] = [0xffff, 0xfffe];
      ambiguous.add(pos);
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = ind(y, x);
        const screens =
            [...tileset.getMetascreens(location.screens[y][x])].map(s => s.uid);
        // TODO - narrow by exits?  location.entranceNear(...)?
        if (screens.length > 1) ambiguous.add(pos);
        map[pos] = screens;
      }
      // Add ambiguous borders.
      addBorder(y, -1);
      addBorder(y, width);
    }
    for (let x = 0; x < width; x++) {
      addBorder(-1, x);
      addBorder(height, x);
    }

    // Resolve any ambiguities.
    while (ambiguous.size) {
      // TODO - why are these not resolving?
      let progress = false;
      const prev = [...ambiguous];
      ambiguous.clear();
      for (const pos of prev) {
        const screens = new Set(map[pos]);
        for (const screen of screens) {
          const ok = [-1, 1, -16, 16].every(delta => {
            if (!inBounds(pos, height, width) &&
                !inBounds(pos + delta, height, width)) {
              return true;
            }
            return map[pos + delta]
                .some(neighbor => cache.check(screen, neighbor, delta));
          });
          if (!ok) {
            screens.delete(screen);
            progress = true;
          }
        }
        map[pos] = [...screens];
      }
      if (!progress) throw new Error(`divergence`);
    }

    // Did we make it here?  If so then we're basically good...!
    const maze = new Maze(random, height, width, tileset);
    maze.map = map.map(s => s ? s[0] : -1);
    return maze;
  }

  // TODO - short vs full?
  show(): string {
    const lines = [];
    let line = [];
    for (let x = 0; x < this.width; x++) {
      line.push(x.toString(16));
    }
    lines.push('   ' + line.join('  '));
    for (let y = 0; y < this.height; y++) {
      for (let r = 0; r < 3; r++) {
        line = [r === 1 ? y.toString(16) : ' ', ' '];
        for (let x = 0; x < this.width; x++) {
          const screen = this.rom.metascreens[this.map[ind(y, x)]];
          line.push(screen?.data.icon?.full[r] ?? (r === 1 ? ' ? ' : '   '));
        }
        lines.push(line.join(''));
      }
    }
    return lines.join('\n');
  }

}

// Map (y, x) screen position to an index.  Note that we use padding for
// borders.  In-bound checking is trivial.
function ind(y: number, x: number): number {
  return ((y + 1) << 4) + x;
}

// TODO - find a place for a Map<number, Metascreen> but what to do with borders?
