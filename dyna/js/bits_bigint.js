/** @typedef {bigint} */
export const Bits = {};
export const BitsBigInt = Bits;

/**
 * @param {...number} nums
 * @return {!Bits}
 */
Bits.of = (...nums) => {
  let bits = ZERO;
  for (const num of nums) {
    bits |= ONE << BigInt(num);
  }
  return bits;
};

/**
 * @param {!Iterable<number>} nums
 * @return {!Bits}
 */
Bits.from = (nums) => {
  let bits = ZERO;
  for (const num of nums) {
    bits |= ONE << BigInt(num);
  }
  return bits;
};

/**
 * @param {!Bits} superset
 * @param {!Bits} subset
 * @return {boolean}
 */
Bits.containsAll = (superset, subset) => !(subset & ~superset);

/**
 * @param {!Bits} bits
 * @param {number} num
 * @return {!Bits}
 */
Bits.with = (bits, num) => bits | (ONE << BigInt(num));

/**
 * @param {!Bits} bits
 * @param {number} num
 * @return {!Bits}
 */
Bits.without = (bits, num) => bits & ~(ONE << BigInt(num));

/**
 * @param {!Bits} bits
 * @param {number} num
 * @return {boolean}
 */
Bits.has = (bits, num) => !!(bits & (ONE << BigInt(num)));

/**
 * @param {!Bits} bits
 * @return {!Array<number>}
 */
Bits.bits = (bits) => {
  const out = [];
  let offset = 0;
  while (bits) {
    let x = Number(bits & MAX_UINT32);
    let y = 32;
    while (x) {
      const z = Math.clz32(x) + 1;
      y -= z;
      x <<= z;
      if (z == 32) x = 0;
      // unfortunately this will jumble the order a bit...
      out.push(offset | y);
    }
    bits >>= THIRTY_TWO;
    offset += 32;
  }
  return out;
};

/**
 * @param {!Bits} bits
 * @return {!Bits}
 */
Bits.clone = (x) => x;

/**
 * @param {!Bits} bits
 * @return {boolean}
 */
Bits.empty = (x) => !x;

/**
 * @param {!Bits} left
 * @param {!Bits} right
 * @return {!Bits}
 */
Bits.difference = (left, right) => left & ~right;

/** @const */
export const BIGINT_OK =
    typeof BigInt === 'function' && typeof BigInt(0) === 'bigint';
const ZERO = BIGINT_OK && BigInt(0);
const ONE = BIGINT_OK && BigInt(1);
const MAX_UINT32 = BIGINT_OK && BigInt(0xffffffff);
const THIRTY_TWO = BIGINT_OK && BigInt(32);
