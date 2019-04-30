import {BitsArray} from './bits_array.js';
import {BitsNamespace} from './bits_base.js';
import {BIGINT_OK, BitsBigInt} from './bits_bigint.js';

declare const BITS: unique symbol;

export interface Bits {
  [BITS]: never;
}

export const Bits: BitsNamespace<Bits> =
    (BIGINT_OK ? BitsBigInt : BitsArray) as any;
