// General utilities for rom package.

/** Removes readonly from fields. */
export type Mutable<T> = {-readonly [K in keyof(T)]: T[K]};

export function seq<T>(x: number, f?: (x: number) => T): T[];
export function seq(x: number, f: (x: number) => number = (i) => i): number[] {
  return new Array(x).fill(0).map((_, i) => f(i));
}

export interface Data<T> {
  slice(start: number, end: number): this;
  [index: number]: T;
  length: number;
};

export function slice<T extends Data<any>>(arr: T, start: number, len: number): T {
  return arr.slice(start, start + len);
}

export function tuple<T>(arr: Data<T>, start: number, len: 2): [T, T];
export function tuple<T>(arr: Data<T>, start: number, len: 3): [T, T, T];
export function tuple<T>(arr: Data<T>, start: number, len: number): T[];
export function tuple<T>(arr: Data<T>, start: number, len: number): T[] {
  return Array.from(arr.slice(start, start + len));
}

export function signed(x: number): number {
  return x < 0x80 ? x : x - 0x100;
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
  while (start + width <= end && arr[start] != sentinel) {
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
};

export function hex(id: number): string {
  return id.toString(16).padStart(2, '0');
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
    const cls = class extends DataTuple {
      constructor(data = new Array(length).fill(0)) { super(data); }
      static of(inits: any) {
        const out = new cls() as any;
        for (const key in inits) {
          out[key] = inits[key];
        }
        return out;
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
                     T[K] extends Function ? T[K] : never} & DataTuple;
// Note: it would be nice for the final T[K] below to be 'never', but
// this fails because all objects have an implicit toString, which would
// otherwise need to be {toString?: undefined} for some reason.
type DataTupleInits<T> =
  {[K in keyof T]?: T[K] extends {set(arg: infer U): void} ? U : T[K]};
type DataTupleCtor<T> = {
  new(data: Data<number>): DataTupleSub<T>,
  of(inits: DataTupleInits<T>): DataTupleSub<T>,
};
