// General utilities for rom package.

/** Removes readonly from fields. */
export type Mutable<T> = {-readonly [K in keyof(T)]: T[K]};

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
  return id ? id.toString(16).padStart(2, '0') : String(id);
}

export function hex4(id: number): string {
  return id.toString(16).padStart(4, '0');
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

export class FlagListType {
  constructor(readonly last: number, readonly clear: number) {}

  read(data: Data<number>, offset: number = 0): number[] {
    // TODO - do we ever need to invert clear/last?  If so, use ~ as signal.
    const flags = [];
    while (true) {
      const hi = data[offset++];
      const lo = data[offset++];
      const flag = (hi & 3) << 8 | lo;
      flags.push(hi & this.clear ? ~flag : flag);
      if (hi & this.last) return flags;
    }
  }

  bytes(flags: number[]): number[] {
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
export const ITEM_GET_FLAGS = new FlagListType(0x40, 0x80);
export const SPAWN_CONDITION_FLAGS = new FlagListType(0x80, 0x20);

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
                     T[K] extends () => void ? T[K] : never} & DataTuple;

// Note: it would be nice for the final T[K] below to be 'never', but
// this fails because all objects have an implicit toString, which would
// otherwise need to be {toString?: undefined} for some reason.
type DataTupleInits<T> = {
  [K in keyof T]?: T[K] extends {set(arg: infer U): void} ? U : T[K]
};

interface DataTupleCtor<T> {
  new(data?: Data<number>): DataTupleSub<T>;
  of(inits: DataTupleInits<T>): DataTupleSub<T>;
  from(data: Data<number>, offset: number): DataTupleSub<T>;
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
          debugger
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
        debugger;
      }
      target[property] = value;
      // you have to return true to accept the changes
      return true;
    },
  };
  return new Proxy(arr, arrayChangeHandler);
};
