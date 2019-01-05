// Assembler



// Useful for patching ROMs.
class Assembler {
  constructor() {
    this.labels = {};
    this.lines = [];
    this.pc = 0;
  }

  ingest(line) {
    // remove comments
    line = line.replace(/;.*/, '');
    // trim the string, leave at most one space at start
    line = line.replace(/\s+/g, ' ');
    line = line.replace(/\s$/g, '');

    // Look for different kinds of lines: directives, labels, data, or code
    // Trick - how to know for forward refs whether it's near or far?
    // Solution - zeropage refs must be defined.
    let match;

    if ((match = /^\s*\.org\s+(\S+)/i.exec(line))) {
      this.lines.push(new OrgLine((this.pc = parseNumber(match[1]))));
      return;
    } else if ((match = /^\s*\.bank\s+(\S+)\s+(\S+)\s*:\s*(\S+)/i.exec(line))) {
      const [_, prg, cpu, length] = match;
      this.lines.push(new BankLine(parseNumber(prg), parseNumber(cpu), parseNumber(length)));
      return;
    } else if ((match = /^\s*\.(byte|word)\s+(.*)/i.exec(line))) {
      const line = (match[1] == 'word' ? WordLine : ByteLine).parse(match[2]);
      this.lines.push(line);
      this.pc += line.size();
      return;
    } else if ((match = /^(\S+?):(.*)$/.exec(line))) {
      // label - extract and record.
      const label = match[1];
      line = ' ' + match[2];
      this.labels[label] = ~this.pc;
    }
    if ((match = /^\s+([a-z]{3})(\s+.*)?$/.exec(line))) {
      const line = new Opcode(match[1], (match[2] || '').trim(), this.pc);
      this.lines.push(line);
      this.pc += line.size();
    } else if (/\S/.test(line)) {
      throw new Error(`Could not parse line ${line}`);
    }
  }

  // Output is an array of Chunks
  assemble() {
    const context = new Context(this.labels);
    const output = [];
    for (const line of this.lines) {
      line.expand(context);
      for (const b of line.bytes()) {
        output[context.pc++] = b;
      }
    }
    // output is a sparse array - find the first indices.
    const starts = [];
    for (const i in output) {
      if (!(i - 1 in output)) starts.push(i);
    }
    // now output chunks.
    const chunks = [];
    for (const start of starts) {
      const data = [];
      for (let i = start; i in output; i++) {
        data.push(output[i]);
      }
      chunks.push(new Chunk(start, data));
    }
    return chunks;
  }
}

class ByteLine {
  static parse(line) {
    const bytes = [];
    for (let part of line.split(',')) {
      part = part.trim();
      const match = /^"(.*)"$/.exec(part);
      if (match) {
        bytes.push(...[...match[1]].map(s => s.charCodeAt(0)));
      } else {
        bytes.push(parseNumber(part));
      }
    }
    return new ByteLine(bytes);
  }

  constructor(bytes) {
    this.bytes_ = bytes;
  }

  bytes() {
    return [...this.bytes_];
  }

  size() {
    return this.bytes_.length;
  }

  expand() {}
}

class WordLine {
  constructor(words) {
    this.words = words;
  }

  bytes() {
    const bytes = [];
    for (const w of this.words) {
      bytes.push(w & 0xff);
      bytes.push(w >>> 8);
    }
  }

  size() {
    return this.words.length * 2;
  }

  expand(context) {
    for (let i = 0; i < this.words.length; i++) {
      if (typeof this.words[i] == 'string') {
        this.words[i] = context.map(this.words[i]);
      }
    }
  }
}

class OrgLine {
  constructor(pc) {
    this.pc = pc;
  }

  bytes() { return []; }

  size() { return 0; }

  expand(context) {
    context.pc = this.pc;
  }
}

class BankLine {
  constructor(prg, cpu, length) {
    this.prg = prg
    this.cpu = cpu;
    this.length = length;
  }

  bytes() { return []; }

  size() { return 0; }

  expand(context) {
    context.updateBank(this.prg, this.cpu, this.length);
  }
}

class Context {
  constructor(labels) {
    this.pc = 0;
    this.labels = labels;
    this.cpuToPrg = [];
    this.prgToCpu = [];
  }

  // Note: there's all sorts of ways this could be made more efficient,
  // but I don't really care since it's not in an inner loop.
  updateBank(prg, cpu, length) {
    // invalidate previous range for this CPU addresses
    for (let i = 0; i < length; i++) {
      const cpuAddr = cpu + i;
      const prgAddr = this.cpuToPrg[cpuAddr];
      if (prgAddr != null) {
        this.prgToCpu[prgAddr] = null;
        this.cpuToPrg[cpuAddr] = null;
      }
    }
    // record current range
    for (let i = 0; i < length; i++) {
      const cpuAddr = cpu + i;
      const prgAddr = prg + i;
      this.prgToCpu[prgAddr] = cpuAddr;
      this.cpuToPrg[cpuAddr] = prgAddr;
    }
  }

  mapLabel(label) {
    const addr = this.labels[label];
    if (!addr) throw new Error(`Label not found: ${label}`);
    return addr;
  }

  mapPrgToCpu(prgAddr) {
    const cpuAddr = this.prgToCpu[prgAddr];
    if (cpuAddr == null) throw new Error(`PRG address unmapped: ${prgAddr}`);
    return cpuAddr;
  }

  // return CPU address or throw - main external entry point.
  map(prgAddr) {
    let addr = prgAddr;
    if (addr == null) return addr;
    if (typeof addr == 'string') {
      addr = this.mapLabel(addr);
    }
    if (addr < 0) { // the label map returns ~address if it should be mapped
      addr = this.mapPrgToCpu(~addr);
    }
    return addr;
  }
}


// A single change.
class Chunk extends Uint8Array {
  constructor(start, data) {
    super(data.length);
    this.set(data);
    this.start = start;
  }

  apply(data) {
    data.subarray(this.start, this.start + this.length).set(this);
  }

  shift(offset) {
    const c = new Chunk(this.start + offset, this);
    return c;
  }
}


// An IPS patch - this iterates as a bunch of chunks.  To concatenate
// two patches (p1 and p2) simply call Patch.from([...p1, ...p2])
class Patch {
  static from(chunks) {
    // TODO - consider moving this to the egestion side.
    const arrays = [];
    let length = 8;
    for (const chunk of chunks) {
      const arr = new Uint8Array(chunk.length + 5);
      arr[0] = chunk.start >>> 16;
      arr[1] = (chunk.start >>> 8) & 0xff;
      arr[2] = chunk.start & 0xff;
      arr[3] = chunk.length >>> 8;
      arr[4] = chunk.length & 0xff;
      arr.set(chunk, 5);
      arrays.push(arr);
      length += arr.length;
    }
    const data = new Uint8Array(length);
    let i = 5;
    data[0] = 0x50;
    data[1] = 0x41;
    data[2] = 0x54;
    data[3] = 0x43;
    data[4] = 0x48;
    for (const arr of arrays) {
      data.subarray(i, i + arr.length).set(arr);
      i += arr.length;
    }
    data[i] = 0x45;
    data[i + 1] = 0x4f;
    data[i + 2] = 0x46;
    return new Patch(data);
  }

  constructor(data) {
    this.data = data;
  }

  apply(data) {
    for (const chunk of this) {
      chunk.apply(data);
    }
  }

  * [Symbol.iterator]() {
    let pos = 5;
    while (pos < this.data.length - 3) {
      const start = this.data[pos] << 16 | this.data[pos + 1] << 8 | this.data[pos + 2];
      const len = this.data[pos + 3] << 8 | this.data[pos + 4];
      yield new Chunk(start, this.data.subarray(pos + 5, pos + 5 + len));
      pos += len + 5;
    }
  }

  toHexString() {
    return [...this.data].map(x => x.toString(16).padStart(2, 0)).join('');
  }
}


// Input: an assembly string
// Output: a patch
export const assemble = (str) => {
  const asm = new Assembler();
  let i = 0;
  for (const line of str.split('\n')) {
    i++;
    asm.ingest(line);
  }
  const chunks = asm.assemble();
  return Patch.from(chunks);
};


export const buildRomPatch = (prg, chr, prgSize) => {
  prg = [...prg].map(c => c.shift(0x10));
  chr = [...(chr || [])].map(c => c.shift(0x10 + prgSize));
  return Patch.from([...prg, ...chr]);
};


console.log(buildRomPatch(assemble(`
.bank $3c000 $c000:$4000 ; fixed bank

.org $3f4eb
  ldx #$03
loop1:
  dex
  bpl loop1

.org $3f455
  ldx #$07
  nop
`)).toHexString());
