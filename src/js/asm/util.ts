// Returns element where fn returns 0, or ~insertion point
export function binarySearch(n: number, f: (i: number) => number): number {
  if (!n) return ~0;
  const fa = f(0);
  const fb = f(n - 1);
  if (fa < 0) return ~0;
  if (fa === 0) return 0;
  if (fb > 0) return ~n;
  if (fb === 0) return n - 1;
  let a = 0;
  let b = n - 1;
  while (b - a > 1) {
    const m = (a + b) >> 1;
    const fm = f(m);
    if (fm > 0) {
      a = m;
    } else if (fm < 0) {
      b = m;
    } else {
      return m;
    }
  }
  return ~b;
}

export function binaryInsert<T>(arr: T[], f: (t: T) => number, t: T) {
  const x = f(t);
  const index = binarySearch(arr.length, i => x < f(arr[i]) ? -1 : 1);
  arr.splice(~index, 0, t);
}

export class SparseArray<T> {
  private _chunks: Array<readonly [number, T[]]> = [];

  private _find(target: number): number {
    return binarySearch(this._chunks.length, (i: number) => {
      const [start, data] = this._chunks[i];
      if (target < start) return -1;
      if (target >= start + data.length) return 1;
      return 0;
    });
  }

  chunks(): ReadonlyArray<readonly [number, readonly T[]]> {
    return this._chunks;
  }

  get(index: number): T|undefined {
    let i = this._find(index);
    if (i < 0) return undefined;
    const [start, data] = this._chunks[i];
    return data[index - start];
  }

  set(start: number, ...values: T[]) {
    if (!values.length) return; // nothing to do
    const end = start + values.length;
    let i0 = this._find(start);
    let i1 = this._find(end);
    const e0 = this._chunks[~i0 - 1];
    if (e0 && (e0[0] + e0[1].length === start)) i0 = ~i0 - 1;
    if (this._chunks[~i1]?.[0] === end) i1 = ~i1;
    if (i0 >= 0) {
      const [s0, a0] = this._chunks[i0];
      if (i1 !== i0) {
        values = spliceHead(a0, start - s0, values);
      } else {
        values.unshift(...a0.slice(0, start - s0));
      }
      start = s0;
    }
    if (i1 >= 0) {
      const [s1, a1] = this._chunks[i1];
      values = spliceTail(values, end - s1, a1)
    }
    let s = i0 < 0 ? ~i0 : i0;
    let e = i1 < 0 ? ~i1 : i1;
    if (i1 >= 0) e++;
    this._chunks.splice(s, e - s, [start, values]);
  }

  splice(start: number, length = 1) {
    const end = start + length;
    let i0 = this._find(start);
    let i1 = this._find(end);
    let e0 = i0 >= 0 ? this._chunks[i0] : undefined;
    let e1 = i1 >= 0 ? this._chunks[i1] : undefined;
    if (e0) {
      
      const l0 = start - e0[0];
      if (l0) {
        e0 = [e0[0], e0 === e1 ? e0[1].slice(0, l0) : arrayHead(e0[1], l0)];
      } else {
        e0 = undefined;
        i0 = ~i0;
      }
    }
    if (e1) {
      e1 = [end, arrayTail(e1[1], end - e1[0])];
      if (!e1[1].length) {
        e1 = undefined;
        i1 = ~i1;
      }
    }

    const entries = [];
    if (e0) entries.push(e0);
    if (e1) entries.push(e1);

    let s = i0 < 0 ? ~i0 : i0;
    let e = i1 < 0 ? ~i1 : i1;
    if (i1 >= 0) e++;
    
    this._chunks.splice(s, e - s, ...entries);
  }
}

// Helper functions to avoid doing expensive array operations, given the
// assumption that we can destroy the input.
function spliceHead<T>(a0: T[], i: number, a1: T[]): T[] {
  const l0 = a0.length;
  if (a1.length < l0) {
    a0.splice(i, l0 - i, ...a1);
    return a0;
  }
  a1.unshift(...arrayHead(a0, i));
  return a1;
}

function spliceTail<T>(a0: T[], i: number, a1: T[]): T[] {
  const l1 = a1.length;
  if (a0.length < l1) {
    a1.splice(0, i, ...a0);
    return a1;
  }
  a0.push(...arrayTail(a1, i));
  return a0;
}

function arrayHead<T>(arr: T[], i: number): T[] {
  const l = arr.length;
  if ((i << 1) < l) {
    return arr.slice(0, i);
  }
  arr.splice(i, l - i);
  return arr;
}

function arrayTail<T>(arr: T[], i: number): T[] {
  const l = arr.length;
  if ((i << 1) < l) {
    arr.splice(0, i);
    return arr;
  }
  return arr.slice(i);
}

// export function linearSearch<T>(T[] haystack, T[] needle,
//                                 start = 0, end = haystack.length): number {

// }

export class BitSet {
  private data = new Uint8Array(16);

  add(i: number) {
    const byte = i >>> 3;
    if (byte >= this.data.length) {
      let newSize = this.data.length;
      while (newSize <= byte) newSize <<= 1;
      const newData = new Uint8Array(newSize);
      newData.subarray(0, this.data.length).set(this.data);
      this.data = newData;
    }
    this.data[byte] |= (1 << (i & 7));
  }

  delete(i: number) {
    const byte = i >>> 3;
    if (byte < this.data.length) this.data[byte] &= ~(1 << (i & 7));
  }

  has(i: number): boolean {
    return Boolean((this.data[i >>> 3] || 0) & (1 << (i & 7)));
  }
}

export class IntervalSet implements Iterable<readonly [number, number]> {
  private data: Array<[number, number]> = [];

  [Symbol.iterator]() { 
    return this.data[Symbol.iterator]();
  }

  private _find(v: number): number {
    return binarySearch(this.data.length, (i: number) => {
      const entry = this.data[i];
      //if (!entry) console.log(i, v);
      if (v < entry[0]) return -1;
      if (v >= entry[1]) return 1;
      return 0;
    });
  }

  has(x: number) {
    return this._find(x) >= 0;
  }

  add(start: number, end: number) {
    let i0 = this._find(start);
    let i1 = this._find(end);
    if (this.data[~i0 - 1]?.[1] === start) i0 = ~i0 - 1;
    if (this.data[~i1]?.[0] === end) i1 = ~i1;
    const entry: [number, number] = [start, end];
    if (i0 >= 0) entry[0] = this.data[i0][0];
    if (i1 >= 0) entry[1] = this.data[i1][1];
    let s = i0 < 0 ? ~i0 : i0;
    let e = i1 < 0 ? ~i1 : i1;
    if (i1 >= 0) e++;
    this.data.splice(s, e - s, entry);
  }

  delete(start: number, end: number) {
    let i0 = this._find(start);
    let i1 = this._find(end);
    let e0 = i0 >= 0 ? this.data[i0] : undefined;
    let e1 = i1 >= 0 ? this.data[i1] : undefined;
    if (e0) {
      e0 = [e0[0], Math.min(e0[1], start)];
      if (e0[0] === e0[1]) {
        e0 = undefined;
        i0 = ~i0;
      }
    }
    if (e1) {
      e1 = [Math.max(e1[0], end), e1[1]];
      if (e1[0] === e1[1]) {
        e1 = undefined;
        i1 = ~i1;
      }
    }

    const entries = [];
    if (e0) entries.push(e0);
    if (e1) entries.push(e1);

    let s = i0 < 0 ? ~i0 : i0;
    let e = i1 < 0 ? ~i1 : i1;
    if (i1 >= 0) e++;
    
    this.data.splice(s, e - s, ...entries);
  }

  tail(x: number): IterableIterator<readonly [number, number]> {
    let index = this._find(x);
    if (index < 0) index = ~index;
    const data = this.data;
    return {
      [Symbol.iterator]() { return this; },
      next() {
        if (index >= data.length) return {value: undefined, done: true};
        const e = data[index++];
        return {value: [Math.max(x, e[0]), e[1]], done: false};
      },
    };
  }
}
