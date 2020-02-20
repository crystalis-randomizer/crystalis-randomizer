import { BitSet, IntervalSet, binaryInsert} from './util';
import {Expr} from './expr';
import {Chunk, Module, Segment, Substitution, Symbol} from './module';
import {Patch} from './patch';
import {Token} from './token';

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

// Tracks an export.
interface Export {
  chunks: Set<number>;
  symbol: number;
}

class LinkChunk {
  segments: readonly string[];
  /** Note: will be filled in once placed. */
  org: number|undefined;
  data: Uint8Array;
  subs: Substitution[];
  asserts: Expr[];

  /** Global IDs of chunks needed to locate before we can complete this one. */
  deps = new Set<number>();
  /** Symbols that are imported into this chunk (these are also deps). */
  imports = new Set<string>();
  // /** Symbols that are exported from this chunk. */
  // exports = new Set<string>();

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

  write(offset: number, val: number, size: number) {
    // TODO - this is almost entirely copied from processor writeNumber
    const s = (size) << 3;
    if (val != null && (val < (-1 << s) || val >= (1 << s))) {
      const name = ['byte', 'word', 'farword', 'dword'][size - 1];
      throw new Error(`Not a ${name}: $${val.toString(16)}`);
    }
    for (let i = 0; i < size; i++) {
      this.data[offset + i] = val & 0xff;
      val >>= 8;
    }
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
  // Maps symbol to symbol # // [symbol #, dependent chunks]
  exports = new Map<string, number>(); // readonly [number, Set<number>]>();
  chunks: LinkChunk[] = [];
  symbols: Symbol[] = [];
  unresolved = new BitSet();
  free = new IntervalSet();
  segments = new Map<string, Segment>();

  // TODO - deferred - store some sort of dependency graph?

  read(file: Module) {
    const dc = this.chunks.length;
    const ds = this.symbols.length;
    for (const chunk of file.chunks || []) {
      this.chunks.push(new LinkChunk(chunk, dc, ds));
      if (chunk.org != null) {
        for (let i = 0; i < chunk.data.length; i++) {

          // TODO - need to get chunk's OFFSET, not .org
          //   - REQUIRE .org chunks to have a single segment?
          throw new Error(`need to get chunk offset`);
          this.unresolved.add(chunk.org + i);
        }
      }
    }
    for (const symbol of file.symbols || []) {
      this.symbols.push(translateSymbol(symbol, dc, ds));
    }
    for (const segment of file.segments || []) {
      this.addSegment(segment);
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

  resolveChunk(chunk: LinkChunk) {
    //if (chunk.resolving) return; // break any cycles
    
  }

  resolveExpr(expr: Expr) {
    // 
  }

  link(): Patch {
    // Find all the exports.
    for (let i = 0; i < this.symbols.length; i++) {
      const symbol = this.symbols[i];
      // TODO - we'd really like to identify this earlier if at all possible!
      if (!symbol.expr) throw new Error(`Symbol ${i} never resolved`);
      // look for imports/exports
      if (symbol.export != null) {
        this.exports.set(symbol.export, i);
      }
    }
    // Resolve all the imports.
    for (const symbol of this.symbols) {
      symbol.expr = this.resolveSymbols(symbol.expr!);
    }
    for (const chunk of this.chunks) {
      for (let i = 0; i < chunk.subs.length; i++) {
        const sub = chunk.subs[i];
        sub.expr = this.resolveSymbols(sub.expr);
      }
      for (let i = 0; i < chunk.asserts.length; i++) {
        chunk.asserts[i] = this.resolveSymbols(chunk.asserts[i]);
      }
    }
    // At this point, we don't care about this.symbols at all anymore.
    // Now figure out the full dependency tree: chunk #X requires chunk #Y
    const fwdDeps = this.chunks.map(() => new Set<number>());
    const revDeps = this.chunks.map(() => new Set<number>());
    const unblocked: number[] = []; // ordered by chunk size decreasing
    const blocked: number[] = []; // ordered by chunk size decreasing
    let index = 0;
    for (const chunk of this.chunks) {
      if (chunk.org != null) continue;
      const remaining: Substitution[] = [];
      for (const sub of chunk.subs) {
        const deps = this.resolveSub(chunk, sub);
        if (!deps) continue;
        remaining.push(sub);
        for (const dep of deps) {
          fwdDeps[index].add(dep);
          revDeps[dep].add(index);
        }
      }
      chunk.subs = remaining;
      insert(
          !remaining.length || fwdDeps[index].has(index) ? unblocked : blocked,
          index);
    }

    // At this point the dep graph is built - now traverse it.
    const insert = (arr: number[], x: number) => {
      binaryInsert(arr, c => -this.chunks[c].data.length, x);
    }
    const place = (i: number) => {
      const chunk = this.chunks[i];
      if (chunk.org != null) return;
      // resolve first
      const remaining: Substitution[] = [];
      for (const sub of chunk.subs) {
        if (this.resolveSub(chunk, sub)) remaining.push(sub);
      }
      chunk.subs = remaining;
      // now place the chunk
      this.placeChunk(chunk); // TODO ...
      // update the graph; don't bother deleting form blocked.
      for (const revDep of revDeps[i]) {
        const fwd = fwdDeps[revDep];
        fwd.delete(i);
        if (!fwd.size) insert(unblocked, revDep);
      }
    }
    while (unblocked.length || blocked.length) {
      let next = unblocked.shift();
      if (next) {
        place(next);
        continue;
      }
      next = blocked[0];
      for (const rev of revDeps[next]) {
        if (this.chunks[rev].org != null) { // already placed
          blocked.shift();
          continue;
        }
        place(rev);
      }
    }
    // At this point, everything should be placed, so do one last resolve.
  }

  placeChunk(chunk: LinkChunk) {
    const size = chunk.data.length;
    if (!chunk.subs.length) {
      // chunk is resolved: search for an existing copy of it first
      for (const name of chunk.segments) {
        const segment = this.segments.get(name)!;
        const end = segment.offset! + segment.size!;
        for (let i = segment.offset!; i < end - size ; i++) {
          // TODO - consider a Boyer-Moore algorithm for more efficiency
          let match = true;
          for (let j = 0; j < size; j++) {
            if (chunk.data[j] !== this.getByte(i + j)) {
              match = false;
              break;
            }
          }
          if (match) {
            chunk.segments = [name];
            chunk.org = i - segment.memory! + segment.offset!;
            return;
          }
        }
      }
    }
    // either unresolved, or didn't find a match; just allocate space.
    for (const name of chunk.segments) {
      const segment = this.segments.get(name)!;
      const s0 = segment.offset!;
      const s1 = s0 + segment.size!;
      for (const [f0, f1] of this.free.tail(segment.offset!)) {
        if (f1 > s1) break;
        if (f1 - f0 >= size) {
          // found a region
          chunk.segments = [name];
          chunk.org = f1 - segment.memory! + segment.offset!;
          this.free.delete(f0, f0 + size);
          return;
        }
      }
    }
    throw new Error(`Could not find space for chunk`);
  }

  getByte(i: number): number|undefined {
    if (this.unresolved.has(i)) return undefined;
    // TODO - allow matching original contents, too?

    // TODO - change unresolved, instead rangemap to chunk?
    throw new Error('');
  }

  // Returns a list of dependent chunks, or undefined if successful.
  resolveSub(chunk: LinkChunk, sub: Substitution): Iterable<number>|undefined {
    // Do a full traverse of the expression - see what's blocking us.
    //   TODO - resolve bank here if possible, since nobody else is gonna do it.
    const deps = new Set<number>();
    sub.expr = Expr.traverse(sub.expr, (e) => {
      if (e.op === 'off') {
        const dep = this.chunks[e.chunk!];
        if (dep.org != null && dep.segments.length === 1) {
          return {op: 'num', num: dep.org + e.num!};
        } else {
          deps.add(e.chunk!);
        }
      }
      return e;
    }, (e) => { // pre-traverse to resolve banks
      if (e.op === '^' && e.args?.length === 1) {
        // TODO - resolve bank bytes here, before we turn it into a number...
        const child = e.args[0];
        if (child.op !== 'off') {
          const at = Token.at(child);
          throw new Error(`Cannot get bank of non-offset: ${child.op}${at}`);
        }
        const dep = this.chunks[child.chunk!];
        if (dep.segments.length === 1) {
          const name = dep.segments[0];
          const segment = this.segments.get(name);
          if (!segment) throw new Error(`Unknown segment: ${name}`);
          if (segment.bank == null) {
            throw new Error(`Segment has no bank data: ${name}`);
          }
          return {op: 'num', num: segment.bank};
        }
      }
      return e;
    });

    // See if we can do it immediately.
    if (sub.expr.op === 'num') {
      chunk.write(sub.offset, sub.expr.num!, sub.size);
      return undefined;
    }

    if (!deps.size) throw new Error(`No deps, but not resolved: ${sub.expr}`);
    return deps;
  }

  resolveSymbols(expr: Expr): Expr {
    // pre-traverse so that transitive imports work
    return Expr.traverse(expr, e => e, (e: Expr) => {
      while (e.op === 'import' || e.op === 'sym') {
        if (e.op === 'import') {
          const name = e.sym!;
          const imported = this.exports.get(name);
          if (imported == null) {
            const at = Token.at(expr);
            throw new Error(`Symbol never exported ${name}${at}`);
          }
          e = this.symbols[imported].expr!;
        } else {
          if (e.num == null) throw new Error(`Symbol not global`);
          e = this.symbols[e.num].expr!;
        }
      }
      return e;
    });
  }

  resolveBankBytes(expr: Expr): Expr {
    return Expr.traverse(expr, (e: Expr) => {
      if (e.op !== '^' || e.args?.length !== 1) return e;
      const child = e.args[0];
      if (child.op !== 'off') return e;
      const chunk = this.chunks[child.num!];
      const banks = new Set<number>();
      for (const s of chunk.segments) {
        const segment = this.segments.get(s);
        if (segment?.bank != null) banks.add(segment.bank);
      }
      if (banks.size !== 1) return e;
      const [b] = banks;
      return {op: 'num', size: 1, num: b};
    });
  }

  //     if (expr.op === 'import') {
  //       if (!expr.sym) throw new Error(`Import with no symbol.`);
  //       const sym = this.symbols[this.exports.get(expr.sym)];
  //       return this.resolveImports(sym.expr);
  //     }
  //     // TODO - this is nonsense...
  //     const args = [];
  //     let mut = false;
  //     for (let i = 0; i < expr.args; i++) {
  //       const child = expr.args[i];
  //       const resolved = this.resolveImports(child);
  //       args.push(resolved);
  //       if (child !== resolved) expr.args[i] = resolved;
  //       return 
  //     }
  //   }
  //   // TODO - add all the things
  //   return patch;
  // }

  addSegment(segment: Segment) {
    // Add the free space
    for (const [start, end] of segment.free || []) {
      this.free.add(start, end);
      for (let i = start; i < end; i++) {
        this.unresolved.add(i);
      }
    }
    // First merge with any existing segment.
    const prev = this.segments.get(segment.name);
    if (prev) segment = Segment.merge(prev, segment);
    this.segments.set(segment.name, segment);
  }

}


export namespace Linker {
  export interface Options {
    

  }
}
