/** @typedef {!Array<number>} */
export const Bits = {};
export const BitsArray = Bits;

/**
 * @param {...number} nums
 * @return {!Bits}
 */
Bits.of = (...nums) => {
  const bits = [];
  for (const num of nums) {
    bits[num >>> 5] = (bits[num >>> 5] || 0) | (1 << num);
  }
  return bits;
};

/**
 * @param {!Iterable<number>} nums
 * @return {!Bits}
 */
Bits.from = (nums) => {
  const bits = [];
  for (const num of nums) {
    bits[num >>> 5] = (bits[num >>> 5] || 0) | (1 << num);
  }
  return bits;
};

/**
 * @param {!Bits} superset
 * @param {!Bits} subset
 * @return {boolean}
 */
Bits.containsAll = (superset, subset) => {
  for (let i = Math.max(superset.length, subset.length) - 1; i >= 0; i--) {
    if ((subset[i] || 0) & ~(superset[i] || 0)) return false;
  }
  return true;
};

/**
 * @param {!Bits} left
 * @param {!Bits} right
 * @return {!Bits}
 */
Bits.difference = (left, right) => {
  const out = new Array(Math.max(left.length, right.length));
  for (let i = Math.max(left.length, right.length) - 1; i >= 0; i--) {
    out[i] = (left[i] || 0) & ~(right[i] || 0);
  }
  return out;
};

/**
 * @param {!Bits} bits
 * @param {number} num
 * @return {!Bits}
 */
Bits.with = (bits, num) => {
  bits = [...bits];
  bits[num >>> 5] = (bits[num >>> 5] || 0) | (1 << num);
  return bits;
};

/**
 * @param {!Bits} bits
 * @param {number} num
 * @return {!Bits}
 */
Bits.without = (bits, num) => {
  bits = [...bits];
  bits[num >>> 5] = (bits[num >>> 5] || 0) & ~(1 << num);
  return bits;
};

/**
 * @param {!Bits} bits
 * @param {number} num
 * @return {boolean}
 */
Bits.has = (bits, num) => !!((bits[num >>> 5] || 0) & (1 << num));

/**
 * @param {!Bits} bits
 * @return {!Array<number>}
 */
Bits.bits = (bits) => {
  const out = [];
  for (let i = 0; i < bits.length; i++) {
    let x = bits[i];
    let y = 32;
    while (x) {
      const z = Math.clz32(x) + 1;
      y -= z;
      x <<= z;
      if (z == 32) x = 0;
      out.push((i << 5) | y);
    }
  }
  return out;
};

/**
 * @param {!Bits} bits
 * @return {!Bits}
 */
Bits.clone = (x) => [...x];

/**
 * @param {!Bits} bits
 * @return {boolean}
 */
Bits.empty = (x) => x.every(b => !b);
