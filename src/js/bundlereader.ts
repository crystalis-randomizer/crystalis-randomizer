// @ts-ignore
import data from '../../target/build/asm.tar.br';
// @ts-ignore
import decompress from 'brotli/decompress';
import {untar} from './untar';


// Simple reader that will use fetch to read files from the server.
// Static file content can be appended for compiled mode.

const files = (() => {
  let fn = () => {
    const decoder = new TextDecoder();
    const allFiles: Record<string, string> = {};
    for (const {filename, contents} of untar(decompress(data))) {
      allFiles[filename] = decoder.decode(contents);
    }
    fn = () => allFiles;
    return allFiles;
  };
  return fn;
})();

export class BundleReader {
  constructor(_path: string) {}
  async read(file: string) {
    return files()[file];
  }
}

//PROD:// @ts-ignore
//PROD:import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';

// // Simple reader that will use fetch to read files from the server.
// // Static file content can be appended for compiled mode.

// const files: Record<string, Uint8Array> =
//     {alloc, init, postparse, postshuffle, preshuffle, stattracker};

// export class BundleReader {
//   constructor(readonly path: string = 'js/') {}
//   async read(file: string) {
//     return files[file.replace(/\.s$/, '')];
//   }
// }



// // Simple reader that will use fetch to read files from the server.
// // Static file content can be appended for compiled mode.

// const files: Record<string, Uint8Array> =
//     {alloc, init, postparse, postshuffle, preshuffle, stattracker};

// export class BundleReader {
//   constructor(readonly path: string = 'js/') {}
//   async read(file: string) {
//     const r = new ZipReader(new BlobReader(new Blob([files[file.replace(/\.s$/, '')]])));
//     const e = (await r.getEntries()).shift();
//     const w = new TextWriter();
//     return await e.getData(w);
//     //return files[file.replace(/\.s$/, '')];
//   }
// }
