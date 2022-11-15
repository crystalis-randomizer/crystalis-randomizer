import { StrictIterator, iters } from '../util';
import { TileId } from './tileid';

// NOTE: This could be exported into a non-game-specific library.

/** A single flag, item, or condition. */
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
  export function or(...rs: Requirement[]): Frozen {
    const out: Array<readonly Condition[]> = [];
    for (const r of rs) {
      if (r === OPEN) return OPEN;
      if (r === CLOSED) continue;
      out.push(...freeze(r));
    }
    if (!out.length) return CLOSED;
    return out;
  }

  /** Meet a bunch of arbitrary requirements. */
  export function meet(left: Requirement, right: Requirement): Frozen {
    if (left === OPEN) return freeze(right);
    if (right === OPEN) return freeze(left);
    if (left === CLOSED || right === CLOSED) return CLOSED;
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
    return r instanceof Builder ?
        [...iters.map(r, (cs: Iterable<Condition>) => [...cs])] : r as Frozen;
  }

  /** Semi-uniquely maps a requirement to a string. */
  export function label(r: Requirement): string {
    // NOTE: equivalent frozen requirements may have different labels due to
    // arbitrary ordering.
    return r instanceof Builder ?
        r.label() :
        (r as Frozen).map((cs: Iterable<Condition>) =>
                          (cs as Array<unknown>).join('&')).join('|');
  }

  export function isOpen(r: Requirement): boolean {
    const outer = r[Symbol.iterator]() as StrictIterator<Iterable<Condition>>;
    const {value, done} = outer.next();
    if (done || !outer.next().done) return false;
    const inner = value[Symbol.iterator]();
    return Boolean(inner.next().done);
  }

  export function isClosed(r: Requirement): boolean {
    const iter = r[Symbol.iterator]();
    return Boolean(iter.next().done);
  }

  /** A requirement that's always met. */
  export const OPEN: Frozen = [[]];

  /** A requirement that's never met. */
  export const CLOSED: Frozen = [];

  /** Mutable builder class for building up requirements piecemeal. */
  export class Builder implements Requirement {
    private readonly map = new Map<string, Set<Condition>>();

    constructor(readonly self?: Condition) {}

    [Symbol.iterator](): Iterator<Iterable<Condition>> {
      return this.map.values();
    }

    /** Internal method for actually adding a route. */
    private addInternal(newLabel: string, newDeps: Set<Condition>): boolean {
      for (const c of newDeps) if (Array.isArray(c)) throw new Error();

      if (newDeps.has(this.self!) || this.map.has(newLabel)) return false;
      for (const [curLabel, curDeps] of this.map) {
        if (containsAll(newDeps, curDeps)) return false;
        if (containsAll(curDeps, newDeps)) this.map.delete(curLabel);
      }
      this.map.set(newLabel, newDeps);
      return true;
    }

    /** Joins a route's requirements. */
    addRoute(route: Route): boolean {
      return this.addInternal(route[DEPS_LABEL], route.deps);
    }

    /** Joins an arbitrary requirement in place. */
    addAll(requirement: Requirement): void {
      for (const conditions of requirement) {
        this.addList(conditions);
      }
    }

    /** Joins a single-route requirement in place. */
    addList(conditions: Iterable<Condition>): void {
      const sorted = [...new Set(conditions)].sort();
      const deps = new Set(sorted);
      this.addInternal(sorted.join('&'), deps);
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

const DEPS_LABEL: unique symbol = Symbol('depsLabel');
export class Route {
  readonly [DEPS_LABEL]: string; // used for direct-adding to a builder.
  readonly deps: Set<Condition>;
  readonly label: string;
  constructor(readonly target: TileId, conditions: readonly Condition[]) {
    const sorted = [...new Set(conditions)].sort();
    this.deps = new Set(sorted);
    this[DEPS_LABEL] = sorted.join('&');
    this.label = `${this.target}:${this[DEPS_LABEL]}`;
  }
}
