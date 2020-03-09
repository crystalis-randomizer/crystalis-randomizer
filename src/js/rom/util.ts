// General utilities for rom package.

export function upperCamelToSpaces(upperCamel: string): string {
  return upperCamel.replace(/([a-z])([A-Z0-9])/g, '$1 $2')
      .replace(/Of/g, 'of')
      .replace(/_/g, ' - ');
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

export class DataTuple {
  constructor(readonly data: Data<number>) {}
  [Symbol.iterator](): Iterator<number> {
    return (this.data as number[])[Symbol.iterator]();
  }
  hex(): string {
    return Array.from(this.data, hex).join(' ');
  }
  clone(): this {
    return new (this.constructor as any)(this.data);
  }
  static make<T>(length: number, props: T): DataTupleCtor<T> {
    // NOTE: There's a lot of dynamism here, so type checking can't handle it.
    // TODO: Give this class a name somehow?
    const cls = class extends DataTuple {
      constructor(data = new Array(length).fill(0)) { super(data); }
      static of(inits: any) {
        const out = new cls() as any;
        for (const [key, value] of Object.entries(inits)) {
          out[key] = value;
        }
        return out;
      }
      static from(data: Data<number>, offset: number = 0) {
        return new cls(tuple(data, offset, length) as number[]);
      }
    };
    const descriptors: any = {};
    for (const key in props) {
      if (typeof props[key] === 'function') {
        descriptors[key] = {value: props[key]};
      } else {
        descriptors[key] = props[key];
      }
    }
    Object.defineProperties(cls.prototype, descriptors);
    return cls as any;
  }
  static prop(...bits: [number, number?, number?][]):
      (GetSet<number> & ThisType<DataTuple>) {
    return {
      get() {
        let value = 0;
        for (const [index, mask = 0xff, shift = 0] of bits) {
          const lsh = shift < 0 ? -shift : 0;
          const rsh = shift < 0 ? 0 : shift;
          value |= ((this.data[index] & mask) >>> rsh) << lsh;
        }
        return value;
      },
      set(value) {
        for (const [index, mask = 0xff, shift = 0] of bits) {
          const lsh = shift < 0 ? -shift : 0;
          const rsh = shift < 0 ? 0 : shift;
          const v = (value >>> lsh) << rsh & mask;
          this.data[index] = this.data[index] & ~mask | v;
        }
      },
    };
  }
  static booleanProp(bit: [number, number, number]):
      (GetSet<boolean> & ThisType<DataTuple>) {
    const prop = DataTuple.prop(bit);
    return {get() { return !!prop.get.call(this); },
            set(value) { prop.set.call(this, +value); }};
  }
  // static func<T>(func: (x: any) => T): ({value: any} & ThisType<DataTuple>) {
  //   return {value: function() { return func(this); }};
  // }
}

interface GetSet<U> {
  get(): U;
  set(arg: U): void;
}

type DataTupleSub<T> =
    {[K in keyof T]: T[K] extends GetSet<infer U> ? U :
                     T[K] extends {value: (infer W)} ? W :
                     T[K] extends (...args: any[]) => void ? T[K] : never} & DataTuple;

// Note: it would be nice for the final T[K] below to be 'never', but
// this fails because all objects have an implicit toString, which would
// otherwise need to be {toString?: undefined} for some reason.
type DataTupleInits<T> = {
  [K in keyof T]?: T[K] extends {set(arg: infer U): void} ? U : T[K]
};

interface DataTupleCtor<T> {
  new(data?: Data<number>): DataTupleSub<T>;
  of(inits: DataTupleInits<T>): DataTupleSub<T>;
  from(data: Data<number>, offset?: number): DataTupleSub<T>;
}


export const watchArray = (arr: Data<unknown>, watch: number) => {
  const arrayChangeHandler = {
    get(target: any, property: string | number) {
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
    set(target: any, property: string | number, value: any, receiver: any) {
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
