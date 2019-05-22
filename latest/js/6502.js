const LOG = true;
export class Assembler {
    constructor() {
        this.labels = {};
        this.allChunks = [];
    }
    assemble(str, filename = 'input') {
        const f = new File(this.labels, filename);
        for (const line of str.split('\n')) {
            f.ingest(line);
        }
        const chunks = f.assemble();
        this.allChunks.push(...chunks);
    }
    chunks() {
        return [...this.allChunks];
    }
    patch() {
        return Patch.from(this.allChunks);
    }
    patchRom(rom) {
        buildRomPatch(this.patch()).apply(rom);
        this.allChunks = [];
    }
    expand(label) {
        const [addr = null, ...rest] = this.labels[label] || [];
        if (addr == null)
            throw new Error(`Missing label: ${label}`);
        if (rest.length)
            throw new Error(`Non-unique label: ${label}`);
        return addr < 0 ? ~addr : addr;
    }
}
class File {
    constructor(labels, filename) {
        this.labels = labels;
        this.filename = filename;
        this.lines = [];
        this.pc = 0;
        this.lineNumber = -1;
        this.lineContents = '';
        this.conditions = [];
        this.assembling = true;
    }
    addLine(line) {
        this.lines.push(line.orig(this.filename, this.lineNumber, this.lineContents));
    }
    addLabel(label, address) {
        if (typeof address !== 'number')
            throw new Error('Expected a number');
        const arr = this.labels[label] || (this.labels[label] = []);
        const index = find(arr, address);
        if (index < 0)
            arr.splice(~index, 0, address);
    }
    parseNumber(num) {
        const parsed = parseNumber(num, true);
        return typeof parsed === 'number' ?
            parsed : new Context(this.labels).mapLabel(parsed);
    }
    ingest(line) {
        this.lineNumber++;
        this.lineContents = line;
        line = line.replace(/;.*/, '');
        line = line.replace(/\s+/g, ' ');
        line = line.replace(/\s$/g, '');
        let match;
        if ((match = /^\s*\.if(n?)def\s+(\S+)/i.exec(line))) {
            const def = match[2] in this.labels;
            this.conditions.push(match[1] ? !def : def);
            this.assembling = this.conditions.every(x => x);
            return;
        }
        else if ((match = /^\s*\.else/i.exec(line))) {
            this.conditions.push(!this.conditions.pop());
            this.assembling = this.conditions.every(x => x);
            return;
        }
        else if ((match = /^\s*\.endif/i.exec(line))) {
            this.conditions.pop();
            this.assembling = this.conditions.every(x => x);
            return;
        }
        else if (!this.assembling) {
            return;
        }
        else if ((match = /^\s*\.org\s+(\S+)/i.exec(line))) {
            this.addLine(new OrgLine((this.pc = parseNumber(match[1]))));
            return;
        }
        else if ((match = /^\s*\.skip\s+(.+)/i.exec(line))) {
            this.addLine(new OrgLine((this.pc += this.parseNumber(match[1]))));
            return;
        }
        else if ((match = /^\s*\.assert\s+(<\s*)?(\S+)/i.exec(line))) {
            this.addLine(new AssertLine((this.pc = parseNumber(match[2])), !match[1]));
            return;
        }
        else if ((match = /^\s*\.bank\s+(\S+)\s+(\S+)\s*:\s*(\S+)/i.exec(line))) {
            const [, prg, cpu, length] = match;
            this.addLine(new BankLine(parseNumber(prg), parseNumber(cpu), parseNumber(length)));
            return;
        }
        else if ((match = /^\s*\.(byte|word)\s+(.*)/i.exec(line))) {
            const l = (match[1] === 'word' ? WordLine : ByteLine).parse(match[2]);
            this.addLine(l);
            this.pc += l.size();
            return;
        }
        else if ((match = /^\s*\.res\s+([^,]+)(?:,\s*(.+))?/i.exec(line))) {
            const l = ByteLine.parseRes(this.parseNumber(match[1]), this.parseNumber(match[2] || '0'));
            this.addLine(l);
            this.pc += l.size();
            return;
        }
        else if ((match = /^define\s+(\S+)\s+(.*)/.exec(line))) {
            const label = match[1];
            this.addLabel(label, this.parseNumber(match[2]));
            return;
        }
        else if ((match = /^(\S+?):(.*)$/.exec(line))) {
            const label = match[1];
            line = ' ' + match[2];
            this.addLabel(label, ~this.pc);
        }
        else if ((match = /^((?:[-+]+\s+)+)(.*)$/.exec(line))) {
            const labels = match[1];
            for (const label of labels.trim().split(' ')) {
                this.addLabel(label, ~this.pc);
            }
            line = ' ' + match[2];
        }
        if ((match = /^\s+([a-z]{3})(\s+.*)?$/.exec(line))) {
            const l = new Opcode(match[1], (match[2] || '').trim(), this.pc);
            this.addLine(l);
            this.pc += l.size();
        }
        else if (/\S/.test(line)) {
            throw new Error(`Could not parse line ${line} at ${this.filename}:${this.lineNumber}`);
        }
    }
    assemble() {
        const context = new Context(this.labels);
        const output = [];
        const outputLines = [];
        const collision = (line, pc) => {
            throw new Error(`Collision at $${pc.toString(16)}:\n  written at ${outputLines[pc].source()}\n  written at ${line.source()}`);
        };
        for (const line of this.lines) {
            try {
                line.expand(context);
            }
            catch (e) {
                const stack = e.stack.replace(`Error: ${e.message}`, '');
                const message = e.message;
                const pos = ` from line ${line.origLineNumber + 1}: \`${line.origContent}\``;
                throw new Error(`${message}${pos}${stack}\n================`);
            }
            if (line instanceof OrgLine && output[line.pc] != null)
                collision(line, line.pc);
            for (const b of line.bytes()) {
                if (output[context.pc] != null)
                    collision(line, context.pc);
                outputLines[context.pc] = line;
                output[context.pc++] = b;
            }
        }
        const starts = [];
        for (const i in output) {
            if (!(Number(i) - 1 in output))
                starts.push(Number(i));
        }
        const chunks = [];
        for (const start of starts) {
            const data = [];
            for (let i = start; i in output; i++) {
                data.push(output[i]);
            }
            chunks.push(new Chunk(start, data));
        }
        if (this.conditions.length) {
            throw new Error('Unterminated .if');
        }
        return chunks;
    }
}
class AbstractLine {
    constructor() {
        this.origFile = '';
        this.origLineNumber = -1;
        this.origContent = '';
    }
    orig(file, num, content) {
        this.origFile = file;
        this.origLineNumber = num;
        this.origContent = content;
        return this;
    }
    source() {
        return `${this.origFile}:${this.origLineNumber + 1}  ${this.origContent}`;
    }
}
class ByteLine extends AbstractLine {
    constructor(bytesInternal) {
        super();
        this.bytesInternal = bytesInternal;
    }
    static parse(line) {
        const bytes = [];
        for (let part of line.split(',')) {
            part = part.trim();
            const match = /^"(.*)"$/.exec(part);
            if (match) {
                bytes.push(...[...match[1]].map(s => s.charCodeAt(0)));
            }
            else {
                bytes.push(parseNumber(part));
            }
        }
        return new ByteLine(bytes);
    }
    static parseRes(count, defaultValue) {
        return new ByteLine(new Array(count).fill(defaultValue));
    }
    bytes() {
        return [...this.bytesInternal];
    }
    size() {
        return this.bytesInternal.length;
    }
    expand() { }
}
class WordLine extends AbstractLine {
    constructor(words) {
        super();
        this.words = words;
    }
    static parse(line) {
        const words = [];
        for (let part of line.split(',')) {
            part = part.trim();
            part = part.replace(/[()]/g, '');
            words.push(parseNumber(part, true));
        }
        return new WordLine(words);
    }
    bytes() {
        const bytes = [];
        for (const w of this.words) {
            bytes.push(w & 0xff);
            bytes.push(w >>> 8);
        }
        return bytes;
    }
    size() {
        return this.words.length * 2;
    }
    expand(context) {
        for (let i = 0; i < this.words.length; i++) {
            if (typeof this.words[i] === 'string') {
                this.words[i] = context.map(this.words[i]);
            }
        }
    }
}
class OrgLine extends AbstractLine {
    constructor(pc) {
        super();
        this.pc = pc;
    }
    bytes() { return []; }
    size() { return 0; }
    expand(context) {
        context.pc = this.pc;
    }
}
class AssertLine extends AbstractLine {
    constructor(pc, exact) {
        super();
        this.pc = pc;
        this.exact = exact;
    }
    bytes() { return []; }
    size() { return 0; }
    expand(context) {
        if (this.exact ? context.pc !== this.pc : context.pc > this.pc) {
            throw new Error(`Misalignment: expected ${this.exact ? '' : '< '}$${this.pc.toString(16)} but was $${context.pc.toString(16)}`);
        }
        if (!this.exact && LOG) {
            console.log(`Free: ${this.pc - context.pc} bytes between $${context.pc.toString(16)} and $${this.pc.toString(16)}`);
        }
    }
}
class BankLine extends AbstractLine {
    constructor(prg, cpu, length) {
        super();
        this.prg = prg;
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
        this.labels = labels;
        this.pc = 0;
        this.cpuToPrg = [];
        this.prgToCpu = [];
    }
    updateBank(prg, cpu, length) {
        for (let i = 0; i < length; i++) {
            const cpuAddr = cpu + i;
            const prgAddr = this.cpuToPrg[cpuAddr];
            if (prgAddr != null) {
                this.prgToCpu[prgAddr] = null;
                this.cpuToPrg[cpuAddr] = null;
            }
        }
        for (let i = 0; i < length; i++) {
            const cpuAddr = cpu + i;
            const prgAddr = prg + i;
            this.prgToCpu[prgAddr] = cpuAddr;
            this.cpuToPrg[cpuAddr] = prgAddr;
        }
    }
    mapLabel(label, pc) {
        let match = /([^-+]+)([-+])(.*)/.exec(label);
        if (match) {
            const left = this.map(parseNumber(match[1].trim(), true), pc);
            const right = this.map(parseNumber(match[3].trim(), true), pc);
            return match[2] === '-' ? left - right : left + right;
        }
        match = /([^*]+)[*](.*)/.exec(label);
        if (match) {
            const left = this.map(parseNumber(match[1].trim(), true), pc);
            const right = this.map(parseNumber(match[2].trim(), true), pc);
            return left * right;
        }
        match = /([<>])(.*)/.exec(label);
        if (match) {
            const arg = this.map(parseNumber(match[2].trim(), true), pc);
            return match[1] === '<' ? arg & 0xff : (arg >>> 8) & 0xff;
        }
        let addrs = this.labels[label];
        if (!addrs)
            throw new Error(`Label not found: ${label}`);
        if (pc == null) {
            if (addrs.length > 1)
                throw new Error(`Ambiguous label: ${label}`);
            return addrs[0];
        }
        pc = ~(pc + 2);
        const index = find(addrs, pc);
        if (index >= 0)
            return addrs[index];
        if (index === -1)
            return addrs[0];
        if (index === ~addrs.length)
            return addrs[addrs.length - 1];
        addrs = addrs.slice(~index - 1, ~index + 1);
        if (label.startsWith('-'))
            return addrs[1];
        if (label.startsWith('+'))
            return addrs[0];
        const mid = (addrs[0] + addrs[1]) / 2;
        return pc < mid ? addrs[0] : addrs[1];
    }
    mapPrgToCpu(prgAddr) {
        const cpuAddr = this.prgToCpu[prgAddr];
        if (cpuAddr == null)
            throw new Error(`PRG address unmapped: $${prgAddr.toString(16)}`);
        return cpuAddr;
    }
    map(prgAddr, pc) {
        let addr = prgAddr;
        if (addr == null)
            return addr;
        if (typeof addr === 'string') {
            addr = this.mapLabel(addr, pc);
        }
        if (addr < 0) {
            addr = this.mapPrgToCpu(~addr);
        }
        return addr;
    }
}
class Chunk extends Uint8Array {
    constructor(start, data) {
        super(data.length);
        this.start = start;
        this.set(data);
    }
    apply(data) {
        data.subarray(this.start, this.start + this.length).set(this);
    }
    shift(offset) {
        const c = new Chunk(this.start + offset, this);
        return c;
    }
}
class Patch {
    constructor(data) {
        this.data = data;
    }
    static from(chunks) {
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
    apply(data) {
        for (const chunk of this) {
            chunk.apply(data);
        }
    }
    *[Symbol.iterator]() {
        let pos = 5;
        while (pos < this.data.length - 3) {
            const start = this.data[pos] << 16 | this.data[pos + 1] << 8 | this.data[pos + 2];
            const len = this.data[pos + 3] << 8 | this.data[pos + 4];
            yield new Chunk(start, this.data.subarray(pos + 5, pos + 5 + len));
            pos += len + 5;
        }
    }
    toHexString() {
        return [...this.data].map(x => x.toString(16).padStart(2, '0')).join('');
    }
}
export const assemble = (str, filename = 'input') => {
    const asm = new File({}, filename);
    for (const line of str.split('\n')) {
        asm.ingest(line);
    }
    const chunks = asm.assemble();
    return Patch.from(chunks);
};
export const buildRomPatch = (prg, chr, prgSize = 0x40000) => {
    const prgChunks = [...prg].map(c => c.shift(0x10));
    const chrChunks = [...(chr || [])].map(c => c.shift(0x10 + prgSize));
    return Patch.from([...prgChunks, ...chrChunks]);
};
class Opcode extends AbstractLine {
    constructor(mnemonic, arg, pcInternal) {
        super();
        this.mnemonic = mnemonic;
        this.pcInternal = pcInternal;
        this.arg = findMode(mnemonic, arg);
    }
    get pc() { return this.pcInternal; }
    size() {
        return 1 + this.arg[1];
    }
    bytes() {
        let value = this.arg[2];
        if (this.arg[0] === 'Relative') {
            value -= this.pc + 2;
            if (!(value < 0x80 && value >= -0x80)) {
                throw new Error(`Too far to branch: ${value} at ${this.source()}`);
            }
        }
        const opcode = opcodes[this.mnemonic][this.arg[0]];
        if (opcode == null)
            throw new Error(`No opcode: ${this.mnemonic} ${this.arg[0]}`);
        const bytes = [opcode];
        let count = this.arg[1];
        while (count--) {
            bytes.push(value & 0xff);
            value >>>= 8;
        }
        return bytes;
    }
    expand(context) {
        this.arg[2] = context.map(this.arg[2], this.pc);
        this.pcInternal = context.map(~this.pc);
    }
}
const find = (arr, val) => {
    let a = 0;
    let b = arr.length - 1;
    if (b < 0)
        return ~0;
    if (val < arr[0])
        return ~0;
    const fb = arr[b];
    if (val === fb)
        return b;
    if (val > fb)
        return ~arr.length;
    while (b - a > 1) {
        const mid = (a + b) >> 1;
        const fmid = arr[mid];
        if (val < fmid) {
            b = mid;
        }
        else {
            a = mid;
        }
    }
    return val === arr[a] ? a : ~b;
};
const findMode = (mnemonic, arg) => {
    for (const [re, f] of modes) {
        const match = re.exec(arg);
        if (!match)
            continue;
        const m = f(match[1]);
        if (!(mnemonic in opcodes))
            throw new Error(`Bad mnemonic: ${mnemonic}`);
        if (m[0] in opcodes[mnemonic])
            return m;
    }
    throw new Error(`Could not find mode for ${mnemonic} ${arg}
Expected one of [${Object.keys(opcodes[mnemonic]).join(', ')}]`);
};
const modes = [
    [/^$/, () => ['Implied', 0, 0]],
    [/^#(.+)$/, (x) => ['Immediate', 1, parseNumber(x, true)]],
    [/^(\$..)$/, (x) => ['ZeroPage', 1, parseNumber(x, true)]],
    [/^(\$..),x$/, (x) => ['ZeroPageX', 1, parseNumber(x, true)]],
    [/^(\$..),y$/, (x) => ['ZeroPageY', 1, parseNumber(x, true)]],
    [/^\((\$..),x\)$/, (x) => ['PreindexedIndirect', 1, parseNumber(x, true)]],
    [/^\((\$..)\),y$/, (x) => ['PostindexedIndirect', 1, parseNumber(x, true)]],
    [/^\((.+)\)$/, (x) => ['IndirectAbsolute', 2, parseNumber(x, true)]],
    [/^(.+),x$/, (x) => ['AbsoluteX', 2, parseNumber(x, true)]],
    [/^(.+),y$/, (x) => ['AbsoluteY', 2, parseNumber(x, true)]],
    [/^(.+)$/, (x) => ['Absolute', 2, parseNumber(x, true)]],
    [/^(.+)$/, (x) => ['Relative', 1, parseNumber(x, true)]],
];
function parseNumber(str, allowLabels = false) {
    if (str.startsWith('$'))
        return Number.parseInt(str.substring(1), 16);
    if (str.startsWith('%'))
        return Number.parseInt(str.substring(1), 2);
    if (str.startsWith('0'))
        return Number.parseInt(str, 8);
    const result = Number.parseInt(str, 10);
    if (!Number.isNaN(result))
        return result;
    if (allowLabels)
        return str;
    throw new Error(`Bad number: ${str}`);
}
const opcodes = {
    adc: {
        Absolute: 0x6d,
        AbsoluteX: 0x7d,
        AbsoluteY: 0x79,
        Immediate: 0x69,
        PostindexedIndirect: 0x71,
        PreindexedIndirect: 0x61,
        ZeroPage: 0x65,
        ZeroPageX: 0x75,
    },
    and: {
        Absolute: 0x2d,
        AbsoluteX: 0x3d,
        AbsoluteY: 0x39,
        Immediate: 0x29,
        PostindexedIndirect: 0x31,
        PreindexedIndirect: 0x21,
        ZeroPage: 0x25,
        ZeroPageX: 0x35,
    },
    asl: {
        Absolute: 0x0e,
        AbsoluteX: 0x1e,
        Implied: 0x0a,
        ZeroPage: 0x06,
        ZeroPageX: 0x16,
    },
    bcc: { Relative: 0x90 },
    bcs: { Relative: 0xb0 },
    beq: { Relative: 0xf0 },
    bit: {
        Absolute: 0x2c,
        ZeroPage: 0x24,
    },
    bmi: { Relative: 0x30 },
    bne: { Relative: 0xd0 },
    bpl: { Relative: 0x10 },
    brk: { Implied: 0x00 },
    bvc: { Relative: 0x50 },
    bvs: { Relative: 0x70 },
    clc: { Implied: 0x18 },
    cld: { Implied: 0xd8 },
    cli: { Implied: 0x58 },
    clv: { Implied: 0xb8 },
    cmp: {
        Absolute: 0xcd,
        AbsoluteX: 0xdd,
        AbsoluteY: 0xd9,
        Immediate: 0xc9,
        PostindexedIndirect: 0xd1,
        PreindexedIndirect: 0xc1,
        ZeroPage: 0xc5,
        ZeroPageX: 0xd5,
    },
    cpx: {
        Absolute: 0xec,
        Immediate: 0xe0,
        ZeroPage: 0xe4,
    },
    cpy: {
        Absolute: 0xcc,
        Immediate: 0xc0,
        ZeroPage: 0xc4,
    },
    dec: {
        Absolute: 0xce,
        AbsoluteX: 0xde,
        ZeroPage: 0xc6,
        ZeroPageX: 0xd6,
    },
    dex: { Implied: 0xca },
    dey: { Implied: 0x88 },
    eor: {
        Absolute: 0x4d,
        AbsoluteX: 0x5d,
        AbsoluteY: 0x59,
        Immediate: 0x49,
        PostindexedIndirect: 0x51,
        PreindexedIndirect: 0x41,
        ZeroPage: 0x45,
        ZeroPageX: 0x55,
    },
    inc: {
        Absolute: 0xee,
        AbsoluteX: 0xfe,
        ZeroPage: 0xe6,
        ZeroPageX: 0xf6,
    },
    inx: { Implied: 0xe8 },
    iny: { Implied: 0xc8 },
    jmp: {
        Absolute: 0x4c,
        IndirectAbsolute: 0x6c,
    },
    jsr: { Absolute: 0x20 },
    lda: {
        Absolute: 0xad,
        AbsoluteX: 0xbd,
        AbsoluteY: 0xb9,
        Immediate: 0xa9,
        PostindexedIndirect: 0xb1,
        PreindexedIndirect: 0xa1,
        ZeroPage: 0xa5,
        ZeroPageX: 0xb5,
    },
    ldx: {
        Absolute: 0xae,
        AbsoluteY: 0xbe,
        Immediate: 0xa2,
        ZeroPage: 0xa6,
        ZeroPageY: 0xb6,
    },
    ldy: {
        Absolute: 0xac,
        AbsoluteX: 0xbc,
        Immediate: 0xa0,
        ZeroPage: 0xa4,
        ZeroPageX: 0xb4,
    },
    lsr: {
        Absolute: 0x4e,
        AbsoluteX: 0x5e,
        Implied: 0x4a,
        ZeroPage: 0x46,
        ZeroPageX: 0x56,
    },
    nop: { Implied: 0xea },
    ora: {
        Absolute: 0x0d,
        AbsoluteX: 0x1d,
        AbsoluteY: 0x19,
        Immediate: 0x09,
        PostindexedIndirect: 0x11,
        PreindexedIndirect: 0x01,
        ZeroPage: 0x05,
        ZeroPageX: 0x15,
    },
    pha: { Implied: 0x48 },
    php: { Implied: 0x08 },
    pla: { Implied: 0x68 },
    plp: { Implied: 0x28 },
    rol: {
        Absolute: 0x2e,
        AbsoluteX: 0x3e,
        Implied: 0x2a,
        ZeroPage: 0x26,
        ZeroPageX: 0x36,
    },
    ror: {
        Absolute: 0x6e,
        AbsoluteX: 0x7e,
        Implied: 0x6a,
        ZeroPage: 0x66,
        ZeroPageX: 0x76,
    },
    rti: { Implied: 0x40 },
    rts: { Implied: 0x60 },
    sbc: {
        Absolute: 0xed,
        AbsoluteX: 0xfd,
        AbsoluteY: 0xf9,
        Immediate: 0xe9,
        PostindexedIndirect: 0xf1,
        PreindexedIndirect: 0xe1,
        ZeroPage: 0xe5,
        ZeroPageX: 0xf5,
    },
    sec: { Implied: 0x38 },
    sed: { Implied: 0xf8 },
    sei: { Implied: 0x78 },
    sta: {
        Absolute: 0x8d,
        AbsoluteX: 0x9d,
        AbsoluteY: 0x99,
        PostindexedIndirect: 0x91,
        PreindexedIndirect: 0x81,
        ZeroPage: 0x85,
        ZeroPageX: 0x95,
    },
    stx: {
        Absolute: 0x8e,
        ZeroPage: 0x86,
        ZeroPageY: 0x96,
    },
    sty: {
        Absolute: 0x8c,
        ZeroPage: 0x84,
        ZeroPageX: 0x94,
    },
    tax: { Implied: 0xaa },
    tay: { Implied: 0xa8 },
    tsx: { Implied: 0xba },
    txa: { Implied: 0x8a },
    txs: { Implied: 0x9a },
    tya: { Implied: 0x98 },
};
//# sourceMappingURL=6502.js.map