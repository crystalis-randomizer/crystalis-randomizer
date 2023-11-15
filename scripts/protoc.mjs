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
dts = dts.replace(/^(\s*)(class|interface|enum|namespace)\b/mg, `$1export $2`);

// also build up a "FooPath" template string type for each message type
//  - don't bother recursing into repeated/dictionary keys
let pending = [];
let indent = '';
function emitPathTypes(obj) {
  for (const [name, child] of Object.entries(obj)) {
    if (child instanceof protobuf.Type) {
      emitPathTypesFor(child);
      pending.push(`${indent}export namespace ${child.name} {\n`);
      indent += '  ';
      if (child.nested) emitPathTypes(child.nested);
      indent = indent.substring(2);
      if (pending.length) {
        pending.pop();
      } else {
        dts += `${indent}}\n`;
      }
    }
  }
}
function emitPathTypesFor(type) {
  const terms = [];
  for (const f of type.fieldsArray) {
    terms.push(`'${f.name}'`);
    if (f.repeated || f.map) continue;
    f.resolve();
    if (!(f.resolvedType instanceof protobuf.Type)) continue;
    terms.push(`\`${f.name}.\${${qname(f.resolvedType)}Path}\``);
  }
  if (!terms.length) return;
  dts += pending.join('');
  pending = [];
  dts += `${indent}export type ${type.name}Path =\n    ${indent
            }${terms.join(`\n    ${indent}| `)};\n`;
}
function qname(type) {
  if (type.parent === root) return type.name;
  return `${qname(type.parent)}.${type.name}`;
}
emitPathTypes(root.nested, []);

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
const decompress = require('brotli/decompress');
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
