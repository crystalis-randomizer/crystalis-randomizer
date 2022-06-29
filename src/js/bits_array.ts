import {BitsNamespace} from './bits_base.js';

export const BitsArray: BitsNamespace<number[]> = {
  of: (...nums) => {
    const bits: number[] = [];
    for (const num of nums) {
      bits[num >>> 5] = (bits[num >>> 5] || 0) | (1 << num);
    }
    return bits;
  },

  from: (nums) => {
    const bits: number[] = [];
    for (const num of nums) {
      bits[num >>> 5] = (bits[num >>> 5] || 0) | (1 << num);
    }
    return bits;
  },

  containsAll: (superset, subset) => {
    for (let i = Math.max(superset.length, subset.length) - 1; i >= 0; i--) {
      if ((subset[i] || 0) & ~(superset[i] || 0)) return false;
    }
    return true;
  },

  difference: (left, right) => {
    const out = new Array(Math.max(left.length, right.length));
    for (let i = Math.max(left.length, right.length) - 1; i >= 0; i--) {
      out[i] = (left[i] || 0) & ~(right[i] || 0);
    }
    return out;
  },

  union: (left, right) => {
    const out = new Array(Math.max(left.length, right.length));
    for (let i = Math.max(left.length, right.length) - 1; i >= 0; i--) {
      out[i] = (left[i] || 0) | (right[i] || 0);
    }
    return out;
  },

  with: (bits: number[], num) => {
    bits = [...bits];
    bits[num >>> 5] = (bits[num >>> 5] || 0) | (1 << num);
    return bits;
  },

  without: (bits: number[], num) => {
    bits = [...bits];
    bits[num >>> 5] = (bits[num >>> 5] || 0) & ~(1 << num);
    return bits;
  },

  has: (bits, num) => !!((bits[num >>> 5] || 0) & (1 << num)),

  bits: (bits) => {
    const out = [];
    for (let i = 0; i < bits.length; i++) {
      let x = bits[i];
      let y = 32;
      while (x) {
        const z = Math.clz32(x) + 1;
        y -= z;
        x <<= z;
        if (z === 32) x = 0;
        out.push((i << 5) | y);
      }
    }
    return out;
  },

  clone: (x) => [...x],

  empty: (x) => x.every(b => !b),
};
