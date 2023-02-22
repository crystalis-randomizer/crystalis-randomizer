#!/usr/bin/env -S node

// Outputs a symbols.json file, which is just an array of all symbols
// defined and/or referenced in the file(s), from the token stream.

import * as fs from 'node:fs';
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
    return new Tokenizer(String(await fs.promises.readFile(path)), path,
                         {lineContinuations: true});
  }

  const symbols = new Set<string>();
  const toks = new TokenStream();
  const sources = await Promise.all(files.map(tokenizer));
  toks.enter(TokenSource.concat(...sources));
  let line;
  while ((line = toks.next())) {
    for (const t of line) {
      if (t.token === 'ident' && !t.str.startsWith('@')) symbols.add(t.str);
    }
  }
  fs.writeFileSync(outfile, JSON.stringify([...symbols]));
}

function usage(code = 1, message = '') {
  if (message) console.error(`js65: ${message}`);
  console.error(`Usage: extract-symbols [-o FILE] [FILE...]`);
  process.exit(code);
}

main();
