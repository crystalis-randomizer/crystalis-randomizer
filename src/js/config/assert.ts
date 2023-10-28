export function assert(x: false, msg?: string): never;
export function assert(x: unknown, msg?: string): asserts x;
export function assert(x: unknown, msg?: string): void {
  if (!x) throw new Error(`Assertion Failed${msg ? ': ' + msg : ''}`);
}
export function assertType<T>(_x: unknown): asserts _x is T {}

export function checkExhaustive(arg: never): never {
  throw new Error(`missing case`);
}
