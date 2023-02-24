// Smudge function that looks for files to use as PRG.

import { smudge } from './smudge';
import { Cpu } from './cpu';
import { NesFile } from './nes';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

export async function nodeSmudger(src: string): Promise<string> {
  const match = /smudge sha1 ([0-9a-f]{40})/.exec(src);
  //if (!match) throw usage(1, 'no sha1 tag, must specify rom');
  if (!match) return src;
  const shaTag = match[1];
  const dirs = await fs.promises.opendir('.');
  let fullRom: Uint8Array|undefined = undefined;
  for await (const dir of dirs) {
    if (/\.nes$/.test(dir.name)) {
      const data = await fs.promises.readFile(dir.name);
      const sha = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-1', data)),
        x => x.toString(16).padStart(2, '0')).join('');
      if (sha === shaTag) {
        fullRom = Uint8Array.from(data);
        break;
      }
    }
  }
  if (!fullRom) throw new Error(`could not find rom with sha ${shaTag}`);
  const prg = new NesFile(fullRom).prg;
  return smudge(src, Cpu.P02, prg);
}
