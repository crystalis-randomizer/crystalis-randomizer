// Bundle-time macro which generates the Mesen labels for the vanilla
// disassembly, so that the result is inlined into the bundle.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractLabels } from './tools/extract-refs';

const ROOT = path.resolve(import.meta.dir, '../..');
const VANILLA = 'vanilla/crystalis.s';

export function vanillaLabels(): string {
  const contents = fs.readFileSync(path.join(ROOT, VANILLA), 'utf8');
  return extractLabels({filename: VANILLA, contents}, ROOT);
}
