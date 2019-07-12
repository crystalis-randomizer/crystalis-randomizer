import {Range, RangeSet} from '../range.js';

// Constraint for pattern and palette pages.
// Allows multiple possibilities, and a callback when one is picked.

export class Constraint {

  readonly options: Option[]; // new Map<string, Option>();

  constructor(options: Option[]) {
    this.options = options;
  }

  join(that: Constraint): Constraint {
    // If any options overlap, then maybe collapse?
    return new Constraint([...this.options, ...that.options]);
  }

  meet(that: Constraint): Constraint {
    // Take the cross product of both sets of options.
    const left = this.options;
    const right = that.options;
    const out = [];
    for (const a of this.options) {
      for (const b of that.options) {
        const c = a.meet(b);
        if (c) out.push(c);
      }
    }
  }

}

const ALL = new RangeSet([new Range(0, 0x80)]);

export class Option {
  constructor(readonly pat0 = ALL, readonly pat1 = ALL,
              readonly pal2 = ALL, readonly pal3 = ALL,
              readonly pages = new Map<number, number>()) {}

  spawn(slot: number) {
    
  }

  meet(that: Option): Option | undefined {
    const pat0 = this.pat0.meet(that.pat0);
    const pat1 = this.pat1.meet(that.pat1);
    const pal2 = this.pal2.meet(that.pal2);
    const pal3 = this.pal3.meet(that.pal3);
    if (pat0.empty() || pat1.empty() || pal2.empty() || pal3.empty()) return undefined;
    return new Option(pat0, pat1, pal2, pal3, new Map([...this.pages, ...that.pages]));
  }
}

// export function r(a: number, b: number): Range {
//   return new Range(a, b);
// }
