// Bundle-time macro which reads the asm sources and spritesheets and
// extracts the refs from the vanilla disassembly, so that the result
// is inlined into the bundle.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Glob } from 'bun';
import { extractRefs, RefsJson } from './tools/extract-refs';
import { extractSymbols, SourceFile } from './tools/extract-symbols';

const ROOT = path.resolve(import.meta.dir, '../..');
const DATA_TS = path.join(import.meta.dir, 'data.ts');

const ASM = 'src/asm/*.s';
const SPRITESHEETS = 'src/images/spritesheets/*.nss';
const VANILLA = 'vanilla/crystalis.s';

export interface Data {
  sources: Record<string, string>;
  spritesheets: Record<string, string>;
  refs: RefsJson;
}

function glob(pattern: string): string[] {
  return [...new Glob(pattern).scanSync(ROOT)].sort();
}

function read(file: string): SourceFile {
  return {filename: file, contents: fs.readFileSync(path.join(ROOT, file), 'utf8')};
}

function byBasename(files: SourceFile[]): Record<string, string> {
  return Object.fromEntries(
      files.map(({filename, contents}) => [path.basename(filename), contents]));
}

function checkWatchImports(inputs: readonly string[]) {
  const imported = new Set<string>();
  const re = /^import\s+'([^']+)'\s+with\s+\{\s*type:\s*'text'\s*\}/mg;
  for (const [, spec] of fs.readFileSync(DATA_TS, 'utf8').matchAll(re)) {
    imported.add(path.relative(ROOT, path.resolve(import.meta.dir, spec)));
  }
  const missing = inputs.filter(f => !imported.delete(f));
  if (!missing.length && !imported.size) return;
  const spec = (f: string) => path.relative(import.meta.dir, path.join(ROOT, f));
  throw new Error([
    'src/js/data.ts is out of sync with the data files on disk:',
    ...missing.map(f => `  add:    import '${spec(f)}' with {type: 'text'};`),
    ...[...imported].map(f => `  remove: import '${spec(f)}' with {type: 'text'};`),
  ].join('\n'));
}

export async function data(): Promise<Data> {
  const asm = glob(ASM);
  const spritesheets = glob(SPRITESHEETS);
  checkWatchImports([...asm, ...spritesheets, VANILLA]);

  const sources = asm.map(read);
  const symbols = extractSymbols(sources);
  const refs = await extractRefs([read(VANILLA)], symbols, ROOT);
  return {
    sources: byBasename(sources),
    spritesheets: byBasename(spritesheets.map(read)),
    // Round-trip to drop anything that's not plain JSON (e.g. undefined).
    refs: JSON.parse(JSON.stringify(refs)),
  };
}
