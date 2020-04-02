import { Feature, featureMask } from './metascreendata.js';
import { Metatileset } from './metatileset.js';
import { Metascreen } from './metascreen.js';
import { Metalocation, Pos } from './metalocation.js';
import { Random } from '../random.js';
import { Failure, Ok } from '../failure.js';

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
  empties: Metascreen[] = []; // index: [edgeindex] singleton
  basics: Metascreen[][] = []; // index: [edgeindex] repeated
  variants: Metascreen[][][] = []; // indices: [edgeindex][features] repeated

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

  /** Returns true if there is a tight cycle northwest of pos. */
  isTightCycle(loc: Metalocation, pos: Pos): boolean {
    const ul = this.index.get(loc.get(pos - 17))!;
    const dr = this.index.get(loc.get(pos))!;
    return !!((ul & 0x0f00) && (ul & 0x00f0) && (dr & 0xf000) && (dr & 0x000f));
  }

  /**
   * Attempts to clear a screen out of the location, updating any
   * neighbors that are invalidated as a result.
   */
  tryClear(loc: Metalocation, pos: Pos, random: Random): Ok {
    const middle = loc.get(pos);
    if (middle.isEmpty()) return; // nothing to do
    const middleIndex = this.index.get(middle)!;

    // First see if there's an empty variant with the same edges.
    // This may leave extra spurs around, but we can get rid of
    // them later (if they don't end up getting spawns in them).
    const candidates =
        this.variants[middleIndex][loc.getFeatures(pos) | EMPTY] || []
    for (const candidate of random.ishuffle(candidates)) {
      // Try to place each candidate, return if it just fits.
      if (!loc.trySet(pos, candidate)) return;
    }

    // Edges need changing.  Try inserting a full "empty".
    loc.set(pos, loc.tileset.empty);
    for (const [delta, mask, neighborMask] of NEIGHBOR_DIRS) {
      if (!(middleIndex & mask)) continue; // already empty
      const neighbor = loc.get(pos + delta);
      const neighborIndex = this.index.get(neighbor)! & ~neighborMask;
      const neighborFeatures = loc.getFeatures(pos + delta);
      const next = this.pickScreen(neighborFeatures, neighborIndex, random);
      if (!next) {
        return Failure.of('no screen for %x %x',
                          neighborFeatures, neighborIndex);
      }
      loc.set(pos + delta, next);
    }
    return loc.validate();

    // given a pos, look at neighbors in non-empty dirs and see if they're all
    // basic and can have the given edge removed.

    // TODO - consider using set2d to set a bunch at once?
    //      - or else invert control to have Metalocation accept the index?
    //      - clearAndUpdate?
    // how to automatically get narrow entrances?  postprocess???
  }

  /** Tries to remove an edge. */
  tryClearEdge(loc: Metalocation, pos0: Pos, dir: number, random: Random): Ok {
    const scr0 = loc.get(pos0);
    const features0 = loc.getFeatures(pos0);
    const index0 = this.index.get(scr0)!;
    const [delta, mask0, mask1] = NEIGHBOR_DIRS[dir];
    const clear0 = index0 & ~mask0;
    if (index0 === clear0) return;
    const pos1 = pos0 + delta;
    const scr1 = loc.get(pos1);
    const features1 = loc.getFeatures(pos1);
    const index1 = this.index.get(scr1)!;
    const clear1 = index1 & ~mask1;
    const next0 = this.pickScreen(features0, clear0, random);
    const next1 = this.pickScreen(features1, clear1, random);
    if (!next0) {
      return Failure.of('no screen (%x, %x) at %02x', features0, clear0, pos0);
    }
    if (!next1) {
      return Failure.of('no screen (%x, %x) at %02x', features1, clear1, pos1);
    }
    loc.set(pos0, next0);
    loc.set(pos1, next1);
    return loc.validate();
  }

  tryAddFeature(loc: Metalocation, pos: Pos, feature: Feature,
                random: Random): Ok {
    const mask = featureMask[feature] | loc.getFeatures(pos);
    const index = this.index.get(loc.get(pos))!;
    const scr = this.pickScreen(mask, index, random);
    if (!scr) {
      return Failure.of('no eligible screens for (%x,%x) at %02x',
                        mask, index, pos);
    }
    return loc.trySet(pos, scr);
    // TODO - try to be more clever?
  }

  // TODO - try to add a path?!?

  pickScreen(features: number, index: number, random: Random): Metascreen|null {
    const candidates =
        features ? this.variants[index][features] : this.basics[index];
    if (!candidates.length) return null;
    return random.pick(candidates);
  }
}

const EMPTY = featureMask['empty'];

const NEIGHBOR_DIRS = [
  [-16, 0xf, 0xf00],
  [-1, 0xf0, 0xf000],
  [16, 0xf00, 0xf],
  [1, 0xf000, 0xf0],
] as const;

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
