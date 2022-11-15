const IM1 = 2147483563;
const IM2 = 2147483399;
const AM = 1 / IM1;
const IMM1 = IM1 - 1;
const IA1 = 40014;
const IA2 = 40692;
const IQ1 = 53668;
const IQ2 = 52774;
const IR1 = 12211;
const IR2 = 3791;
const NTAB = 32;
const NDIV = 1 + Math.floor(IMM1 / NTAB);
const EPS = 1.2e-7;
const RNMX = 1 - EPS;

export class Random {

  // Returns a new seed at random, using the system PRNG.
  static newSeed(): number {
    return Math.floor(Math.random() * 0x100000000);
  }

  private idum: number = 0;
  private idum2: number = 0;
  private iy: number = 0;
  private iv: number[] = [];
  private z1: number | null = null; // extra normal deviate

  constructor(seed: number = Math.floor(Math.random() * 0x100000000)) {
    this.seed(seed);
  }

  seed(seed: number) {
    this.idum = Math.max(1, Math.floor(seed));
    this.idum2 = this.idum;
    this.iy = 0;
    this.iv = new Array(NTAB).fill(0);
    for (let j = NTAB + 7; j >= 0; j--) {
      const k = Math.floor(this.idum / IQ1);
      this.idum = IA1 * (this.idum - k * IQ1) - k * IR1;
      if (this.idum < 0) this.idum += IM1;
      if (j < NTAB) this.iv[j] = this.idum;
    }
    this.iy = this.iv[0];
  }

  next(): number {
    let k = Math.floor(this.idum / IQ1);
    this.idum = IA1 * (this.idum - k * IQ1) - k * IR1;
    if (this.idum < 0) this.idum += IM1;
    k = Math.floor(this.idum2 / IQ2);
    this.idum2 = IA2 * (this.idum2 - k * IQ2) - k * IR2;
    if (this.idum2 < 0) this.idum2 += IM2;
    const j = Math.floor(this.iy / NDIV);
    this.iy = this.iv[j] - this.idum2;
    this.iv[j] = this.idum;
    if (this.iy < 1) this.iy += IMM1;
    return Math.min(AM * this.iy, RNMX);
  }

  nextInt(n: number): number {
    return Math.floor(this.next() * n);
  }

  nextNormal(mean: number = 0,
             stdev: number = 1,
             min: number = -Infinity,
             max: number = Infinity) {
    while (true) {
      let z = this.z1;
      if (z == null) {
        const r = Math.sqrt(-2 * Math.log(this.next()));
        const theta = TWOPI * this.next();
        z = r * Math.cos(theta);
        this.z1 = r * Math.sin(theta);
      } else {
        this.z1 = null;
      }
      z = mean + z * stdev;
      if (z >= min && z <= max) return z;
    }
  }

  shuffle<T extends MutableArrayLike<unknown>>(array: T): T {
    for (let i = array.length; i;) {
      const j = this.nextInt(i--);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** Does not destroy the input iterable. */
  * ishuffle<T>(iterable: Iterable<T>): IterableIterator<T> {
    const arr: T[] = [];
    if (!Array.isArray(iterable)) {
      if (hasSize(iterable)) {
        const iter = iterable[Symbol.iterator]();
        for (let i = 0; i < iterable.size; i++) {
          const j = i + this.nextInt(iterable.size - i);
          while (arr.length <= j) {
            arr.push(iter.next().value);
          }
          yield arr[j];
          arr[j] = arr[i];
        }
        return; // TODO - why was this not required?
      } else {
        iterable = [...iterable];
      }
    }
    if (!Array.isArray(iterable)) throw new Error('impossible');
    for (let i = 0; i < iterable.length; i++) {
      const j: number = i + this.nextInt(iterable.length - i);
      yield j in arr ? arr[j] : iterable[j];
      arr[j] = i in arr ? arr[i] : iterable[i];
    }
  }

  pick<T>(arr: readonly T[]): T {
    if (!arr.length) throw new Error('empty array');
    return arr[this.nextInt(arr.length)];
  }

  pickWeighted<T>(arr: ReadonlyArray<readonly [number, T]>): T {
    if (!arr.length) throw new Error('empty array');
    let total = 0;
    for (const [weight] of arr) total += weight;
    let choice = this.next() * total;
    for (const [weight, elem] of arr) {
      if (choice < weight) return elem;
      choice -= weight;
    }
    throw new Error('bad weights');
  }

  pickAndRemove<T>(...arrs: T[][]): T {
    let count = 0;
    for (const arr of arrs) {
      count += arr.length;
    }
    if (!count) throw new Error('empty arrays');
    let i = this.nextInt(count);
    for (const arr of arrs) {
      if (i < arr.length) return arr.splice(i, 1)[0];
      i -= arr.length;
    }
    throw new Error('impossible');
  }

  bitGenerator(): () => boolean {
    let bits = 0;
    let next = 0;
    return () => {
      if (!bits) {
        bits = 32;
        next = this.nextInt(0x100000000);
      }
      bits--;
      const result = !(next & 1);
      next >>>= 1
      return result;
    };
  }
}

interface HasSize<T> extends Iterable<T> {
  readonly size: number;
}
function hasSize<T>(iter: Iterable<T>): iter is HasSize<T> {
  return 'size' in iter;
}

const TWOPI = 2 * Math.PI;

interface MutableArrayLike<T> {
  length: number;
  [index: number]: T;
}

// // Provide a static singleton instance.
// let random = (() => {
//   let seed = 0;
//   if (window && window.location && window.location.hash) {
//     for (const component of window.location.hash.substring(1).split('&')) {
//       const split = component.split('=');
//       if (split[0] === 'seed') {
//         seed = Number(split[1]) || 0;
//       }
//     }
//   }
//   if (!seed) {
//     seed = Math.floor(Math.random() * 0x100000000);
//   }
//   return new Random(seed);
// })();
// Random.nextInt = (n) => random.nextInt(n);
// Random.next = () => random.next();
// Random.seed = (s) => random.seed(s);
