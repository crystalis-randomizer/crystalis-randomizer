export class Deque<T> implements Iterable<T> {

  private buffer: (T | undefined)[] = new Array(16);
  private mask: number = 0xf;
  private start: number = 0;
  private end: number = 0;
  private size: number = 0;

  constructor(iter?: Iterable<T>) {
    if (iter) this.push(...iter);
  }

  [Symbol.iterator](): Iterator<T> {
    let i = 0;
    return {
      next: () => {
        if (i >= this.size) return {value: undefined, done: true};
        return {
          value: this.buffer[(this.start + i++) & this.mask] as T,
          done: false,
        };
      },
      [Symbol.iterator]() { return this; }
    } as Iterator<T>;
  }

  get length(): number {
    return this.size;
  }

  upsize(target: number) {
    while (this.mask <= target) {
      if (this.end < this.start) this.start += this.mask + 1;
      this.mask = this.mask << 1 | 1;
      this.buffer = this.buffer.concat(this.buffer);
    }
    this.size = target;
  }

  push(...elems: T[]) {
    this.upsize(this.size + elems.length);
    for (const elem of elems) {
      this.buffer[this.end] = elem;
      this.end = (this.end + 1) & this.mask;
    }
  }

  pop(): T | undefined {
    if (!this.size) return undefined;
    this.end = (this.end - 1) & this.mask;
    this.size--;
    return this.buffer[this.end];
  }

  peek(): T | undefined {
    if (!this.size) return undefined;
    return this.buffer[(this.end - 1) & this.mask];
  }

  unshift(...elems: T[]) {
    this.upsize(this.size + elems.length);
    let i = this.start = (this.start - elems.length) & this.mask;
    for (const elem of elems) {
      this.buffer[i++ & this.mask] = elem;
    }
  }

  shift(): T | undefined {
    if (!this.size) return undefined;
    const result = this.buffer[this.start];
    this.start = (this.start + 1) & this.mask;
    this.size--;
    return result;
  }

  front(): T | undefined {
    if (!this.size) return undefined;
    return this.buffer[this.start];
  }

  get(i: number): T | undefined {
    if (i >= this.size) return undefined;
    return this.buffer[(this.start + i) & this.mask];
  }

  slice(start: number, end: number = this.size): T[] {
    if (start < 0) start += this.size;
    if (end < 0) end += this.size;
    if (end <= start) return [];
    start = (this.start + Math.max(0, Math.min(this.size, start))) & this.mask;
    end = (this.start + Math.max(0, Math.min(this.size, end))) & this.mask;
    if (start <= end) return this.buffer.slice(start, end) as T[];
    return this.buffer.slice(start).concat(this.buffer.slice(0, end)) as T[];
  }

  splice(start: number, count: number, ...elems: T[]): T[] {
    if (start < 0) start += this.size;
    start = Math.max(0, Math.min(this.size, start));
    count = Math.max(0, Math.min(this.size - start, count));
    let end = start + count;
    const delta = elems.length - count;
    const out = this.slice(start, end);
    this.upsize(this.size + delta);
    this.size -= delta; // undo the size change so slice works

    if (start === 0) {
      this.start = (this.start - delta) & this.mask;
      for (let i = 0; i < elems.length; i++) {
        this.buffer[(this.start + i) & this.mask] = elems[i];
      }
    } else if (end === this.size) {
      this.end = (this.end + delta) & this.mask;
      start += this.start;
      for (let i = 0; i < elems.length; i++) {
        this.buffer[(start + i) & this.mask] = elems[i];
      }
    } else {
      // splice out of the middle...
      const buf = [...this.slice(0, start), ...elems, ...this.slice(end)];
      buf.length = this.buffer.length;
      this.buffer = buf;
      this.start = 0;
      this.end = this.size;
    }
    this.size += delta;
    return out;

    // start &= this.mask;
    // end &= this.mask;
    // const delta = elems.length - count;
    // if (delta === 0) {
    //   // no change to the size
    //   const out =
    //       pivot2 < pivot1 ?
    //           this.buffer.slice(pivot1).concat(this.buffer.slice(0, pivot2)) :
    //           this.buffer.slice(pivot1, pivot2);
    //   for (let i = 0; i < count; i++) {
    //     this.buffer[(pivot1 + i) & this.mask] = elems[i];
    //   }
    //   return out;
    // } else if (delta < 0) {
    //   // deque is shrinking
    //   if (pivot1 < start) {
    //     // break is in the first chunk
    //     const pivot3 = pivot1 + elems.length;
    //     this.buffer.splice(pivot1, elems.length, ...elems);
    //     this.buffer.copyWithin(pivot3, pivot2, end);
    //     this.end += delta;
    //     this.size += delta;
    //   } else if (pivot2 < pivot1) {
    //     // break is between pivots: if the elements to insert
    //     // can cross the gap then we can trivially copy.
    //   } else {
    //     // break is in the last chunk or not at all
    //     const pivot3 = pivot2 - elems.length;
    //     this.buffer.splice(pivot3, elems.length, ...elems);
    //     this.buffer.copyWithin(start, pivot3, pivot1);
    //     this.start -= delta;
    //     this.size += delta;
    //   } else if (
    // }
    // // this.start <= pivot1 <= pivot2 <= this.end
    // // The wrap will occur in at most one of those gaps
    // // Don't move that block.
    // // If the wrap occurs between pivot1 and pivot2 then we may be
    // // stuck making two copies.  In that case, just rebase to 0.
    
  }

  toString() {
    const parts = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      parts[i] = this.buffer[(this.start + i) & this.mask];
    }
    return `[${parts.join(', ')}]`;
  }
}

// /** @template T */
// export class DequeSet {
//   constructor() {
//     /** @type {!Array<T|undefined>} */
//     this.buffer = new Array(16);
//     /** @type {number} */
//     this.mask = 0xf;
//     /** @type {number} */
//     this.start = 0;
//     /** @type {number} */
//     this.end = 0;
//     /** @type {number} */
//     this.size = 0; // readonly externally
//     /** @type {!Set<T>} */
//     this.set = new Set();
//   }

//   upsize(target) {
//     while (this.mask < target) {
//       this.start += this.mask + 1;
//       this.mask = this.mask << 1 | 1;
//       this.buffer = this.buffer.concat(this.buffer);
//     }
//     this.size = target;
//   }

//   /** @param {...T} elem */
//   push(...elems) {
//     this.upsize(this.size + elems.length);
//     for (const elem of elems) {
//       if (this.set.has(elem)) {
//         this.size--;
//         continue;
//       }
//       this.buffer[this.end] = elem;
//       this.end = (this.end + 1) & this.mask;
//     }
//   }

//   /** @return {T|undefined} */
//   pop() {
//     if (!this.size) return undefined;
//     this.end = (this.end - 1) & this.mask;
//     this.size--;
//     const out = this.buffer[this.end];
//     this.set.delete(out);
//     return out;
//   }

//   /** @return {T|undefined} */
//   peek() {
//     if (!this.size) return undefined;
//     return this.buffer[(this.end - 1) & this.mask];
//   }

//   /** @param {...T} elem */
//   unshift(...elems) {
//     this.upsize(this.size + elems.length);
//     for (const elem of elems) {
//       if (this.set.has(elem)) {
//         this.size--;
//         continue;
//       }
//       this.start = (this.start - 1) & this.mask;
//       this.buffer[this.start] = elem;
//     }
//   }

//   /** @return {T|undefined} */
//   shift() {
//     if (!this.size) return undefined;
//     const result = this.buffer[this.start];
//     this.start = (this.start + 1) & this.mask;
//     this.size--;
//     this.set.remove(result);
//     return result;
//   }

//   /** @return {T|undefined} */
//   front() {
//     if (!this.size) return undefined;
//     return this.buffer[this.start];
//   }
// }

// export class IndexedList {
//   constructor() {
//     this.list = [];
//     this.map = new Map();
//   }

//   add(elem) {
//     if (this.map.has(elem)) return;
//     this.map.set(elem, this.list.length);
//     this.list.push(elem);
//   }

//   indexOf(elem) {
//     return this.map.get(elem);
//   }

//   remove(elem) {
//     // TODO - this isn't super efficient...
//     // We could maintain a small handful of split points.
//     // Or a RemovalTree where it starts with a fully-balanced
//     // binary tree (height ~ log(n)) and then we just remove
//     // elements from there so that we only need to update
//     // O(log(n)) "size" values on the way up.  Though this
//     // doesn't help to actually *find* the element...
//     // Another option would be to use the bits of the index
//     // to keep track of the number of removed elements before.
//     // So we have a same-size array of numbers
//     // where each entry tells the size to add for the Nth one-bit
//     // and all the higher bits.
//     //   00 -> 0
//     //   01 -> 1
//     //   10 -> 2
//     //   11 -> 3 = 2 + 1
//     // Storing
//     //   X#  -> 2
//     //   1X  -> 1
//     //   0X  -> 1
//     // For bigger list,
//     //   11X -> 1    stored at    111 = 7
//     //   10X -> 1                 110 = 6
//     //   01X -> 1                 101 = 5
//     //   00X -> 1                 100 = 4
//     //   1X# -> 2                 011 = 3
//     //   0X# -> 2                 010 = 2
//     //   X## -> 4                 001 = 1
//     // The upshot is that when removing an element we only need to
//     // update O(log(n)) elements...
//     // And we can avoid splicing the list and even find the first
//     // element with binary search - O(log(n))
//     const index = this.map.get(elem);
//     if (index == null) return;
//     this.list.splice(index, 1);
//     this.map.delete(elem);
//     for (let i = index; i < this.list.length; i++) {
//       this.map.set(this.list[i], i);
//     }
//   }

//   [Symbol.iterator]() {
//     return this.list[Symbol.iterator]();
//   }
// }

export const breakLines = (str: string, len: number): string[] => {
  str = str.trim();
  const out: string[] = [];
  while (str.length > len) {
    let b = str.substring(0, len).lastIndexOf(' ');
    if (b < 0) b = len;
    out.push(str.substring(0, b).trim());
    str = str.substring(b).trim();
  }
  out.push(str.trim());
  return out;
};

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

export class SuffixTrie<T> {
  readonly next = new Map<string, SuffixTrie<T>>();
  data: T | undefined;

  constructor(readonly key: string = '') {}

  get(key: string): T | undefined {
    let t: SuffixTrie<T> | undefined = this;
    for (let i = key.length - 1; i >= 0 && t; i++) {
      t = t.next.get(key[i]);
    }
    return t && t.data;
  }

  with(c: string): SuffixTrie<T> {
    let t = this.next.get(c);
    if (!t) this.next.set(c, (t = new SuffixTrie<T>(c + this.key)));
    return t;
  }

  set(key: string, value: T | undefined) {
    let t: SuffixTrie<T> = this;
    for (let i = key.length - 1; i >= 0 && t; i++) {
      t = t.with(key[i]);
    }
    t.data = value;
  }

  * values(): Iterable<T> {
    const stack: SuffixTrie<T>[] = [this];
    while (stack.length) {
      const top = stack.pop()!;
      if (top.data) yield top.data;
      stack.push(...top.next.values());
    }
  }
}

export class DefaultMap<K, V extends {}> extends Map<K, V> {
  constructor(private readonly supplier: (key: K) => V,
              init?: Iterable<readonly [K, V]>) {
    super(init as any); // NOTE: Map's declarations are off, Iterable is fine.
  }
  get(key: K): V {
    let value = super.get(key);
    if (value == null) super.set(key, value = this.supplier(key));
    return value;
  }
  sortedKeys(fn?: (a: K, b: K) => number): K[] {
    return [...this.keys()].sort(fn);
  }
  sortedEntries(fn?: (a: K, b: K) => number): Array<[K, V]> {
    return this.sortedKeys(fn).map(k => [k, this.get(k) as V]);
  }
}

export class IndexedSet<T extends {}> {
  private forward: T[] = [];
  private reverse = new Map<T, number>();

  add(elem: T): number {
    let result = this.reverse.get(elem);
    if (result == null) this.reverse.set(elem, result = this.forward.push(elem) - 1);
    return result;
  }

  get(index: number): T {
    return this.forward[index];
  }
}

export namespace iters {
  // Concatenates iterables.
  export function * concat<T>(...iters: Array<Iterable<T>>): IterableIterator<T> {
    for (const iter of iters) {
      yield * iter;
    }
  }

  export function isEmpty(iter: Iterable<unknown>): boolean {
    return Boolean(iter[Symbol.iterator]().next().done);
  }

  export function * map<T, U>(iter: Iterable<T>, f: (elem: T) => U): IterableIterator<U> {
    for (const elem of iter) {
      yield f(elem);
    }
  }
  export function * filter<T>(iter: Iterable<T>, f: (elem: T) => boolean): Iterable<T> {
    for (const elem of iter) {
      if (f(elem)) yield elem;
    }
  }
  export function * flatMap<T, U>(iter: Iterable<T>, f: (elem: T) => Iterable<U>): IterableIterator<U> {
    for (const elem of iter) {
      yield * f(elem);
    }
  }
  export function count(iter: Iterable<unknown>): number {
    let count = 0;
    for (const _ of iter) {
      count++;
    }
    return count;
  }

  export function * take<T>(iter: Iterable<T>, count: number): IterableIterator<T> {
    for (const elem of iter) {
      if (--count < 0) return;
      yield elem;
    }
  }

  export function first<T>(iter: Iterable<T>): T;
  export function first<T>(iter: Iterable<T>, fallback: T): T;
  export function first<T>(iter: Iterable<T>, fallback?: T): T {
    for (const elem of iter) return elem;
    if (arguments.length < 2) throw new Error(`Empty iterable: ${iter}`);
    return fallback as T;    
  }

  export function zip<A, B>(left: Iterable<A>,
                            right: Iterable<B>): Iterable<[A, B]>;
  export function zip<A, B, C>(left: Iterable<A>, right: Iterable<B>,
                               zipper: (a: A, b: B) => C): Iterable<C>;
  export function zip<A, B, C>(left: Iterable<A>, right: Iterable<B>,
                               zipper: (a: A, b: B) => C = (a, b) => [a, b] as any):
  Iterable<C> {
    return {
      * [Symbol.iterator]() {
        const leftIter = left[Symbol.iterator]();
        const rightIter = right[Symbol.iterator]();
        let a, b;
        while ((a = leftIter.next(), b = rightIter.next(), !a.done && !b.done)) {
          yield zipper(a.value, b.value);
        }
      }
    };
  }
}

export function spread<T>(iter: Iterable<T>): T[] {
  return [...iter];
}

/** A set of objects with unique labels (basically toString-equivalence). */
export class LabeledSet<T extends Labeled> implements Iterable<T> {
  private map = new Map<String, T>();
  add(elem: T) {
    this.map.set(elem.label, elem);
  }
  has(elem: T): boolean {
    return this.map.has(elem.label);
  }
  delete(elem: T) {
    this.map.delete(elem.label);
  }
  [Symbol.iterator]() {
    return this.map.values();
  }
}
/** Superinterface for objects that can be stored in a LabeledSet. */
export interface Labeled {
  readonly label: string;
}

const INVALIDATED = Symbol('Invalidated');
const SIZE = Symbol('Size');

class SetMultimapSetView<K, V> implements Set<V> {
  constructor(private readonly ownerMap: Map<K, Set<V>>,
              private readonly ownerKey: K, private currentSet?: Set<V>) {}
  private getCurrentSet() {
    if (!this.currentSet || (this.currentSet as any)[INVALIDATED]) {
      this.currentSet = this.ownerMap.get(this.ownerKey) || new Set<V>();
    }
    return this.currentSet;
  }
  private mutateSet<R>(f: (s: Set<V>) => R): R {
    const set = this.getCurrentSet();
    const size = set.size;
    try {
      return f(set);
    } finally {
      (this.ownerMap as any)[SIZE] += set.size - size;
      if (!set.size) {
        this.ownerMap.delete(this.ownerKey);
        (set as any)[INVALIDATED] = true;
      }
    }
  }
  add(elem: V): this {
    this.mutateSet(s => s.add(elem));
    return this;
  }
  has(elem: V): boolean {
    return this.getCurrentSet().has(elem);
  }
  clear(): void {
    this.mutateSet(s => s.clear());
  }
  delete(elem: V): boolean {
    return this.mutateSet(s => s.delete(elem));
  }
  [Symbol.iterator](): IterableIterator<V> {
    return this.getCurrentSet()[Symbol.iterator]();
  }
  values(): IterableIterator<V> {
    return this.getCurrentSet().values();
  }
  keys(): IterableIterator<V> {
    return this.getCurrentSet().keys();
  }
  entries(): IterableIterator<[V, V]> {
    return this.getCurrentSet().entries();
  }
  forEach<T>(callback: (value: V, key: V, set: Set<V>) => void, thisArg?: T): void {
    this.getCurrentSet().forEach(callback, thisArg);
  }
  get size(): number {
    return this.getCurrentSet().size;
  }
  get [Symbol.toStringTag](): string {
    return 'Set';
  }
}
// Fix 'instanceof' to work properly without requiring actual superclass...
Reflect.setPrototypeOf(SetMultimapSetView.prototype, Set.prototype);

export class SetMultimap<K, V> {

  private readonly map = new Map<K, Set<V>>();

  constructor(entries: Iterable<readonly [K, V]> = []) {
    (this.map as any)[SIZE] = 0;
    for (const [k, v] of entries) {
      this.add(k, v);
    }
  }

  get size(): number {
    return (this.map as any)[SIZE];
  }

  get(k: K): Set<V> {
    return new SetMultimapSetView(this.map, k, this.map.get(k));
  }

  add(k: K, v: V): void {
    let set = this.map.get(k);
    if (!set) this.map.set(k, set = new Set());
    const size = set.size;
    set.add(v);
    (this.map as any)[SIZE] += set.size - size;
  }

  // TODO - iteration?
}


export class Multiset<T> implements Iterable<[T, number]> {
  private entries: DefaultMap<T, number>;
  constructor(entries: Iterable<[T, number]> = []) {
    this.entries = new DefaultMap(() => 0, entries);
  }
  add(elem: T) {
    this.entries.set(elem, this.entries.get(elem) + 1);
  }
  delete(elem: T) {
    const count = this.entries.get(elem) - 1;
    if (count > 0) {
      this.entries.set(elem, count);
    } else {
      this.entries.delete(elem);
    }
  }
  unique(): number {
    return this.entries.size;
  }
  count(elem: T): number {
    return this.entries.has(elem) ? this.entries.get(elem) : 0;
  }
  [Symbol.iterator](): IterableIterator<[T, number]> {
    return this.entries.entries();
  }
}


// export class SparseArray<T> implements Iterable<T> {
//   readonly [id: number]: T; // NOTE: readonly is only for external!
//   private elements = new Map<number, T>();

//   [Symbol.iterator]() { return this.elements.values(); }

//   protected set(id: number, value: T) {
//     (this as {[id: number]: T})[id] = value;
//     this.elements.set(id, value);
//   }
//   delete(id: number) {
//     delete (this as {[id: number]: T})[id];
//     this.elements.delete(id);
//   }
// }


export function assertNever(x: never): never {
  throw new Error(`non-exhaustive check: ${x}`);
}

export function assert<T>(x: T|undefined|null): T {
  if (!x) throw new Error(`asserted but falsy: ${x}`);
  return x;
}

export function isNonNull<T extends {}>(x: T|undefined|null): x is T {
  return x != null;
}
// export function nonNull<T extends {}>(x: T|undefined|null): T {
//   if (x != null) return x;
//   throw new Error(`Expected non-null`);
// }


// Generalized memoization wrapper.  All arguments must be objects,
// but any number of arguments is allowed.
type F<A extends any[], R> = (...args: A) => R;
export function memoize<T extends object[], R>(f: F<T, R>): F<T, R> {
  interface V {
    next?: WeakMap<any, V>;
    value?: R;
    cached?: boolean;
  }
  const cache: V = {};
  return function(this: any, ...args: any[]) {
    let c = cache;
    for (const arg of args) {
      if (!c.next) c.next = new WeakMap<any, V>();
      let next = (c.next || (c.next = new WeakMap())).get(arg);
      if (!next) c.next.set(arg, next = {});
    }
    if (!c.cached) {
      c.value = f.apply(this, args);
      c.cached = true;
    }
    return c.value as R;
  };
}

export function strcmp(left: string, right: string): number {
  if (left < right) return -1;
  if (right < left) return 1;
  return 0;
}

// export class PrimeIdGenerator {
//   private _index = 0;
//   next(): number {
//     if (this._index >= PRIMES.length) throw new Error('overflow');
//     return PRIMES[this._index++];
//   }
// }
// const PRIMES = (() => {
//   const n = 10000;
//   const out = new Set();
//   for (let i = 2; i < n; i++) { out.add(i); }
//   for (let i = 2; i * i < n; i++) {
//     if (!out.has(i)) continue;
//     for (let j = 2 * i; j < n; j += i) {
//       out.delete(j);
//     }
//   }
//   return [...out];
// })();

export class Keyed<K extends number, V> implements Iterable<[K, V]> {
  constructor(private readonly data: readonly V[]) {}

  get(index: K): V|undefined {
    return this.data[index];
  }

  [Symbol.iterator]() {
    return this.data.entries() as IterableIterator<[K, V]>;
  }

  values(): Iterator<V> {
    return this.data[Symbol.iterator]();
  }

  map<U>(func: (val: V, key: K) => U): U[] {
    return this.data.map(func as (val: V, key: number) => U);
  }
}

export class ArrayMap<K extends number, V> implements Iterable<[K, V]> {
  protected readonly rev: ReadonlyMap<V, K>;
  readonly length: number;

  constructor(private readonly data: readonly V[]) {
    const rev = new Map<V, K>();
    for (let i = 0 as K; i < data.length; i++) {
      rev.set(data[i], i);
    }
    this.rev = rev;
    this.length = data.length;
  }

  get(index: K): V|undefined {
    return this.data[index];
  }

  hasValue(value: V): boolean {
    return this.rev.has(value);
  }

  index(value: V): K|undefined {
    const index = this.rev.get(value);
    if (index == null) throw new Error(`Missing index for ${value}`);
    return index;
  }

  [Symbol.iterator]() {
    return this.data.entries() as IterableIterator<[K, V]>;
  }

  values(): IterableIterator<V> {
    return this.data[Symbol.iterator]();
  }
}

export class MutableArrayBiMap<K extends number, V extends number> {
  private readonly _fwd: V[] = [];
  private readonly _rev: K[] = [];

  * [Symbol.iterator](): IterableIterator<[K, V]> {
    for (let i = 0 as K; i < this._fwd.length; i++) {
      const val = this._fwd[i];
      if (val != null) yield [i, val];
    }
  }

  * keys(): IterableIterator<K> {
    for (let i = 0 as K; i < this._fwd.length; i++) {
      if (this._fwd[i] != null) yield i;
    }
  }

  * values(): IterableIterator<V> {
    for (let i = 0 as V; i < this._rev.length; i++) {
      if (this._rev[i] != null) yield i;
    }
  }

  get(index: K): V|undefined {
    return this._fwd[index];
  }

  has(key: K): boolean {
    return this._fwd[key] != null;
  }

  hasValue(value: V): boolean {
    return this._rev[value] != null;
  }

  index(value: V): K|undefined {
    const index = this._rev[value];
    if (index == null) throw new Error(`Missing index for ${value}`);
    return index;
  }

  set(key: K, value: V) {
    if (this._fwd[key]) throw new Error(`already has key ${key}`);
    if (this._rev[value]) throw new Error(`already has value ${value}`);
    this._fwd[key] = value;
    this._rev[value] = key;
  }

  replace(key: K, value: V): V|undefined {
    const oldKey = this._rev[value];
    if (oldKey != null) delete this._fwd[oldKey];
    const oldValue = this._fwd[key];
    if (oldValue != null) delete this._rev[oldValue];
    this._fwd[key] = value;
    this._rev[value] = key;
    return oldValue;
  }
}

export class Table<R, C, V> implements Iterable<[R, C, V]>{
  private readonly _map = new Map<R, Map<C, V>>();
  constructor(elems?: Iterable<readonly [R, C, V]>) {
    if (elems) {
      for (const [r, c, v] of elems) {
        this.set(r, c, v);
      }
    }
  }

  * [Symbol.iterator](): Generator<[R, C, V]> {
    for (const [r, map] of this._map) {
      for (const [c, v] of map) {
        yield [r, c, v];
      }
    }
  }

  set(r: R, c: C, v: V) {
    let col = this._map.get(r);
    if (!col) this._map.set(r, col = new Map());
    col.set(c, v);
  }

  get(r: R, c: C): V|undefined {
    return this._map.get(r)?.get(c);
  }

  has(r: R, c: C): boolean {
    return this._map.get(r)?.has(c) || false;
  }

  delete(r: R, c: C): void {
    const col = this._map.get(r);
    if (!col) return;
    col.delete(c);
    if (!col.size) this._map.delete(r);
  }

  row(r: R): ReadonlyMap<C, V> {
    return this._map.get(r) ?? new Map();
  }
}

export function format(fmt: string, ...args: unknown[]): string {
  const split = fmt.split(/%/g);
  let argIndex = 0;
  let out = split[0];
  for (let i = 1; i < split.length; i++) {
    if (!split[i]) {
      out += '%' + split[++i];
      continue;
    }
    const match = /([-+]*)([0\D]?)(\d*)([dxs])/.exec(split[i]);
    if (!match) {
      out += args[argIndex++] + split[i];
      continue;
    } 
    const len = parseInt(match[3]) || 0;
    const pad = match[2] || ' ';
    const arg = args[argIndex++];
    let str = match[4] === 'x' ? Number(arg).toString(16) : String(arg);
    if (match[4] !== 's' && /\+/.test(match[1]) && Number(arg) >= 0) {
      str = '+' + str;
    }
    if (str.length < len) {
      const padding = pad.repeat(len - str.length);
      str = /-/.test(match[1]) ? str + padding : padding + str;
    }
    out += str + split[i].substring(match[0].length);
  }
  return out;
}

// cancellation

export interface CancelTokenRegistration {
  unregister(): void;
}
class CancelTokenReg {
  constructor(readonly callback: () => void,
              readonly source: CancelTokenSource) {}
  unregister() { this.source.unregister(this); }
}
export class CancelTokenSource {
  readonly token: CancelToken;
  private cancelled = false;
  private registrations = new Set<CancelTokenReg>();

  constructor() {
    const source = this;
    this.token = {
      get requested() { return source.cancelled; },
      throwIfRequested() {
        if (source.cancelled) throw new Error(`Cancelled`);
      },
      register(callback: () => void) {
        const reg = new CancelTokenReg(callback, source);
        source.registrations.add(reg);
        return reg;
      },
    };
  }

  // TODO - parent/child?

  cancel() {
    if (this.cancelled) return;
    this.cancelled = true;
    const regs = [...this.registrations];
    this.registrations.clear();
    for (const reg of regs) {
      reg.callback();
    }
  }

  unregister(reg: CancelTokenReg) {
    this.registrations.delete(reg);
  }
}

export interface CancelToken {
  readonly requested: boolean;
  throwIfRequested(): void;
  register(callback: () => void): CancelTokenRegistration;
}
export namespace CancelToken {
  export const NONE: CancelToken = {
    get requested() { return false; },
    throwIfRequested() {},
    register() { return {unregister() {}}; },
  };
  export const CANCELLED: CancelToken = {
    get requested() { return true; },
    throwIfRequested() { throw new Error('cancelled'); },
    register() { return {unregister() {}}; },
  };
}

export function lowerCamelToWords(lowerCamel: string): string {
  const split = lowerCamel.split(/(?=[A-Z0-9])/g);
  return split.map(s => s[0].toUpperCase() + s.substring(1)).join(' ');
}

//////////////

/**
 * A string-to-V map that can be used either case-sensitively
 * or case-insensitively.
 */
export class CaseMap<V> {
  s = new Map<string, V>();
  i = new Map<string, V>();
  sensitive = true;

  set(key: string, val: V) {
    const ki = key = key.toUpperCase();
    if (this.sensitive) {
      // TODO - check!
      this.s.set(key, val);
      this.i.set(ki, val);
    }
  }
}

export function assertType<T>(actual: T): void {}

export function hex1(x: number, digits = 1): string {
  return x < 0 ? `~${(~x).toString(16).padStart(digits, '0')}` :
      x.toString(16).padStart(digits, '0');
}

export type StrictIterator<T> = {
  next(): {value: T, done: boolean};
}
