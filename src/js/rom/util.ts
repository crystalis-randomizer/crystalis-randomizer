// General utilities for rom package.

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

export function signed(x: number): number {
  return x < 0x80 ? x : x - 0x100;
}

export function varSlice<T extends Data<number>>(arr: T,
                                                 start: number,
                                                 width: number,
                                                 sentinel: number,
                                                 end: number = Infinity): T[] {
  const out = [];
  while (start + width <= end && arr[start] != sentinel) {
    out.push(arr.slice(start, start + width));
    start += width;
  }
  return out;
}

export function addr(arr: Data<number>, i: number, offset: number = 0): number {
  return (arr[i] | arr[i + 1] << 8) + offset;
}

export function group<T extends Data<any>>(width: number, arr: T): T[] {
    return seq(
        Math.max(0, Math.floor(arr.length / width)),
        i => slice(arr, i * width, width));
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
