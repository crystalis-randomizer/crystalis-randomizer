#!/usr/bin/env node

// Usage: ips patch.ips < file.nes > patched.nes

const fs = require('fs');

if (process.argv.length !== 3) {
  console.error(`Usage: ips.js patch.ips < infile > outfile`);
  process.exit(1);
}
const patch = new Uint8Array(fs.readFileSync(process.argv[2]));
const orig = new Uint8Array(fs.readFileSync('/dev/stdin'));

function badPatch(msg) {
  console.error(`Bad patch file: ${process.argv[2]}: ${msg}`);
  const hex = Array.from(patch, x => String.fromCharCode(x)); // x.toString(16).padStart(2, '0'));
  for (let i = 0; i < hex.length; i += 16) {
    console.error(`${i.toString(16).padStart(8, '0')}: ${
                     hex.slice(i, i + 16).join(' ')}`);
  }
  process.exit(1);
}

const PREFIX = [0x50, 0x41, 0x54, 0x43, 0x48];
const SUFFIX = [0x45, 0x4f, 0x46];

for (let i = 0; i < PREFIX.length; i++) {
  if (PREFIX[i] !== patch[i]) badPatch(`prefix ${i} ${patch[i]}`);
}
for (let i = 0; i < SUFFIX.length; i++) {
  if (SUFFIX[SUFFIX.length - i - 1] !== patch[patch.length - i - 1]) {
    badPatch(`suffix ${SUFFIX.length - i - 1} ${patch[patch.length - i - 1]}`);
 }
}
let data = patch.subarray(5, patch.length - 3);
while (data.length) {
  const offset = data[0] << 16 | data[1] << 8 | data[2];
  const length = data[3] << 8 | data[4];
  if (data.length < 5 + length) badPatch(`Block length ${data.length} < ${length - 5}`);
  orig.subarray(offset, offset + length).set(data.subarray(5, 5 + length));
  data = data.subarray(5 + length);
}

fs.writeFileSync('/dev/stdout', orig);
