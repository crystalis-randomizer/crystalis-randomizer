export type Bits = bigint;

export const Bits = {
  of: (...nums: number[]): bigint => {
    let bits = 0n;
    for (const num of nums) {
      bits |= 1n << BigInt(num);
    }
    return bits;
  },

  from: (nums: Iterable<number>): bigint => {
    let bits = 0n;
    for (const num of nums) {
      bits |= 1n << BigInt(num);
    }
    return bits;
  },

  containsAll: (superset: bigint, subset: bigint): boolean =>
      !(subset & ~superset),

  with: (bits: bigint, num: number): bigint =>
      bits | (1n << BigInt(num)),

  without: (bits: bigint, num: number): bigint =>
      bits & ~(1n << BigInt(num)),

  has: (bits: bigint, num: number): boolean =>
      !!(bits & (1n << BigInt(num))),

  bits: (bits: bigint): number[] => {
    const out = [];
    let offset = 0;
    while (bits) {
      let x = Number(bits & 0xffffffffn);
      let y = 32;
      while (x) {
        const z = Math.clz32(x) + 1;
        y -= z;
        x <<= z;
        if (z === 32) x = 0;
        // unfortunately this will jumble the order a bit...
        out.push(offset | y);
      }
      bits >>= 32n;
      offset += 32;
    }
    return out;
  },

  clone: (x: bigint): bigint => x,

  empty: (x: bigint): boolean => !x,

  difference: (left: bigint, right: bigint): bigint => left & ~right,
};
