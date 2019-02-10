require = require('esm')(module);

const {crc32} = require('./crc32.js');
const fs = require('fs');

const data = new Uint8Array(fs.readFileSync(process.argv[2]).buffer);
console.log(crc32(data).toString(16).padStart(8,0));

