import {NumArray, ReadBuffer, WriteBuffer} from './buffer';

// Data compression schemes.

// Packs a list of numbers in an efficient way.  Favors small ints
// by packing as many small bit-sizes as possible.
export function pack(args: number[]): number[] {
  let values = [...args];
  const buf = new WriteBuffer();
  // First trim off any trailing nulls
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] != undefined) {
      values.length = i + 1;
      break;
    }
  }
  // Now push the initial bit mask
  let next = [];
  buf.pushVarint(values.length);
  for (const v of values) {
    buf.pushBits(v != undefined ? 1 : 0, 1);
    if (v != undefined) next.push(v);
  }
  // Keep going util next is empty
  while (next.length) {
    values = next;
    next = [];
    // Figure out how many bits to pack in this round - we want at least (half + 8)
    // to go away to be worth it
    let bits = 1;
    const target = Math.min(values.length, (values.length >>> 1) + 8);
    while (values.filter(x => x < (1 << bits)).length < target) {
      bits++;
    }
    // Push the number of bits as unary
    buf.pushBits(0, bits - 1);
    buf.pushBits(1, 1);
    // Now push the data
    const mask = (1 << bits) - 1;
    for (const v of values) {
      buf.pushBits(v & mask, bits);
      const rest = v >>> bits;
      buf.pushBits(rest ? 1 : 0, 1);
      if (rest) next.push(rest);
    }
  }
  return buf.toArray();
}

export function unpack(packed: NumArray|ReadBuffer): number[] {
  const buf = packed instanceof ReadBuffer ? packed : new ReadBuffer(packed);
  const out: number[] = new Array(buf.readVarint());
  let left = [];
  for (let i = 0; i < out.length; i++) {
    if (buf.readBits(1)) left.push(i);
  }
  let base = 0;
  while (left.length) {
    const next = [];
    // read the number of bits (unary)
    let bits = 1;
    while (!buf.readBits(1)) {
      bits++;
    }
    // read out all the bits and continuations
    for (const i of left) {
      out[i] |= buf.readBits(bits) << base
      if (buf.readBits(1)) next.push(i);
    }
    base += bits;
    left = next;
  }
  return out;
}
