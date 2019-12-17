export class Deque<T> {

  private buffer: (T | undefined)[] = new Array(16);
  private mask: number = 0xf;
  private start: number = 0;
  private end: number = 0;
  private size: number = 0;

  get length(): number {
    return this.size;
  }

  upsize(target: number) {
    while (this.mask < target) {
      if (this.end <= this.start) this.start += this.mask + 1;
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
    for (const elem of elems) {
      this.start = (this.start - 1) & this.mask;
      this.buffer[this.start] = elem;
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

export class UsageError extends Error {}

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
}

// export class LabeledSet<T> {
//   private map: Map<String, T>
// }

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
