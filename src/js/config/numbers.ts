// Defines a few types of numbers.

import { Minifloat } from 'minifloat';
import { NumArray } from './buffer';

export interface NumberEncoding {
  readonly name: string;
  encode(arg: number): number;
  decode(arg: number): number;
}

/** Encodes 1/128ths fractions from 0 to 1 in a minimum of bits. */
export const U8_128: NumberEncoding = {
  get name() { return 'u8/128'; },
  encode(frac: number) {
    let numerator = Math.max(0, Math.min(Math.round(frac * 128), 128));
    if (!numerator) return 0;
    let denominator = 128;
    while (!(numerator & 1)) { // any better way to count trailing zeros?
      numerator >>>= 1;
      denominator >>>= 1;
    }
    return ((numerator | denominator) >>> 1) + 1;
  },

  decode(byte: number) {
    if (!byte) return 0;
    byte -= 1; // unfortunate, but we want a closed range
    if (!byte) return 1; // special case: numerator == denominator would cancel.
    // Denominator is determined by leftmost bit
    const denominator = 1 << (32 - Math.clz32(byte));
    console.log(`denominator: ${denominator}`);
    const numerator = ((2 * byte + 1) & ~denominator) >>> 0;
    if (numerator > denominator) return 1; // should never happen.
    return numerator / denominator;
  },
} as const;

export const I8_64: NumberEncoding = {
  get name() { return 'i8/64'; },
  encode(frac: number) {
    return (U8_128.encode(Math.abs(frac)) << 1) | (frac < 0 ? 1 : 0);
  },
  decode(byte: number) {
    return U8_128.decode((byte + 1) >>> 1) * (byte & 1 ? -1 : 1);
  },
} as const;

export const U8_64: NumberEncoding = {
  get name() { return 'u8/64'; },
  encode(frac: number) {
    return U8_128.encode(frac / 2);
  },
  decode(byte: number) {
    return 2 * U8_128.decode(byte);
  },
} as const;

export const I8_32: NumberEncoding = {
  get name() { return 'i8/32'; },
  encode(frac: number) {
    return I8_64.encode(frac / 2);
  },
  decode(byte: number) {
    return 2 * I8_64.decode(byte);
  },
} as const;

export const U8_32: NumberEncoding = {
  get name() { return 'u8/32'; },
  encode(frac: number) {
    return U8_128.encode(frac / 4);
  },
  decode(byte: number) {
    return 4 * U8_128.decode(byte);
  },
} as const;

export const I8_16: NumberEncoding = {
  get name() { return 'i8/16'; },
  encode(frac: number) {
    return I8_64.encode(frac / 4);
  },
  decode(byte: number) {
    return 4 * I8_64.decode(byte);
  },
} as const;

// Just a reordering of signed int8 to put small-magnitude numbers first.
// This is basically just a signed varint...
export const I8_1: NumberEncoding = {
  get name() { return 'i8/1'; },
  encode(num: number) {
    return num < 0 ? -2 * num - 1 : 2 * num;
  },
  decode(byte: number) {
    return ((byte + 1) >>> 1) * (byte & 1 ? -1 : 1);
  },
} as const;

export const F8_1_4_3 = minifloatEncoding(new Minifloat(1, 4, 3));

function minifloatEncoding(mf: Minifloat): NumberEncoding {
  return {
    get name() { return `f${mf.BITS}:${mf.LABEL}`; },
    encode(frac: number) {
      return mf.toBits(frac);
    },
    decode(byte: number) {
      return mf.fromBits(byte);
    },
  };
}

// allows us to find an encoding by name.
export const ENCODINGS = [U8_128, I8_64, U8_64, I8_32, U8_32, I8_16, I8_1, F8_1_4_3];
const ENCODING_MAP = new Map<string, NumberEncoding>(ENCODINGS.map(e => [e.name, e]));

export function getEncoding(name: string): NumberEncoding|undefined {
  return ENCODING_MAP.get(name);
}

export function encode(encoding: string, declType: string, value: unknown): number|NumArray {
  if (encoding == undefined) {
    if (declType === 'float' || declType === 'double') {
      // default to small floats?
      encoding = 'f8:1.4.3';
    } else if (declType === 'int32' || declType === 'int64') {
      // signed type
      encoding = 'i8/1'; // note: works for larger numbers, too
    }
  }
  const enc = encoding != undefined ? getEncoding(encoding) : undefined;
  if (enc && typeof value === 'number') {
    return enc.encode(value);
  } else if (typeof value === 'boolean' || typeof value === 'number') {
    return Number(value);
  } else if (typeof value === 'string') {
    return new TextEncoder().encode(value);
  } else {
    throw new Error(`Don't know how to handle ${declType} (type ${encoding})`);
  }
}

export function decode(encoding: string, declType: string, value: number): unknown {
  if (encoding == undefined) {
    if (declType === 'float' || declType === 'double') {
      // default to small floats?
      encoding = 'f8:1.4.3';
    } else if (declType === 'int32' || declType === 'int64') {
      // signed type
      encoding = 'i8/1'; // note: works for larger numbers, too
    }
  }
  const enc = encoding != undefined ? getEncoding(encoding) : undefined;
  const jsType = protoToJsType[declType];
  if (typeof value === 'string') {
    throw new Error(`Can't decode string from number`);
  } else if (enc) {
    return jsType(enc.decode(value));
  } else {
    throw new Error(`Don't know how to handle ${declType} (type ${encoding})`);
  }
}

const protoToJsType: Record<string, Function> = {
  int32: Number, sint32: Number, uint32: Number, fixed32: Number, sfixed32: Number,
  int64: BigInt, sint64: BigInt, uint64: BigInt, fixed64: BigInt, sfixed64: BigInt,
  float: Number, double: Number, bool: Boolean, string: String, bytes: Uint8Array,
};
