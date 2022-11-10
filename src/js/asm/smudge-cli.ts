#!/usr/bin/env -S node -r esm --inspect

import { promises as fs } from 'fs';
import { clean, smudge } from './smudge';
import { Cpu } from './cpu';

async function main() {
  let op: ((src: string, cpu: Cpu, prg: Uint8Array) => string)|undefined = undefined;
  let rom = 'Crystalis.nes'; // TODO - look for any *.nes file?
  let file: string|undefined = undefined;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--help') {
      usage(0);
    } else if (arg === '--clean') {
      op = clean;
    } else if (arg === '--smudge') {
      op = smudge;
    } else if (arg === '--rom') {
      rom = process.argv[++i];
    } else if (arg.startsWith('--rom=')) {
      rom = arg.substring(6);
    } else if (!file) {
      file = arg;
    } else {
      usage();
    }
  }
  if (!op) {
    throw usage();
  }
  if (!file) {
    file = '/dev/stdin';
  }
  
  const fullRom = Uint8Array.from(await fs.readFile(rom));
  // TODO - read the header properly
  const prg = fullRom.subarray(0x10, 0x40010);
  const src = String(await fs.readFile(file));
  console.log(`${chop(op(src, Cpu.P02, prg))}`); // ???
}

function chop(out: string) {
  return out.endsWith('\n') ? out.substring(0, out.length - 1) : out;
}

function usage(code = 1) {
  console.error(`Usage: smudge (--smudge|--clean) [--rom=<rom>] [file]`);
  process.exit(code);
}

main();
