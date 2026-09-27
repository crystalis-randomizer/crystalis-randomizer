#!/usr/bin/env bun

/**
 * `buildchr` will convert the files in `./patches/chr/*.chr` and
 * output a single `.ts` file for each `.chr` file. This ts file
 * contains a declaration for an ASCII representation of the tiles,
 * which can be used in the randomizer code to update a tile.
 *
 * This task is not part of any other pipeline, it is intended to be
 * used as a one-off task, and the output is intended to be copy-pasted
 * into the other source files as needed.
 * 
 * bun run scripts/buildchr.ts
 */

import * as path from 'node:path';

const dir = path.resolve(import.meta.dir, '../patches/chr');

for await (const file of new Bun.Glob('*.chr').scan(dir)) {
  const contents = new Uint8Array(await Bun.file(path.join(dir, file)).arrayBuffer());
  const stem = path.basename(file, '.chr');
  let out = '';
  for (let start = 0; start * 0x10 < contents.length; ++start) {
    const data = contents.subarray(start * 0x10, start * 0x10 + 0x10);
    const arr = new Array(64).fill(0);
    for (let x = 0; x < 8; ++x) {
      for (let y = 0; y < 8; ++y) {
        arr[x + y * 8] |= (data[y | 8] >> (~x & 7) & 1) << 1 | (data[y] >> (~x & 7) & 1);
      }
    }
    const concatted = arr
      .map((num) => ' x.o'[num])
      .join('')
      .match(/.{1,8}/g)!
      .join('\n  ');
    const tileAsHex = start.toString(16).padStart(2, '0');
    out += `public static readonly ${stem}_tile${tileAsHex} = parsePattern(\`\n  ${concatted}\n\`);\n`;
  }
  await Bun.write(path.join(dir, `${stem}.ts`), out);
}
