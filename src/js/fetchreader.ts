// Simple reader that will use fetch to read files from the server.
// Static file content can be appended for compiled mode.

export class FetchReader {
  constructor(readonly path: string = 'asm/') {}
  async read(file: string) {
    if (file in STATIC) return STATIC[file];
    const response = await fetch(this.path + file);
    return await response.text();
  }
}

// TODO - append all *.s files here, using template strings and
// escaping any ` and $ within.  The trick is that while it's nice
// to have separate *.s files for each feature, and pulling out
// shuffle passes into separate pairs of files (foo.ts, foo.s),
// we lose some helpful structure from the common *.s files.
const STATIC: {[filename: string]: string} = {};
