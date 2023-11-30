// Simple table utility

export interface ReadonlyTable<R, C, V> {
  [Symbol.iterator](): Iterator<[R, C, V]>;
  get(row: R, col: C): V|undefined;
  row(row: R): ReadonlyMap<C, V>;
  col(col: C): ReadonlyMap<R, V>;
  readonly size: number;
}

export class Table<R, C, V> implements Iterable<[R, C, V]> {
  private readonly rows = new Map<R, Map<C, V>>();
  private readonly cols = new Map<C, Map<R, V>>();
  private _size = 0;
  private readonly inc = (delta: number) => { this._size += delta; };

  * [Symbol.iterator](): Iterator<[R, C, V]> {
    for (const [r, m] of this.rows) {
      for (const [c, v] of m) {
        yield [r, c, v];
      }
    }
  }

  set(r: R, c: C, v: V) {
    this.row(r).set(c, v);
  }

  delete(r: R, c: C) {
    this.rows.get(r)?.delete(c);
  }

  get(r: R, c: C): V|undefined {
    return this.rows.get(r)?.get(c);
  }

  get size(): number {
    return this._size;
  }

  row(r: R): Map<C, V> {
    let m = this.rows.get(r);
    if (!m) {
      m = new TableMap<C, R, V>(this.rows, this.cols, r, this.inc);
      this.rows.set(r, m);
    }
    return m;
  }

  col(c: C): Map<R, V> {
    let m = this.cols.get(c);
    if (!m) {
      m = new TableMap<R, C, V>(this.cols, this.rows, c, this.inc);
      this.cols.set(c, m);
    }
    return m;
  }
}

class TableMap<K, T, V> extends Map<K, V> {
  constructor(private readonly parent: Map<T, Map<K, V>>,
              private readonly alt: Map<K, Map<T, V>>,
              private readonly ind: T,
              private readonly inc: (delta: number) => void) { super(); }
  override set(k: K, v: V) {
    let c = this.alt.get(k);
    if (!c) {
      this.alt.set(k, c = new TableMap<T, K, V>(this.alt, this.parent, k, this.inc));
    }
    if (!this.has(k)) this.inc(1);
    Map.prototype.set.call(this.alt.get(k), this.ind, v);
    return super.set(k, v);
  }
  override delete(k: K) {
    const m = this.alt.get(k);
    if (m) Map.prototype.delete.call(m, this.ind);
    if (this.has(k)) this.inc(-1);
    return super.delete(k);
  }
  override clear() {
    for (const k of this.keys()) {
      const m = this.alt.get(k);
      if (m) Map.prototype.delete.call(m, this.ind);
    }
    this.inc(-this.size);
    return super.clear();
  }
}
