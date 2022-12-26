#!/usr/bin/env -S node

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { Assembler } from './assembler';
import { Cpu } from './cpu';
import { Linker } from './linker';
//import { Module } from './module.js';
import { Preprocessor } from './preprocessor';
import { clean, smudge } from './smudge';
import { TokenSource } from './token';
import { Tokenizer } from './tokenizer';
import { TokenStream } from './tokenstream';

async function main() {
  let op: ((src: string, cpu: Cpu, prg: Uint8Array) => string)|undefined = undefined;
  let files: string[] = [];
  let outfile: string|undefined = undefined;
  let rom: string|undefined = undefined;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--help') {
      usage(0);
    } else if (arg === '-o') {
      if (outfile) usage();
      outfile = process.argv[++i];
    } else if (arg === '--clean') {
      op = clean;
    } else if (arg === '--smudge') {
      op = smudge;
    } else if (arg === '--rom') {
      rom = process.argv[++i];
    } else if (arg.startsWith('--rom=')) {
      rom = arg.substring(6);
    } else {
      files.push(arg);
    }
  }
  if (!files.length) {
    files.push('/dev/stdin');
  }
  if (!outfile) outfile = '/dev/stdout';

  if (op) {
    if (files.length > 1) usage(1, '--smudge and --clean only allow one input');
    const src = String(fs.readFileSync(files[0]));
    let fullRom!: Uint8Array;
    if (rom) {
      fullRom = Uint8Array.from(fs.readFileSync(rom));
    } else {
      const match = /smudge sha1 ([0-9a-f]{40})/.exec(src);
      if (!match) throw usage(1, 'no sha1 tag, must specify rom');
      const shaTag = match[1];
      const dirs = await fs.promises.opendir('.');
      for await (const dir of dirs) {
        if (/\.nes$/.test(dir.name)) {
          const data = fs.readFileSync(dir.name);
          const sha = Array.from(
              new Uint8Array(await crypto.subtle.digest('SHA-1', data)),
              x => x.toString(16).padStart(2, '0')).join('');
          if (sha === shaTag) {
            fullRom = Uint8Array.from(data);
            break;
          }
        }
      }
      if (!fullRom) usage(1, `could not find rom with sha ${shaTag}`);
    }

    // TODO - read the header properly
    const prg = fullRom.subarray(0x10, 0x40010);
    fs.writeFileSync(outfile, op(src, Cpu.P02, prg));
    return;
  }

  // assemble
  if (rom) usage(1, '--rom only allowed with --smudge or --clean');
  async function tokenizer(path: string) {
    return new Tokenizer(String(await fs.promises.readFile(path)), path,
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
  fs.writeFileSync(outfile, data);
}

function usage(code = 1, message = '') {
  if (message) console.error(`js65: ${message}`);
  console.error(`Usage: js65 [-o FILE] [FILE...]`);
  console.error(`       js65 (--smudge|--clean) [--rom=<rom>] [FILE]`);
  process.exit(code);
}

main();
