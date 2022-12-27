#!/usr/bin/env node

// Usage: brotli [-x] <input >output

const {compress, decompress} = require('brotli');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

const infile = argv._[0] || '/dev/stdin';
const outfile = argv.o || '/dev/stdout';
const cmd = argv.x ? decompress : compress;
fs.writeFileSync(outfile, cmd(fs.readFileSync(infile)), 'binary');
