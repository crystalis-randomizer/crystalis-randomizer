import {Condition} from './condition.js';
import {Requirement} from './requirement.js';

// Class for keeping track of a disjunctive normal form expression
export class MutableRequirement {
  private readonly map = new Map<string, Set<Condition>>();

  [Symbol.iterator](): Iterator<Iterable<Condition>> {
    return this.map.values();
  }

  add(newLabel: string, newDeps: Set<Condition>): boolean {
    for (const c of newDeps) if (Array.isArray(c)) throw new Error();

    if (this.map.has(newLabel)) return false;
    for (const [curLabel, curDeps] of this.map) {
      if (containsAll(newDeps, curDeps)) return false;
      if (containsAll(curDeps, newDeps)) this.map.delete(curLabel);
    }
    this.map.set(newLabel, newDeps);
    return true;
  }

  addAll(requirement: Requirement): void {
    for (const conditions of requirement) {
      this.addList(conditions);
    }
  }

  addList(conditions: readonly Condition[]): void {
    const sorted = [...new Set(conditions)].sort();
    const deps = new Set(sorted);
    this.add(sorted.join(' '), deps);
  }

  /** Appends the given requirement to all routes. */
  restrict(r: Requirement): void {
    const l = [...this.map.values()];
    this.map.clear();
    for (const ls of l) {
      for (const rs of r) {
        this.addList([...ls, ...rs]);
      }
    }
  }

  freeze(): Requirement {
    return [...this].map(cs => [...cs]);
  }
}

function containsAll<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size < right.size) return false;
  for (const d of right) {
    if (!left.has(d)) return false;
  }
  return true;
}
