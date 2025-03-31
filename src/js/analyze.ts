#!/usr/bin/env -S node -r esm --inspect 

import './build_info.js'; // side effect global set (affects version module)

import {EXPECTED_CRC32S} from './rom.js';
import {FlagSet, Preset} from './flagset.js';
import {crc32} from './crc32.js';
import * as fs from 'fs';
import * as patch from './patch.js';
import {UsageError} from './util.js';
import * as version from './version.js';
import {disableAsserts} from './assert.js';

// Usage: node analyze.js [--flags=<FLAGS>] rom.nes

const main = async (...args: string[]) => {
  let flags = '@Standard';
  let count = 1;
  let seed = '';
  let output = '%n_%c';
  let force = false;
  while (args[0] && args[0].startsWith('--')) {
    let arg = args.shift()!.substring(2);
    let value = undefined;
    const eq = arg.indexOf('=');
    if (eq >= 0) {
      value = arg.substring(eq + 1);
      arg = arg.substring(0, eq);
    } else {
      value = args.shift();
    }
    if (arg == 'flags' && value) {
      flags = value;
    } else if (arg == 'preset' && value) {
      flags = '@' + value.replace(/ /g, '');
    } else if (arg == 'output' && value) {
      output = value;
    } else if (arg == 'count' && value) {
      count = Number(value);
    } else if (arg == 'force') {
      force = true;
      disableAsserts();
      if (value != null) args.unshift(value);
    } else if (arg == 'version' || arg == '-v') {
      console.log(version.VERSION);
      process.exit(0);
    } else if (arg == 'list-presets') {
      // undocumented flag
      for (const {name} of Preset.all()) {
        console.log(name.replace(/ /g, ''));
      }
      process.exit(0);
    } else {
      console.error(`Bad argument: ${arg}`);
    }
  }

  if (count > 1) {
    if (seed) fail('Cannot specify both --count and --seed');
    if (!/%[sc]/.test(output)) {
      fail('--output must have a %c or %s placeholder when --count is given');
    }
  }

  const flagset = new FlagSet(flags);
  const rom = new Uint8Array(fs.readFileSync(args[0]).buffer);
  const orig_crc = crc32(rom);
  if (!EXPECTED_CRC32S.has(orig_crc)) {
    console.error(`WARNING: Bad CRC for input rom: ${orig_crc.toString(16)}`);
    if (!force) fail('Run with --force to proceed anyway');
    console.error('Proceeding anyway');
  }

  const sphereAnalysis = (globalThis as any).sphereAnalysis = new Map<string, number[]>();
  await Promise.all(new Array(count).fill(0).map(async () => {
    const s = patch.parseSeed(seed);
    console.log(`Seed: ${s.toString(16)}`);
    const orig = rom.slice();
    await patch.shuffle(orig, s, flagset);
  }));
  for (const [item, hist] of sphereAnalysis) {
    console.log(`\n${item}`);
    const max = hist.reduce((a, b) => Math.max(a, b), 0);
    const scale = Math.min(1, 80 / max);
    let first = true;
    for (let i = 0; i < hist.length; i++) {
      if (!hist[i] && first) continue;
      first = false;
      const lines = scale * hist[i];
      const frac = lines % 1;
      console.log(`${String(i).padStart(2, ' ')}|${
              '*'.repeat(Math.floor(lines))}${frac > 0.5 ? '.' : ''}`);
    }
  }
};

function fail(message: string): never {
  console.error(message);
  throw process.exit(2);
}

process.on('unhandledRejection', (error: any) => {
  console.error(
      typeof error === 'string' ?
          error :
          error instanceof UsageError ? error.message : error.stack);
  process.exit(1);
});

const asyncMain =
    async () => {
  try {
    await main(...process.argv.slice(2));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      console.error(`Try passing --help for documentation.`);
      process.exit(1);
    }
    throw error;
  }
}

asyncMain().then(() => process.exit(0));
