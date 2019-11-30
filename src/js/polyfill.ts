// Polyfill Array.protoype.flatMap

if (!(Array.prototype as any).flatMap) {
  Object.defineProperties(Array.prototype, {
    flatMap: {
      value<T, U>(this: Array<T>, f: (x: T, i: number) => U[]): U[] {
        const out = [];
        let i = 0;
        for (const x of this) {
          let y = f(x, i++);
          if (typeof y[Symbol.iterator] !== 'function') y = [y] as any;
          y = [...y];
          if (y.length) out.push(...y);
        }
        return out;
      },
    },
  });
}
