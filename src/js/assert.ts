let assertionsEnabled = true;

export function disableAsserts() {
  assertionsEnabled = false;
}

export function assert(x: boolean) {
  if (assertionsEnabled && !x) throw new Error('impossible');
}

export function fail() {
  if (assertionsEnabled) throw new Error('impossible');
}
