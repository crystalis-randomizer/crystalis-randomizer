import { Monogrid } from './monogrid.js';
import { GridIndex, GridCoord } from './grid.js';
import { CaveShuffle, CaveShuffleAttempt } from './cave.js';
import { Result, OK } from './maze.js';
import { hex, seq, Mutable } from '../rom/util.js';
import { Metalocation } from '../rom/metalocation.js';

type A = CaveShuffleAttempt;

export abstract class TwoStageCaveShuffle extends CaveShuffle {
  maxAttempts = 250;
  abstract early: string;
  validEarlyScreens?: Set<number>;

  abstract targetEarly(): number;

  initialFill(a: A): Result<void> {
    let result: Result<void>;
    if ((result = this.initialFillEarly(a)), !result.ok) return result;
    this.initialFillLate(a);
    if ((result = this.connectEarlyToLate(a)), !result.ok) return result;
    // update count
    a.count =
        [...a.grid.screens()]
            .filter(pos => a.grid.get(pos + 0x808 as GridCoord)).length;
    return OK;
  }

  initialFillEarly(a: A): Result<void> {
    const g = new Monogrid(a.h, a.w, this.getValidEarlyScreens());
    let attempts = 0;
    const target = this.targetEarly();
    while (attempts++ < 20 && g.size < target) {
      if (g.addPath(this.random, target)) attempts = 0;
    }

    a.grid.data = g.toGrid(this.early).data;
    this.addAllFixed(a);
    return OK;
  }

  initialFillLate(a: A) {
    // Add cave screens where possible
    for (let y = 0; y < a.h; y++) {
      for (let x = 0; x < a.w; x++) {
        const c = (y << 12 | x << 4 | 0x808) as GridCoord;
        if (!a.grid.get(c)) a.grid.set(c, 'c');
      }
    }

    // Connect all the 'c' screens, don't connect to 'r'
    for (let y = 0; y < a.h; y++) {
      for (let x = 0; x < a.w; x++) {
        for (const d of [8, 0x800]) {
          const c = (y << 12 | x << 4 | 0x808) as GridCoord;
          const c1 = c + d as GridCoord;
          const c2 = c + 2 * d as GridCoord;
          if (!a.grid.isBorder(c1) && !a.grid.get(c1) &&
              a.grid.get(c) === 'c' && a.grid.get(c2) === 'c') {
            a.grid.set(c1, 'c');
          }
        }
      }
    }
  }

  connectEarlyToLate(a: A): Result<void> {
    // Add connections between land and water
    for (const s of this.random.ishuffle(a.grid.screens())) {
      for (const d of [8, 0x800]) {
        const c = s | 0x808 as GridCoord;
        const c1 = c + d as GridCoord;
        const c2 = c + 2 * d as GridCoord;
        if (a.grid.isBorder(c1) || a.grid.get(c1)) continue;
        // Check if adding c1 is valid
        a.grid.set(c1, 'c');
        const s1 = this.extract(a.grid, c - 0x808 as GridCoord);
        const s2 = this.extract(a.grid, c2 - 0x808 as GridCoord);
        if (!this.orig.tileset.getMetascreensFromTileString(s1).length ||
            !this.orig.tileset.getMetascreensFromTileString(s2).length) {
          a.grid.set(c1, '');
        }
      }
    }
    return OK;
  }

  pruneDisconnected(a: A): Result<void> {
    // Prune anything not attached to river, make sure it's big enough.
    const parts = new Set(a.grid.partition().values());
    let size = 0;
    for (const part of parts) {
      const early = [...part].some(c => a.grid.get(c) === this.early);
      if (early) {
        size += [...part].filter(c => (c & 0x808) === 0x808).length;
      } else {
        for (const c of part) {
          if (a.fixed.has(c)) {
            return {ok: false, fail: `fixed tile ${hex(c)} disconnected`};
          }
          a.grid.set(c, '');
        }
      }
    }
    if (size < this.params.size) {
      console.error(a.grid.show());
      return {ok: false, fail: 'too much disconnected'};
    }
    return OK;
  }

  addAllFixed(a: A) {
    for (let i = 0; i < a.grid.data.length; i++) {
      if (a.grid.data[i]) a.fixed.add(a.grid.coord(i as GridIndex));
    }
  }

  getValidEarlyScreens(): Set<number> {
    if (!this.validEarlyScreens) {
      const valid = new Set<number>();
      for (const s of this.orig.tileset) {
        const index = s.edgeIndex(this.early);
        if (index != null) valid.add(index);
      }
      this.validEarlyScreens = valid;
    }
    return this.validEarlyScreens;
  }

  addEarlyFeatures(a: A): Result<void> {
    if (!this.addArenas(a, this.params.features?.arena ?? 0)) {
      return {ok: false, fail: 'addArenas'};
    }
    let result: Result<void>
    if ((result = this.pruneDisconnected(a)), !result.ok) return result;
    return super.addEarlyFeatures(a);
  }
}



export class SaberaPalaceShuffle extends TwoStageCaveShuffle {
  early = 'w';
  maxAttempts = 250;

  targetEarly() {
    // Adds +2 because arenas must come from wide screens.
    const target = this.params.features?.wide;
    return target != null ? target + 2 + this.random.nextInt(3) : 0;
  }

  // initialFillEarly(a: A): Result<void> {

  //   // TODO - random upfront loc for arenas and downstair, connect w/ paths?
  //   //      - need a more random directed path.

  //   const r = super.initialFillEarly(a);
  //   if (!r.ok) return r;
  //   // Find somewhere for the downstairs.
  //   for (const c of this.random.ishuffle(a.grid.screens())) {
  //     const e = this.extract(a.grid, c);
  //     if (e === ' w  w    ') {
  //       a.grid.set(c + 0x808 as GridCoord, '>');
  //       return OK;
  //     } else if (c >>> 12 < a.h - 1 &&
  //                / [w ] www   /.test(e) &&
  //                !/\S/.test(this.extract(a.grid, c + 0x1000 as GridCoord))) {
  //       a.grid.set(c + 0x1008 as GridCoord, 'w');
  //       a.grid.set(c + 0x1808 as GridCoord, '>');
  //       return OK;
  //     }
  //   }
  //   return {ok: false, fail: `could not place downstair`};
  // }

  initialFillEarly(a: A): Result<void> {
    const g = new Monogrid(a.h, a.w);
    g.fill();
    const all = seq(g.data.length).slice(g.w);
    const stair = this.random.pick(all);
    if (!g.deleteEdge(stair, 1)) return {ok: false, fail: `initial stair`};
    if (!g.deleteEdge(stair, 2)) return {ok: false, fail: `initial stair`};
    if (!g.deleteEdge(stair, 3)) return {ok: false, fail: `initial stair`};
    g.fixed.add(stair);
    const allSet = new Set(all);
    allSet.delete(stair);
    const arenas: number[] = [];
    for (const pos of this.random.ishuffle(allSet)) {
      function del(p: number) {
        if (!g.delete(p)) return false;
        g.fixed.add(p);
        return true;
      }
      const targetArenas = this.params.features?.arena ?? 0;
      if (arenas.length >= targetArenas) break;
      if (pos > g.data.length - 2 * g.w) continue;
      if (g.fixed.has(pos)) continue;
      const l = !g.isBorder(pos, 1);
      const r = !g.isBorder(pos, 3);
      if (l && g.fixed.has(pos - 1)) continue;
      if (r && g.fixed.has(pos + 1)) continue;
      if (g.fixed.has(pos - g.w)) continue;
      if (g.fixed.has(pos + g.w)) continue;
      if (!(g.data[pos] & 4)) continue;
      if (!del(pos - g.w)) return {ok: false, fail: `initial arena`};
      if (l && !del(pos - 1)) return {ok: false, fail: `initial arena`};
      if (r && !del(pos + 1)) return {ok: false, fail: `initial arena`};
      const d = pos + g.w;
      if ((g.data[d] & 5) !== 5) return {ok: false, fail: `initial arena`};
      if (!g.deleteEdge(d, 1)) return {ok: false, fail: `initial arena`};
      if (!g.deleteEdge(d, 3)) return {ok: false, fail: `initial arena`};
      g.deleteEdge(d + g.w, 2);
      g.fixed.add(d);
      arenas.push(pos);
      g.fixed.add(pos);
    }
    if (!g.refine(this.random, this.targetEarly())) {
      return {ok: false, fail: `refine`};
    }
    const bad = new Set<number>();
    for (let i = 1; i < 16; i++) {
      if (!this.getValidEarlyScreens().has(i)) bad.add(i);
    }
    if (!g.consolidateFixed(this.random, bad)) {
      return {ok: false, fail: `consolidate`};
    }
    a.grid.data = g.toGrid('w').data;
    function set(i: number, v: string) {
      const x = i % g.w;
      const y = (i - x) / g.w;
      const c = (y << 12 | x << 4 | 0x808) as GridCoord;
      a.grid.set(c, v);
      for (const d of [-0x808, -0x800, -0x7f8, -8, 0, 8, 0x7f8, 0x800, 0x808]) {
        a.fixed.add(c + d as GridCoord);
      }
    }
    set(stair, '>');
    for (const a of arenas) {
      set(a, 'a');
    }
    let size = 3;
    for (const s of a.grid.screens()) {
      if (a.grid.get(s + 0x808 as GridCoord)) size++;
    }
    (a as Mutable<typeof a>).size = size;
    return OK;
  }

  addStairs(a: A, up?: number, down?: number) {
    return super.addStairs(a, up, down ? down - 1 : 0);
  }

  addArenas() { return true; }

  connectEarlyToLate(a: A): Result<void> {
    for (let y = 0; y < a.h; y++) {
      const row = y << 12 | 0x808;
      for (let x = 0; x < a.w; x++) {
        const c = (row | x << 4) as GridCoord;
        if (a.grid.get(c) === 'a') {
          a.grid.set(c - 0x800 as GridCoord, 'c');
        }
      }
    }
    return OK;
  }

  preinfer(a: A): Result<void> {
    const map = new Map<GridCoord, string>();
    for (let i = 0 as GridIndex; i < a.grid.data.length; i++) {
      if (a.grid.data[i] === 'w') map.set(a.grid.coord(i), '');
    }
    const parts = a.grid.partition(map);
    const ups = new Set<Set<GridCoord>>();
    for (const [c, s] of parts) {
      if (a.grid.get(c) === '<') ups.add(s);
    }
    if (ups.size < 2) return {ok: false, fail: `stairs bunched`};
    return OK;
  }

  refineMetascreens(a: A, meta: Metalocation): Result<void> {
    for (const pos of meta.allPos()) {
      const scr = meta.get(pos);
      if (scr.hasFeature('arena')) {
        meta.set(pos, meta.rom.metascreens.fortressArena_through);
      }
    }
    return OK;
  }

  refineEdges() { return true; }
}
