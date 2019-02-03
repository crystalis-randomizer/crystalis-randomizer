const REPEATABLE_FLAGS = new Set(['S']);

const exclusiveFlags = (flag) => {
  if (flag.startsWith('S')) {
    return new RegExp(`S.*[${flag.substring(1)}]`);
  }
  return FLAG_CONFLICTS[flag];
}
const FLAG_CONFLICTS = {
  Hm: /Em/,
  Hx: /Ex/,
  Em: /Hm/,
  Ex: /Hx/,
  Tw: /Gw/,
  Gw: /Tw/,
};

export class FlagSet {
  constructor(str) {
    this.flags = {};
    // parse the string
    str = str.replace(/[^A-Za-z0-9!]/g, '');
    const re = /([A-Z])([a-z0-9!]+)/g;
    let match;
    while ((match = re.exec(str))) {
      let [flag, key, terms] = match;
      if (REPEATABLE_FLAGS.has(key)) {
        terms = [terms];
      }
      for (const term of terms) {
        this.set(key + term, true);
      }
    }
  }

  set(flag, value) {
    // check for incompatible flags...?
    const key = flag[0];
    const term = flag.substring(1); // assert: term is only letters/numbers
    if (!value) {
      // Just delete - that's easy.
      const filtered = (this.flags[key] || []).filter(t => t !== term);
      if (filtered.length) {
        this.flags[key] = filtered;
      } else{
        delete this.flags[key];
      }
      return;
    }
    // Actually add the flag.
    this.removeConflicts(flag);
    const terms = (this.flags[key] || []).filter(t => t !== term);
    terms.push(term);
    terms.sort();
    this.flags[key] = terms;
  }

  check(flag) {
    const terms = this.flags[flag[0]];
    return !!(terms && (terms.indexOf(flag.substring(1)) >= 0));
  }

  // The following didn't end up getting used.

  // allows(flag) {
  //   const re = exclusiveFlags(flag);
  //   if (!re) return true;
  //   for (const key in this.flags) {
  //     if (this.flags[key].find(t => re.test(key + t))) return false;
  //   }
  //   return true;
  // }

  // merge(that) {
  //   this.flags = that.flags;
  // }

  removeConflicts(flag) {
    // NOTE: this is somewhat redundant with set(flag, false)
    const re = exclusiveFlags(flag);
    if (!re) return;
    for (const key in this.flags) {
      const terms = this.flags[key].filter(t => !re.test(key + t));
      if (terms.length) {
        this.flags[key] = terms;
      } else {
        delete this.flags[key];
      }
    }
  }

  toStringKey(key) {
    if (REPEATABLE_FLAGS.has(key)) {
      return [...this.flags[key]].sort().map(v => key + v).join(' ');
    }
    return key + [...this.flags[key]].sort().join('');
  }

  toString() {
    const keys = Object.keys(this.flags);
    keys.sort();
    return keys.map(k => this.toStringKey(k)).join(' ');
  }
}
