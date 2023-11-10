export interface Signal<T> {
  value: T;
}

export function signal<T>(init: T): Signal<T> {
  return null!;
}
export function computed<T>(fn: () => T): Signal<T> {
  return null!;
}
