import { Monogrid } from './monogrid';
import { GridCoord, GridIndex } from './grid';
import { CaveShuffle } from './cave';
import { OK, Result } from './maze';
import { Mutable, hex, seq } from '../rom/util';
import { Metalocation } from '../rom/metalocation';

export abstract class TwoStageCaveShuffle extends CaveShuffle {
  maxAttempts = 250;
  abstract early: string;
  validEarlyScreens?: Set<number>;

  abstract targetEarly(): number;

  initialFill(): Result<void> {
    let result: Result<void>;
    if ((result = this.initialFillEarly()), !result.ok) return result;
    this.initialFillLate();
    if ((result = this.connectEarlyToLate()), !result.ok) return result;
    // update count
    this.count =
        [...this.grid.screens()]
            .filter(pos => this.grid.get(pos + 0x808 as GridCoord)).length;
    return OK;
  }

  initialFillEarly(): Result<void> {
    const g = new Monogrid(this.h, this.w, this.getValidEarlyScreens());
    let attempts = 0;
    const target = this.targetEarly();
    while (attempts++ < 20 && g.size < target) {
      if (g.addPath(this.random, target)) attempts = 0;
    }

    this.grid.data = g.toGrid(this.early).data;
    this.addAllFixed();
    return OK;
  }

  initialFillLate() {
    // Add cave screens where possible
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = (y << 12 | x << 4 | 0x808) as GridCoord;
        if (!this.grid.get(c)) this.grid.set(c, 'c');
      }
    }

    // Connect all the 'c' screens, don't connect to 'r'
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        for (const d of [8, 0x800]) {
          const c = (y << 12 | x << 4 | 0x808) as GridCoord;
          const c1 = c + d as GridCoord;
          const c2 = c + 2 * d as GridCoord;
          if (!this.grid.isBorder(c1) && !this.grid.get(c1) &&
              this.grid.get(c) === 'c' && this.grid.get(c2) === 'c') {
            this.grid.set(c1, 'c');
          }
        }
      }
    }
  }

  connectEarlyToLate(): Result<void> {
    // Add connections between land and water
    for (const s of this.random.ishuffle(this.grid.screens())) {
      for (const d of [8, 0x800]) {
        const c = s | 0x808 as GridCoord;
        const c1 = c + d as GridCoord;
        const c2 = c + 2 * d as GridCoord;
        if (this.grid.isBorder(c1) || this.grid.get(c1)) continue;
        // Check if adding c1 is valid
        this.grid.set(c1, 'c');
        const s1 = this.extract(this.grid, c - 0x808 as GridCoord);
        const s2 = this.extract(this.grid, c2 - 0x808 as GridCoord);
        if (!this.orig.tileset.getMetascreensFromTileString(s1).length ||
            !this.orig.tileset.getMetascreensFromTileString(s2).length) {
          this.grid.set(c1, '');
        }
      }
    }
    return OK;
  }

  pruneDisconnected(): Result<void> {
    // Prune anything not attached to river, make sure it's big enough.
    const parts = new Set(this.grid.partition().values());
    let size = 0;
    for (const part of parts) {
      const early = [...part].some(c => this.grid.get(c) === this.early);
      if (early) {
        size += [...part].filter(c => (c & 0x808) === 0x808).length;
      } else {
        for (const c of part) {
          if (this.fixed.has(c)) {
            return {ok: false, fail: `fixed tile ${hex(c)} disconnected`};
          }
          this.grid.set(c, '');
        }
      }
    }
    if (size < this.params.size) {
      console.error(this.grid.show());
      return {ok: false, fail: 'too much disconnected'};
    }
    return OK;
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

  addEarlyFeatures(): Result<void> {
    if (!this.addArenas(this.params.features?.arena ?? 0)) {
      return {ok: false, fail: 'addArenas'};
    }
    let result: Result<void>
    if ((result = this.pruneDisconnected()), !result.ok) return result;
    return super.addEarlyFeatures();
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

  // initialFillEarly(): Result<void> {

  //   // TODO - random upfront loc for arenas and downstair, connect w/ paths?
  //   //      - need a more random directed path.

  //   const r = super.initialFillEarly();
  //   if (!r.ok) return r;
  //   // Find somewhere for the downstairs.
  //   for (const c of this.random.ishuffle(this.grid.screens())) {
  //     const e = this.extract(this.grid, c);
  //     if (e === ' w  w    ') {
  //       this.grid.set(c + 0x808 as GridCoord, '>');
  //       return OK;
  //     } else if (c >>> 12 < this.h - 1 &&
  //                / [w ] www   /.test(e) &&
  //                !/\S/.test(this.extract(this.grid, c + 0x1000 as GridCoord))) {
  //       this.grid.set(c + 0x1008 as GridCoord, 'w');
  //       this.grid.set(c + 0x1808 as GridCoord, '>');
  //       return OK;
  //     }
  //   }
  //   return {ok: false, fail: `could not place downstair`};
  // }

  initialFillEarly(): Result<void> {
    const g = new Monogrid(this.h, this.w);
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
    this.grid.data = g.toGrid('w').data;
    const set = (i: number, v: string) => {
      const x = i % g.w;
      const y = (i - x) / g.w;
      const c = (y << 12 | x << 4 | 0x808) as GridCoord;
      this.grid.set(c, v);
      for (const d of [-0x808, -0x800, -0x7f8, -8, 0, 8, 0x7f8, 0x800, 0x808]) {
        this.fixed.add(c + d as GridCoord);
      }
    };
    set(stair, '>');
    for (const a of arenas) {
      set(a, 'a');
    }
    let size = 3;
    for (const s of this.grid.screens()) {
      if (this.grid.get(s + 0x808 as GridCoord)) size++;
    }
    (this as Mutable<this>).size = size;
    return OK;
  }

  addStairs(up?: number, down?: number) {
    return super.addStairs(up, down ? down - 1 : 0);
  }

  addArenas() { return true; }

  connectEarlyToLate(): Result<void> {
    for (let y = 0; y < this.h; y++) {
      const row = y << 12 | 0x808;
      for (let x = 0; x < this.w; x++) {
        const c = (row | x << 4) as GridCoord;
        if (this.grid.get(c) === 'a') {
          this.grid.set(c - 0x800 as GridCoord, 'c');
        }
      }
    }
    return OK;
  }

  preinfer(): Result<void> {
    const map = new Map<GridCoord, string>();
    for (let i = 0 as GridIndex; i < this.grid.data.length; i++) {
      if (this.grid.data[i] === 'w') map.set(this.grid.coord(i), '');
    }
    const parts = this.grid.partition(map);
    const ups = new Set<Set<GridCoord>>();
    for (const [c, s] of parts) {
      if (this.grid.get(c) === '<') ups.add(s);
    }
    if (ups.size < 2) return {ok: false, fail: `stairs bunched`};
    return OK;
  }

  refineMetascreens(meta: Metalocation): Result<void> {
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
