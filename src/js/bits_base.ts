export interface BitsNamespace<B> {
  /** Constructs a new Bits instance from the given numbers. */
  of(...nums: number[]): B;

  /** Constructs a new Bits instance from the given iterable. */
  from(nums: Iterable<number>): B;

  /** Checks whether the superset contains all elements from the subset. */
  containsAll(superset: B, subset: B): boolean;

  /** Constructs a new Bits with the given element added. */
  with(bits: B, num: number): B;

  /** Constructs a new Bits with the given element removed. */
  without(bits: B, num: number): B;

  /** Checks whether the given bits contains the element. */
  has(bits: B, num: number): boolean;

  /** Returns an array of all elements. */
  bits(bits: B): number[];

  /** Clones the Bits (should not be required...?). */
  clone(x: B): B;

  /** Checks whether the Bits is empty. */
  empty(x: B): boolean;

  /** Returns a Bits with elements in `left` but not in `right`. */
  difference(left: B, right: B): B;
}
