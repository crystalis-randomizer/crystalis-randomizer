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

  constructor(seed = Math.floor(Math.random() * 0x100000000)) {
    this.seed(seed);
  }

  seed(seed) {
    this.idum = Math.max(1, seed);
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

  next() {
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

  nextInt(n) {
    return Math.floor(this.next() * n);
  }
}

// Provide a static singleton instance.
let random = new Random();
Random.nextInt = (n) => random.nextInt(n);
Random.next = () => random.next();
Random.seed = (s) => random.seed(s);
