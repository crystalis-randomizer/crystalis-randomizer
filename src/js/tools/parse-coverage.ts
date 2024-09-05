// Read the cov.lo and cov.hi files, outputting their data into a nicer
// format (cov.bnk).

import * as fs from 'node:fs';

class File {
  done = false;
  constructor(private buf: string) {}
  next(): number {
    try {
      const match = /^[0-9a-f]{8}\s*/.exec(this.buf);
      if (!match) {
        this.done = true;
        return 0;
      }
      this.buf = this.buf.substring(match[0].length);
      return parseInt(match[0], 16);
    } finally {
      if (!this.buf) this.done = true;
    }
  }
}

function h5(n: number): string {
  return n.toString(16).padStart(5, '0');
}
function h2(n: number): string {
  return n.toString(16).padStart(2, '0');
}
function bits(n: number): string {
  let i = 0;
  const out = [];
  while (n) {
    if (n & 1) out.push(h2(i));
    i++;
    n >>>= 1;
  }
  return out.join('|');
}
function banks(lo: number, hi: number): string {
  if (!lo || !hi) return 'uncovered';
  return `${bits(lo).padEnd(24, ' ')}   ${bits(hi)}`;
}

let lo = new File(String(fs.readFileSync('cov.lo')));
let hi = new File(String(fs.readFileSync('cov.hi')));

let addr = -1;
let curLo = 0;
let curHi = 0;
while (!lo.done && !hi.done) {
  addr++;
  const nextLo = lo.next();
  const nextHi = hi.next();
  if (nextLo === curLo && nextHi === curHi) continue;
  console.log(`${h5(addr)}: ${banks(nextLo, nextHi)}`);
  curLo = nextLo;
  curHi = nextHi;
}
