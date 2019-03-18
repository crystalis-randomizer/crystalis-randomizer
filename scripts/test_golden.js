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
  let rom = args.shift();
  let golden = args.shift();
  if (!rom || !golden) {
    usage(1);
  }

  // Read the files
  // Build a data structure for golden data
  // Call a test function w/ flags and golden file??


};

main(process.argv.slice(2)).then(() => process.exit(0));
