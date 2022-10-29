// Returns element where fn returns 0, or ~insertion point
// First parameter is the size to search: [0..n-1] inclusive.
// Function returns + if we need to increase, - if we need to decrease.
// To find an element in a list:
//     binarySearch(list.length, (i) => wanted - list[i]);
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
  protected _chunks: Array<readonly [number, T[]]> = [];
  protected _length: number = 0;

  // NOTE: length is a high water mark.
  get length() { return this._length; }
  // TODO - set length - may need to splice
  //  - alternative: shrink() method

  protected _find(target: number): number {
    return binarySearch(this._chunks.length, (i: number) => {
      const [start, data] = this._chunks[i];
      if (target < start) return -1;
      if (target >= start + data.length) return 1;
      return 0;
    });
  }

  apply(target: MutableArrayLike<T>) {
    if (target.length < this._length) throw new Error(`Target too small.`);
    for (const [start, chunk] of this._chunks) {
      for (let i = 0; i < chunk.length; i++) {
        target[start + i] = chunk[i];
      }
    }
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
    this.setInternal(start, values);
  }

  protected setInternal(start: number, values: IterableArrayLike<T>) {
    if (!values.length) return; // nothing to do
    const end = start + values.length;
    this._length = Math.max(this._length, end);
    let i0 = this._find(start);
    let i1 = this._find(end);
    if (i0 >= 0 && i0 === i1) {
      // Optimize trivial case of overwriting already-filled values
      const [s0, a0] = this._chunks[i0];
      for (let i = 0; i < values.length; i++) {
        a0[start + i - s0] = values[i];
      }
      return;
    }
    const e0 = this._chunks[~i0 - 1];
    if (e0 && (e0[0] + e0[1].length === start)) i0 = ~i0 - 1;
    if (this._chunks[~i1]?.[0] === end) i1 = ~i1;
    if (i0 >= 0) {
      const [s0, a0] = this._chunks[i0];
      if (i1 !== i0 || !Array.isArray(values)) {
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
    if (!Array.isArray(values)) values = Array.from(values);
    this._chunks.splice(s, e - s, [start, values as T[]]);
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

  slice(start: number, end: number): T[] {
    if (end <= start) return [];
    const i = this._find(start);
    if (i < 0) throw new Error(`Absent: ${start}`);
    const [s, a] = this._chunks[i];
    if (s + a.length < end) throw new Error(`Absent: ${s + a.length}`);
    return a.slice(start - s, end - s);
  }
}

interface MutableArrayLike<T> {
  length: number;
  [i: number]: T;
}

/** Specialization of SparseArray optimized for efficient search. */
export class SparseByteArray extends SparseArray<number> {

  set(start: number, arr: Uint8Array): void;
  set(start: number, ...values: number[]): void;
  set(start: number, ...args: Array<number|Uint8Array>) {
    this.setInternal(start, args[0] instanceof Uint8Array ?
                     args[0] : Uint8Array.from(args as number[]));
  }

  search(needle: ArrayLike<number>, start?: number, end?: number): number {
    return this.pattern(needle).search(start, end);
  }

  /** Perform a Boyer-Moore search. */
  pattern(needle: ArrayLike<number>): SparseByteArray.Pattern {
    // Stupid trivial edge cases first
    if (!needle.length) return {search: (start = 0) => start};
    const len = needle.length;
    // Build jump table based on mismatched char info
    const charTable: number[] = new Array(256).fill(len);
    for (let i = 0; i < needle.length; i++) {
      charTable[needle[i]] = len - 1 - i;
    }
    // Build jump table based on scan offset for mismatch (bad char rule)
    const offsetTable: number[] = [];
    let lastPrefixPos = len;
    for (let i = len; i > 0; --i) {
      if (isPrefix(i)) {
        lastPrefixPos = i;
      }
      offsetTable[len - i] = lastPrefixPos - i + len;
      for (let i = 0; i < len - 1; ++i) {
        const slen = suffixLength(i);
        offsetTable[slen] = len - 1 - i + slen;
      }
    }
    return {search: (start = 0, end = this._length): number => {
      if (!this._chunks.length || end < start) return -1;
      // handle start position
      let k = this._find(start);
      let i0 = 0;
      if (k >= 0) {
        i0 = start - this._chunks[k][0];
      } else {
        k = ~k;
      }
      while (k < this._chunks.length) {
        const [offset, haystack] = this._chunks[k++];
        const i1 = Math.min(end - offset, haystack.length);
        if (i1 < 0) break;
        for (let i = len - 1 + i0, j; i < i1;) {
          for (j = len - 1; needle[j] === haystack[i]; --i, --j) {
            if (j === 0) return i + offset;
          }
          i += Math.max(offsetTable[len - 1 - j], charTable[haystack[i]]);
        }
        i0 = 0;
      }
      return -1;
    }};

    function isPrefix(p: number) {
      for (let i = p, j = 0; i < len; ++i, ++j) {
        if (needle[i] !== needle[j]) return false;
      }
      return true;
    }
    function suffixLength(p: number) {
      let out = 0;
      for (let i = p, j = len - 1;
           i >= 0 && needle[i] === needle[j];
           --i, --j) {
        ++out;
      }
      return out;
    }
  }

  addOffset(offset: number): SparseByteArray {
    const out = new SparseByteArray();
    for (const [start, data] of this._chunks) {
      out._chunks.push([start + offset, data]);
    }
    return out;
  }

  toIpsPatch(): Uint8Array {
    let size = 8;
    for (const [, chunk] of this._chunks) {
      size += 5 + chunk.length;
    }
    const buffer = new Uint8Array(size);
    let i = 5;
    buffer[0] = 0x50;
    buffer[1] = 0x41;
    buffer[2] = 0x54;
    buffer[3] = 0x43;
    buffer[4] = 0x48;
    for (const [start, chunk] of this._chunks) {
      if (chunk.length > 0xffff) throw new Error(`Oops!`);
      buffer[i++] = start >>> 16;
      buffer[i++] = (start >>> 8) & 0xff;
      buffer[i++] = start & 0xff;
      buffer[i++] = chunk.length >>> 8;
      buffer[i++] = chunk.length & 0xff;
      buffer.subarray(i, i + chunk.length).set(chunk);
      i += chunk.length;
    }
    buffer[i] = 0x45;
    buffer[i + 1] = 0x4f;
    buffer[i + 2] = 0x46;
    return buffer;
  }

  toIpsHexString(): string {
    //return Array.from(this.toIpsPatch(), x => x.toString(16).padStart(2, '0'))
    // NOTE: this format is compatible with `xxd -r foo.ips.hex > foo.ips`
    const bytes = [...this.toIpsPatch()];
    const lines = [];
    for (let i = 0; i < bytes.length; i += 16) {
      lines.push([i.toString(16).padStart(8, '0') + ':',
                  ...bytes.slice(i, i + 16)
                      .map(x => x.toString(16).padStart(2, '0'))].join(' '));
    }
    return lines.join('\n');
  }
}

export namespace SparseByteArray {
  export interface Pattern {
    search(start?: number, end?: number): number;
  }
}


// Helper functions to avoid doing expensive array operations, given the
// assumption that we can destroy the input.
function spliceHead<T>(a0: T[], i: number, a1: IterableArrayLike<T>): T[] {
  const l0 = a0.length;
  if (a1.length < l0 || !Array.isArray(a1)) {
    a0.splice(i, l0 - i, ...a1);
    return a0;
  }
  a1.unshift(...arrayHead(a0, i));
  return a1;
}

function spliceTail<T>(a0: IterableArrayLike<T>, i: number, a1: T[]): T[] {
  const l1 = a1.length;
  if (a0.length < l1 || !Array.isArray(a0)) {
    a1.splice(0, i, ...a0);
    return a1;
  }
  a0.push(...arrayTail(a1, i));
  return a0;
}

type IterableArrayLike<T> = ArrayLike<T> & Iterable<T>;

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
