require = require('esm')(module);

const {EXPECTED_CRC32} = require('./view/rom.js');
const {FlagSet} = require('./flagset.js');
const {crc32} = require('./crc32.js');
const fs = require('fs');
const patch = require('./patch');

// Usage: node cli.js [--flags=<FLAGS>] [--seed=<SEED>] rom.nes > out.nes

const main = (...args) => {
  let flags = 'Em Gt Mr Rlpt Sbk Sct Sm Tasd';
  let count = 1;
  let seed = '';
  let output = '%n_%c';
  let force = false;
  while (args[0].startsWith('--')) {
    let arg = args.shift().substring(2);
    let value = undefined;
    const eq = arg.indexOf('=');
    if (eq >= 0) {
      value = arg.substring(eq + 1);
      arg = arg.substring(0, eq);
    } else {
      value = args.shift();
    }
    if (arg == 'flags') {
      flags = value;
    } else if (arg == 'output') {
      output = value;
    } else if (arg == 'seed') {
      seed = value;
    } else if (arg == 'count') {
      count = Number(value);
    } else if (arg == 'force') {
      force = true;
      if (value != null) args.unshift(value);
    } else {
      fail(`Bad argument: ${arg}`);
    }
    // TODO - preset options
  }

  if (args.length != 1) fail(`Bad remaining arguments: ${args}`);
  if (count > 1) {
    if (seed) fail('Cannot specify both --count and --seed');
    if (!/%[sc]/.test(output)) {
      fail('--output must have a %c or %s placeholder when --count is given');
    }
  }

  const flagset = new FlagSet(flags);
  const rom = new Uint8Array(fs.readFileSync(args[0]).buffer);
  if (crc32(rom) != EXPECTED_CRC32) {
    console.error(`WARNING: Bad CRC for input rom: ${crc32(rom).toString(16)}`);
    if (!force) fail('Run with --force to proceed anyway');
    console.error('Proceeding anyway');
  }

  return Promise.all(new Array(count).fill(0).map(async () => {
    const s = patch.parseSeed(seed);
    const shuffled = rom.slice();
    const c = await patch.shuffle(shuffled, s, flagset);
    const n = args[0].replace('.nes', '');
    const f = String(flagset).replace(/ /g, '');
    const v = patch.BUILD_HASH;
    const filename = fillTemplate(output, {c, n, s, v, f, '%': '%'}) + '.nes';
    await new Promise((resolve, reject) =>
                      fs.writeFile(filename, shuffled,
                                   (err) => err ? reject(err) : resolve()));
    console.log(`Wrote ${filename}`);
  }));
};

const fail = (message) => {
  console.error(message);
  process.exit(2);
};

const fillTemplate = (str, arg) => {
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
};

process.on('unhandledRejection', error => {
  console.error(error.stack);
  process.exit(1);
});

main(...process.argv.slice(2)).then(() => process.exit(0));
