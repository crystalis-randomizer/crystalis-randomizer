#!/usr/bin/env bun

// Outputs a symbols.json file, which is just an array of all symbols
// defined and/or referenced in the file(s), from the token stream.

import * as fs from 'node:fs';
import { Cpu } from '../asm/cpu';
import { nodeSmudger } from '../asm/nodesmudger';
import { TokenSource } from '../asm/token';
import { Tokenizer } from '../asm/tokenizer';
import { TokenStream } from '../asm/tokenstream';

export interface SymbolsJson {
  symbols: string[];
  overrides: string[];
  defs: string[];
}

export interface SourceFile {
  filename: string;
  contents: string;
}

export async function extractSymbols(files: readonly SourceFile[],
                                     romDir = '.'): Promise<SymbolsJson> {
  async function tokenizer({filename, contents}: SourceFile) {
    const src = await nodeSmudger(contents, romDir);
    return new Tokenizer(src, filename, {lineContinuations: true});
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
  return {
    symbols: [...symbols],
    overrides: [...overrides],
    defs: [...defs],
  };
}

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

  const sources = await Promise.all(files.map(async filename => ({
    filename,
    contents: String(await fs.promises.readFile(filename)),
  })));
  fs.writeFileSync(outfile, JSON.stringify(await extractSymbols(sources)));
}

function usage(code = 1, message = '') {
  if (message) console.error(`js65: ${message}`);
  console.error(`Usage: extract-symbols [-o FILE] [FILE...]`);
  process.exit(code);
}

if (import.meta.main) main();
