import { Random } from '../random';
import { Grid, GridCoord } from './grid';
import { Multiset } from '../util';
import { UnionFind } from '../unionfind';

/** A simpler grid of a single type of edge. */
export class Monogrid {
  /** Elements are 0..f. */
  data: Uint8Array;
  fixed = new Set<number>();
  size = 0;

  constructor(readonly h: number, readonly w: number,
              readonly valid?: Set<number>) {
    this.data = new Uint8Array(h * w);
  }

  /** Fill the grid. */
  fill() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (y > 0) this.data[i] |= 1;
        if (x > 0) this.data[i] |= 2;
        if (y < this.h - 1) this.data[i] |= 4;
        if (x < this.w - 1) this.data[i] |= 8;
      }
    }
    // TODO - check valid?
  }

  isBorder(i: number, dir: number): boolean {
    const x = i % this.w;
    const y = (i - x) / this.w;
    return this.isBorder2(y, x, dir);
  }

  isBorder2(y: number, x: number, dir: number): boolean {
    if (dir === 0) return !y;
    if (dir === 1) return !x;
    if (dir === 2) return y >= this.h - 1;
    if (dir === 3) return x >= this.w - 1;
    throw new Error('bad direction');
  }

  // Delete a screen.
  delete2(y: number, x: number, i = y * this.w + x): boolean {
    if (this.fixed.has(i)) return false;
    const repl = new Map<number, number>();
    repl.set(i, 0);
    for (let dir = 0; dir < 4; dir++) {
      if (this.isBorder2(y, x, dir)) continue;
      const neighbor = i + this.delta(dir);
      const prev = this.data[neighbor];
      const next = prev & ~(1 << (dir ^ 2));
      if (prev !== next) {
        if (this.fixed.has(neighbor)) return false;
        repl.set(neighbor, next);
      }
    }
    return this.try(repl);
  }

  delete(i: number): boolean {
    const x = i % this.w;
    const y = (i - x) / this.w;
    return this.delete2(y, x, i);
  }

  // Delete an edge.
  deleteEdge2(y: number, x: number, dir: number, i0 = y * this.w + x): boolean {
    if (this.fixed.has(i0)) return false;
    if (this.isBorder2(y, x, dir)) {
      this.data[i0] &= ~(1 << dir);
      return true;
    }
    const repl = new Map<number, number>();
    const i1 = i0 + this.delta(dir);
    if (this.fixed.has(i1)) return false;
    repl.set(i0, this.data[i0] & ~(1 << dir));
    repl.set(i1, this.data[i1] & ~(1 << (dir ^ 2)));
    return this.try(repl);
  }

  deleteEdge(i: number, dir: number): boolean {
    const x = i % this.w;
    const y = (i - x) / this.w;
    return this.deleteEdge2(y, x, dir, i);
  }

  refine(random: Random, target: number): boolean {
    let count = 0;
    const all = new Set<number>();
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i]) count++;
      if (!this.fixed.has(i)) all.add(i);
    }
    // Find screens to delete
    while (count > target) {
      let found = false;
      for (const pos of random.ishuffle(all)) {
        if (count <= target) break;
        const scr = this.data[pos];
        if (!scr) {
          count--;
          continue;
        }
        if (this.delete(pos)) {
          found = true;
          count--;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  validate() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        const v = this.data[i];
        if (y && !(this.data[i - this.w] & 4) !== !(v & 1)) {
          throw new Error(`invalid above ${y}${x}`);
        }
        if (x && !(this.data[i - 1] & 8) !== !(v & 2)) {
          throw new Error(`invalid left of ${y}${x}`);
        }
      }
    }
  }

  // Add an edge.
  addEdge(y: number, x: number, dir: number) {
    const i = y * this.w + x;
    this.data[i] |= 1 << dir;
    if (!this.isBorder2(y, x, dir)) {
      this.data[i + this.delta(dir)] |= 1 << (dir ^ 2);
    }
  }

  /**
   * Across all the non-fixed screens, rearrange them to reduce the number
   * of different screens to <= target.
   */
  consolidate(random: Random, target: number): number[] {
    const counts = new Multiset<number>();
    for (let i = 0; i < this.data.length; i++) {
      if (!this.fixed.has(i) && this.data[i]) counts.add(this.data[i]);
    }

    let attempts = 1000;
    while (counts.unique() > target && --attempts) {
      const sorted = [...counts].sort((a, b) => b[1] - a[1]);
      const threshold = sorted[target][1];
      const bad = new Set(sorted.filter(a => a[1] <= threshold).map(x => x[0]));
      const eligible = this.findEligibleConsolidates(bad);
      if (!eligible.length) return [];
      for (const [i, s] of random.pick(eligible)) {
        if (this.data[i]) counts.delete(this.data[i]);
        if (s) counts.add(s);
        this.data[i] = s;
      }
    }
    if (!attempts) return [];
    return [...counts].map(x => x[0]);
  }

  /** Try to remove all instances of bad screens. */
  consolidateFixed(random: Random, bad: Set<number>): boolean {
    const counts = new Multiset<number>();
    for (let i = 0; i < this.data.length; i++) {
      const scr = this.data[i];
      if (!this.fixed.has(i) && bad.has(scr)) counts.add(scr);
    }

    let attempts = 1000;
    while (counts.unique() && --attempts) {
      const eligible = this.findEligibleConsolidates(bad);
      if (!eligible.length) return false;
      for (const [i, s] of random.pick(eligible)) {
        const scr = this.data[i];
        if (bad.has(scr)) counts.delete(scr);
        if (bad.has(s)) counts.add(s);
        this.data[i] = s;
      }
    }
    if (!attempts) return false;
    return true;
  }

  /** Returns a set of elibile consolidations. */
  findEligibleConsolidates(bad: Set<number>): Array<Map<number, number>> {
    const eligible: Array<Map<number, number>> = [];
    const best: Array<Map<number, number>> = [];
    for (let i = 0; i < this.data.length; i++) {
      if (this.fixed.has(i)) continue;
      const scr0 = this.data[i];
      if (!bad.has(scr0)) continue;
      for (let dir = 0; dir < 4; dir++) {
        if (this.isBorder(i, dir)) continue;
        const delta = this.delta(dir);
        if (this.fixed.has(i + delta)) continue;
        const mask0 = 1 << dir;
        if (bad.has(scr0 ^ mask0)) continue;
        const mask1 = 1 << (dir ^ 2);
        const scr1 = this.data[i + delta];
        const repl = new Map([[i, scr0 ^ mask0], [i + delta, scr1 ^ mask1]]);
        if (!this.check(repl)) continue;
        eligible.push(repl);
        if (!bad.has(scr1 ^ mask1) && bad.has(scr1)) {
          best.push(repl);
          break;
        }
      }
    }
    return best.length ? best : eligible;
  }

  try(map: Map<number, number>): boolean {
    if (!this.check(map)) return false;
    for (const [i, v] of map) {
      this.data[i] = v;
    }
    //this.validate();
    return true;
  }

  check(map?: Map<number, number>): boolean {
    const uf = new UnionFind<number>();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        const s = map?.get(i) ?? this.data[i];
        if (s) uf.union([i]); // handle disconnected edges
        if (y > 0 && (s & 1)) uf.union([i, i - this.w]);
        if (x > 0 && (s & 2)) uf.union([i, i - 1]);
        if (y < this.h - 1 && (s & 4)) uf.union([i, i + this.w]);
        if (x < this.w - 1 && (s & 8)) uf.union([i, i + 1]);
      }
    }
    return uf.roots().length === 1;
  }

  /** Add a path onto an existing non-empty element, if one exists. */
  addPath(random: Random, maxSize?: number): boolean {
    let y: number;
    let x: number;
    if (!this.size) {
      y = random.nextInt(this.h);
      x = random.nextInt(this.w);
    } else {
      const eligible: number[] = [];
      for (let i = 0; i < this.data.length; i++) {
        if (this.data[i] && this.data[i] !== 0xf) eligible.push(i);
      }
      if (!eligible.length) return false;
      const p = random.pick(eligible);
      x = p % this.w;
      y = (p - x) / this.w;
    }
    const path = new Map<number, number>();
    let i = y * this.w + x;
    let len = 0;
    let ok = true;
    while (true) {
      let closed = false;
      const prev = path.get(i) ?? this.data[i];
      let found = false;
      for (let dir of random.ishuffle([0, 1, 2, 3])) {
        const mask = (1 << dir);
        if (prev & mask) continue;
        const next = prev | mask;
        if (this.valid && !this.valid.has(next)) continue;
        const y1 = y + DY[dir];
        const x1 = x + DX[dir];
        if (y1 < 0 || x1 < 0 || y1 >= this.h || x1 >= this.w) continue;
        const i1 = y1 * this.w + x1;
        const prev1 = path.get(i1) ?? this.data[i1];
        const next1 = prev1 | (1 << (dir ^ 2));
        if (prev1) {
          if (prev1 === next1 || (this.valid && !this.valid.has(next1))) {
            continue; // either a complete retrace, or invalid
          }
          closed = true;
        }
        ok = !this.valid || this.valid.has(next1);
        path.set(i, next);
        path.set(i1, next1);
        x = x1;
        y = y1;
        i = i1;
        found = true;
        break;
      }
      if (!found) break;
      if (closed || this.data[i]) break;
      if (!this.size++) this.size++; // count 2 the first time
      if (ok && maxSize && this.size >= maxSize) break;
      if (ok && random.nextInt(15) < len++) break;
    }
    if (!path.size || !ok) return false;
    for (const [i, v] of path) {
      this.data[i] = v;
    }
    return true;
  }

  toGrid<T>(char: T): Grid<T> {
    const g = new Grid<T>(this.h, this.w);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        const s = this.data[i];
        if (!s) continue;
        const c = (y << 12 | x << 4 | 0x808) as GridCoord;
        g.set(c, char);
        for (let dir = 0; dir < 4; dir++) {
          if (!(s & (1 << dir))) continue;
          const delta = dir & 1 ? 8 : 0x800;
          g.set((dir & 2 ? c + delta : c - delta) as GridCoord, char);
        }
      }
    }
    return g;
  }

  delta(dir: number) {
    return (dir & 2 ? 1 : -1) * (dir & 1 ? 1 : this.w);
  }

  show(): string {
    const lines = [];
    for (let y = 0; y < this.h; y++) {
      let line = '';
      for (let x = 0; x < this.w; x++) {
        line += ' ╵╴┘╷│┐┤╶└─┴┌├┬┼'[this.data[y * this.w + x]];
      }
      lines.push(line);
    }
    return lines.join('\n');
  }
}

export class Cursor {
  private _i: number
  constructor(readonly grid: Monogrid, y: number, x: number) {
    this._i = y * grid.w + x;
  }

  get x() { return this._i % this.grid.w };
  get y() { return Math.floor(this._i / this.grid.w); }

  go(dir: number) {
    const delta = this.grid.delta(dir);
    const i1 = this._i + delta;
    const mask0 = 1 << dir;
    const mask1 = 1 << (dir ^ 2);
    this.grid.data[this._i] |= mask0;
    this.grid.data[this._i = i1] |= mask1;
    // TODO - check valid?
  }

  directedPath(random: Random, y: number, x: number) {
    while (true) {
      const y0 = this.y;
      const x0 = this.x;
      const dirs: number[] = [];
      if (y < y0) dirs.push(0);
      if (x < x0) dirs.push(1);
      if (y > y0) dirs.push(2);
      if (x > x0) dirs.push(3);
      if (!dirs.length) return;
      this.go(random.pick(dirs));
    }
  }
}

const DY = [-1, 0, 1, 0];
const DX = [0, -1, 0, 1];
