import { CaveShuffle } from './cave';
import { GridCoord, GridIndex, N, S } from './grid';
import { Monogrid, Cursor } from './monogrid';
import { Result, OK } from './maze';
import { Metalocation, Pos } from '../rom/metalocation';
import { Metascreen } from '../rom/metascreen';
import { TwoStageCaveShuffle } from './twostage';
import { seq } from '../rom/util';
import { DefaultMap } from '../util';

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

  // addEarlyFeatures(): Result<void> {
  //   // fill with river and then refine down to the correct size.
  //   //this.fillCave(
  //   return
  // }

  // canRemove(c: string) {
  //   return c === 'c' || c === 'r';
  // }

  // removalMap(coord: GridCoord): Map<GridCoord, string> {
  //   if ((coord & 0x808) !== 0x800) return new Map([[coord, '']]);
  //   // need to be a little cleverer: horizontal branches are not
  //   // allowed (though we could add them, in which case this gets
  //   // a lot easier), so ensure we're left with a bend instead.
  //   const map = new Map([[coord, '']]);
  //   const left = coord - 8 as GridCoord;
  //   if (this.grid.get(left) === 'r') {
  //     const leftUp = left - 0x800 as GridCoord;
  //     const leftDown = left + 0x800 as GridCoord;
  //     const leftLeft = left - 8 as GridCoord;
  //     // may need to remove another neighbor.
  //     if (this.grid.get(leftUp) === 'r' && this.grid.get(leftDown) === 'r' &&
  //         this.grid.get(leftLeft) === 'r') {
  //       map.set(this.random.nextInt(2) ? leftUp : leftDown, '');
  //     }
  //   }
  //   const right = coord + 8 as GridCoord;
  //   if (this.grid.get(right) === 'r') {
  //     const rightUp = right - 0x800 as GridCoord;
  //     const rightDown = right + 0x800 as GridCoord;
  //     const rightRight = right + 8 as GridCoord;
  //     // may need to remove another neighbor.
  //     if (this.grid.get(rightUp) === 'r' && this.grid.get(rightDown) === 'r' &&
  //         this.grid.get(rightRight) === 'r') {
  //       map.set(this.random.nextInt(2) ? rightUp : rightDown, '');
  //     }
  //   }
  //   return map;
  // }

  preinfer(): Result<void> {
    // Make sure river is actually necessary!
    if ([...this.orig.exits()].length < 2) return OK;
    const override = new Map<GridCoord, string>();
    for (let i = 0 as GridIndex; i < this.grid.data.length; i++) {
      if (this.grid.data[i] === 'r') override.set(this.grid.coord(i), '');
    }
    const parts = this.grid.partition(override);
    const stairParts: unknown[] = [];
    for (let i = 0 as GridIndex; i < this.grid.data.length; i++) {
      if (this.grid.data[i] === '<' || this.grid.data[i] === '>' ||
          (this.grid.data[i] && this.grid.isBorder(this.grid.coord(i)))) {
        stairParts.push(parts.get(this.grid.coord(i)));
      }
    }
    if (new Set(stairParts).size < stairParts.length) {
      //console.error(this.grid.show());
      return {ok: false, fail: `river didn't matter\n${this.grid.show()}`};
    }
    return super.preinfer();
  }

  addLateFeatures(): Result<void> {
    // console.error(this.grid.show());
    // return super.addLateFeatures();
    return OK;
  }

  addArenas(arenas: number): boolean {
    // This version works a little differently, since it runs as an early
    // feature (before refinement) rather than late.  We look for a 3x1
    // block of 'c' screens, zero out all but the middle (which gets the
    // arena), and then afterwards we prune away any newly-disconnected
    // land screens.
    if (!arenas) return true;
    const g = this.grid;
    for (const c of this.random.ishuffle(this.grid.screens())) {
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
      this.fixed.add(middle);
      this.fixed.add(up);
      this.fixed.add(down);
      g.set(middle, 'a');
      arenas--;
      if (!arenas) {
        this.pruneDisconnected();
        return true;
      }
    }
    //console.error('could not add arena');
    return false;
  }
}

export class WaterfallRiverCaveShuffle extends RiverCaveShuffle {

  addBlocks = false;

  initialFillEarly(): Result<void> {
    const g = new Monogrid(this.h, this.w, this.getValidEarlyScreens());
    const x0 = 2 + this.random.nextInt(this.w - 4);
    const x1 = 2 + this.random.nextInt(this.w - 4);
    const c = new Cursor(g, this.h - 1, x1);
    c.go(0);
    c.directedPath(this.random, 1, x0);
    c.go(0);

    this.grid.data = g.toGrid('r').data;
    this.addAllFixed();
    return OK;
  }

  addEdges(): Result<void> {
    let r = -1;
    const h = (this.h - 1) << 12 | 0x808;
    for (let x = 0; x < this.w; x++) {
      if (this.grid.get((h | (x << 4)) as GridCoord) === 'r') r = x;
    }
    if (r < 0) throw new Error(`no river on bottom edge`);
    const c0 = (h | this.random.nextInt(r) << 4) as GridCoord;
    const c1 =
        (h | (r + 1 + this.random.nextInt(this.w - 1 - r)) << 4) as GridCoord;
    this.grid.set(c0, '>');
    this.grid.set(c0 - 8 as GridCoord, '');
    this.grid.set(c0 + 8 as GridCoord, '');
    this.grid.set(c1, '>');
    this.grid.set(c1 - 8 as GridCoord, '');
    this.grid.set(c1 + 8 as GridCoord, '');
    this.fixed.add(c0);
    this.fixed.add(c1);
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

  initialFill(): Result<void> {
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
    const x = 1 + this.random.nextInt(this.w - 2);
    const y = 1 + this.random.nextInt(this.h - 2);
    let pos = y << 4 | x;
    let c = this.posToGrid(pos, 0x808);
    let dir = y < this.h / 2 ? 2 : 0;
    this.insertTile(pos, this.random.pick(spikes.get(1 << dir)));
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
        if (this.grid.isBorder(c + DGRID[d] as GridCoord)) continue;
        if (this.insertTile(pos, this.random.pick(spikes.get(d)))) {
          nextDir = 31 - Math.clz32(d & ~(1 << opp));
          break;
        }
      }
      if (nextDir == null) return {ok: false, fail: `spikes`};
      dir = nextDir;
    }

    // Now add some river tiles.
    const riverStart: GridCoord[] = [];
    for (let y = 3; y < this.h - 3; y++) {
      for (let x = 1; x < this.w - 1; x++) {
        riverStart.push((y << 12 | x << 4 | 0x808) as GridCoord);
      }
    }
    
    let found = false;
    for (const c of this.random.ishuffle(riverStart)) {
      if (this.grid.get(c)) continue;
      for (const d of DGRID) {
        if (this.grid.get(c + d as GridCoord) !== 'c') continue;
        this.grid.set(c, 'r');
        const orthogonal = 0x808 & ~Math.abs(d);
        this.grid.set(c + orthogonal as GridCoord, 'r');
        this.grid.set(c - orthogonal as GridCoord, 'r');
        const o = this.random.pick([-orthogonal, orthogonal]);
        this.grid.set(c + 2 * o as GridCoord, 'r');
        this.grid.set(c + 3 * o as GridCoord, 'r');
        this.grid.set(c + 2 * o - d as GridCoord, 'c');
        found = true;
        break;
      }
      if (found) break;
    }
    if (!found) return {ok: false, fail: `nucleate river`};

    // let attempts = 10;
    // for (let i = 2 + this.random.nextInt(2); i > 0 && attempts; i--) {
    //   if (!this.tryAdd({char: 'r'})) (attempts--, i++);
    // }
    // if (!attempts) return {ok: false, fail: `accrete river`};

    // Finally add some cave tiles.
    for (let i = 5 + this.random.nextInt(3); i > 0; i--) {
      if (!this.tryAdd({char: 'c'})) return {ok: false, fail: `fill cave`};
    }

    // Make sure there's nothing on the border.
    for (let i = 0; i < this.grid.data.length; i++) {
      if (this.grid.data[i] && this.grid.isBorder(this.grid.coord(i as GridIndex))) {
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

  addSpikes(spikes: number) {
    return true;
    // for (const s of this.random.ishuffle(this.grid.screens())) {
    //   const c = s + 0x808 as GridCoord;
    //   if (this.grid.get(c) !== 'r') continue;
    //   for (const dir of [0x800, -0x800]) {
    //     if (this.grid.get(c + dir as GridCoord) !== 'c') continue;
    //     let 
    // }
  }

  refineMetascreens(meta: Metalocation): Result<void> {
    const result = super.refineMetascreens(meta);
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

  fillGrid(): Result<void> {
    // make 2 bottom edge exits
    const edges: number[] = [];
    let size = 0;
    for (const x of this.random.ishuffle(seq(this.w - 2, x => x + 1))) {
      if (edges.length === 1 && (x - edges[0]) ** 2 <= 1) continue;
      const c = ((this.h - 1) << 12 | x << 4 | 0x808) as GridCoord;
      this.grid.set(c, 'c');
      this.grid.set(N(c), 'c');
      this.grid.set(S(c), 'n');
      this.fixed.add(c);
      this.fixed.add(N(c));
      this.fixed.add(S(c));
      edges.push(x);
      size++;
      if (edges.length === 2) break;
    }
    if (edges.length < 2) return {ok: false, fail: `initial edges`};
    // make a river across the bottom.
    let rivers = this.w;
    const cut =
        this.random.nextInt(Math.abs(edges[0] - edges[1]) - 1) +
        Math.min(edges[0], edges[1]) + 1;
    for (let i = 1; i < 2 * this.w; i++) {
      if (i === 2 * cut + 1) continue;
      this.grid.set(((this.h - 2) << 12 | i << 3 | 0x800) as GridCoord, 'r');
      this.fixed.add(((this.h - 1) << 12 | i << 3 | 0x800) as GridCoord);
    }
    // extend river.
    const riversTarget = this.params.features!.river!;
    while (rivers < riversTarget) {
      const added = this.tryAdd({char: 'r'});
      if (!added) return {ok: false, fail: `failed to extrude river\n${this.grid.show()}`};
      rivers += added;
      size += added;
    }
    // extrude cave.
    const sizeTarget = this.params.size;
    while (size < sizeTarget) {
      const added = this.tryAdd();
      if (!added) return {ok: false, fail: `failed to extrude cave`};
      size += added;
    }

    return this.addStairs(...(this.params.stairs ?? []));
  }

  // Flight may be required for anything.
  checkMeta() { return true; }

  refineMetascreens(meta: Metalocation): Result<void> {
    const result = super.refineMetascreens(meta);
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

  initialFill(): Result<void> {
    // Initial fill: make sure there's enough room and then copy the pattern.
    return this.insertPattern(this.pattern);
  }

  addEdges(): Result<void> {
    // Find the top-left corner (TODO - save this somewhere?)
    let corner!: GridCoord;
    for (let i = 0; i < this.grid.data.length; i++) {
      if (this.grid.data[i] === 'r') {
        corner = this.grid.coord(i as GridIndex) - 0x808 as GridCoord;
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
          [...this.extract(this.grid, edge - 0x808 as GridCoord)]
              .filter(v => v === 'r').length < 4) {
        continue;
      }
      if (this.canSet(edge, char)) this.grid.set(edge, chars.pop()!);
      if (!chars.length) break;
    }

    // Add a few extra 'c' tiles.
    for (let i = 0; i < 6; i++) {
      this.tryAdd({char: 'c'});
    }
    return OK;
  }

  refine(): Result<void> {
    // Add stairs.
    const stairs = [...(this.params.stairs ?? [])];
    stairs[0]--;
    if (stairs[0] || stairs[1]) {
      const result = this.addStairs(...stairs);
      if (!result.ok) return result;
    }
    // Find two cave dead ends and try to pin them (?)
    let deadEnds = 0;
    for (const s of this.random.ishuffle(this.grid.screens())) {
      if (this.extract(this.grid, s).replace(/ /g, '') === 'c') {
        if (stairs[0] && !this.grid.get(s + 8 as GridCoord)) {
          this.grid.set(s + 0x808 as GridCoord, '<');
          stairs[0]--;
        }
        this.fixed.add(s + 0x808 as GridCoord);
        if (++deadEnds >= 2) break;
      }
    }
    // Make sure it's traversible.
    const parts = this.grid.partition();
    if (new Set(parts.values()).size > 1) return {ok: false, fail: `orphans`};
    // // Look for edges we can delete and not actually cut anything off.
    // for (const i of this.random.ishuffle(seq(this.grid.data.length))) {
    //   const c = this.grid.coord(i as GridIndex);
    //   if (!((c ^ (c >> 8)) & 8)) continue; // only look at edges
    //   if (!this.grid.data[i]) continue;
    // }
    return OK;
  }

  fillGrid(): Result<void> {
    let result: Result<void>;
    if ((result = this.initialFill()), !result.ok) return result;
    if ((result = this.addEdges()), !result.ok) return result;
    if ((result = this.refine()), !result.ok) return result;
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

  refineMetascreens(meta: Metalocation): Result<void> {
    if (!this.checkMeta(meta)) return {ok: false, fail: `initial checkMeta`};
    const result = super.refineMetascreens(meta);
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
