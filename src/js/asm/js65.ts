#!/usr/bin/env -S node -r esm --inspect

import { promises as fs } from 'fs';
import { Cpu } from './cpu';
import { Assembler } from './assembler.js';
import { Linker } from './linker.js';
//import { Module } from './module.js';
import { Preprocessor } from './preprocessor.js';
import { TokenSource } from './token.js';
import { TokenStream } from './tokenstream.js';
import { Tokenizer } from './tokenizer.js';

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
    return new Tokenizer(String(await fs.readFile(path)), path,
                         {lineContinuations: true});
  }

  const asm = new Assembler(Cpu.P02);
  const toks = new TokenStream();
  const sources = await Promise.all(files.map(tokenizer));
  toks.enter(TokenSource.concat(...sources));
  const pre = new Preprocessor(toks, asm);
  asm.tokens(pre);

  const linker = new Linker();
  //linker.base(this.prg, 0);
  linker.read(asm.module());
  const out = linker.link();
  const data = new Uint8Array(out.length);
  out.apply(data);
  //const exports = linker.exports();
  await fs.writeFile(outfile, data);
}

function usage(code = 1) {
  console.error(`Usage: js65 [-o FILE] [FILE...]`);
  process.exit(code);
}

main();
