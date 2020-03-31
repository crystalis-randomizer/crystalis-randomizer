import { Feature, featureMask } from './metascreendata.js';
import { Metatileset } from './metatileset.js';
import { Metascreen } from './metascreen.js';
import { Metalocation, Pos } from './metalocation.js';
import { Random } from '../random.js';

type EdgeIndex = number;

// TODO - this mainly applies to caves, but we'll want to take a different
// approach with overworld, breaking it up into corners (12/48) and then
// growing out pairs of mountains (e.g.
//   00   =>   84
//   cc   =>   ed
// would correspond to jutting out an outcropping from the bottom, or
//   0a   =>   8e
//   ce   =>   ef
// would be adding a bit on a corner.  Alternatively, we could "burrow out"
// from a solid mountain, expanding the valley until it's big enough?
// We may want to extract a common interface between overworld and cave
// indexes, if possible?

/**
 * Given a Metatileset and some edge types, indexes the basic
 * and variant screens.
 */
export class MetascreenIndex {

  index = new Map<Metascreen, EdgeIndex>();
  basics: Metascreen[][] = [];
  empties: Metascreen[] = [];
  variants: Metascreen[][][] = []; // indices: variants[index][features]

  constructor(readonly tileset: Metatileset,
              edges: string, // edge types to consider
              basicFeatures: Feature[] = []) { // features considered "basic"
    const revEdges: Record<string, number> = {' ': 0};
    for (let i = 0; i < edges.length; i++) {
      revEdges[edges[i]] = i + 1; // 0 is always empty
    }
    let nonBasicMask = ~0;
    for (const feature of basicFeatures) {
      nonBasicMask &= ~featureMask[feature];
    }
    const features: [EdgeIndex, Metascreen][] = [];
    for (const screen of tileset) {
      // Skip anything with no edges or bad edges.
      if (!screen.data.edges) continue;
      const index = indexEdges(screen.data.edges, revEdges);
      if (index < 0) continue;
      const empty = screen.isEmpty();
      this.index.set(screen, index);
      // Save anything with features, we'll use it later.
      const nonBasicFeatures = screen.features & nonBasicMask;
      if (nonBasicFeatures) {
        features.push([index, screen]);
        // only add to basics if (1) no edges, and (2) features is exactly empty
        if (index) continue;
        if (nonBasicFeatures !== featureMask['empty']) continue;
      }
      // Depending on whether this is empty or not, either add it to
      // basics or empties.  If it's empty with a zero index, add to
      // both??
      if (empty) this.empties[index] = screen;
      if (empty && index) continue;
      (this.basics[index] || (this.basics[index]  = [])).push(screen);
    }
    for (const [index, screen] of features) {
      //for (const bits of powerSet(screen.features)) {
      for (const bits of [screen.features]) {
        const inner = this.variants[index] || (this.variants[index] = []);
        (inner[bits] || (inner[bits] = [])).push(screen);
      }
    }
  }

  tryClear(loc: Metalocation, pos: Pos, random: Random): boolean {
    const middle = loc.get(pos);
    if (middle.isEmpty()) return true; // nothing to do
    const middleIndex = this.index.get(middle)!;
    // const sameIndexEmpty = this.empties[middleIndex];
    // if (sameIndexEmpty) return loc.set(pos, sameIndexEmpty);
    const candidates =
        this.variants[middleIndex][loc.getFeatures(pos) | EMPTY] || []
    for (const candidate of random.ishuffle(candidates)) {
      // In theory this should fit fine.  Clear out random spurs later.
      if (loc.set(pos, candidate)) return true;
    }



    // given a pos, look at neighbors in non-empty dirs and see if they're all
    // basic and can have the given edge removed.

    // TODO - consider using set2d to set a bunch at once?
    //      - or else invert control to have Metalocation accept the index?
    //      - clearAndUpdate?
    // how to automatically get narrow entrances?  postprocess???
  }

  // TODO - try to add a path?!?

}

const EMPTY = featureMask['empty'];

function indexEdges(edges: string, dict: Record<string, number>): EdgeIndex {
  let index = 0;
  for (let i = 0; i < 4; i++) {
    const digit = dict[edges[i]];
    if (digit == null) return -1;
    index = index << 4 | digit;
  }
  return index;
}

// function * powerSet(num: number) {
//   Math.clz32(num)
// }

//const OPTIONAL_PROPS = ['empty', 
