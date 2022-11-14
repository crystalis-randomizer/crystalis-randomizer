// @ts-ignore
import alloc from '../asm/alloc.s?br';
// @ts-ignore
import init from '../asm/init.s?br';
// @ts-ignore
import postparse from '../asm/postparse.s?br';
// @ts-ignore
import postshuffle from '../asm/postshuffle.s?br';
// @ts-ignore
import preshuffle from '../asm/preshuffle.s?br';
// @ts-ignore
import stattracker from '../asm/stattracker.s?br';

// @ts-ignore
import decompress from 'brotli/decompress';


// Simple reader that will use fetch to read files from the server.
// Static file content can be appended for compiled mode.

const files: Record<string, Uint8Array> =
    {alloc, init, postparse, postshuffle, preshuffle, stattracker};

export class BundleReader {
  constructor(readonly path: string = 'js/') {}
  async read(file: string) {
    const buffer = decompress(files[file.replace(/\.s$/, '')]);
    return new TextDecoder().decode(buffer);
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
