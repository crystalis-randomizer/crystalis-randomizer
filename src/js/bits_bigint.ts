import {BitsNamespace} from './bits_base.js';

export const BitsBigInt: BitsNamespace<bigint> = {
  of: (...nums) => {
    let bits = ZERO;
    for (const num of nums) {
      bits |= ONE << BigInt(num);
    }
    return bits;
  },

  from: (nums) => {
    let bits = ZERO;
    for (const num of nums) {
      bits |= ONE << BigInt(num);
    }
    return bits;
  },

  containsAll: (superset, subset) => !(subset & ~superset),

  with: (bits, num) => bits | (ONE << BigInt(num)),

  without: (bits, num) => bits & ~(ONE << BigInt(num)),

  has: (bits, num) => !!(bits & (ONE << BigInt(num))),

  bits: (bits) => {
    const out = [];
    let offset = 0;
    while (bits) {
      let x = Number(bits & MAX_UINT32);
      let y = 32;
      while (x) {
        const z = Math.clz32(x) + 1;
        y -= z;
        x <<= z;
        if (z === 32) x = 0;
        // unfortunately this will jumble the order a bit...
        out.push(offset | y);
      }
      bits >>= THIRTY_TWO;
      offset += 32;
    }
    return out;
  },

  clone: (x) => x,

  empty: (x) => !x,

  difference: (left, right) => left & ~right,
};

export const BIGINT_OK =
    typeof BigInt === 'function' && typeof BigInt(0) === 'bigint';
const ZERO = (BIGINT_OK && BigInt(0)) as bigint;
const ONE = (BIGINT_OK && BigInt(1)) as bigint;
const MAX_UINT32 = (BIGINT_OK && BigInt(0xffffffff)) as bigint;
const THIRTY_TWO = (BIGINT_OK && BigInt(32)) as bigint;
