#!/usr/bin/env node

// NOTE: The generated JS file is stupid because it lacks some reflection
// data, for some reason.  It's larger than just brotli-encoding the whole
// proto source, so instead we'll just embed that and parse it live.  We
// could rely on esbuild for this, but that makes it harder to use for
// interactive debugging in Node, and we need a build step anyway to
// generate the typings, so we might as well just do it all here.

import * as fs from 'node:fs';
import {execFile} from 'node:child_process';
import * as tmp from 'tmp';
import protobuf from 'protobufjs';
//import { compress } from '../src/js/compress.js';
import { compress } from 'brotli';

// Usage: node build.js [-d outdir] foo.proto

const protos = [];
let outdir = '.';
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '-d') {
    outdir = process.argv[++i];
  } else if (arg.startsWith('-d')) {
    outdir = arg.substring(2);
  } else {
    protos.push(arg);
  }
}

function run(bin, ...args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, undefined, (err, out) => {
      if (err) {
        reject(err);
      } else {
        resolve(out);
      }
    });
  });
}

//const jsonFile = tmp.tmpNameSync();
const jsFile = tmp.tmpNameSync({postfix: 'static.js'});
const tsFile = tmp.tmpNameSync();

const root = await protobuf.load(protos);
await run('npx', 'pbjs', '-t', 'static', '-o', jsFile, ...protos);
await run('npx', 'pbts', '-o', tsFile, jsFile);

let json = JSON.parse(JSON.stringify(root)); //String(fs.readFileSync(jsonFile)));
let dts = String(fs.readFileSync(tsFile));

// we've got strings now - time to mangle them

dts = dts.replace(/^import Long\s*=.*$/mi, '');
dts = dts.replace(/implements I.*{\n/g,`$&
public static ctor: {new(): IConfig};
public static readonly \$type: \$protobuf.Type;
public readonly \$type: \$protobuf.Type;
`);

// let js = `import protobuf from 'protobufjs';
// import {decompress} from '../../src/js/compress.js';
// export const root = new protobuf.Root();
// async function add(b64) {
//   const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
//   const src = new TextDecoder().decode(await decompress(data));
//   protobuf.parse(src, root);
// }
// `;
// for (const f of protos) {
//   const proto = Buffer.from(await compress(fs.readFileSync(f)));
//   js += `await add('${proto.toString('base64')}');\n`;
// }
// for (const key of Object.keys(json.nested)) {
//   js = js + `exports const ${key} = root.${key};\n`;
// }

let js = `const protobuf = require('protobufjs');
const {decompress} = require('brotli');
const root = new protobuf.Root();
exports.root = root;
function add(b64) {
  const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const src = new TextDecoder().decode(decompress(data));
  protobuf.parse(src, root);
}
`;
for (const f of protos) {
  const proto = Buffer.from(await compress(fs.readFileSync(f)));
  js += `add('${proto.toString('base64')}');\n`;
}
for (const key of Object.keys(json.nested)) {
  js = js + `exports.${key} = root.${key};\n`;
}

// let js = `import protobuf from 'protobufjs';
// import {decompress} from 'brotli';
// export const root = new protobuf.Root();
// function add(b64) {
//   const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
//   const src = new TextDecoder().decode(decompress(data));
//   protobuf.parse(src, root);
// }
// `;
// for (const f of protos) {
//   const proto = Buffer.from(await compress(fs.readFileSync(f)));
//   js += `add('${proto.toString('base64')}');\n`;
// }
// for (const key of Object.keys(json.nested)) {
//   js = js + `export const ${key} = root.${key};\n`;
// }

const base = protos[0].replace(/\.proto$/, '_proto');

fs.writeFileSync(`${outdir}/${base}.js`, js);
fs.writeFileSync(`${outdir}/${base}.d.ts`, dts);

//fs.unlinkSync(jsonFile);
fs.unlinkSync(jsFile);
fs.unlinkSync(tsFile);
