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

const main = async (args) => {
  let regen = false;
  if (args[0] == '-r') {
    regen = true;
    args.shift();
  }
  let romFile = args.shift();
  let goldenFile = args.shift();
  if (!romFile || !goldenFile) {
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
    goldenData.push({flags, seed, crc});
  }

  // Shuffle the rom for each test case
  const output = [];
  let tested = 0;
  for (const g of goldenData) {
    if (!g.seed && !regen) throw new Error('Seed required for test');
    const seed = patch.parseSeed(g.seed);
    g.seed = seed.toString(16);
    let shuffled;
    try {
      shuffled = rom.slice();
      await patch.shuffle(shuffled, seed, new FlagSet(String(g.flags)));
    } catch (err) {
      shuffled = Uint8Array.of(0); // indicate that shuffle failed...?
    }
    const crc = crc32(shuffled).toString(16);
    if (regen) g.crc = crc;
    if (g.crc != crc) {
      throw new Error(`Mismatch for ${g.flags}: got ${crc} want ${g.crc}`);
    }
    output.push(`${g.flags} ${g.seed} ${g.crc}\n`);
    tested++;
  }

  // Write out the new golden file if needed
  if (regen) {
    fs.writeFileSync(goldenFile, output.join(''));
    console.log(`Wrote ${goldenFile}`);
  } else {
    console.log(`Tested ${tested} files`);
  }
};

process.on('unhandledRejection', error => {
  console.error(error.stack);
  process.exit(1);
});
main(process.argv.slice(2)).then(() => process.exit(0));
