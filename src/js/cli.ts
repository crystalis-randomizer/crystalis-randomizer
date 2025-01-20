#!/usr/bin/env -S node --inspect 

import '../../target/build/build_info'; // side effect global set (affects version module)

import {EXPECTED_CRC32_NES, EXPECTED_CRC32_SNK_40TH} from './rom.js';
import {FlagSet, Preset} from './flagset';
import {crc32} from './crc32';
import * as fs from 'fs';
import * as patch from './patch';
import {UsageError, breakLines} from './util';
import * as version from './version';
import {disableAsserts} from './assert';

// Usage: node cli.js [--flags=<FLAGS>] [--seed=<SEED>] rom.nes

const usage = (code: number) => {
  console.log(`Crystalis Randomizer v${version.VERSION}
Usage: cryr [OPTIONS...] rom.nes

Options
  --flags=FLAGSET    Specify the flagset.
  --preset=PRESET    Specify the preset by name.
                     Spaces and capitalization are ignored.
  --seed=SEED        Specify the seed.
  --output=PATTERN   Specify the output filename pattern.
                     May include placeholders:
                       %n: input base filename
                       %v: cryr version hash
                       %s: seed
                       %f: flagset
                       %c: checksum
                     The default pattern is "%n_%c".
  --count=NUMBER     Number of shuffled roms to generate.
                     This flag is not compatible with specifying
                     a seed manually, nor with output patterns
                     that don't include %s or %c.
  --force            Don't fail due to wrong input file checksum.

Flags
  The randomizer supports a number of options, documented in detail
  at https://crystalisrandomizer.com.  Spaces are ignored.

Presets
${Preset.all().map(showPreset).join('\n\n')}`);
  process.exit(code);
};

const showPreset = ({description, flagString, name}: Preset) => {
  const LINE_LENGTH = 68;
  const flagLen = LINE_LENGTH - name.length - 6;
  const flagLines = breakLines(flagString, flagLen);
  const descrLines = breakLines(description, LINE_LENGTH - 2);
  const indent = '\n' + ' '.repeat(name.length + 5);
  return `  ${name}: "${flagLines.join(indent)}"
  ${descrLines.join('\n  ')}`;
};

const main = (...args: string[]) => {
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
    } else if (arg == 'seed' && value) {
      seed = value;
    } else if (arg == 'count' && value) {
      count = Number(value);
    } else if (arg == 'force') {
      force = true;
      disableAsserts();
      if (value != null) args.unshift(value);
    } else if (arg == 'help') {
      usage(0);
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
      usage(1);
    }
  }

  if (args.length != 1) usage(1);
  if (count > 1) {
    if (seed) fail('Cannot specify both --count and --seed');
    if (!/%[sc]/.test(output)) {
      fail('--output must have a %c or %s placeholder when --count is given');
    }
  }

  const flagset = new FlagSet(flags);
  const rom = new Uint8Array(fs.readFileSync(args[0]).buffer);
  const orig_crc = crc32(rom);
  if (orig_crc != EXPECTED_CRC32_NES && orig_crc != EXPECTED_CRC32_SNK_40TH) {
    console.error(`WARNING: Bad CRC for input rom: ${crc32(rom).toString(16)}`);
    if (!force) fail('Run with --force to proceed anyway');
    console.error('Proceeding anyway');
  }

  return Promise.all(new Array(count).fill(0).map(async () => {
    const s = patch.parseSeed(seed);
    console.log(`Seed: ${s.toString(16)}`);
    const orig = rom.slice();
    const [shuffled, c] =
        await patch.shuffle(orig, s, flagset);
    const n = args[0].replace('.nes', '');
    const f = String(flagset).replace(/ /g, '');
    const v = version.VERSION;
    const filename = fillTemplate(output, {c, n, s, v, f, '%': '%'}) + '.nes';
    await new Promise(
        (resolve, reject) => fs.writeFile(
            filename, shuffled, (err) => err ? reject(err) : resolve('')));
    console.log(`Wrote ${filename}`);
  }));
};

function fail(message: string): never {
  console.error(message);
  throw process.exit(2);
}

function fillTemplate(str: string, arg: {[key: string]: unknown}): string {
  const terms = [];
  while (str) {
    const index = str.indexOf('%');
    if (index < 0) {
      terms.push(str);
      str = '';
    } else {
      terms.push(str.substring(0, index));
      const ch = str[index + 1];
      if (!(ch in arg)) throw new Error(`Bad placeholder: %${ch}`);
      terms.push(arg[ch]);
      str = str.substring(index + 2);
    }
  }
  return terms.join('');
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
