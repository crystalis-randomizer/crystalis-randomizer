import {Condition} from './condition.js';

// An immutable DNF expression.  All exported constants are in this form.
export type Requirement = readonly (readonly Condition[])[];

export function and(...cs: (readonly [readonly Condition[]])[]): Requirement {
  return [([] as Condition[]).concat(...cs.map(([c]) => c))];
}
export function or(...cs: Requirement[]): Requirement {
  return ([] as Requirement).concat(...cs);
}

export function meet(left: Requirement, right: Requirement): Requirement {
  const out = new MutableRequirement();
  for (const ls of left) {
    for (const rs of right) {
      out.addList([...ls, ...rs]);
    }
  }
  return out.freeze();
}
