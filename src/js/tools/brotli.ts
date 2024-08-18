#!/usr/bin/env node

// Usage: brotli [-x] <input >output

import { compress, decompress } from 'brotli';
import * as fs from 'node:fs';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));

const infile = argv._[0] || '/dev/stdin';
const outfile = argv.o || '/dev/stdout';
const cmd = argv.x ? decompress : compress;
fs.writeFileSync(outfile, cmd(fs.readFileSync(infile)), 'binary');
