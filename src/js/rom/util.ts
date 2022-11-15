// General utilities for rom package.

export function upperCamelToSpaces(upperCamel: string): string {
  return upperCamel.replace(/([a-z])([A-Z0-9])/g, '$1 $2')
      .replace(/Of/g, 'of')
      .replace(/_/g, ' - ');
}

export function lowerCamelToSpaces(lowerCamel: string): string {
  return upperCamelToSpaces(lowerCamel).replace(/^./, (x) => x.toUpperCase());
}

/** Removes readonly from fields. */
export type Mutable<T> = {-readonly [K in keyof(T)]: T[K]};

export function seq(x: number): number[];
export function seq<T>(x: number, f?: (x: number) => T): T[];
export function seq(x: number, f: (x: number) => number = (i) => i): number[] {
  return new Array(x).fill(0).map((_, i) => f(i));
}

export interface Data<T> {
  [index: number]: T;
  length: number;
  slice(start: number, end: number): this;
  [Symbol.iterator](): Iterator<T>;
}

export function slice<T extends Data<any>>(arr: T, start: number, len: number): T {
  return arr.slice(start, start + len);
}

export function tuple<T>(arr: Data<T>, start: number, len: 2): [T, T];
export function tuple<T>(arr: Data<T>, start: number, len: 3): [T, T, T];
export function tuple<T>(arr: Data<T>, start: number, len: 4): [T, T, T, T];
export function tuple<T>(arr: Data<T>, start: number, len: number): T[];
export function tuple<T>(arr: Data<T>, start: number, len: number): T[] {
  return Array.from(arr.slice(start, start + len));
}

export function signed(x: number): number {
  return x < 0x80 ? x : x - 0x100;
}

export function unsigned(x: number): number {
  return x < 0 ? x + 0x100 : x;
}

export function varSlice<T extends Data<number>>(arr: T,
                                                 start: number,
                                                 width: number,
                                                 sentinel: number,
                                                 end?: number): T[];
export function varSlice<T extends Data<number>, U>(arr: T,
                                                    start: number,
                                                    width: number,
                                                    sentinel: number,
                                                    end: number,
                                                    func: (slice: T) => U): U[];
export function varSlice<T extends Data<number>, U>(arr: T,
                                                    start: number,
                                                    width: number,
                                                    sentinel: number,
                                                    end: number = Infinity,
                                                    func?: (slice: T) => U): U[] {
  if (!func) func = (x: T) => x as any;
  const out = [];
  while (start + width <= end && arr[start] !== sentinel) {
    out.push(func!(arr.slice(start, start + width)));
    start += width;
  }
  return out;
}

export function addr(arr: Data<number>, i: number, offset: number = 0): number {
  return (arr[i] | arr[i + 1] << 8) + offset;
}

export function group<T extends Data<any>>(width: number, arr: T): T[];
export function group<T extends Data<any>, U>(width: number,
                                              arr: T,
                                              func: (slice: T) => U): U[];

export function group<T extends Data<any>, U>(width: number,
                                              arr: T,
                                              func?: (slice: T) => U): U[] {
  if (!func) func = (x: T) => x as any;
  return seq(
      Math.max(0, Math.floor(arr.length / width)),
      i => func!(slice(arr, i * width, width)));
}

export function reverseBits(x: number): number {
  return ((x * 0x0802 & 0x22110) | (x * 0x8020 & 0x88440)) * 0x10101 >>> 16 & 0xff;
}

export function countBits(x: number): number {
  x -= x >> 1 & 0x55;
  x = (x & 0x33) + (x >> 2 & 0x33);
  return (x + (x >> 4)) & 0xf;
}

export function hex(id: number): string {
  return id != null ? id.toString(16).padStart(2, '0') : String(id);
}

export function hex3(id: number): string {
  return id.toString(16).padStart(3, '0');
}

export function hex4(id: number): string {
  return id.toString(16).padStart(4, '0');
}

export function hex5(id: number): string {
  return id.toString(16).padStart(5, '0');
}

export function concatIterables(iters: Iterable<number>[]): number[] {
  const out: number[] = [];
  for (const iter of iters) {
    for (const elem of iter) {
      out.push(elem);
    }
  }
  return out;
  // return [].concat(...iters.map(Array.from));
}

export function readBigEndian(data: Data<number>, offset: number): number {
  return data[offset] << 8 | data[offset + 1];
}

export function readLittleEndian(data: Data<number>, offset: number): number {
  return data[offset + 1] << 8 | data[offset];
}

export function readString(arr: Data<number>, address: number, end: number = 0): string {
  const bytes = [];
  while (arr[address] != end) {
    bytes.push(arr[address++]);
  }
  return String.fromCharCode(...bytes);
}

export function readLengthDelimitedString(arr: Data<number>, address: number): string {
  const length = arr[address];
  return String.fromCharCode(...arr.slice(address + 1, address + 1 + length));
}

export function writeLittleEndian(data: Data<number>, offset: number, value: number) {
  data[offset] = value & 0xff;
  data[offset + 1] = value >>> 8;
}

export function writeString(arr: Data<number>, address: number, str: string) {
  for (let i = 0, len = str.length; i < len; i++) {
    arr[address + i] = str.charCodeAt(i);
  }
}

export function write(data: Uint8Array, offset: number, values: Data<number>) {
  data.subarray(offset, offset + values.length).set(values);
}

export class FlagListType {
  constructor(readonly last: number,
              readonly clear: number,
              readonly nonEmpty: boolean = false) {}

  read(data: Data<number>, offset: number = 0): number[] {
    // TODO - do we ever need to invert clear/last?  If so, use ~ as signal.
    const flags = [];
    while (true) {
      const hi = data[offset++];
      const lo = data[offset++];
      const flag = (hi & 3) << 8 | lo;
      const signed = hi & this.clear ? ~flag : flag;
      if (signed !== ~0) flags.push(signed);
      if (hi & this.last) return flags;
    }
  }

  bytes(flags: number[]): number[] {
    flags = flags.filter(f => f !== ~0);
    if (this.nonEmpty && !flags.length) flags = [~0];
    const bytes = [];
    for (let i = 0; i < flags.length; i++) {
      let flag = flags[i];
      if (flag < 0) flag = (this.clear << 8) | ~flag;
      if (i === flags.length - 1) flag |= (this.last << 8);
      bytes.push(flag >>> 8);
      bytes.push(flag & 0xff);
    }
    return bytes;
  }

  write(data: Data<number>, flags: number[], offset: number = 0) {
    const bytes = this.bytes(flags);
    for (let i = 0; i < bytes.length; i++) {
      data[i + offset] = bytes[i];
    }
  }
}

export const DIALOG_FLAGS = new FlagListType(0x40, 0x80);
export const ITEM_GET_FLAGS = new FlagListType(0x40, 0x80, true);
export const ITEM_USE_FLAGS = new FlagListType(0x40, 0x80, true);
export const ITEM_CONDITION_FLAGS = new FlagListType(0x80, 0x20, true);
export const SPAWN_CONDITION_FLAGS = new FlagListType(0x80, 0x20);

////////////////////////////////////////////////////////////////

declare const initialTag: unique symbol;
export interface Initial { [initialTag]: never; }
export type InitialProps<T,
    X = {[P in keyof T]: T[P] extends Initial ? P : never}> = X[keyof X];

// Impl - question - can we do something similar for DataTuple???

export function initializer<P extends readonly any[], T>(): Initializer<P, T> {
  const tag = Symbol();
  function f(...args: P): T & Initial {
    return {tag, args} as any; // NOTE: this is a complete lie for now.
  }
  f.commit = (instance: any, builder: (prop: string, ...args: P) => T) => {
    for (const prop of Object.getOwnPropertyNames(instance)) {
      const value = instance[prop];
      if (value.tag !== tag) continue;
      instance[prop] = builder(prop, ...value.args);
    }
  };
  return f;
}
export interface Initializer<P extends readonly any[], T> {
  (...args: P): T;
  commit(instance: any, builder: (prop: string, ...args: P) => T): void;
}

////////////////////////////////////////////////////////////////

type NonNeverProps<T> = ({[K in keyof T]: T[K] extends never ? never : K})[keyof T];
export type NonNever<T> = Pick<T, NonNeverProps<T>>;

////////////////////////////////////////////////////////////////

// // interface ReadonlySet<V> extends Iterable<V> {
// //   has(elem: V): boolean;
// // }
// interface HasId {
//   id: number;
// }

// type CollectionBase<K, V> = {[T in keyof K]: V} & ReadonlySet<V>;
// type CollectionBaseIndex<K, V extends {id: number}> =
//     CollectionBase<K, V> & {[id: number]: V};
// type CollectionBaseArray<K, V extends {id: number}> =
//     {[T in keyof K]: V} & ReadonlyArray<V> & Iterable<V>;

// type CollectionMapper<K, V> = <T extends keyof K>(elem: K[T], key: T) => V;
// interface CollectionCtor<K, V> {
//   new(data: K, mapper: CollectionMapper<K, V>): CollectionBase<K, V>;
// }
// interface CollectionCtorIndex<K, V extends {id: number}> {
//   new(data: K, mapper: CollectionMapper<K, V>): CollectionBaseIndex<K, V>;
// }
// interface CollectionCtorArray<K, V extends {id: number}> {
//   new(data: K, mapper: CollectionMapper<K, V>, initialSize?: number):
//       CollectionBaseArray<K, V>;
// }

// // function collectionBase<K, V>(): {
// //   new(data: K, mapper: CollectionMapper<K, V>): CollectionBase<K, V>
// // } {
// //   return class extends Set<unknown> {
// //     constructor(data: K, mapper: <T extends keyof K>(elem: K[T], key: T) => V) {
// //       super();
// //       for (const key in data) {
// //         const value = mapper(data[key], key);
// //         super.add((this as any)[key] = value);
// //         if (indexed) (this as any)[(value as any).id] = value;
// //       }
// //     }
// //     add(): never { throw new Error('not implemented'); }
// //     delete(): never { throw new Error('not implemented'); }
// //     clear(): never { throw new Error('not implemented'); }
// //   } as any;
// // }

// export function collectionBase<K, V extends HasId>(indexed: true): CollectionCtorIndex<K, V>;
// export function collectionBase<K, V>(indexed: boolean): CollectionCtor<K, V> {
//   return class extends Set<unknown> {
//     constructor(data: K, mapper: <T extends keyof K>(elem: K[T], key: T) => V) {
//       super();
//       for (const key in data) {
//         const value = mapper(data[key], key);
//         super.add((this as any)[key] = value);
//         if (indexed) (this as any)[(value as any).id] = value;
//       }
//     }
//     add(): never { throw new Error('not implemented'); }
//     delete(): never { throw new Error('not implemented'); }
//     clear(): never { throw new Error('not implemented'); }
//   } as any;
// }

// export function collectionBaseArray<K, V extends HasId>(): CollectionCtorArray<K, V> {
//   return class extends Array<unknown> {
//     static get [Symbol.species]() { return Array; }
//     constructor(data: K,
//                 mapper: <T extends keyof K>(elem: K[T], key: T) => V,
//                 initialSize = 0) {
//       super(initialSize);
//       for (const key in data) {
//         const value = mapper(data[key], key);
//         (this as any)[value.id] = value;
//       }
//     }
//   } as any;
// }

// // export class Collection<K, V> extends collectionBase<K, V>() implements CollectionBase<K, V> {}
// // export class IndexedCollection<K, V extends {id: number}>
// //     extends collectionBase<K, V>(true) {}
// // export class ArrayCollection<K, V extends {id: number}>
// //     extends collectionBaseArray<K, V>() {}

// // type CollectionBase<K, V> = {
// //   readonly [T in keyof K]: V,
  
// // export function collectionBase<K, V>(): {new(): {[T in keyof K]: V}} {
// //   return Object as unknown as {new(): {[T in keyof K]: V}};
// // }

////////////////////////////////////////////////////////////////

const PROP_TAG = Symbol('PROP_TAG');

type SetterHelper<X, Y, Z, A> =
  Z extends Function ? never :
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? A : never;
type SetterProps<T> = {
  [P in keyof T]-?: SetterHelper<{[Q in P]: T[P]},
                                 {-readonly [Q in P]: T[P]}, T[P], P>
}[keyof T];
// NOTE: This form gives the best tooltip messages.
type Settable<T> = PickPartial<T, SetterProps<T>>;
interface DataTupleCtor<T extends DataTuple> {
  new(arg: never): T; // NOTE: it's actually data: Data<number>
  size: number;
}
type PickPartial<T, K extends keyof T> = {[P in K]?: T[P]};

const dataTupleMap = new WeakMap();

function dataTupleActualClass<T extends DataTupleCtor<any>>(arg: T): T {
  let result = dataTupleMap.get(arg);
  if (!result) {
    // Make a new direct subtype of DataTuple, but make it look like arg.
    result = class extends DataTuple {};
    Object.defineProperties(result, {name: {value: arg.name}});
    Object.assign(result, arg); // copy static properties to ensure ctor skipped
    Reflect.setPrototypeOf(result.prototype, arg.prototype);
    // Reflect on an actual instance to find the props.
    const proto = new (arg as any)();
    const descriptors: any = {};
    for (const [prop, descr] of Object.entries(proto)) {
      if (descr && (descr as {[PROP_TAG]: boolean})[PROP_TAG]) {
        descriptors[prop] = descr;
      }
    }
    Object.defineProperties(result.prototype, descriptors);
    // Finally add it to the map for both arg and result.
    dataTupleMap.set(arg, result);
    dataTupleMap.set(result, result);
  }
  return result;
}

export abstract class DataTuple implements Iterable<number> {
  static size: number;

  readonly data: Data<number>;
  constructor(arg: never) {
    this.data = arg;
  }

  static of<T extends DataTuple>(this: DataTupleCtor<T>,
                                 inits: Settable<T>): T {
    return Object.assign(
        new (dataTupleActualClass(this) as any)(new Array(this.size).fill(0)),
        inits);
  }

  static from<T extends DataTuple>(this: DataTupleCtor<T>,
                                   data: Data<number>, offset = 0): T {
    const cls: any = dataTupleActualClass(this);
    const arg =
        !offset && data.length === this.size ?
        data : tuple(data, offset, this.size);
    return new cls(arg);
  }

  [Symbol.iterator](): Iterator<number> {
    return (this.data as number[])[Symbol.iterator]();
  }

  hex(): string {
    return Array.from(this.data, hex).join(' ');
  }

  clone(): this {
    return new (this.constructor as any)(this.data);
  }

  protected prop(...bits: [number, number?, number?][]): number {
    return {
      get(this: DataTuple): number {
        let value = 0;
        for (const [index, mask = 0xff, shift = 0] of bits) {
          const lsh = shift < 0 ? -shift : 0;
          const rsh = shift < 0 ? 0 : shift;
          value |= ((this.data[index] & mask) >>> rsh) << lsh;
        }
        return value;
      },
      set(this: DataTuple, value: number) {
        for (const [index, mask = 0xff, shift = 0] of bits) {
          const lsh = shift < 0 ? -shift : 0;
          const rsh = shift < 0 ? 0 : shift;
          const v = (value >>> lsh) << rsh & mask;
          this.data[index] = this.data[index] & ~mask | v;
        }
      },
      [PROP_TAG]: true,
    } as unknown as number;
  }

  protected booleanProp(byte: number, bit: number): boolean {
    return {
      get(this: DataTuple): boolean {
        return Boolean(this.data[byte] & (1 << bit));
      },
      set(this: DataTuple, value: boolean) {
        const mask = 1 << bit;
        if (value) {
          this.data[byte] |= mask;
        } else {
          this.data[byte] &= ~mask;
        }
      },
      [PROP_TAG]: true,
    } as unknown as boolean;
  }
}  




// interface GetSet<U> {
//   get(): U;
//   set(arg: U): void;
// }

// type DataTupleSub<T> =
//     {[K in keyof T]: T[K] extends GetSet<infer U> ? U :
//                      T[K] extends {value: (infer W)} ? W :
//                      T[K] extends (...args: any[]) => void ? T[K] : never} & DataTuple;

// // Note: it would be nice for the final T[K] below to be 'never', but
// // this fails because all objects have an implicit toString, which would
// // otherwise need to be {toString?: undefined} for some reason.
// type DataTupleInits<
//   T, K = {[P in keyof T]: T[P] extends {set(arg: infer U): void} ? U : never}>
//   = {[P in NonNeverProps<K>]?: K[P]};

// interface DataTupleCtor<T> {
//   new(data?: Data<number>): DataTupleSub<T>;
//   of<V extends DataTupleCtor<T>>(this: V, inits: DataTupleInits<T>): InstanceType<V>;
//   from<V extends DataTupleCtor<T>>(data: Data<number>, offset: number): InstanceType<V>;
// }

export const watchArray = (arr: Data<unknown>, watch: number) => {
  const arrayChangeHandler = {
    get(target: any, property: string|number|symbol) {
      // console.log('getting ' + property + ' for ' + target);
      // property is index in this case
      let v = target[property];
      if (property === 'subarray') {
        return (start: number, end: number) => {
          const sub = target.subarray(start, end);
          if (start <= watch && watch < end) return watchArray(sub, watch - start);
          return sub;
        };
      } else if (property === 'set') {
        return (val: Data<unknown>) => {
          console.log(`Setting overlapping array ${watch}`);
          // throw new Error('');
          debugger;
          target.set(val);
        };
      }
      if (typeof v === 'function') v = v.bind(target);
      return v;
    },
    set(target: any, property: string|number|symbol, value: any, _receiver: any) {
      // console.log('setting ' + property + ' for '/* + target*/ + ' with value ' + value);
      // tslint:disable-next-line:triple-equals
      if (property == watch) {
        console.log(`Writing ${watch.toString(16)}`);
        // throw new Error('');
        debugger;
      }
      target[property] = value;
      // you have to return true to accept the changes
      return true;
    },
  };
  return new Proxy(arr, arrayChangeHandler);
};

export type Writable<T> = {-readonly [K in keyof T]: T[K]};

export class Segment {
  constructor(readonly name: string,
              readonly bank: number,
              readonly org: number) {}

  get offset(): number {
    // TODO - offset depends on expansion or not for fixed banks
    // It should probably only be used for READING, so we use 1f
    return (this.bank & 0x1f) << 13;
  }

  static readonly $04 = new Segment('04', 0x04, 0x8000);
  static readonly $05 = new Segment('05', 0x05, 0xa000);

  static readonly $0a = new Segment('0a', 0x0a, 0x8000);
  static readonly $0b = new Segment('0b', 0x0b, 0xa000);
  static readonly $0c = new Segment('0c', 0x0c, 0x8000);
  static readonly $0d = new Segment('0d', 0x0d, 0xa000);
  static readonly $0e = new Segment('0e', 0x0e, 0x8000);
  static readonly $0f = new Segment('0f', 0x0f, 0xa000);
  static readonly $10 = new Segment('10', 0x10, 0x8000);

  static readonly $14 = new Segment('14', 0x14, 0x8000);
  static readonly $15 = new Segment('15', 0x15, 0xa000);
  static readonly $16_a = new Segment('16:a', 0x16, 0xa000); // NOTE: anomalous
  static readonly $17 = new Segment('17', 0x17, 0xa000);
  static readonly $18 = new Segment('18', 0x18, 0x8000);
  static readonly $19 = new Segment('19', 0x19, 0xa000);
  static readonly $1a = new Segment('1a', 0x1a, 0x8000);
  static readonly $1b = new Segment('1b', 0x1b, 0xa000);

  static readonly $fe = new Segment('fe', 0x1e, 0xc000);
  static readonly $ff = new Segment('ff', 0x1f, 0xe000);
}

// TODO - it may be a mistake to use segment strings here?
//      - we'll see if that comes back to byte us later.
export class Address {
  static of(segment: Segment, org: number) {
    return new Address(segment, org - segment.org);
  }

  private constructor(readonly seg: Segment, readonly delta: number) {}

  get offset() {
    return this.seg.offset + this.delta;
  }
  get org() {
    return this.seg.org + this.delta;
  }
  get segment() {
    return this.seg.name;
  }
  plus(offset: number, nextSegment?: Segment) {
    const newDelta = this.delta + offset;
    if (newDelta >= 0x2000) {
      if (!nextSegment) throw new Error(`Segment changed`);
      if (this.seg.org & 0x2000) throw new Error(`Bad segment cross`);
      return new Address(nextSegment, newDelta & 0x1fff);
    }
    return new Address(this.seg, newDelta);
  }
  minus(addr: Address) {
    if (addr.seg !== this.seg) throw new Error(`Incompatible segments`);
    return this.delta - addr.delta;
  }
  read<T>(data: Data<T>): T {
    return data[this.offset];
  }
  readLittleEndian(data: Data<number>): number {
    const off = this.offset;
    return data[off] | data[off + 1] << 8;
  }
  readAddress(data: Data<number>, ...segments: Segment[]): Address {
    const org = this.readLittleEndian(data);
    if (!segments.length) segments = [this.seg];
    // Figure out which segment it's in.
    for (const s of segments) {
      if ((org & 0xe000) === (s.org & 0xe000)) return Address.of(s, org);
    }
    throw new Error(`Could not find valid segment for ${hex(org)}`);
  }
  loc(assembler: IAssembler, name?: string) {
    assembler.segment(this.segment);
    assembler.org(this.org, name);
  }
  // locWide(assembler: IAssembler, name?: string) {
  //   assembler.segment(this.segment, hex(this.seg ^ 1));
  //   assembler.org(this.org, name);
  // }
  // locFixed(assembler: IAssembler, name?: string) {
  //   assembler.segment(this.segment, 'fe', 'ff');
  //   assembler.org(this.org, name);
  // }
  // locWideFixed(assembler: IAssembler, name?: string) {
  //   assembler.segment(this.segment, hex(this.seg ^ 1), 'fe', 'ff');
  //   assembler.org(this.org, name);
  // }
}

interface IAssembler {
  segment(...s: string[]): void;
  org(o: number, n?: string): void;
  free(size: number): void;
  reloc(name?: string): void;
  label(name: string): void;
  export(name: string): void;
}

export function free(a: IAssembler, seg: Segment, start: number, end: number) {
  a.segment(seg.name);
  a.org(start);
  a.free(end - start);
}

export function relocExportLabel(a: IAssembler, seg: Segment[], name: string) {
  a.segment(...seg.map(s => s.name));
  a.reloc(name);
  a.label(name);
  a.export(name);
}

export function cloneArray<T extends ReadonlyArray<any>>(arr: T): Mutable<T> {
  return [...arr] as Mutable<T>;
}
