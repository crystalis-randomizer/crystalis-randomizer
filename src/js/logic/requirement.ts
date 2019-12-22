// NOTE: This could be exported into a non-game-specific library.

// A single flag, item, or condition.
export type Condition = number & {__condition__: never};

// A DNF expression representing a satisfiable set of conditions.
export type Requirement = Iterable<Iterable<Condition>>;

export namespace Requirement {
  /** An immutable single-route requirement. */
  export type Single = readonly [ReadonlyArray<Condition>];

  /** A "frozen" requirement, which can be treated as immutable. */
  export type Frozen = ReadonlyArray<ReadonlyArray<Condition>>;

  /** Meet a single-route requirements into a new single-route requirement. */
  export function and(...cs: Single[]): Single {
    return [([] as Condition[]).concat(...cs.map(([c]) => c))];
  }
  /** Join a bunch of requirements into a new requirement. */
  export function or(...cs: Requirement[]): Frozen {
    return ([] as Requirement).concat(...cs.map(freeze));
  }

  /** Meet a bunch of arbitrary requirements. */
  export function meet(left: Requirement, right: Requirement): Frozen {
    const out = new Builder();
    for (const ls of left) {
      for (const rs of right) {
        out.addList([...ls, ...rs]);
      }
    }
    return freeze(out);
  }

  /** Freeze an arbitrary requirement into an immutable requirement. */
  export function freeze(r: Requirement): Frozen {
    return r instanceof Builder ? [...r].map(cs => [...cs]) : r;
  }

  /** Semi-uniquely maps a requirement to a string. */
  export function label(r: Requirement): string {
    // NOTE: equivalent frozen requirements may have different labels due to
    // arbitrary ordering.
    return r instanceof Builder ?
        r.label() : r.map(cs => cs.join('&')).join('|');
  }

  export function isOpen(r: Requirement): boolean {
    return r.length === 1 && !r[0].length;
  }

  export function isClosed(r: Requirement): boolean {
    return !r.length;
  }

  /** A requirement that's always met. */
  export const OPEN: Requirement = [[]];

  /** A requirement that's never met. */
  export const CLOSED: Requirement = [];

  /** Mutable builder class for building up requirements piecemeal. */
  export class Builder implements Requirement {
    private readonly map = new Map<string, Set<Condition>>();

    [Symbol.iterator](): Iterator<Iterable<Condition>> {
      return this.map.values();
    }

    /** Internal method for actually adding a route. */
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

    /** Joins an arbitrary requirement in place. */
    addAll(requirement: Requirement): void {
      for (const conditions of requirement) {
        this.addList(conditions);
      }
    }

    /** Joins a single-route requirement in place. */
    addList(conditions: readonly Iterable<Condition>): void {
      const sorted = [...new Set(conditions)].sort();
      const deps = new Set(sorted);
      this.add(sorted.join('&'), deps);
    }

    /** Meet this requirement in-place with the given requirement. */
    restrict(r: Requirement): void {
      const l = [...this.map.values()];
      this.map.clear();
      for (const ls of l) {
        for (const rs of r) {
          this.addList([...ls, ...rs]);
        }
      }
    }

    /** Returns a label. */
    label() {
      return [this.map.keys()].join('|');
    }
  }
}

/** Helper function for building requirements. */
function containsAll<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size < right.size) return false;
  for (const d of right) {
    if (!left.has(d)) return false;
  }
  return true;
}

