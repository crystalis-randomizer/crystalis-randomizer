// Returns element where fn returns 0, or ~insertion point
export function binarySearch(n: number, f: (i: number) => number): number {
  const fa = f(0);
  const fb = f(n - 1);
  if (fa < 0) return ~0;
  if (fa === 0) return 0;
  if (fb > 0) return ~n;
  if (fb === 0) return n - 1;
  let a = 0;
  let b = n - 1;
  while (b - a > 1) {
    const m = (a + b) >> 1;
    const fm = f(m);
    if (fm > 0) {
      a = m;
    } else if (fm < 0) {
      b = m;
    } else {
      return m;
    }
  }
  return ~b;
}
