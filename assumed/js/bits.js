import {Bits as BitsBigint, BIGINT_OK} from './bits_bigint.js';
import {Bits as BitsArray} from './bits_array.js';

const b = BIGINT_OK ? BitsBigint : BitsArray;

export class Bits {};

/**
 * @param {...number} nums
 * @return {!Bits}
 */
Bits.of = /** @type {?} */ (b.of);

/**
 * @param {!Iterable<number>} nums
 * @return {!Bits}
 */
Bits.from = /** @type {?} */ (b.from);

/**
 * @param {!Bits} superset
 * @param {!Bits} subset
 * @return {boolean}
 */
Bits.containsAll = /** @type {?} */ (b.containsAll);

/**
 * @param {!Bits} bits
 * @param {number} num
 * @return {!Bits}
 */
Bits.with = /** @type {?} */ (b.with);

/**
 * @param {!Bits} bits
 * @param {number} num
 * @return {!Bits}
 */
Bits.without = /** @type {?} */ (b.without);

/**
 * @param {!Bits} bits
 * @param {number} num
 * @return {boolean}
 */
Bits.has = /** @type {?} */ (b.has);

/**
 * @param {!Bits} bits
 * @return {!Array<number>}
 */
Bits.bits = /** @type {?} */ (b.bits);

/**
 * @param {!Bits} bits
 * @return {!Bits}
 */
Bits.clone = /** @type {?} */ (b.clone);

/**
 * @param {!Bits} bits
 * @return {boolean}
 */
Bits.empty = /** @type {?} */ (b.empty);
