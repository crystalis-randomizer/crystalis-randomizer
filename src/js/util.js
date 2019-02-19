/** @template T */
export class Deque {
  constructor() {
    /** @type {!Array<T|undefined>} */
    this.buffer = new Array(16);
    /** @type {number} */
    this.mask = 0xf;
    /** @type {number} */
    this.start = 0;
    /** @type {number} */
    this.end = 0;
    /** @type {number} */
    this.size = 0; // readonly externally
  }

  get length() { return this.size; } // TODO - just use length

  upsize(target) {
    while (this.mask < target) {
      if (this.end <= this.start) this.start += this.mask + 1;
      this.mask = this.mask << 1 | 1;
      this.buffer = this.buffer.concat(this.buffer);
    }
    this.size = target;
  }

  /** @param {...T} elem */
  push(...elems) {
    this.upsize(this.size + elems.length);
    for (const elem of elems) {
      this.buffer[this.end] = elem;
      this.end = (this.end + 1) & this.mask;
    }
  }

  /** @return {T|undefined} */
  pop() {
    if (!this.size) return undefined;
    this.end = (this.end - 1) & this.mask;
    this.size--;
    return this.buffer[this.end];
  }

  /** @return {T|undefined} */
  peek() {
    if (!this.size) return undefined;
    return this.buffer[(this.end - 1) & this.mask];
  }

  /** @param {...T} elem */
  unshift(...elems) {
    this.upsize(this.size + elems.length);
    for (const elem of elems) {
      this.start = (this.start - 1) & this.mask;
      this.buffer[this.start] = elem;
    }
  }

  /** @return {T|undefined} */
  shift() {
    if (!this.size) return undefined;
    const result = this.buffer[this.start];
    this.start = (this.start + 1) & this.mask;
    this.size--;
    return result;
  }

  /** @return {T|undefined} */
  front() {
    if (!this.size) return undefined;
    return this.buffer[this.start];
  }

toString(){
const parts=new Array(this.size);
  for (let i = 0; i < this.size; i++)parts[i]=this.buffer[(this.start+i)&this.mask];return '['+parts.join(', ')+']';
}
}

// /** @template T */
// export class DequeSet {
//   constructor() {
//     /** @type {!Array<T|undefined>} */
//     this.buffer = new Array(16);
//     /** @type {number} */
//     this.mask = 0xf;
//     /** @type {number} */
//     this.start = 0;
//     /** @type {number} */
//     this.end = 0;
//     /** @type {number} */
//     this.size = 0; // readonly externally
//     /** @type {!Set<T>} */
//     this.set = new Set();
//   }

//   upsize(target) {
//     while (this.mask < target) {
//       this.start += this.mask + 1;
//       this.mask = this.mask << 1 | 1;
//       this.buffer = this.buffer.concat(this.buffer);
//     }
//     this.size = target;
//   }

//   /** @param {...T} elem */
//   push(...elems) {
//     this.upsize(this.size + elems.length);
//     for (const elem of elems) {
//       if (this.set.has(elem)) {
//         this.size--;
//         continue;
//       }
//       this.buffer[this.end] = elem;
//       this.end = (this.end + 1) & this.mask;
//     }
//   }

//   /** @return {T|undefined} */
//   pop() {
//     if (!this.size) return undefined;
//     this.end = (this.end - 1) & this.mask;
//     this.size--;
//     const out = this.buffer[this.end];
//     this.set.delete(out);
//     return out;
//   }

//   /** @return {T|undefined} */
//   peek() {
//     if (!this.size) return undefined;
//     return this.buffer[(this.end - 1) & this.mask];
//   }

//   /** @param {...T} elem */
//   unshift(...elems) {
//     this.upsize(this.size + elems.length);
//     for (const elem of elems) {
//       if (this.set.has(elem)) {
//         this.size--;
//         continue;
//       }
//       this.start = (this.start - 1) & this.mask;
//       this.buffer[this.start] = elem;
//     }
//   }

//   /** @return {T|undefined} */
//   shift() {
//     if (!this.size) return undefined;
//     const result = this.buffer[this.start];
//     this.start = (this.start + 1) & this.mask;
//     this.size--;
//     this.set.remove(result);
//     return result;
//   }

//   /** @return {T|undefined} */
//   front() {
//     if (!this.size) return undefined;
//     return this.buffer[this.start];
//   }
// }

export class IndexedList {
  constructor() {
    this.list = [];
    this.map = new Map();
  }

  add(elem) {
    if (this.map.has(elem)) return;
    this.map.set(elem, this.list.length);
    this.list.push(elem);
  }

  indexOf(elem) {
    return this.map.get(elem);
  }

  remove(elem) {
    // TODO - this isn't super efficient...
    // We could maintain a small handful of split points.
    // Or a RemovalTree where it starts with a fully-balanced
    // binary tree (height ~ log(n)) and then we just remove
    // elements from there so that we only need to update
    // O(log(n)) "size" values on the way up.  Though this
    // doesn't help to actually *find* the element...
    // Another option would be to use the bits of the index
    // to keep track of the number of removed elements before.
    // So we have a same-size array of numbers
    // where each entry tells the size to add for the Nth one-bit
    // and all the higher bits.
    //   00 -> 0
    //   01 -> 1
    //   10 -> 2
    //   11 -> 3 = 2 + 1
    // Storing
    //   X#  -> 2
    //   1X  -> 1
    //   0X  -> 1
    // For bigger list,
    //   11X -> 1    stored at    111 = 7
    //   10X -> 1                 110 = 6
    //   01X -> 1                 101 = 5
    //   00X -> 1                 100 = 4
    //   1X# -> 2                 011 = 3
    //   0X# -> 2                 010 = 2
    //   X## -> 4                 001 = 1
    // The upshot is that when removing an element we only need to
    // update O(log(n)) elements...
    // And we can avoid splicing the list and even find the first
    // element with binary search - O(log(n))
    const index = this.map.get(elem);
    if (index == null) return;
    this.list.splice(index, 1);
    this.map.delete(elem);
    for (let i = index; i < this.list.length; i++) {
      this.map.set(this.list[i], i);
    }
  }

  [Symbol.iterator]() {
    return this.list[Symbol.iterator]();
  }
}


class BitSet_BigInt {
  constructor(value = ZERO) {
    this.value = value;
  }

  check(bit) {
    return !!(this.value & bigIntMask(bit))
  }

  without(bit) {
    return this.with(bit, false);
  }

  with(bit, value = true) {
    const mask = bigIntMask(bit);
    if (!!(this.value & mask) == !!value) return this;
    return new BitSetBigInt(value ? this.value | mask : this.value & ~mask);
  }

  union(that) {
    const value = this.value | that.value;
    // TODO - is it even worth checking for returning the same object?
    // Might be better to just add the value and make a new object.
    return this.value === value ? this : that.value === value ? that :
        new BitSetBigInt(value);
  }

  intersect(that) {
    const value = this.value & that.value;
    // TODO - is it even worth checking for returning the same object?
    // Might be better to just add the value and make a new object.
    return this.value === value ? this : that.value === value ? that :
        new BitSetBigInt(value);
  }
}

const bigIntMask = (bit) => ONE << BigInt(bit);
const ZERO = typeof BigInt === 'function' ? BigInt(0) : undefined;
const ONE = typeof BigInt === 'function' ? BigInt(1) : undefined;

class BitSet_Array {
  constructor(arr = new Uint32Array(0)) {
    this.array = arr;
    this.str = undefined;
  }

  check(bit) {
    const elem = bit >> 5;
    const mask = 1 << (bit & 31);
    return elem < this.array.length && !!(this.array[elem] & mask)
  }

  without(bit) {
    return this.with(bit, false);
  }

  with(bit, value) {
    const elem = bit >> 5;
    const mask = 1 << (bit & 31);
    if ((elem < this.array.length && !!(this.array[elem] & mask)) === !!value) {
      return this;
    }
    const arr = new Uint32Array(Math.max(elem, this.array.length));
    arr.set(this.array);
    if (value) {
      arr[elem] |= mask;
    } else {
      arr[elem] &= ~mask;
    }
    return new BitSetArray(arr);
  }

  union(that) {
    const arr = new Uint32Array(Math.max(that.array.length, this.array.length));
    for (let i = 0; i < arr.length; i++) {
      arr[i] = (this.array[i] || 0) | (that.array[i] || 0);
    }
    return new BitSetArray(arr);
  }

  intersect(that) {
    const arr = new Uint32Array(Math.min(that.array.length, this.array.length));
    for (let i = 0; i < arr.length; i++) {
      arr[i] = this.array[i] & that.array[i];
    }
    return new BitSetArray(arr);
  }

  toString() {
    if (str != null) return str;
    let i = this.array.length;
    while (i && !this.array[--i]);
    i++;
    const terms = new Array(i);
    let j = 0;
    while (i--) {
      terms[j++] = this.array[i].toString(16).padStart(8, 0);
    }
    return str = terms.join('');    
  }
}

export const BitSet = typeof BigInt == 'function' ? BitSet_BigInt : BitSet_Array;


class BitSetSet_BigInt {
  constructor(set = EMPTY) {
    this.set = set;
  }

  * [Symbol.iterator]() {
    for (const s of this.set) {
      yield new BitSet_BigInt(s);
    }
  }

  common() {
    let x;
    for (const i of this.set) {
      if (x == null) {
        x = i;
      } else {
        x &= i;
      }
      if (!x) break;
    }
    if (x == null) throw new Error('Empty'); // 0?
    return new BitSet_BigInt(x);
  }

  plus(that) {
    if (that instanceof BitSet_BigInt) {
      if (this.set.has(that)) return this;
      const set = new Set(this.set);
      set.add(that);
      return new BitSetSet_BigInt(set);
    } else {
      const set = new Set(this.set);
      for (const i of that.set) set.add(i);
      return new BitSetSet_BigInt(set);
    }
  }
}
const EMPTY = new Set();

class BitSetSet_Map {

}

export const BitSetSet = typeof BigInt === 'function' ? BitSetSet_BigInt : BitSetSet_Map;
