// @ts-ignore
import data from '../../target/build/data.tar.br';
// @ts-ignore
import decompress from 'brotli/decompress';
import { TarRecord, untar } from './untar';
import { RefsJson, Ref } from './tools/extract-refs';
import { Expr } from './asm/expr';

function comparing<T, S extends number|string>(key: (arg: T) => S): (left: T, right: T) => number {
  return (a, b) => {
    const ka = key(a);
    const kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  }
}

function memoize<T>(f: () => T, post: (arg: T) => T = x => x): () => T {
  let fn = (): T => {
    const x = f();
    fn = () => post(x);
    return fn();
  };
  return () => fn();
}

const files = memoize(() =>
    [...untar(decompress(data))].sort(comparing(x => x.filename)));

function clone<T>(arg: T): T {
  if (Array.isArray(arg)) return arg.map(clone) as T;
  if (typeof arg !== 'object') return arg;
  return Object.fromEntries(
      Object.entries(arg as object)
          .map(([k, v]) => [k, clone(v)])) as T;
}

const decoder = new TextDecoder();
const decode = (arr: Uint8Array) => decoder.decode(arr);

function stringifyContents({filename, contents}: TarRecord): TarRecord<string> {
  return {filename, contents: decode(contents)};
}

/** Returns the assembly sources as strings. */
export const sources = memoize(() =>
    files()
        .filter(({filename}) => filename.endsWith('.s'))
        .map(stringifyContents),
    clone);

/** Returns the spritesheets as a map of strings. */
export const spritesheets = memoize(() =>
    Object.fromEntries(files()
        .filter(({filename}) => filename.endsWith('.nss'))
        .map(({filename, contents}) => [filename, decode(contents)])),
    clone);

export const refs = memoize(() => {
  const f = files().find(({filename}) => filename === 'refs.json')!;
  return JSON.parse(decode(f.contents)) as RefsJson;
});

export const refsBySymbol = memoize((): ReadonlyMap<string, readonly Ref[]> => {
  const map = new Map<string, Ref[]>();
  for (const ref of refs().refs) {
    const syms = Expr.symbols(ref.expr);
    if (syms.length !== 1) continue;
    let vals = map.get(syms[0]);
    if (!vals) map.set(syms[0], vals = []);
    vals.push(ref);
  }
  return map;
});
