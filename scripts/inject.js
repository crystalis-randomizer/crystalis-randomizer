#!/usr/bin/env node

// Inject bytes from one file into another.
// Usage:
//   inject.js source dest [start:end[@byte]]...
// Addresses are always in hex.

const fs = require('fs');

const main = async (args) => {
  const src = new Uint8Array(fs.readFileSync(args[0]).buffer);
  const dst = new Uint8Array(fs.readFileSync(args[1]).buffer);
  for (const arg of args.slice(2)) {
    const match = /([0-9a-f]+):([0-9a-f]+)(?:@([0-9a-f]+))?/.exec(arg);
    if (!match) throw new Error(`Bad arg: ${arg}`);
    const a = Number.parseInt(match[1], 16);
    const b = Number.parseInt(match[2], 16);
    const req = (() => {
      if (match[3]) {
        const c = Number.parseInt(match[3], 16);
        return (x) => c === x;
      }
      return () => true;
    })();
    for (let j = a; j < b; j++) {
      if (req(src[j])) dst[j] = src[j];
    }
  }
  console.log(`writing ${args[1]}`);
  return new Promise((resolve, reject) =>
                     fs.writeFile(args[1], dst,
                                  (err) => err ? reject(err) : resolve()));
};

process.on('unhandledRejection', error => {
  console.error(error.stack);
  process.exit(1);
});

main(process.argv.slice(2)).then(() => process.exit(0));
