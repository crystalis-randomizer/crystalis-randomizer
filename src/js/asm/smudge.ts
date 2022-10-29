// Smudger.  Supports transforming files by adding/removing actual ROM data.
// The basic idea is that a source file has a cleaned form and a smudged form.
// Cleaning removes actual ROM data and replaces it with address references.
// Smudging reads the original ROM and replaces references with actual code
// and data.
//
// Comments are preserved, and some special comments are understood to direct
// the cleaner where to look to find references.

import { AddressingMode, Cpu } from './cpu.js';
import { binarySearch } from './util.js';

// Smudging is pretty easy: we don't need to be clever about which bytes in the
// rom to use for obfuscating.  We just deobfuscate based on whatever we see.
// The biggest challenge is how to handle relative jumps.  Generally the right
// thing to do would be to preserve the jump target like an emacs marker:
// inserting or deleting in between doesn't change where we land.  But this is
// not really sound and we're probably better off just making sure everything
// is actually labeled before we touch it.  We can clean up the labels later.
// If we find a relative jump without an argument, we replace it with a `*+`
// expression.
export class Smudger {
  constructor(private readonly cpu: Cpu, private readonly prg: Uint8Array) {}

  smudge(contents: string): string {
    let output = '';
    while (contents.length) {
      let newline = contents.indexOf('\n');
      if (newline < 0) newline = contents.length;
      output += this.smudgeLine(contents.substring(0, newline));
      contents = contents.substring(newline);
    }
    return output;
  }

  private smudgeLine(line: string): string {
    // TODO - consider allowing multiple spaces to signify more space between
    // opcode and argument, along with a format indicator for hex/dec/binary?
    const match = /^([^;]*?)<@([0-9a-f]+)(?: (.*?))?@>(.*)$/i.exec(line);
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
      const match = /^([^;]*?)\[@([0-9a-f]+)(:[0-9]+|:w)?@\](.*)/i.exec(line);
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
    return `($${value.toString(16).padStart(4, '0')})`;
  } else if (/:\d+/.test(mod)) {
    const chars = parseInt(mod.substring(1));
    let result = `"${String.fromCharCode(value)}`;
    for (let i = 1; i < chars; i++) {
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
    return `$${value.toString(16).padStart(2, '0')}`;
  }
}

class CleanOpSequence {
  readonly type = 'seq';
  address = 0;

  constructor(
      readonly plain: string,
      readonly bytes: number[]) {
  }

  format(prg: Uint8Array, cpu: Cpu): string {
    // check if the address works, use it if so?
    if (this.plain === smudgeOp(cpu, prg, this.address, '')) {
      return `<@${this.address.toString(16)}@>`;
    }
    // no match: don't obfuscate.
    return this.plain;
  }
}

class CleanOpWithArg {
  readonly type = 'arg';
  address = 0;

  constructor(
      readonly plain: string,
      readonly options: number[],
      readonly arg: string) {
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

class CleanData {
  readonly type = 'seq';
  address = 0;

  constructor(
      readonly plain: string,
      readonly bytes: number[],
      readonly mod: string) {}

  format(prg: Uint8Array): string {
    // check if the address works, use it if so?
    if (this.plain === smudgeData(prg, this.address, this.mod)) {
      return `[@${this.address.toString(16)}${this.mod}@]`;
    }
    // no match: don't obfuscate.
    return this.plain;
  }
}

class CleanStr {
  readonly type = 'str';

  constructor(readonly plain: string) {}

  format(): string {
    return this.plain;
  }
}
type CleanChunk = CleanStr | CleanRef;
type CleanRef = CleanOpSequence | CleanOpWithArg | CleanData;

// Maps from hex string to sorted list of addresses, up to 16 bytes long
type Index = ReadonlyMap<string, ReadonlyArray<number>>;
export class Cleaner {
  private readonly index: Index;
  private chunks: CleanChunk[] = [];
  private refs: CleanRef[][] = [];

  constructor(private readonly cpu: Cpu, private readonly prg: Uint8Array) {
    const index = new Map<string, number[]>();
    let buffer = '';
    for (let i = 0; i < prg.length; i++) {
      const val = prg[i];
      buffer = buffer + val.toString(16).padStart(2, '0');
      if (buffer.length > 32) buffer = buffer.substring(buffer.length - 32);
      for (let j = 0; j < buffer.length; j += 2) {
        const key = buffer.substring(j);
        let array = index.get(key);
        if (!array) index.set(key, array = []);
        array.push(i + 1 - (buffer.length - j) / 2);
      }
    }
    this.index = index;
  }

  private pushRef(ref: CleanRef): void {
    this.chunks.push(ref);
    if (ref.type !== this.refs[this.refs.length - 1]?.[0]?.type) {
      this.refs.push([])
    }
    this.refs[this.refs.length - 1].push(ref);
  }
  private pushStr(str: string): void {
    if (str) this.chunks.push(new CleanStr(str));
  }

  clean(contents: string): string {
    const lines = contents.split(/\n/g);
    for (const line of lines) {
      this.readLine(line);
    }
    // Now fix up all the addresses...
    let pc = 0;
    for (const chunk of this.refs) {
      if (chunk[0].type === 'seq') {
        // sequence chunk - go through all the bytes and see how long we can reach.
        let start = 0;
        let end = 0;
        let str = '';
        while (end < chunk.length) {
          const term = chunk[end] as CleanOpSequence;
          const nextStr = str + term.bytes.map(x => x.toString(16).padStart(2, '0')).join('');
          const results = this.index.get(nextStr);
          if (results) {
            // success: keep going.
          } else {
            // failure: reset, but set the address for all the previous.
            // NOTE: we need to save those addresses?            
          }
        }
      }
      
      
      const ref = this.refs[i];
      if 
      let bytes = ref.bytes;
      let hex = 
      if (ref.arg)
    }
  }

  private readLine(line: string): void {
    // Look for a label at the front
    const labelMatch = /^\s*(?:[-+]*:?|\w+:)\s*/.exec(line);
    if (labelMatch) {
      this.pushStr(labelMatch[0]);
      line = line.substring(labelMatch[0].length);
    }

    // Look for a .byte or .word directive
    const byteMatch = /^\s*\.(?:byte|word|text)\s*/.exec(line);
    while (byteMatch) { // NOTE: infinite loop if it's entered, returned out of
      this.pushStr(byteMatch[0]);
      line = line.substring(byteMatch[0].length);
      // Now look for words, hex/dec/bin bytes, or text
      const textMatch = /^("(?:[^\\"]|\\.)+")(,?\s*)/.exec(line);
      const wordMatch = /^(\(\$([0-9a-f]{4})\))(,?\s*)/.exec(line);
      const hexMatch = /^(\$([0-9a-f]{2}))(,?\s*)/.exec(line);
      const decMatch = /^([1-9][0-9]*|0)(,?\s*)/.exec(line);
      const binMatch = /^(%([01]{8}))(,?\s*)/.exec(line);
      if (textMatch) {
        const str = JSON.parse(textMatch[1]);
        const bytes = Array.from({length: str.length}, (_, i) => str.charCodeAt(i) & 255);
        this.pushRef(new CleanData(textMatch[1], bytes, `:${bytes.length}`));
        this.pushStr(textMatch[2]);
      } else if (wordMatch) {
        const value = parseInt(wordMatch[2], 16);
        this.pushRef(new CleanData(wordMatch[1], [value & 255, value >>> 8], ':w'));
        this.pushStr(wordMatch[3]);
      } else if (hexMatch) {
        const value = parseInt(hexMatch[2], 16);
        this.pushRef(new CleanData(hexMatch[1], [value], ''));
        this.pushStr(hexMatch[3]);
      } else if (decMatch) {
        const value = parseInt(decMatch[1]);
        this.pushRef(new CleanData(decMatch[1], [value], ':d'));
        this.pushStr(decMatch[2]);
      } else if (binMatch) {
        const value = parseInt(binMatch[2]);
        this.pushRef(new CleanData(binMatch[1], [value], ':b'));
        this.pushStr(binMatch[3]);
      } else {
        // end of the line - no more useful data
        this.pushStr(line);
        return;
      }
    }

    // Not a data line: see if we can find an opcode.  Args should never have
    // quotes or semicolons, so this should be fine.
    const opMatch = /^(\s*)([a-z]{3})([^;]*?)(\s*(?:;.*))$/.exec(line);
    if (opMatch) {
      const [, prefix, mnemonic, arg, suffix] = opMatch;
      const op = this.cpu.op(mnemonic);
      if (op) {
        const options: Array<[string, ...number[]]> = [];
        for (const mode in op) {
          assertType<AddressingMode>(mode);
          const opcode = op[mode]!;
          const argLen = this.cpu.argLen(mode);
          const [regex, predicate] = addrModeRegexes[mode];
          const match = regex.exec(arg);
          if (match && predicate(match[1])) {
            // we have a valid operation: now it's a question of whether
            // the arg is "custom" or just a standard number.
            const argMatch = match[1];
            if (!/^(?:\$[0-9a-f]{2,4}|[0-9]+|\%[01]{8}|)$/.test(argMatch)) {
              // something other than a simple number: add an option but no arg
              options.push([argMatch, opcode]);
            } else {
              // just a basic argument: push the whole op
              const num = argMatch && parseNum(argMatch) || 0;
              const instruction: [string, ...number[]] = ['', opcode];
              if (argLen > 0) instruction.push(num & 0xff);
              if (argLen > 1) instruction.push(num >>> 8);
              options.push(instruction);
            }
          }
        }
        // At this point we have some options.  If there's any with custom
        // arguments, use that.
        const custom = options.filter(x => x[0]);
        if (custom.length) {
          const args = new Set(custom.map(x => x[0]));
          if (args.size === 1) {
            // A single unique custom arg.
            const ops = custom.map(x => x[1]);
            const arg = custom[0][0];
            this.pushStr(prefix);
            this.pushRef(new CleanOpWithArg(mnemonic + arg, ops, arg));
            this.pushStr(suffix);
            return;
          }
        } else {
          // No custom args: should be a single unique sequence.
          if (options.length === 1) {
            const [, ...bytes] = options[0];
            this.pushStr(prefix);
            this.pushRef(new CleanOpSequence(mnemonic + arg, bytes));
            this.pushStr(suffix);
            return;
          }
        }
      }
      this.pushStr(line);
    }


    // This is a trickier direction because we need to pay attention to hints.
    // We keep track of pc/incr and look ahead a bit to find something that
    // matches.  Whenever we see a plain instruction, we have to assume maybe
    // that it's a replacement, an insertion, or that there have been deletions.
    // In some sense, it doesn't matter a _ton_ how far ahead we look, since the
    // transformation will still be reversible and the result will still be
    // obfuscated even if we pick random instructions far away.
    //
    // Actually... we could index all possible instructions and data and just
    // rotate through arbitrarily and not worry about where it's actually coming
    // from.  This would still be rom-based obfuscation, but we'd ignore the
    // hints.  It doesn't much matter what address we're actually at.  It's a
    // little ridiculous, though.  We'd need to build up the index:
    //   - [0..255] -> sortedlist<addr>
    //   - `${mnemonic} ${mode}` -> sortedlist<addr>
    //   - `${mnemonic} ${mode} ${arg}` -> sortedlist<addr>
    // This would allow quickly finding the "next" possible instance for any
    // given thing we want to substitute.  This has the interesting effect that
    // we'll be pulling "code" out of data tables... but that's fine...?
    //   - We can probably just keep a trie of up to 8-byte words?
    //   - Can we take a multi-pass approach where we recognize location based
    //     on _later_ bytes and reassign the previous ones?  If we build up a
    //     list of objects then we could basically store symlinks as needed and
    //     update them in-place to do a single map-join at the end.

    // TODO - look for .byte, .word, or a mnemonic
    //      - clear out optional labels

  }
}

function assertType<T>(arg: unknown): asserts arg is T {}

type Predicate<T> = (arg: T) => boolean;
const addrModeRegexes: Record<string, readonly [RegExp, Predicate<string>]> = {
  acc: [/^()$/, () => true], // must be empty
  imp: [/^()$/, () => true],
  imm: [/^ #(.*)$/, () => true], // no restriction
  abs: [/^ ([^,]*)$/, arg => !isEightBit(arg)],
  abx: [/^ ([^,]*),x$/, arg => !isEightBit(arg)],
  aby: [/^ ([^,]*),y$/, arg => !isEightBit(arg)],
  zpg: [/^ ([^,]*)$/, arg => !isSixteenBit(arg)],
  zpx: [/^ ([^,]*),x$/, arg => !isSixteenBit(arg)],
  zpy: [/^ ([^,]*),y$/, arg => !isSixteenBit(arg)],
  ind: [/^ \(([^,]*)\)$/, () => true],
  inx: [/^ \(([^,]*),x\)$/, () => true],
  iny: [/^ \(([^,]*)\),y$/, () => true],
}

function isEightBit(arg: string): boolean {
  return /^\$[0-9a-f]{1,2}$/.test(arg) || /^%[01]{1,8}$/.test(arg) || arg === '0'
    || /^[1-9][0-9]*$/.test(arg) && parseInt(arg) < 256;
}
function isSixteenBit(arg: string): boolean {
  return /^\$[0-9a-f]{3,4}$/.test(arg) || /^%[01]{9,16}$/.test(arg)
    || /^[1-9][0-9]*$/.test(arg) && parseInt(arg) > 255;
}

function parseNum(arg: string): number|undefined {
  if (/^\$[0-9a-f]+$/i.test(arg)) return parseInt(arg.substring(1), 16);
  if (/^(?:0|[1-9][0-9]*)$/.test(arg)) return parseInt(arg);
  if (/^\%[01]+$/.test(arg)) return parseInt(arg.substring(1), 2);
  return undefined;
}

function arraysMatch(arr1: ArrayLike<number>, arr2: ArrayLike<number>) {
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}
