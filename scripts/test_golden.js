/**
 * @fileoverview Test various flagsets and seeds to make sure the result is
 * exactly what we think it should be.  In general this is not useful, but when
 * making large changes that shouldn't actually change behavior, it adds an
 * extra level of confidence.
 *
 * It can be run in several modes: (1) generate the golden data, or (2) test
 * against previously-generated data.
 */

// Golden file format: each line has three words separated by spaces:
//   FlagSet Seed Crc
// The Crc is ignored for regenerating, and if no seed is specified
// then seeds will be regenerated as well.

require = require('esm')(module);

const {FlagSet} = require('../src/js/flagset.js');
const {crc32} = require('../src/js/crc32.js');
const fs = require('fs');
const patch = require('../src/js/patch');

const usage = (code) => {
  console.log(`Usage: test_golden.js [-r] rom.nes golden`);
  process.exit(code);
};

const main = (args) => {
  let regen = false;
  if (args[0] == '-r') {
    regen = true;
    args.shift();
  }
  let romFile = args.shift();
  let goldenFile = args.shift();
  if (!rom || !golden) {
    usage(1);
  }

  // Read the files
  const rom = new Uint8Array(fs.readFileSync(romFile));
  const golden = fs.readFileSync(goldenFile).toString('utf-8');
  const goldenData = [];
  for (let line of golden.split('\n')) {
    line = line.trim();
    if (!line) continue;
    const [flags, seed, crc] = line.split(/ +/g);
    goldenData.push({flag, seed, crc});
  }

  // Shuffle the rom for each test case
  const output = [];
  let tested = 0;
  for (const g of golden) {
    if (!g.seed && !regen) throw new Error('Seed required for test');
    const seed = patch.parseSeed(g.seed);
    g.seed = seed.toString(16);
    const shuffled = rom.slice();
    await patch.shuffle(shuffled, seed, new FlagSet(String(g.flags)));
    const crc = crc32(shuffled)
    if (regen) g.crc = crc;
    if (g.crc != crc) throw new Error(`Mismatch for flagset ${g.flags}`);
    output.push(`${g.flags} ${g.seed} ${g.crc}\n`);
    tested++;
  }

  // Write out the new golden file if needed
  if (regen) {
    fs.writeFile(golden, output.join(''));
  } else {
    console.log(`Tested ${tested} files`);
  }
};

main(process.argv.slice(2)).then(() => process.exit(0));
