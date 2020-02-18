import {Expr} from './expr';
import {Chunk, Module, Substitution, Symbol} from './module';
import {Patch} from './patch';

export function link(...files: Module[]): Patch {
  const linker = new Linker();
  for (const file of files) {
    linker.read(file);
  }
  return linker.link();
}

// TODO - link-time only function for getting either the original or the
//        patched byte.  Would allow e.g. copy($8000, $2000, "1e") to move
//        a bunch of code around without explicitly copy-pasting it in the
//        asm patch.

class LinkChunk {
  segments: readonly string[];
  org: number|undefined;
  data: Uint8Array;
  subs: Substitution[];
  asserts: Expr[];

  /** Global IDs of chunks needed to locate before we can complete this one. */
  deps = new Set<number>();
  /** Symbols that are imported into this chunk (these are also deps). */
  imports = new Set<string>();
  /** Symbols that are exported from this chunk. */
  exports = new Set<string>();

  constructor(chunk: Chunk<Uint8Array>,
              chunkOffset: number,
              symbolOffset: number) {
    this.segments = chunk.segments;
    this.org = chunk.org;
    this.data = chunk.data;
    this.subs = (chunk.subs || [])
        .map(s => translateSub(s, chunkOffset, symbolOffset));
    this.asserts = (chunk.asserts || [])
        .map(e => translateExpr(e, chunkOffset, symbolOffset));
  }
}

function translateSub(s: Substitution, dc: number, ds: number): Substitution {
  s = {...s};
  s.expr = translateExpr(s.expr, dc, ds);
  return s;
}
function translateExpr(e: Expr, dc: number, ds: number): Expr {
  e = {...e};
  if (e.args) e.args = e.args.map(a => translateExpr(a, dc, ds));
  if (e.chunk != null) e.chunk += dc;
  if (e.op === 'sym' && e.num != null) e.num += ds;
  return e;
}
function translateSymbol(s: Symbol, dc: number, ds: number): Symbol {
  s = {...s};
  if (s.expr) s.expr = translateExpr(s.expr, dc, ds);
  return s;
}

// This class is single-use.
class Linker {

  patch = new Patch();
  exports = new Map<string, unknown>();
  chunks: LinkChunk[] = [];
  symbols: Symbol[] = [];

  read(file: ObjectFile) {
    const dc = this.chunks.length;
    const ds = this.symbols.length;
    for (const chunk of file.chunks || []) {
      this.chunks.push(new LinkChunk(chunk, dc, ds));
    }
    for (const symbol of file.symbols || []) {
      this.symbols.push(translateSymbol(symbol, dc, ds));
    }
    // TODO - what the heck do we do with segments?
    //      - in particular, who is responsible for defining them???

    // Basic idea:
    //  1. get all the chunks
    //  2. build up a dependency graph
    //  3. write all fixed chunks, memoizing absolute offsets of
    //     missing subs (these are not eligible for coalescing).
    //     -- probably same treatment for freed sections
    //  4. for reloc chunks, find the biggest chunk with no deps.
  }

  link(): Patch {
    // TODO - add all the things

    return patch;
  }

}


export namespace Linker {
  export interface Options {
    

  }
}
