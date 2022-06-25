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
      const j = i + this.nextInt(iterable.length - i);
      yield j in arr ? arr[j] : iterable[j];
      arr[j] = i in arr ? arr[i] : iterable[i];
    }
  }

  /**
   * Attempts to do a metropolis-ish weighted shuffle.  This adds only a
   * log-time overhead to the shuffle.  There are a few choices we could
   * consider: (1) pre-sort or not, (2) unconditionally swap to improve
   * weight or not.  We opt to not sort and to maybe not swap (though this
   * potentially scales the temperature by a factor of 2 one direction or
   * the other).
   */
  * ishuffleMetropolis<T>(arr: Array<[number, T]>, temp: number):
  IterableIterator<T> {
    const a = [...arr]; // .sort((a, b) => a[0] - b[0]);
    for (let i = a.length - 1; i >= 0; i--) {
      // try to swap out log2(i) different items, using a shooting method
      for (let j = 1; j < i; j <<= 1) {
        const j1 = j >>> 1;
        const k = (j1 ? this.nextInt(j1) : 0) + j1 + 1;
        const delta = a[i][0] - a[i - k][0];
        // If delta < 0 then definitely swap, otherwise use a boltzman factor
        //const swap = delta < 0 || this.next() < Math.exp(-delta / temp);
        const swap = delta < 0 ? 2 * this.next() > Math.exp(delta / temp) :
                                 2 * this.next() < Math.exp(-delta / temp);
        if (swap) {
          const tmp = a[i];
          a[i] = a[i - k];
          a[i - k] = tmp;
        }
      }
      yield a[i][1];
    }    
  }

  // /**
  //  * Shuffles a weighted list such that the higher weights _tend_ to come
  //  * earlier, but uses a temperature-parametrized monte carlo algorithm to
  //  * inject some randomness.  When temperature is zero then this is just a
  //  * deterministic sort.  When temperature is infinite, then it's a
  //  * completely random shuffle.  At in-between temperatures (on the order
  //  * of magnitude of the weights), there is a transition.
  //  */
  // metropolisShuffle<T extends Array<[number, T]>>(arr: T, temp: number): T {
  //   // Start at T=0 equilibrium, then heat it up.
  //   arr.sort((a, b) => b[0] - a[0]);
  //   if (temp <= 0) return arr;

  //   // TODO - this probably doesn't work how we'd like - randomly swapping
  //   // non-neighbors seems problematic, and I'm starting to question the
  //   // scale - if we have weights from 0 to 15 then T=5 might mean that
  //   // we'll see 10..15 at the front but very not likely others.
  //   //   - maybe it's the same thing with a unitless scaling?
  //   // We should also try N passes of non-random neighbor shuffles?
  //   //   - if there's a big delta somewhere in the middle, it would be hard
  //   //     to break through that?
  //   //   ---> way too slow

  //   const l = arr.length;
  //   for (let i = l * l; i > 0; i--) {
  //     const j2 = this.nextInt(l - 1) + 1;
  //     const j1 = this.nextInt(j2);
  //     const delta = arr[j1][0] - arr[j2][0];
  //     // Goal: weight 1 should be greater than weight 2:
  //     //   so delta < 0 means we should definitely swap
  //     //   but delta > 0 means we might swap at higher temperatures
  //     //                 (probability P=exp(-delta/temp))
  //     const swap = delta < 0 || this.next() < Math.exp(-delta / temp);
  //     if (swap) {
  //       const tmp = arr[j1];
  //       arr[j1] = arr[j2];
  //       arr[j2] = tmp;
  //     }
  //   }
  //   return arr;
  // }

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
