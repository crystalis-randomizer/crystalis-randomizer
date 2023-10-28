export function assert(x: false): never;
export function assert(x: unknown): asserts x;
export function assert(x: unknown): void {
  if (!x) throw new Error('Assertion Failed');
}
export function assertType<T>(_x: unknown): asserts _x is T {}

export function checkExhaustive(arg: never): never {
  throw new Error(`missing case`);
}
