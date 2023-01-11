// Smudger.  Supports transforming files by adding/removing actual ROM data.
// The basic idea is that a source file has a cleaned form and a smudged form.
// Cleaning removes actual ROM data and replaces it with address references.
// Smudging reads the original ROM and replaces references with actual code
// and data.
//
// Comments are preserved, and some special comments are understood to direct
// the cleaner where to look to find references.

import { Cpu } from './cpu';
import { binarySearch } from './util';

export function smudge(contents: string, cpu: Cpu, prg: Uint8Array): string {
  return new Smudger(cpu, prg).smudge(contents);
}
export function clean(contents: string, cpu: Cpu, prg: Uint8Array): string {
  return new Cleaner(cpu, prg).clean(contents);
}

// Smudging is pretty easy: we don't need to be clever about which bytes in the
// rom to use for obfuscating.  We just deobfuscate based on whatever we see.
// The biggest challenge is how to handle relative jumps.  Generally the right
// thing to do would be to preserve the jump target like an emacs marker:
// inserting or deleting in between doesn't change where we land.  But this is
// not really sound and we're probably better off just making sure everything
// is actually labeled before we touch it.  We can clean up the labels later.
// If we find a relative jump without an argument, we replace it with a `*+`
// expression.

class PcStack {
  stack: number[][] = [[0]];

  pc(): number {
    const top = this.stack[this.stack.length - 1];
    return top[top.length - 1];
  }
  push() {
    this.stack.push([this.pc()]);
  }
  pop() {
    if (this.stack.length < 2) return;
    this.stack.pop();
  }
  merge() {
    if (this.stack.length < 2) return;
    const top = this.stack.pop();
    if (!top) return;
    this.set(Math.min(...top));
  }
  alt() {
    if (this.stack.length < 2) return;
    const prev = this.stack[this.stack.length - 2];
    this.stack[this.stack.length - 1].push(prev[prev.length - 1]);
  }
  set(a: number) {
    const top = this.stack[this.stack.length - 1];
    top[top.length - 1] = a;
  }
  advance(delta: number) {
    const top = this.stack[this.stack.length - 1];
    top[top.length - 1] += delta;
  }
}


function* lines(str: string): Iterable<string> {
  let i = 0;
  while (i < str.length) {
    const next = (str.indexOf('\n', i) + 1) || str.length;
    yield str.substring(i, next);
    i = next;
  }
}

class Smudger {
  constructor(private readonly cpu: Cpu, private readonly prg: Uint8Array) {}

  smudge(contents: string): string {
    let output = '';
    for (const line of lines(contents)) {
      output += this.smudgeLine(line);
    }
    return output;
  }

  private smudgeLine(line: string): string {
    // TODO - consider allowing multiple spaces to signify more space between
    // opcode and argument, along with a format indicator for hex/dec/binary?
    const match = /^([^;]*?)<@([0-9a-f]+)(?: (.*?))?@>(.*\n?)$/i.exec(line);
    if (match) {
      // code - don't allow a second match on the same line
      const [, prefix, addrStr, argStr, suffix] = match;
      const addr = parseInt(addrStr, 16)
      const op = smudgeOp(this.cpu, this.prg, addr, argStr);
      return prefix + op + suffix;
    }
    // look for data reads
    let smudged = '';
    for (;;) {
      const match = /^([^;]*?)\[@([0-9a-f]+)(:[0-9]+|:[wdb])?@\](.*\n?)/i.exec(line);
      if (!match) {
        smudged += line;
        break;
      }
      const [, prefix, addrStr, modifier, suffix] = match;
      line = suffix;
      smudged += prefix;
      const addr = parseInt(addrStr, 16);
      smudged += smudgeData(this.prg, addr, modifier);
    }
    return smudged;
  }
}

function smudgeOp(cpu: Cpu, prg: Uint8Array, addr: number, argStr?: string): string {
  let arg: string|number|undefined = argStr;
  const [mnemonic, mode] = cpu.disasm(prg[addr]) || ['brk', 'imp'];
  const argLen = cpu.argLen(mode);
  if (!arg) {
    if (argLen > 0) arg = prg[addr + 1];
    if (argLen > 1) arg = (arg as number) | (prg[addr + 2] << 8);
  }
  return mnemonic + (argLen ? ' ' + cpu.format(mode, arg!) : '');
}

function smudgeData(prg: Uint8Array, addr: number, mod: string): string {
  let value = prg[addr];
  if (mod === ':w') {
    value |= (prg[addr + 1] << 8);
    return `($${toHex(value, 4)})`;
  } else if (/:\d+/.test(mod)) {
    const chars = parseInt(mod.substring(1));
    let result = '"';
    for (let i = 0; i < chars; i++) {
      let chr = String.fromCharCode(prg[addr + i]);
      if ('"\\'.includes(chr)) chr = '\\' + chr;
      result += chr;
    }
    result += '"';
    return result;
  } else if (mod === ':d') {
    return String(value);
  } else if (mod === ':b') {
    return `%${value.toString(2).padStart(8, '0')}`;
  } else {
    return `$${toHex(value, 2)}`;
  }
}

abstract class CleanChunk {
  constructor(readonly plain: string) {}
  fix(_pc: PcStack, _index: Index, _prg: Uint8Array) {}
  format(_prg: Uint8Array, _cpu: Cpu): string {
    return this.plain;
  }
}

class CleanPc extends CleanChunk {
  constructor(readonly fix: (pc: PcStack) => void) { super(''); }
  static set(address: number) {
    return new CleanPc(pc => pc.set(address));
  }
  static push = new CleanPc(pc => pc.push());
  static alt = new CleanPc(pc => pc.alt());
  static pop = new CleanPc(pc => pc.pop());
  static merge = new CleanPc(pc => pc.merge());
}

class CleanStr extends CleanChunk {}

class CleanSequence extends CleanChunk {
  address = 0;
  constructor(plain: string, readonly bytes: number[]) { super(plain); }

  fix(pc: PcStack, index: Index, prg: Uint8Array) {
    // Look for the sequence
    const maxIndex = INDEX_SIZE >>> 1;
    const addrs = index.get(toHexString(this.bytes.slice(0, maxIndex))) || [];
    if (!addrs.length) return;
    // Find the next match (at or) after pc
    let i = binarySearch(addrs.length, (i) => pc.pc() - addrs[i]);
    if (i < 0) i = ~i;
    if (i >= addrs.length) i = 0;
    // Handle long strings
    if (this.bytes.length > maxIndex) {
      let j = addrs.length;
      while (j--) {
        const prgSlice =
          prg.subarray(addrs[i] + maxIndex, addrs[i] + this.bytes.length);
        if (sameArray(this.bytes.slice(maxIndex), prgSlice)) break;
        i = (i + 1) % addrs.length;
      }
      // No match found, so just return.
      if (j < 0) return;
    }
    // Update address if appropriate.
    pc.set((this.address = addrs[i]) + this.bytes.length);
  }
}

class CleanOpSimple extends CleanSequence {
  format(prg: Uint8Array, cpu: Cpu): string {
    // check if the address works, use it if so?
    if (this.plain === smudgeOp(cpu, prg, this.address, '')) {
      return `<@${this.address.toString(16)}@>`;
    }
    // no match: don't obfuscate.
    return this.plain;
  }
}

class CleanOpPartial extends CleanChunk {
  address = 0;

  constructor(plain: string, readonly options: number[], readonly arg: string) {
    super(plain);
  }

  fix(pc: PcStack, index: Index) {
    const optAddrs = [];
    for (const o of this.options) {
      const addrs = index.get(toHex(o)) || [];
      if (!addrs) return;
      let i = binarySearch(addrs.length, (i) => pc.pc() - addrs[i]);
      if (i < 0) i = ~i;
      if (i < addrs.length) optAddrs.push(addrs[i]);
    }
    if (!optAddrs.length) return;
    pc.set((this.address = Math.min(...optAddrs)) + 1);
  }

  format(prg: Uint8Array, cpu: Cpu): string {
    // check if the address works, use it if so?
    if (this.plain === smudgeOp(cpu, prg, this.address, this.arg)) {
      return `<@${this.address.toString(16)} ${this.arg}@>`;
    }
    // no match: don't obfuscate.
    return this.plain;
  }
}

class CleanData extends CleanSequence {
  constructor(plain: string, bytes: number[], readonly mod: string) {
    super(plain, bytes);
  }

  format(prg: Uint8Array): string {
    // check if the address works, use it if so?
    if (this.plain === smudgeData(prg, this.address, this.mod)) {
      return `[@${this.address.toString(16)}${this.mod}@]`;
    }
    // no match: don't obfuscate.
    return this.plain;
  }
}

// Maps from hex string to sorted list of addresses, up to 16 bytes long
const INDEX_SIZE = 6;
type Index = ReadonlyMap<string, ReadonlyArray<number>>;
class Cleaner {
  private on = true;
  private readonly index: Index;
  private chunks: CleanChunk[] = [];

  constructor(private readonly cpu: Cpu, private readonly prg: Uint8Array) {
    const index = new Map<string, number[]>();
    let buffer = '';
    for (let i = 0; i < prg.length; i++) {
      const val = prg[i];
      buffer = buffer + toHex(val);
      if (buffer.length > INDEX_SIZE) {
        buffer = buffer.substring(buffer.length - INDEX_SIZE);
      }
      for (let j = 0; j < buffer.length; j += 2) {
        const key = buffer.substring(j);
        let array = index.get(key);
        if (!array) index.set(key, array = []);
        array.push(i + 1 - (buffer.length - j) / 2);
      }
    }
    this.index = index;
  }

  private push(chunk: CleanChunk): void {
    this.chunks.push(chunk);
  }
  private pushStr(str: string): void {
    this.push(new CleanStr(str));
  }

  clean(contents: string): string {
    for (const line of lines(contents)) {
      this.readLine(line);
    }

    // Now fix up all the addresses...
    let pc = new PcStack();
    for (const chunk of this.chunks) {
      chunk.fix(pc, this.index, this.prg);
    }

    // Format and concatenate
    return this.chunks.map(c => c.format(this.prg, this.cpu)).join('');
  }

  private readLine(line: string): void {
    // Handle "smudge off" and "smudge on" comments.
    if (/smudge off/.test(line)) this.on = false;
    if (/smudge (on|from)/.test(line)) this.on = true;
    if (!this.on) {
      this.pushStr(line);
      return;
    }

    let match;

    // Look for a `; from .*` comment
    if ((match = /(?:;|smudge)\s*from\s+\$?([0-9a-f]{1,6})\b/i.exec(line))) {
      // don't delete anything, but set the PC.
      this.push(CleanPc.set(parseInt(match[1], 16)));
    }
    if (/^\s+\.if/.test(line)) this.push(CleanPc.push);
    if (/^\s+\.else/.test(line)) this.push(CleanPc.alt);
    if (/^\s+\.endif/.test(line)) this.push(CleanPc.merge);
    if (/@\(@/.test(line)) this.push(CleanPc.push);
    if (/@\)@/.test(line)) this.push(CleanPc.pop);

    // Look for a label at the front
    // TODO - consider removing the [$ ] and the repeat from this when it's no longer needed for disasm
    if ((match = /^(?:\s*[-+]+:?|\s*[@$a-z0-9_ ]*:)+\s*/i.exec(line))) {
      this.pushStr(match[0]);
      line = line.substring(match[0].length);
    }

    // Look for a .byte or .word directive.
    // TODO - consider removing the (\$[0-9a-f]{5}\s*)? once it's no longer needed
    if ((match = /^\s*(?:\$[0-9a-f]{5}\s*)?\.(?:byte|word|asciiz)\s*/i.exec(line))) {
      this.pushStr(match[0]);
      line = line.substring(match[0].length);
      for (;;) {
        // Now look for words, hex/dec/bin bytes, or text
        let match;
        if ((match = /^("(?:[^\\"]|\\.)+")(\s*,?\s*)/.exec(line))) { // "text"
          const str = JSON.parse(match[1]);
          const bytes = Array.from({length: str.length},
                                   (_, i) => str.charCodeAt(i) & 255);
          this.push(new CleanData(match[1], bytes, `:${bytes.length}`));
          this.pushStr(match[2]);
          line = line.substring(match[0].length);
        } else if ((match = /^(\(\$([0-9a-f]{4})\))(\s*,?\s*)/.exec(line))) { // (word)
          const value = parseInt(match[2], 16);
          this.push(new CleanData(match[1], [value & 255, value >>> 8], ':w'));
          this.pushStr(match[3]);
          line = line.substring(match[0].length);
        } else if ((match = /^(\$([0-9a-f]{2}))(\s*,?\s*)/.exec(line))) { // $hex
          const value = parseInt(match[2], 16);
          this.push(new CleanData(match[1], [value], ''));
          this.pushStr(match[3]);
          line = line.substring(match[0].length);
        } else if ((match = /^([1-9][0-9]*|0)(\s*,?\s*)/.exec(line))) { // decimal
          const value = parseInt(match[1]);
          this.push(new CleanData(match[1], [value], ':d'));
          this.pushStr(match[2]);
          line = line.substring(match[0].length);
        } else if ((match = /^(%([01]{8}))(\s*,?\s*)/.exec(line))) { // %binary
          const value = parseInt(match[2]);
          this.push(new CleanData(match[1], [value], ':b'));
          this.pushStr(match[3]);
          line = line.substring(match[0].length);
        } else {
          // end of the line - no more useful data
          this.pushStr(line);
          return;
        }
      }
    }

    // Not a data line: see if we can find an opcode.  Args should never have
    // quotes or semicolons, so this should be fine.
    if ((match = /^(\s*)([a-z]{3})([^;]*?)(\s*(?:;.*)?)$/s.exec(line))) {
      const [, prefix, mnemonic, arg, suffix] = match;
      const op = parseOp(this.cpu, mnemonic, arg);
      if (op) {
        this.pushStr(prefix);
        this.push(op);
        this.pushStr(suffix);
        return;
      }
    }
    this.pushStr(line);
  }
}

function parseOp(cpu: Cpu, mnemonic: string, argStr: string): CleanChunk|undefined {
  const op = cpu.table[mnemonic];
  const plain = mnemonic + argStr;
  let arg;
  if (!op) return undefined;
  if (!argStr) { // acc/imp
    if (op.acc != null) return new CleanOpSimple(plain, [op.acc]);
    if (op.imp != null) return new CleanOpSimple(plain, [op.imp]);
    return undefined;
  } else if (op.rel != null) { // don't bother trying to use it directly
    return new CleanOpPartial(plain, [op.rel], argStr.replace(/^ /, ''));
  } else if ((arg = /^ #(.+)$/.exec(argStr)?.[1])) { // imm
    return zpgOrAbs(plain, arg, op.imm);
  } else if ((arg = /^ ([^,)]+)$/.exec(argStr)?.[1])) { // abs/zpg
    return zpgOrAbs(plain, arg, op.zpg, op.abs);
  } else if ((arg = /^ ([^,)]+),x$/.exec(argStr)?.[1])) { // abx/zpx
    return zpgOrAbs(plain, arg, op.zpx, op.abx);
  } else if ((arg = /^ ([^,)]+),y$/.exec(argStr)?.[1])) { // aby/zpy
    return zpgOrAbs(plain, arg, op.zpy, op.aby);
  } else if ((arg = /^ \(([^,)]+)\)$/.exec(argStr)?.[1])) { // ind
    return zpgOrAbs(plain, arg, undefined, op.ind);
  } else if ((arg = /^ \(([^,)]+),x\)$/.exec(argStr)?.[1])) { // inx
    return zpgOrAbs(plain, arg, undefined, op.inx);
  } else if ((arg = /^ \(([^,)]+)\),y$/.exec(argStr)?.[1])) { // inx
    return zpgOrAbs(plain, arg, op.iny);
  }
  return undefined;
}

function zpgOrAbs(plain: string, arg: string, zpg?: number, abs?: number): CleanChunk|undefined {
  if (/^\$[0-9a-f]{2}$/.test(arg) && zpg != null) {
    return new CleanOpSimple(plain, [zpg, parseNum(arg)!]);
  } else if (/^\$[0-9a-f]{4}$/.test(arg) && abs != null) {
    const word = parseNum(arg)!;
    return new CleanOpSimple(plain, [abs, word & 0xff, word >>> 8]);
  }
  const options = [abs, zpg].filter(x => x != null) as number[];
  if (!options.length) return undefined;
  return new CleanOpPartial(plain, options, arg);
}

function parseNum(arg: string): number|undefined {
  if (/^\$[0-9a-f]+$/i.test(arg)) return parseInt(arg.substring(1), 16);
  if (/^(?:0|[1-9][0-9]*)$/.test(arg)) return parseInt(arg);
  if (/^\%[01]+$/.test(arg)) return parseInt(arg.substring(1), 2);
  return undefined;
}

function toHex(num: number, digits = 2): string {
  return num.toString(16).padStart(digits, '0');
}
function toHexString(nums: number[]): string {
  return nums.map(x => toHex(x)).join('');
}

function sameArray(left: ArrayLike<number>, right: ArrayLike<number>): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}
