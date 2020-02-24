import {IntervalSet, SparseByteArray, binaryInsert} from './util';
import {Expr} from './expr';
import {Chunk, Module, Segment, Substitution, Symbol} from './module';
import {Token} from './token';

export class Linker {
  static link(...files: Module[]): SparseByteArray {
    const linker = new Linker();
    for (const file of files) {
      linker.read(file);
    }
    return linker.link();
  }

  private _link = new Link();

  read(file: Module): Linker {
    this._link.read(file);
    return this;
  }

  base(data: Uint8Array, offset = 0): Linker {
    this._link.base(data, offset);
    return this;
  }

  link(): SparseByteArray {
    return this._link.link();
  }
}

export namespace Linker {
  export interface Options {
    

  }
}

// TODO - link-time only function for getting either the original or the
//        patched byte.  Would allow e.g. copy($8000, $2000, "1e") to move
//        a bunch of code around without explicitly copy-pasting it in the
//        asm patch.

// Tracks an export.
// interface Export {
//   chunks: Set<number>;
//   symbol: number;
// }

function fail(msg: string): never {
  throw new Error(msg);
}

class LinkSegment {
  readonly name: string;
  readonly bank: number;
  readonly size: number;
  readonly offset: number;
  readonly memory: number;
  readonly addressing: number;

  constructor(segment: Segment) {
    const name = this.name = segment.name;
    this.bank = segment.bank ?? 0;
    this.addressing = segment.addressing ?? 2;
    this.size = segment.size ?? fail(`Size must be specified: ${name}`);
    this.offset = segment.offset ?? fail(`OFfset must be specified: ${name}`);
    this.memory = segment.memory ?? fail(`OFfset must be specified: ${name}`);
  }

  // offset = org + delta
  get delta(): number { return this.offset - this.memory; }
}

class LinkChunk {
  readonly size: number;
  segments: readonly string[];
  asserts: Expr[];

  subs = new Set<Substitution>();
  selfSubs = new Set<Substitution>();

  /** Global IDs of chunks needed to locate before we can complete this one. */
  deps = new Set<number>();
  /** Symbols that are imported into this chunk (these are also deps). */
  imports = new Set<string>();
  // /** Symbols that are exported from this chunk. */
  // exports = new Set<string>();

  follow = new Map<Substitution, LinkChunk>();

  /**
   * Whether the chunk is placed overlapping with something else.
   * Overlaps aren't written to the patch.
   */
  overlaps = false;

  private _data?: Uint8Array;

  private _org?: number;
  private _offset?: number;
  private _segment?: Segment;

  constructor(readonly linker: Link,
              readonly index: number,
              chunk: Chunk<Uint8Array>,
              chunkOffset: number,
              symbolOffset: number) {
    this.size = chunk.data.length;
    this.segments = chunk.segments;
    this._data = chunk.data;
    for (const sub of chunk.subs || []) {
      this.subs.add(translateSub(sub, chunkOffset, symbolOffset));
    }
    this.asserts = (chunk.asserts || [])
        .map(e => translateExpr(e, chunkOffset, symbolOffset));
    if (chunk.org) this._org = chunk.org;
  }

  get org() { return this._org; }
  get offset() { return this._offset; }
  get segment() { return this._segment; }
  get data() { return this._data ?? fail('no data'); }

  initialPlacement() {
    // Invariant: exactly one of (data) or (org, _offset, _segment) is present.
    // If (org, ...) filled in then we use linker.data instead.
    // We don't call this in the ctor because it depends on all the segments
    // being loaded, but it's the first thing we do in link().
    if (this._org == null) return;
    if (this.segments.length !== 1) {
      throw new Error(`Non-unique segment: ${this.segments}`);
    }
    const segment = this.linker.segments.get(this.segments[0]);
    if (!segment) throw new Error(`Unknown segment: ${this.segments[0]}`);
    this.place(this._org, segment);
  }

  place(org: number, segment: LinkSegment) {
    this._org = org;
    this._segment = segment;
    const offset = this._offset = org + segment.delta;
    // Copy data, leaving out any holes
    const full = this.linker.data;
    const data = this._data ?? fail(`No data`);
    this._data = undefined;

    if (this.subs.size) {
      full.splice(offset, data.length);
      const sparse = new SparseByteArray();
      sparse.set(0, data);
      for (const sub of this.subs) {
        sparse.splice(sub.offset, sub.size);
      }
      for (const [start, chunk] of sparse.chunks()) {
        full.set(offset + start, ...chunk);
      }
    } else {
      full.set(offset, data);
    }

    // Mark the follow-ons
    for (const [sub, chunk] of this.follow) {
      chunk.resolveSub(sub, false);
    }

    this.linker.free.delete(this.offset!, this.offset! + this.size);
  }

  resolveSubs(initial = false) { //: Map<number, Substitution[]> {
    // iterate over the subs, see what progress we can make?
    // result: list of dependent chunks.

    // NOTE: if we depend on ourself then we will return empty deps,
    //       and may be placed immediately, but will still have holes.
    //      - NO, it's responsibility of caller to check that
    for (const sub of this.selfSubs) {
      this.resolveSub(sub, initial);
    }

    // const deps = new Set();
    for (const sub of this.subs) {
      // const subDeps = 
      this.resolveSub(sub, initial);
      // if (!subDeps) continue;
      // for (const dep of subDeps) {
      //   let subs = deps.get(dep);
      //   if (!subs) deps.set(dep, subs = []);
      //   subs.push(sub);
      // }
    }
    // if (this.org != null) return new Set();
    // return deps;
  }

  // Returns a list of dependent chunks, or undefined if successful.
  resolveSub(sub: Substitution, initial: boolean) { //: Iterable<number>|undefined {


    // TODO - resolve(resolver) via chunkData to resolve banks!!


    // Do a full traverse of the expression - see what's blocking us.
    //   TODO - resolve bank here if possible, since nobody else is gonna do it.
    if (!this.subs.has(sub) && !this.selfSubs.has(sub)) return;
    sub.expr = Expr.traverse(sub.expr, (e) => {
      if (e.op === 'off') {
        const dep = this.linker.chunks[e.chunk!];
        if (dep.org != null) {
          return {op: 'num', num: dep.org + e.num!};
        } else {
          if (initial && e.chunk === this.index && this.subs.delete(sub)) {
            this.selfSubs.add(sub);
          }
          // if (e.chunk !== this.index) this.resolved = false;
          if (initial) {
            this.linker.chunks[e.chunk!].follow.set(sub, this);
            this.deps.add(e.chunk!);
          }
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
        const dep = this.linker.chunks[child.chunk!];
        if (dep.org) return {op: 'num', num: dep._segment!.bank};
      }
      // will traverse child but will only record info, can't resolve it
      return e;
    });

    // See if we can do it immediately.
    if (sub.expr.op === 'num') {
      this.writeValue(sub.offset, sub.expr.num!, sub.size);
      this.subs.delete(sub) || this.selfSubs.delete(sub);
      if (!this.subs.size) { // NEW: ignores self-subs now
      // if (!this.subs.size || (deps.size === 1 && deps.has(this.index)))  {
        // add to resolved queue - ready to be placed!
        // Question: should we place it right away?  We place the fixed chunks
        // immediately in the ctor, but there's no choice to defer.  For reloc
        // chunks, it's better to wait until we've resolved as much as possible
        // before placing anything.  Fortunately, placing a chunk will
        // automatically resolve all deps now!
        if (this.linker.unresolvedChunks.delete(this)) {
          this.linker.insertResolved(this);
        }
      }
    }
  }

  writeValue(offset: number, val: number, size: number) {
    // TODO - this is almost entirely copied from processor writeNumber
    const bits = (size) << 3;
    if (val != null && (val < (-1 << bits) || val >= (1 << bits))) {
      const name = ['byte', 'word', 'farword', 'dword'][size - 1];
      throw new Error(`Not a ${name}: $${val.toString(16)}`);
    }
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      bytes[i] = val & 0xff;
      val >>= 8;
    }
    if (this._data) {
      this._data.subarray(offset, offset + size).set(bytes);
    } else if (this._offset != null) {
      this.linker.data.set(this._offset + offset, bytes);
    } else {
      throw new Error(`Impossible`);
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
class Link {
  data = new SparseByteArray();
  // Maps symbol to symbol # // [symbol #, dependent chunks]
  exports = new Map<string, number>(); // readonly [number, Set<number>]>();
  chunks: LinkChunk[] = [];
  symbols: Symbol[] = [];
  free = new IntervalSet();
  segments = new Map<string, LinkSegment>();

  resolvedChunks: LinkChunk[] = [];
  unresolvedChunks = new Set<LinkChunk>();

  // TODO - deferred - store some sort of dependency graph?

  insertResolved(chunk: LinkChunk) {
    binaryInsert(this.resolvedChunks, c => c.size, chunk);
  }

  base(data: Uint8Array, offset = 0) {
    this.data.set(offset, data);
  }

  read(file: Module) {
    const dc = this.chunks.length;
    const ds = this.symbols.length;
    // segments come first, since LinkChunk constructor needs them
    for (const segment of file.segments || []) {
      this.addSegment(segment);
    }
    for (const chunk of file.chunks || []) {
      const lc = new LinkChunk(this, this.chunks.length, chunk, dc, ds);
      this.chunks.push(lc);
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

  // resolveChunk(chunk: LinkChunk) {
  //   //if (chunk.resolving) return; // break any cycles
    
  // }

  // NOTE: so far this is only used for asserts?
  // It basically copy-pastes from resolveSubs... :-(
  resolveExpr(expr: Expr): number {
    expr = Expr.traverse(expr, (e) => {
      if (e.op === 'off') {
        const c = this.chunks[e.chunk!];
        if (c.org != null) return {op: 'num', num: c.org + e.num!};
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
        const c = this.chunks[child.chunk!];
        if (c.org) return {op: 'num', num: c.segment!.bank};
      }
      // will traverse child but will only record info, can't resolve it
      return e;
    });

    if (expr.op === 'num') return expr.num!;
    const at = Token.at(expr);
    throw new Error(`Unable to fully resolve expr${at}`);
  }

  link(): SparseByteArray {
    // Set up all the initial placements.
    for (const chunk of this.chunks) {
      chunk.initialPlacement();
    }
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
    // Resolve all the imports in all symbol and chunk.subs exprs.
    for (const symbol of this.symbols) {
      symbol.expr = this.resolveSymbols(symbol.expr!);
    }
    for (const chunk of this.chunks) {
      for (const sub of [...chunk.subs, ...chunk.selfSubs]) {
        sub.expr = this.resolveSymbols(sub.expr);
      }
      for (let i = 0; i < chunk.asserts.length; i++) {
        chunk.asserts[i] = this.resolveSymbols(chunk.asserts[i]);
      }
    }
    // At this point, we don't care about this.symbols at all anymore.
    // Now figure out the full dependency tree: chunk #X requires chunk #Y
    for (const c of this.chunks) {
      c.resolveSubs(true);
    }

    // TODO - fill (un)resolvedChunks
    //   - gets 

    const chunks = [...this.chunks];
    chunks.sort((a, b) => b.size - a.size);

    for (const chunk of chunks) {
      chunk.resolveSubs();
      if (chunk.subs.size) {
        this.unresolvedChunks.add(chunk);
      } else {
        this.insertResolved(chunk);
      }
    }

    while (this.resolvedChunks.length || this.unresolvedChunks.size) {
      const c = this.resolvedChunks.pop();
      if (c) {
        this.placeChunk(c);
      } else {
        // resolve all the first unresolved chunks' deps
        const [first] = this.unresolvedChunks;
        for (const dep of first.deps) {
          const chunk = this.chunks[dep];
          if (chunk.org == null) this.placeChunk(chunk);
        }
      }
    }

    // if (!chunk.org && !chunk.subs.length) this.placeChunk(chunk);

    // At this point the dep graph is built - now traverse it.

    // const place = (i: number) => {
    //   const chunk = this.chunks[i];
    //   if (chunk.org != null) return;
    //   // resolve first
    //   const remaining: Substitution[] = [];
    //   for (const sub of chunk.subs) {
    //     if (this.resolveSub(chunk, sub)) remaining.push(sub);
    //   }
    //   chunk.subs = remaining;
    //   // now place the chunk
    //   this.placeChunk(chunk); // TODO ...
    //   // update the graph; don't bother deleting form blocked.
    //   for (const revDep of revDeps[i]) {
    //     const fwd = fwdDeps[revDep];
    //     fwd.delete(i);
    //     if (!fwd.size) insert(unblocked, revDep);
    //   }
    // }
    // while (unblocked.length || blocked.length) {
    //   let next = unblocked.shift();
    //   if (next) {
    //     place(next);
    //     continue;
    //   }
    //   next = blocked[0];
    //   for (const rev of revDeps[next]) {
    //     if (this.chunks[rev].org != null) { // already placed
    //       blocked.shift();
    //       continue;
    //     }
    //     place(rev);
    //   }
    // }
    // At this point, everything should be placed, so do one last resolve.

    const patch = new SparseByteArray();
    for (const c of this.chunks) {
      for (const a of c.asserts) {
        const v = this.resolveExpr(a);
        if (v) continue;
        const at = Token.at(a);
        throw new Error(`Assertion failed${at}`);
      }
      if (c.overlaps) continue;
      patch.set(c.offset!, ...this.data.slice(c.offset!, c.offset! + c.size!));
    }
    return patch;
  }

  placeChunk(chunk: LinkChunk) {
    if (chunk.org) return; // don't re-place.
    const size = chunk.size;
    if (!chunk.subs.size && !chunk.selfSubs.size) {
      // chunk is resolved: search for an existing copy of it first
      const pattern = this.data.pattern(chunk.data);
      for (const name of chunk.segments) {
        const segment = this.segments.get(name)!;
        const start = segment.offset!;
        const end = start + segment.size!;
        const index = pattern.search(start, end);
        if (index < 0) continue;
        chunk.place(index, segment);
        chunk.overlaps = true;
        return;
      }
    }
    // either unresolved, or didn't find a match; just allocate space.
    for (const name of chunk.segments) {
      const segment = this.segments.get(name)!;
      const s0 = segment.offset!;
      const s1 = s0 + segment.size!;
      for (const [f0, f1] of this.free.tail(s0)) {
        if (f1 > s1) break;
        if (f1 - f0 >= size) {
          // found a region
          chunk.place(f0 - segment.delta, segment);
          this.free.delete(f0, f0 + size);
          // TODO - factor out the subs-aware copy method!
          return;
        }
      }
    }
    throw new Error(`Could not find space for chunk`);
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

  // resolveBankBytes(expr: Expr): Expr {
  //   return Expr.traverse(expr, (e: Expr) => {
  //     if (e.op !== '^' || e.args?.length !== 1) return e;
  //     const child = e.args[0];
  //     if (child.op !== 'off') return e;
  //     const chunk = this.chunks[child.num!];
  //     const banks = new Set<number>();
  //     for (const s of chunk.segments) {
  //       const segment = this.segments.get(s);
  //       if (segment?.bank != null) banks.add(segment.bank);
  //     }
  //     if (banks.size !== 1) return e;
  //     const [b] = banks;
  //     return {op: 'num', size: 1, num: b};
  //   });
  // }

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
    // Save out 'free' first, don't merge it.
    const free = segment.free;
    // Merge with any existing segment.
    const prev = this.segments.get(segment.name);
    if (prev) segment = Segment.merge(prev, segment);
    const s = new LinkSegment(segment);
    this.segments.set(segment.name, s);
    // Add the free space
    for (const [start, end] of free || []) {
      this.free.add(start + s.delta, end + s.delta);
      this.data.splice(start + s.delta, end - start);
    }
  }

}
