import { CaveShuffleAttempt, CaveShuffle } from './cave.js';
import { GridCoord, GridIndex, N, S } from './grid.js';
import { Monogrid, Cursor } from './monogrid.js';
import { Result, OK } from './maze.js';
import { Metalocation, Pos } from '../rom/metalocation.js';
import { Metascreen } from '../rom/metascreen.js';
import { TwoStageCaveShuffle } from './twostage.js';
import { seq } from '../rom/util.js';
import { DefaultMap } from '../util.js';

type A = CaveShuffleAttempt;

export class RiverCaveShuffle extends TwoStageCaveShuffle {
  // basic problem: missing |- and -| pieces.
  //  one solution would be to just add them
  //  outside of that, we need to switch to a pathgen algo rather
  //  than refinement

  // simple pathgen should be pretty easy w/ grid

  // alternatively, trial removals are further-reaching?
  //  - if we remove a horizontal edge then also remove the
  //    opposite edges of any neighbors, continuing.
  //  - or remove a vertical edge of one...?
  early = 'r';
  maxAttempts = 250;
  validRiverScreens?: Set<number>;

  targetEarly() { return this.params.features?.river ?? 0; }

  // addEarlyFeatures(a: A): Result<void> {
  //   // fill with river and then refine down to the correct size.
  //   //this.fillCave(
  //   return
  // }

  // canRemove(c: string) {
  //   return c === 'c' || c === 'r';
  // }

  // removalMap(a: A, coord: GridCoord): Map<GridCoord, string> {
  //   if ((coord & 0x808) !== 0x800) return new Map([[coord, '']]);
  //   // need to be a little cleverer: horizontal branches are not
  //   // allowed (though we could add them, in which case this gets
  //   // a lot easier), so ensure we're left with a bend instead.
  //   const map = new Map([[coord, '']]);
  //   const left = coord - 8 as GridCoord;
  //   if (a.grid.get(left) === 'r') {
  //     const leftUp = left - 0x800 as GridCoord;
  //     const leftDown = left + 0x800 as GridCoord;
  //     const leftLeft = left - 8 as GridCoord;
  //     // may need to remove another neighbor.
  //     if (a.grid.get(leftUp) === 'r' && a.grid.get(leftDown) === 'r' &&
  //         a.grid.get(leftLeft) === 'r') {
  //       map.set(this.random.nextInt(2) ? leftUp : leftDown, '');
  //     }
  //   }
  //   const right = coord + 8 as GridCoord;
  //   if (a.grid.get(right) === 'r') {
  //     const rightUp = right - 0x800 as GridCoord;
  //     const rightDown = right + 0x800 as GridCoord;
  //     const rightRight = right + 8 as GridCoord;
  //     // may need to remove another neighbor.
  //     if (a.grid.get(rightUp) === 'r' && a.grid.get(rightDown) === 'r' &&
  //         a.grid.get(rightRight) === 'r') {
  //       map.set(this.random.nextInt(2) ? rightUp : rightDown, '');
  //     }
  //   }
  //   return map;
  // }

  preinfer(a: A): Result<void> {
    // Make sure river is actually necessary!
    if ([...this.orig.exits()].length < 2) return OK;
    const override = new Map<GridCoord, string>();
    for (let i = 0 as GridIndex; i < a.grid.data.length; i++) {
      if (a.grid.data[i] === 'r') override.set(a.grid.coord(i), '');
    }
    const parts = a.grid.partition(override);
    const stairParts: unknown[] = [];
    for (let i = 0 as GridIndex; i < a.grid.data.length; i++) {
      if (a.grid.data[i] === '<' || a.grid.data[i] === '>' ||
          (a.grid.data[i] && a.grid.isBorder(a.grid.coord(i)))) {
        stairParts.push(parts.get(a.grid.coord(i)));
      }
    }
    if (new Set(stairParts).size < stairParts.length) {
      //console.error(a.grid.show());
      return {ok: false, fail: `river didn't matter\n${a.grid.show()}`};
    }
    return super.preinfer(a);
  }

  addLateFeatures(a: A): Result<void> {
    // console.error(a.grid.show());
    // return super.addLateFeatures(a);
    return OK;
  }

  addArenas(a: A, arenas: number): boolean {
    // This version works a little differently, since it runs as an early
    // feature (before refinement) rather than late.  We look for a 3x1
    // block of 'c' screens, zero out all but the middle (which gets the
    // arena), and then afterwards we prune away any newly-disconnected
    // land screens.
    if (!arenas) return true;
    const g = a.grid;
    for (const c of this.random.ishuffle(a.grid.screens())) {
      const middle = (c | 0x808) as GridCoord;
      const left = (middle - 8) as GridCoord;
      const left2 = (left - 8) as GridCoord;
      const right = (middle + 8) as GridCoord;
      const right2 = (right + 8) as GridCoord;
      const up = middle - 0x800 as GridCoord;
      const down = middle + 0x800 as GridCoord;
      if (g.get(middle) !== 'c') continue;
      if (g.get(up) !== 'c') continue;
      if (g.get(down) !== 'c') continue;
      const leftTile =
          g.isBorder(left) ? '' : this.extract(g, left2 - 0x808 as GridCoord);
      const rightTile =
          g.isBorder(right) ? '' : this.extract(g, right2 - 0x808 as GridCoord);
      if (/[^ c]/.test(leftTile + rightTile)) continue;
      if (!g.isBorder(left)) {
        g.set(left, '');
        g.set(left2, '');
        g.set(left2 - 8 as GridCoord, '');
        g.set(left2 - 0x800 as GridCoord, '');
        g.set(left2 + 0x800 as GridCoord, '');
      }
      if (!g.isBorder(right)) {
        g.set(right, '');
        g.set(right2, '');
        g.set(right2 + 8 as GridCoord, '');
        g.set(right2 - 0x800 as GridCoord, '');
        g.set(right2 + 0x800 as GridCoord, '');
      }
      a.fixed.add(middle);
      a.fixed.add(up);
      a.fixed.add(down);
      g.set(middle, 'a');
      arenas--;
      if (!arenas) {
        this.pruneDisconnected(a);
        return true;
      }
    }
    //console.error('could not add arena');
    return false;
  }
}

export class WaterfallRiverCaveShuffle extends RiverCaveShuffle {

  addBlocks = false;

  initialFillEarly(a: A): Result<void> {
    const g = new Monogrid(a.h, a.w, this.getValidEarlyScreens());
    const x0 = 2 + this.random.nextInt(a.w - 4);
    const x1 = 2 + this.random.nextInt(a.w - 4);
    const c = new Cursor(g, a.h - 1, x1);
    c.go(0);
    c.directedPath(this.random, 1, x0);
    c.go(0);

    a.grid.data = g.toGrid('r').data;
    this.addAllFixed(a);
    return OK;
  }

  addEdges(a: A): Result<void> {
    let r = -1;
    const h = (a.h - 1) << 12 | 0x808;
    for (let x = 0; x < a.w; x++) {
      if (a.grid.get((h | (x << 4)) as GridCoord) === 'r') r = x;
    }
    if (r < 0) throw new Error(`no river on bottom edge`);
    const c0 = (h | this.random.nextInt(r) << 4) as GridCoord;
    const c1 =
        (h | (r + 1 + this.random.nextInt(a.w - 1 - r)) << 4) as GridCoord;
    a.grid.set(c0, '>');
    a.grid.set(c0 - 8 as GridCoord, '');
    a.grid.set(c0 + 8 as GridCoord, '');
    a.grid.set(c1, '>');
    a.grid.set(c1 - 8 as GridCoord, '');
    a.grid.set(c1 + 8 as GridCoord, '');
    a.fixed.add(c0);
    a.fixed.add(c1);
    return OK;
  }

  addStairs(): Result<void> { return OK; }

  checkMeta(meta: Metalocation, repl?: Map<Pos, Metascreen>): boolean {
    const opts = repl ? {flight: true, with: repl} : {flight: true};
    const parts = meta.traverse(opts);
    return new Set(parts.values()).size === this.maxPartitions;
  }
}

export class OasisEntranceCaveShuffle extends CaveShuffle {

  addBlocks = false;

  // new plan: index valid spike screens, accrete a line/curve of them
  // somewhere random (consider adding spike curves?), with random caves
  // sticking out.  Cap the end of the spike and accrete a random river
  // somewhere (may need to increase width).  Then accrete caves, fill
  // in stairs, etc.

  pickWidth() {
    return super.pickWidth() + this.random.nextInt(2);
  }

  initialFill(a: A): Result<void> {
    // multimap of direction masks to tile strings.
    const spikes = new DefaultMap<number, string[]>(() => []);
    for (const scr of this.orig.tileset) {
      if (!scr.hasFeature('spikes') || !scr.data.edges) continue;
      let mask = 0;
      for (let dir = 0; dir < 4; dir++) {
        if (scr.data.edges[dir] === 's') mask |= (1 << dir);
      }
      spikes.get(mask).push(...scr.gridTiles());
    }
    // start accreting.
    const x = 1 + this.random.nextInt(a.w - 2);
    const y = 1 + this.random.nextInt(a.h - 2);
    let pos = y << 4 | x;
    let c = this.posToGrid(pos, 0x808);
    let dir = y < a.h / 2 ? 2 : 0;
    this.insertTile(a, pos, this.random.pick(spikes.get(1 << dir)));
    for (let i = 4; i >= 0; i--) {
      // advance the position.
      pos += DPOS[dir];
      c = c + DGRID[dir] as GridCoord;
      const opp = dir ^ 2;
      const masks: number[] = [];
      for (const [d, ts] of spikes) {
        if (!(d & (1 << opp))) continue;
        const rem = d & ~(1 << opp);
        if (i ? !rem : rem) continue;
        for (const _ of ts) masks.push(d);
      }
      let nextDir: number|undefined;
      for (const d of this.random.ishuffle(masks)) {
        if (a.grid.isBorder(c + DGRID[d] as GridCoord)) continue;
        if (this.insertTile(a, pos, this.random.pick(spikes.get(d)))) {
          nextDir = 31 - Math.clz32(d & ~(1 << opp));
          break;
        }
      }
      if (nextDir == null) return {ok: false, fail: `spikes`};
      dir = nextDir;
    }

    // Now add some river tiles.
    const riverStart: GridCoord[] = [];
    for (let y = 3; y < a.h - 3; y++) {
      for (let x = 1; x < a.w - 1; x++) {
        riverStart.push((y << 12 | x << 4 | 0x808) as GridCoord);
      }
    }
    
    let found = false;
    for (const c of this.random.ishuffle(riverStart)) {
      if (a.grid.get(c)) continue;
      for (const d of DGRID) {
        if (a.grid.get(c + d as GridCoord) !== 'c') continue;
        a.grid.set(c, 'r');
        const orthogonal = 0x808 & ~Math.abs(d);
        a.grid.set(c + orthogonal as GridCoord, 'r');
        a.grid.set(c - orthogonal as GridCoord, 'r');
        const o = this.random.pick([-orthogonal, orthogonal]);
        a.grid.set(c + 2 * o as GridCoord, 'r');
        a.grid.set(c + 3 * o as GridCoord, 'r');
        a.grid.set(c + 2 * o - d as GridCoord, 'c');
        found = true;
        break;
      }
      if (found) break;
    }
    if (!found) return {ok: false, fail: `nucleate river`};

    // let attempts = 10;
    // for (let i = 2 + this.random.nextInt(2); i > 0 && attempts; i--) {
    //   if (!this.tryAdd(a, {char: 'r'})) (attempts--, i++);
    // }
    // if (!attempts) return {ok: false, fail: `accrete river`};

    // Finally add some cave tiles.
    for (let i = 5 + this.random.nextInt(3); i > 0; i--) {
      if (!this.tryAdd(a, {char: 'c'})) return {ok: false, fail: `fill cave`};
    }

    // Make sure there's nothing on the border.
    for (let i = 0; i < a.grid.data.length; i++) {
      if (a.grid.data[i] && a.grid.isBorder(a.grid.coord(i as GridIndex))) {
        return {ok: false, fail: `border`};
      }
    }

    return OK;
  }

  checkMeta(meta: Metalocation, repl?: Map<Pos, Metascreen>): boolean {
    // TODO - relevance requirement?
    const opts = repl ? {flight: true, with: repl} : {flight: true};
    const parts = meta.traverse(opts);
    return new Set(parts.values()).size === this.maxPartitions;
  }

  refine() { return OK; }
  refineEdges() { return true; }

  addSpikes(a: A, spikes: number) {
    return true;
    // for (const s of this.random.ishuffle(a.grid.screens())) {
    //   const c = s + 0x808 as GridCoord;
    //   if (a.grid.get(c) !== 'r') continue;
    //   for (const dir of [0x800, -0x800]) {
    //     if (a.grid.get(c + dir as GridCoord) !== 'c') continue;
    //     let 
    // }
  }

  refineMetascreens(a: A, meta: Metalocation): Result<void> {
    const result = super.refineMetascreens(a, meta);
    if (!result.ok) return result;
    // Require that flight blocks at least one stair.
    function accessible(map: Map<number, Set<number>>): number {
      const stairParts =
          [...new Set(map.values())].filter(set => {
            for (const stair of set) {
              if (meta.exitType(stair)?.startsWith('stair')) return true;
            }
            return false;
          });
      return stairParts.length;
    }
    const parts1 = accessible(meta.traverse());
    const parts2 = accessible(meta.traverse({flight: true}));
    if (parts1 === parts2) return {ok: false, fail: `flight not required`};
    return OK;
  }
}

const DGRID = [-0x800, -8, 0x800, 8];
const DPOS = [-16, -1, 16, 1];

export class StyxRiverCaveShuffle extends RiverCaveShuffle {
  addBlocks = false;

  fillGrid(a: A): Result<void> {
    // make 2 bottom edge exits
    const edges: number[] = [];
    let size = 0;
    for (const x of this.random.ishuffle(seq(a.w - 2, x => x + 1))) {
      if (edges.length === 1 && (x - edges[0]) ** 2 <= 1) continue;
      const c = ((a.h - 1) << 12 | x << 4 | 0x808) as GridCoord;
      a.grid.set(c, 'c');
      a.grid.set(N(c), 'c');
      a.grid.set(S(c), 'n');
      a.fixed.add(c);
      a.fixed.add(N(c));
      a.fixed.add(S(c));
      edges.push(x);
      size++;
      if (edges.length === 2) break;
    }
    if (edges.length < 2) return {ok: false, fail: `initial edges`};
    // make a river across the bottom.
    let rivers = a.w;
    const cut =
        this.random.nextInt(Math.abs(edges[0] - edges[1]) - 1) +
        Math.min(edges[0], edges[1]) + 1;
    for (let i = 1; i < 2 * a.w; i++) {
      if (i === 2 * cut + 1) continue;
      a.grid.set(((a.h - 2) << 12 | i << 3 | 0x800) as GridCoord, 'r');
      a.fixed.add(((a.h - 1) << 12 | i << 3 | 0x800) as GridCoord);
    }
    // extend river.
    const riversTarget = this.params.features!.river!;
    while (rivers < riversTarget) {
      const added = this.tryAdd(a, {char: 'r'});
      if (!added) return {ok: false, fail: `failed to extrude river\n${a.grid.show()}`};
      rivers += added;
      size += added;
    }
    // extrude cave.
    const sizeTarget = this.params.size;
    while (size < sizeTarget) {
      const added = this.tryAdd(a);
      if (!added) return {ok: false, fail: `failed to extrude cave`};
      size += added;
    }

    return this.addStairs(a, ...(this.params.stairs ?? []));
  }

  // Flight may be required for anything.
  checkMeta() { return true; }

  refineMetascreens(a: A, meta: Metalocation): Result<void> {
    const result = super.refineMetascreens(a, meta);
    if (!result.ok) return result;
    // Check simple conditions: (1) there's an accessible bridge,
    // (2) flight is required for some tile.
    function accessible(map: Map<number, Set<number>>): number {
      let count = 0;
      for (const set of new Set(map.values())) {
        for (const edge of set) {
          // only check accessibility from bottom edge.
          if (meta.exitType(edge) === 'edge:bottom') {
            count += set.size;
            break;
          }
        }
      }
      return count;
    }
    const parts1 = accessible(meta.traverse({noFlagged: true}));
    const parts2 = accessible(meta.traverse());
    if (parts1 === parts2) return {ok: false, fail: `bridge didn't matter`};
    const parts3 = accessible(meta.traverse({flight: true}));
    if (parts2 === parts3) return {ok: false, fail: `flight not required`};
    return OK;
  }
}


export class OasisCaveShuffle extends RiverCaveShuffle {

  readonly pattern = [
    '               ',
    ' rrrrrrrrrrrrr ',
    ' r           r ',
    ' r rrrrrrrrr r ',
    ' r r       r r ',
    ' r r rrrrr r r ',
    ' r r r   r r r ',
    ' r r r   r r r ',
    ' r r r   r r r ',
    ' r r r < r r r ',
    ' r r r c r r r ',
    ' r r rrrrr r r ',
    ' r r       r r ',
    ' r rrrrrrrrr r ',
    ' r           r ',
    ' rrrrrrrrrrrrr ',
    '               ',
  ];

  initialFill(a: A): Result<void> {
    // Initial fill: make sure there's enough room and then copy the pattern.
    return this.insertPattern(a, this.pattern);
  }

  addEdges(a: A): Result<void> {
    // Find the top-left corner (TODO - save this somewhere?)
    let corner!: GridCoord;
    for (let i = 0; i < a.grid.data.length; i++) {
      if (a.grid.data[i] === 'r') {
        corner = a.grid.coord(i as GridIndex) - 0x808 as GridCoord;
        break;
      }
    }
    if (corner == null) throw new Error(`no corner`);

    const edges: GridCoord[] = [];
    for (let y = 0; y < this.pattern.length; y++) {
      for (let x = 1; x < this.pattern[y].length - 1; x++) {
        if (!((x ^ y) & 1)) continue;
        if (this.pattern[y][x] !== ' ') continue;
        edges.push(corner + (y << 11 | x << 3) as GridCoord);
      }
    }

    let chars = this.random.shuffle([...'ccrrrrrrrr']);
    for (const edge of this.random.ishuffle(edges)) {
      const char = chars[chars.length - 1];
      // don't place caves on the outer boundary.
      if (char === 'c' &&
          [...this.extract(a.grid, edge - 0x808 as GridCoord)]
              .filter(v => v === 'r').length < 4) {
        continue;
      }
      if (this.canSet(a, edge, char)) a.grid.set(edge, chars.pop()!);
      if (!chars.length) break;
    }

    // Add a few extra 'c' tiles.
    for (let i = 0; i < 6; i++) {
      this.tryAdd(a, {char: 'c'});
    }
    return OK;
  }

  refine(a: A): Result<void> {
    // Add stairs.
    const stairs = [...(this.params.stairs ?? [])];
    stairs[0]--;
    if (stairs[0] || stairs[1]) {
      const result = this.addStairs(a, ...stairs);
      if (!result.ok) return result;
    }
    // Find two cave dead ends and try to pin them (?)
    let deadEnds = 0;
    for (const s of this.random.ishuffle(a.grid.screens())) {
      if (this.extract(a.grid, s).replace(/ /g, '') === 'c') {
        if (stairs[0] && !a.grid.get(s + 8 as GridCoord)) {
          a.grid.set(s + 0x808 as GridCoord, '<');
          stairs[0]--;
        }
        a.fixed.add(s + 0x808 as GridCoord);
        if (++deadEnds >= 2) break;
      }
    }
    // Make sure it's traversible.
    const parts = a.grid.partition();
    if (new Set(parts.values()).size > 1) return {ok: false, fail: `orphans`};
    // // Look for edges we can delete and not actually cut anything off.
    // for (const i of this.random.ishuffle(seq(a.grid.data.length))) {
    //   const c = a.grid.coord(i as GridIndex);
    //   if (!((c ^ (c >> 8)) & 8)) continue; // only look at edges
    //   if (!a.grid.data[i]) continue;
    // }
    return OK;
  }

  fillGrid(a: A): Result<void> {
    let result: Result<void>;
    if ((result = this.initialFill(a)), !result.ok) return result;
    if ((result = this.addEdges(a)), !result.ok) return result;
    if ((result = this.refine(a)), !result.ok) return result;
    return OK;
  }

  // Flight may be required for anything.
  checkMeta(meta: Metalocation, rep?: Map<Pos, Metascreen>) {
    const parts = meta.traverse(rep ? {with: rep} : {});
    const allStairs: number[] = [];
    for (const edges of new Set(parts.values())) {
      let stairs = 0;
      for (const edge of new Set([...edges])) {
        // NOTE: pos can be off the right or bottom edge
        if (meta.exitType(edge)) stairs++;
      }
      allStairs.push(stairs);
    }
    return allStairs.filter(s => s > 0).length === 1;
  }

  refineMetascreens(a: A, meta: Metalocation): Result<void> {
    if (!this.checkMeta(meta)) return {ok: false, fail: `initial checkMeta`};
    const result = super.refineMetascreens(a, meta);
    if (!result.ok) return result;

    // Check that flight is required for some tile.
    // TODO - bias a POI to be on that tile!
    function accessible(map: Map<number, Set<number>>): number {
      let count = 0;
      for (const set of new Set(map.values())) {
        for (const edge of set) {
          if (meta.exitType(edge)) {
            count += set.size;
            break;
          }
        }
      }
      return count;
    }
    const parts1 = accessible(meta.traverse());
    const parts2 = accessible(meta.traverse({flight: true}));
    if (parts1 === parts2) return {ok: false, fail: `flight not required`};

    return OK;
  }
}
