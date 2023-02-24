#!/usr/bin/env -S node

// Outputs a symbols.json file, which is just an array of all symbols
// defined and/or referenced in the file(s), from the token stream.

import * as fs from 'node:fs';
import { Cpu } from '../asm/cpu';
import { nodeSmudger } from '../asm/nodesmudger';
import { TokenSource } from '../asm/token';
import { Tokenizer } from '../asm/tokenizer';
import { TokenStream } from '../asm/tokenstream';

async function main() {
  let files: string[] = [];
  let outfile: string|undefined = undefined;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--help') {
      usage(0);
    } else if (arg === '-o') {
      if (outfile) usage();
      outfile = process.argv[++i];
    } else {
      files.push(arg);
    }
  }
  if (!files.length) {
    files.push('/dev/stdin');
  }
  if (!outfile) outfile = '/dev/stdout';

  async function tokenizer(path: string) {
    const src = await nodeSmudger(String(await fs.promises.readFile(path)));
    return new Tokenizer(src, path, {lineContinuations: true});
  }

  const symbols = new Set<string>();
  const overrides = new Set<string>();
  const defs = new Set<string>();
  const toks = new TokenStream();
  const sources = await Promise.all(files.map(tokenizer));
  toks.enter(TokenSource.concat(...sources));
  let line;
  let override = false;
  while ((line = toks.next())) {
    for (let i = 0; i < line.length; i++) {
      const t = line[i];
      if (t.token === 'ident' && !/^[@:]/.test(t.str)) {
        symbols.add(t.str);
        const next = line[i + 1];
        if (next?.token === 'op' && /^[:=]$/.test(next.str)) {
          (override ? overrides : defs).add(t.str);
        } else if (override) {
          overrides.add(t.str);
        }
      }
      override = t.token === 'ident' && t.str === 'OVERRIDE';
    }
  }
  for (const op of Object.keys(Cpu.P02.table)) {
    symbols.delete(op);
  }
  for (const s of overrides) {
    symbols.delete(s);
    defs.delete(s);
  }
  for (const s of defs) {
    symbols.delete(s);
  }
  symbols.delete('x');
  symbols.delete('y');
  fs.writeFileSync(outfile, JSON.stringify({
    symbols: [...symbols],
    overrides: [...overrides],
    defs: [...defs],
  }));
}

function usage(code = 1, message = '') {
  if (message) console.error(`js65: ${message}`);
  console.error(`Usage: extract-symbols [-o FILE] [FILE...]`);
  process.exit(code);
}

main();
