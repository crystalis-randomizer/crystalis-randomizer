// TODO - Consider allowing floats to use varint encoding as follows:
//  - given a float SEEEEEEE EMMMMMMM MMMMMMMM MMMMMMMM
//  - rearrange the bits to MMMMMMMM MMMMMMME MEMEMEME MEMEMEMS
//  - where (1) the exponent bits are reversed and shifted so that
//    "normal" magnitude numbers are closer to zero, and (2) the
//    mantissa bits are also reversed so that trailing zeros become
//    leading zeros.
//  - we could also consider somehow encoding a repeating mantissa
//    somehow, though these repeats don't seem to be as common as
//    I would have expected.
//  - alternatively, it's probably more practical to just avoid
//    dividing by 5, by using 1/2^n as the increment in all sliders.

interface NumArrayLike {
  length: number;
  [arg: number]: number;
}

export class Cursor {
  constructor(private index = 0) {}
  getAndIncrement(): number {
    return this.index++;
  }
  get(): number {
    return this.index;
  }
  advance(delta: number): void {
    this.index += delta;
  }
}

export function encodeVarint(num: number|boolean): number[];
export function encodeVarint<T extends NumArrayLike>(
  num: number|boolean,
  arr: T,
  index?: number|Cursor,
): T;
export function encodeVarint(
  num: number|boolean,
  arr: NumArrayLike = [],
  index: number|Cursor = 0,
): Record<number, number> {
  if (typeof num === 'boolean') num = Number(num);
  if (!Number.isSafeInteger(num)) throw new Error(`not an int: ${num}`);
  do {
    let b = num % 128;
    num = Math.floor(num / 128);
    if (num) b |= 0x80;
    arr[index instanceof Cursor ? index.getAndIncrement() : index++] = b;
  } while (num);
  return arr;
  // TODO - consider returning number of bytes written???
}

export function encodeSignedVarint(num: number|boolean): number[];
export function encodeSignedVarint<T extends NumArrayLike>(
  num: number|boolean,
  arr: T,
  index?: number|Cursor,
): T;
export function encodeSignedVarint(
  num: number|boolean,
  arr?: NumArrayLike,
  index?: number|Cursor,
): Record<number, number> {
  return encodeVarint((Math.abs(num as number) * 2) | (num as number < 0 ? 1 : 0), arr!, index);
}

export function decodeVarint(data: NumArrayLike, index: number|Cursor = 0): number {
  let result = 0;
  let multiplier = 1;
  let val;
  do {
    val = data[index instanceof Cursor ? index.getAndIncrement() : index++];
    result += (val & 0x7f) * multiplier;
    multiplier *= 128;
  } while (val != undefined && val & 0x80);
  return result;
}

export function decodeSignedVarint(data: NumArrayLike, index: number|Cursor = 0): number {
  const result = decodeVarint(data, index);
  return result % 2 ? -Math.floor(result / 2) : Math.floor(result / 2);
}
