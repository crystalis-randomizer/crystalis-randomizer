// Satisfiability class

// Represents a disjunction of conjunctions.
// Needs a way to indicate that propositions are incompatible?
//  - colored edges...

// Propositions are numbers from 0..N
// Colors are arbitrary references


// /** @template K, C */
// export class Disjunction {
//   constructor(/** !Array<!Conjunction<K, C>> */ terms) {
//     this.terms = terms;
//   }

//   or(/** !Disjunction<K, C> | !Conjection<K, C> */ that) {
//     const thatTerms = that instanceof Disjunction ? that.terms : [that];
//     outer:
//     for (const thatTerm of thatTerms) {
//       // if any existing terms include all the propositions from the
//       // given term, we don't need to include it.

//       for (const thisTerm of this.terms) {
//         const cmp = thisTerm.
//       }
//     }
//   }
// }


// class Sat {

// }



// There are two uses for this:
//  1. tracking requirements for pattern tables
//     in this case we have a coloring: the propositions are colored
//     such that there are ~4 keys and various possible values, and
//     some are incompatible with others.
//  2. tracking prerequisites for items
//     in this case it's just a bunch of sets.
// In any case, the disjunction is always an array of whatever the
// conjunction type is.

/** @template C extends Conjunction<C> */
export class Requirements {

  constructor() {
    this.options = [];
  }

  /**
   * @param {C|Requirements<C>} that
   * @return {Requirements<C>}
   */
  and(that) {
    // (A|B) & (C|D) = (A&C) | (A&D) | (B&C) | (B&D)
    const thatOpts = that instanceof Requirements ? that.options : [that];
    const opts = [];
    for (const thatOpt of thatOpts) {
      for (const thisOpt of this.options) {
        let opt = thatOpt.and(thisOpt);
        for (let i = 0; i < opts.length; i++) {
          const joined = opts[i].or(opt);
          if (joined) {
            if (joined == opts[i]) {
              // already in the disjunction
              opt = null;
              break;
            }
            opts.splice(i, 1);
            opt = joined;
            i--;
          }
        }
        if (opt) opts.push(opt);
      }
    }
    return new Requirements(opts);
  }

  or(that) {
    const thatOpts = that instanceof Requirements ? that.options : [that];
    const opts = this.options.slice();
    for (const thatOpt of thatOpts) {
      for (const thisOpt of opts) {
        const joined = opts[i].or(thatOpt);
        if (joined) {
          if (joined == opts[i]) {
            // already in the disjunction
            thatOpt = null;
            break;
          }
          opts.splice(i, 1);
          thatOpt = joined;
          i--;
        }
      }
      if (thatOpt) opts.push(thatOpt);
    }
    return new Requirements(opts);
  }
}

/** @implements {Conjunction<!Items>} */
export class Items {
  constructor(n) {
    this.n = n;
  }

  and(that) {
    const n = this.n | that.n;
    if (n == this.n) return this;
    if (n == that.n) return that;
    return new Items(n);
  }

  or(that) {
    const n = this.n & that.n;
    if (n == this.n) return this;
    if (n == that.n) return that;
    return null;
  }
}

/** @interface @template C extends Conjunction<C> */
class Conjunction {
  /**
   * @this {THIS}
   * @param {THIS} that
   * @return {THIS|null}
   * @template THIS
   */
  and(that) {}

  /**
   * If the two requirements can be collapsed, return the collapse one.
   * Otherwise return null.
   * @this {THIS}
   * @param {THIS} that
   * @return {THIS|null}
   * @template THIS
   */
  or(that) {}
}
