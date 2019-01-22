const BITS = 4;
const BITS_SHIFT = 32 - BITS;

let DEPTH=0;
let CNT=0;
let PR=false;

// A persistent (immutable) map.
export class PMap {

  static setFrom(elems) {
    let set = PMap.EMPTY;
    for (const elem of elems) {
      set = set.plus(elem);
    }
    return set;
  }

  constructor(key, hash, value, mask, children, hashCode, size) {
    this.key_ = key;
    this.hash_ = hash;
    this.value_ = value;
    this.mask_ = mask;
    this.children_ = children;
    this.hashCode_ = hashCode;
    this.size_ = size;


if(this.value_===undefined){
console.dir(this);
throw new Error('MISSING VALUE!');
}
for(let i=0;i<children.length;i++)if(!children[i]){
console.dir(children);
throw new Error('MISSING CHILDREN');
}
const bits=Array.from(mask.toString(2)).filter(x=>x==1).length;
if(bits!=children.length){
console.dir(children);
throw new Error('MISSING CHILDREN: expected '+bits+' from '+mask.toString(2));
}

  }

  toString() {
    const terms = [];
    for (const [k, v] of this) {
      terms.push(`${k}: ${v}`);
    }
    return `{${terms.join(', ')}}`;
  }

  get size() {
    return this.size_;
  }

  isEmpty() {
    return this.key_ == null;
  }

  * [Symbol.iterator]() {
    if (this.key_ !== null) yield [this.key_, this.value_];
    for (const child of this.children_) {
      yield * child;
    }
  }

  * keys() {
    if (this.key_ !== null) yield this.key_;
    for (const child of this.children_) {
      yield * child.keys();
    }
  }

  * values() {
    if (this.key_ !== null) yield this.value_;
    for (const child of this.children_) {
      yield * child.values();
    }
  }

  get(key) {
    return this.key_ !== null ? this.get_(key, hash(key)) : undefined;
  }

  get_(key, hash) {
    if (hash === this.hash_ && equal(key, this.key_)) {
      return this.value_;
    }
    const bucketMask = 1 << bucket(hash);
try{
    return this.mask_ & bucketMask ?
        this.children_[this.index_(bucketMask)].get_(key, shift(hash)) :
        undefined;
}catch(e){
if (e!='x'){
console.dir(bucketMask);console.dir(this.index_(bucketMask));console.dir(this);}
throw 'x';
}
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  plus(key, value = true) {
if(CNT++>=/*4*/54438)PR=true;
if(PR)console.log(`\x1b[1;33mPLUS(${key}, ${value})\x1b[m`);
    const h = hash(key);
    return this.key_ !== null ?
        this.plus_(key, h, value, h) :
        new PMap(key, h, value, 0, [], entryHash(h, value), 1);
  }

  plus_(key, hash, value, originalHash) {
if(PR)console.log(`plus_:\n  this=${this}\n  key=${key}\n  hash=${hash}\n  value=${value}\n  originalHash=${originalHash}`);
if(PR&&DEPTH>50)throw new Error();
DEPTH++;
try{

    if (hash === this.hash_ && equal(key, this.key_)) {
if(PR)console.log(`  => eq: check value: ${equal(value, this.value_)}`);
      return equal(value, this.value_) ?
          this :
          new PMap(
              key, hash, value, this.mask_, this.children_,
              (this.hashCode_ -
                  entryHash(originalHash, this.value_) +
                  entryHash(originalHash, value)) >>> 0,
              this.size_);
    } else if (hash < this.hash_) {
if(PR)console.log(`  => replace root`);
      return this.replaceRoot_(key, hash, value, originalHash);
    }
    const bucketMask = 1 << bucket(hash);
if(PR)console.log(`  bucketMask: ${bucketMask}`);
    hash = shift(hash);
    const index = this.index_(bucketMask);
    if (this.mask_ & bucketMask) {
      // already a child - overwrite
      const child = this.children_[index];
if(PR)console.log(`  child: ${child}`);
if(DEPTH>500){console.log(CNT,'this');console.dir(this);console.log(`child ${index}`);console.dir(child);console.log(`trying to add ${key}\n${hash}, ${value} ${originalHash}`);}
      const newChild = child.plus_(key, hash, value, originalHash); // TODO - blowing stack
if(PR)console.log(`  newChild: ${newChild}`);
      if (child === newChild) return this;
      const children = this.children_.slice();
      children[index] = newChild;
      return new PMap(
          this.key_, this.hash_, this.value_, this.mask_, children,
          this.hashCode_ - child.hashCode_ + newChild.hashCode_ >>> 0,
          this.size_ + newChild.size_ - child.size_);
    }
    // insert at index directly
    const mask = this.mask_ | bucketMask;
    const newChild =
        new PMap(key, hash, value, 0, [], entryHash(originalHash, value), 1);
    const children = this.children_.slice();
    children.splice(index, 0, newChild);
    return new PMap(
        this.key_, this.hash_, this.value_, mask, children,
        this.hashCode_ + newChild.hashCode_ >>> 0,
        this.size_ + 1);
}finally{DEPTH--;}
  }

  replaceRoot_(key, h, value, originalHash) {
    const bucketMask = 1 << bucket(this.hash_);
    const index = this.index_(bucketMask);
    const children = this.children_.slice();
    const mask = this.mask_ | bucketMask;
    const shifted = shift(this.hash_);
    const rootEntryHash = entryHash(hash(this.key_), this.value_);
    if (this.mask_ & bucketMask) {
      children[index] =
          this.children_[index].plus_(
              this.key_, shifted, this.value_, rootEntryHash);
    } else {
      children.splice(
          index, 0,
          new PMap(this.key_, shifted, this.value_, 0, [], rootEntryHash, 1));
    }
    return new PMap(
        key, h, value, mask, children,
        this.hashCode_ + entryHash(originalHash, value) >>> 0, this.size_ + 1);
  }

  minus(key) {
    if (this.key_ === null) return this;
    return this.minus_(key, hash(key));
  }

  minus_(key, hash) {
    if (hash === this.hash_ && equal(key, this.key_)) {
      const result = this.deleteRoot_();
      return result != null ? result : PMap.EMPTY;
    }
    const bucketMask = 1 << bucket(hash);
    // if not present then stop looking
    if ((this.mask_ & bucketMask) === 0) return this;
    // recurse
    hash = shift(hash);
    const index = this.index_(bucketMask);
    const child = this.children_[index];
    const newChild = child.minus_(key, hash);
    if (newChild === child) return this;
    const delta = newChild.hashCode_ - child.hashCode_;
    const newChildren = this.children_.slice();
    if (newChild === PMap.EMPTY) {
      newChildren.splice(index, 1);
      return new PMap(
          this.key_, this.hash_, this.value_, this.mask_ & ~bucketMask,
          newChildren, this.hashCode_ + delta, this.size_ - 1);
    }
    newChildren[index] = newChild;
    return new PMap(
        this.key_, this.hash_, this.value_, this.mask_,
        newChildren, this.hashCode_ + delta, this.size - 1);
  }

  deleteRoot_() {
    if (this.mask_ === 0) return null;
    const child = this.children_[0];
    const hashBits = countTrailingZeros(this.mask_);
    const newHash = unshift(child.hash_, hashBits);
    const newChild = child.deleteRoot_();
    const newHashCode =
        (this.hashCode_ - entryHash(hash(this.key_), this.value_)) >>> 0;
    if (newChild === null) {
      const newMask = this.mask_ & ~(1 << hashBits);
      return new PMap(
          child.key_, newHash, child.value_, newMask, this.children_.slice(1),
          newHashCode, this.size_ - 1);
    }
    const children = this.children_.slice();
    children[0] = newChild;
    return new PMap(
        child.key_, newHash, child.value_, this.mask_, children,
        newHashCode, this.size_ - 1);
  }

  index_(bit) {
    return bitCount(this.mask_ & (bit - 1));
  }

  hashCode() {
    return this.hashCode_;
  }

  equals(that) {
    if (this === that) return true;
    if (!(that instanceof PMap)) return false;
    if (this.hashCode_ !== that.hashCode_) return false;
    if (this.hash_ !== that.hash_) return false;
    if (!equal(this.key_, that.key_)) return false;
    if (!equal(this.value_, that.value_)) return false;
    if (this.mask_ !== that.mask_) return false;
    for (let i = this.children_.length - 1; i >= 0; i--) {
      if (!this.children_[i].equals(that.children_[i])) return false;
    }
    return true;
  }

  includes(submap) {
    if (!(submap instanceof PMap)) return false;
    if (submap.size_ > this.size_) return false;
    for (const [k, v] of submap) {
      if (this.get(k) !== v) return false;
    }
    return true;
  }
}

export const entryHash = (keyHash, value) => keyHash * 31 + hash(value) >>> 0;
export const bucket = (hash) => hash >>> BITS_SHIFT;
export const shift = (hash) => hash << BITS;
export const unshift = (hash, bucket) => hash >>> BITS | bucket << BITS_SHIFT;

export const equal = (a, b) => {
  const t = typeof a;
  if (t !== typeof b) return false;
  if (t !== 'object' && t !== 'function') return a === b;
  if (typeof a.equals === 'function') return a.equals(b);
  return a === b;
}
const fa = new Float64Array(1);
const ia = new Uint32Array(fa.buffer);

const hashes = new WeakMap();
let hashesCount = 0;
const symbolHash = new Map(); // leaky
export const hash = (obj) => {
  const t = typeof obj;
  if (t === 'number') {
    if (obj === (obj >>> 0)) return obj;
    fa[0] = obj;
    return (ia[0] ^ ia[1]) >>> 0;
  } else if (t === 'string') {
    let h = 1;
    for (let i = obj.length - 1; i >= 0; i--) {
      h = (31 * h + obj.charCodeAt(i)) >>> 0;
    }
    return h;
  } else if (t === 'boolean') {
    return +obj;
  } else if (t !== 'object' && t !== 'function') {
    let result = symbolHash.get(obj);
    if (result === undefined) {
      symbolHash.set(obj, result = hashesCount++);
    }
    return result;
  } else if (typeof obj.hashCode !== 'function') {
    let result = hashes.get(obj);
    if (result === undefined) {
      hashes.set(obj, result = hashesCount++);
    }
    return result;
  }
  return obj.hashCode() >>> 0;
};

export const countTrailingZeros = (i) => {
  if (!i) return 32;
  let n = 31;
  let y = i << 16;
  if (y) { n -= 16; i = y; }
  y = i << 8;
  if (y) { n -= 8; i = y; }
  y = i << 4;
  if (y) { n -= 4; i = y; }
  y = i << 2;
  if (y) { n -= 2; i = y; }
  return n - ((i << 1) >>> 31);
};


const bitCount = (n) => {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
};

PMap.EMPTY = new PMap(null, 0, null, 0, [], 0, 0);
