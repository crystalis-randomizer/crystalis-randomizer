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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiNjUwMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy82NTAyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQztBQVFqQixNQUFNLE9BQU8sU0FBUztJQUF0QjtRQUVXLFdBQU0sR0FBVyxFQUFFLENBQUM7UUFDckIsY0FBUyxHQUFZLEVBQUUsQ0FBQztJQWtDbEMsQ0FBQztJQTdCQyxRQUFRLENBQUMsR0FBVyxFQUFFLFdBQW1CLE9BQU87UUFDOUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNoQjtRQUNELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxNQUFNO1FBQ0osT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxLQUFLO1FBQ0gsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsUUFBUSxDQUFDLEdBQWU7UUFDdEIsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBR0QsTUFBTSxDQUFDLEtBQWE7UUFDbEIsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLEVBQUUsR0FBRyxJQUFJLENB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QUFFLENBQUMsRUFBRSxDQUFDLENBQWMsQ0FBQztJQUM1QyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEQsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDekQsQ0FBQztBQUlGLFNBQVMsV0FBVyxDQUFDLEdBQVcsRUFDWCxjQUF1QixLQUFLO0lBQy9DLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7UUFBRSxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN0RSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1FBQUUsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckUsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztRQUFFLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDeEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDeEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQUUsT0FBTyxNQUFNLENBQUM7SUFDekMsSUFBSSxXQUFXO1FB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QUN4QixRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO0tBQ2hCO0lBQ0QsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFO1FBQ0gsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtRQUNmLFNBQVMsRUFBRSxJQUFJO1FBQ2YsbUJBQW1CLEVBQUUsSUFBSTtRQUN6QixrQkFBa0IsRUFBRSxJQUFJO1FBQ3hCLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztDQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgTE9HID0gdHJ1ZTtcblxuLy8gTXVsdGltYXAgZnJvbSBsYWJlbCB0byBhZGRyZXNzLlxuLy8gTmVnYXRpdmUgYWRkcmVzc2VzIGFyZSBQUkcgUk9NIGFuZCBuZWVkIHRvIGJlIG1hcHBlZC5cbmludGVyZmFjZSBMYWJlbHMge1xuICBbbGFiZWw6IHN0cmluZ106IG51bWJlcltdO1xufVxuXG5leHBvcnQgY2xhc3MgQXNzZW1ibGVyIHtcblxuICByZWFkb25seSBsYWJlbHM6IExhYmVscyA9IHt9O1xuICBwcml2YXRlIGFsbENodW5rczogQ2h1bmtbXSA9IFtdO1xuXG4gIC8vIElucHV0OiBhbiBhc3NlbWJseSBzdHJpbmdcbiAgLy8gT3V0cHV0OiBhZGRzIGNodW5rcyB0byB0aGUgc3RhdGUuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBhbHNvIG91dHB1dHRpbmcgdGhlIGRpY3Rpb25hcnkgb2YgbGFiZWxzPz8/XG4gIGFzc2VtYmxlKHN0cjogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nID0gJ2lucHV0Jyk6IHZvaWQge1xuICAgIGNvbnN0IGYgPSBuZXcgRmlsZSh0aGlzLmxhYmVscywgZmlsZW5hbWUpO1xuICAgIGZvciAoY29uc3QgbGluZSBvZiBzdHIuc3BsaXQoJ1xcbicpKSB7XG4gICAgICBmLmluZ2VzdChsaW5lKTtcbiAgICB9XG4gICAgY29uc3QgY2h1bmtzID0gZi5hc3NlbWJsZSgpO1xuICAgIHRoaXMuYWxsQ2h1bmtzLnB1c2goLi4uY2h1bmtzKTtcbiAgfVxuXG4gIGNodW5rcygpOiBDaHVua1tdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuYWxsQ2h1bmtzXTtcbiAgfVxuXG4gIHBhdGNoKCk6IFBhdGNoIHtcbiAgICByZXR1cm4gUGF0Y2guZnJvbSh0aGlzLmFsbENodW5rcyk7XG4gIH1cblxuICBwYXRjaFJvbShyb206IFVpbnQ4QXJyYXkpOiB2b2lkIHtcbiAgICBidWlsZFJvbVBhdGNoKHRoaXMucGF0Y2goKSkuYXBwbHkocm9tKTtcbiAgICB0aGlzLmFsbENodW5rcyA9IFtdO1xuICB9XG5cbiAgLy8gRW5zdXJlcyB0aGF0IGxhYmVsIGlzIHVuaXF1ZVxuICBleHBhbmQobGFiZWw6IHN0cmluZyk6IG51bWJlciB7XG4gICAgY29uc3QgW2FkZHIgPSBudWxsLCAuLi5yZXN0XSA9IHRoaXMubGFiZWxzW2xhYmVsXSB8fCBbXTtcbiAgICBpZiAoYWRkciA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgbGFiZWw6ICR7bGFiZWx9YCk7XG4gICAgaWYgKHJlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYE5vbi11bmlxdWUgbGFiZWw6ICR7bGFiZWx9YCk7XG4gICAgcmV0dXJuIGFkZHIgPCAwID8gfmFkZHIgOiBhZGRyO1xuICB9XG59XG5cbi8vIEEgc2luZ2xlIGNodW5rIG9mIGFzc2VtYmx5XG5jbGFzcyBGaWxlIHtcblxuICByZWFkb25seSBsaW5lczogQWJzdHJhY3RMaW5lW10gPSBbXTtcbiAgcGM6IG51bWJlciA9IDA7XG4gIGxpbmVOdW1iZXI6IG51bWJlciA9IC0xO1xuICBsaW5lQ29udGVudHM6IHN0cmluZyA9ICcnO1xuXG4gIC8vIEZvciBjb25kaXRpb25hbCBhc3NlbWJseVxuICBjb25kaXRpb25zOiBib29sZWFuW10gPSBbXTtcbiAgYXNzZW1ibGluZzogYm9vbGVhbiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbGFiZWxzOiBMYWJlbHMsIHJlYWRvbmx5IGZpbGVuYW1lOiBzdHJpbmcpIHt9XG5cbiAgYWRkTGluZShsaW5lOiBBYnN0cmFjdExpbmUpOiB2b2lkIHtcbiAgICB0aGlzLmxpbmVzLnB1c2gobGluZS5vcmlnKHRoaXMuZmlsZW5hbWUsIHRoaXMubGluZU51bWJlciwgdGhpcy5saW5lQ29udGVudHMpKTtcbiAgfVxuXG4gIGFkZExhYmVsKGxhYmVsOiBzdHJpbmcsIGFkZHJlc3M6IG51bWJlcik6IHZvaWQge1xuICAgIGlmICh0eXBlb2YgYWRkcmVzcyAhPT0gJ251bWJlcicpIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgYSBudW1iZXInKTtcbiAgICBjb25zdCBhcnIgPSB0aGlzLmxhYmVsc1tsYWJlbF0gfHwgKHRoaXMubGFiZWxzW2xhYmVsXSA9IFtdKTtcbiAgICBjb25zdCBpbmRleCA9IGZpbmQoYXJyLCBhZGRyZXNzKTtcbiAgICBpZiAoaW5kZXggPCAwKSBhcnIuc3BsaWNlKH5pbmRleCwgMCwgYWRkcmVzcyk7XG4gIH1cblxuICBwYXJzZU51bWJlcihudW06IHN0cmluZyk6IG51bWJlciB7XG4gICAgLy8gTWFrZSBhIHRlbXBvcmFyeSBjb250ZXh0OiBjYW4gb25seSBleHBhbmQgY29uc3RhbnRzLi4uXG4gICAgLy8gVE9ETyAtIG1ha2UgYSBiZXR0ZXIgZGlzdGluY3Rpb24gYmV0d2VlbiBjb25zdGFudHMvbWFjcm9zIHZzLiBsYWJlbHNcbiAgICAvLyAgICAgIC0gdGhlbiBhbGxvdyBleHBhbmRpbmcgbWFjcm9zIGJ1dCBub3QgbGFiZWxzLlxuICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTnVtYmVyKG51bSwgdHJ1ZSk7XG4gICAgcmV0dXJuIHR5cGVvZiBwYXJzZWQgPT09ICdudW1iZXInID9cbiAgICAgICAgcGFyc2VkIDogbmV3IENvbnRleHQodGhpcy5sYWJlbHMpLm1hcExhYmVsKHBhcnNlZCk7XG4gIH1cblxuICBpbmdlc3QobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5saW5lTnVtYmVyKys7XG4gICAgdGhpcy5saW5lQ29udGVudHMgPSBsaW5lO1xuICAgIC8vIHJlbW92ZSBjb21tZW50c1xuICAgIGxpbmUgPSBsaW5lLnJlcGxhY2UoLzsuKi8sICcnKTtcbiAgICAvLyB0cmltIHRoZSBzdHJpbmcsIGxlYXZlIGF0IG1vc3Qgb25lIHNwYWNlIGF0IHN0YXJ0XG4gICAgbGluZSA9IGxpbmUucmVwbGFjZSgvXFxzKy9nLCAnICcpO1xuICAgIGxpbmUgPSBsaW5lLnJlcGxhY2UoL1xccyQvZywgJycpO1xuXG4gICAgLy8gTG9vayBmb3IgZGlmZmVyZW50IGtpbmRzIG9mIGxpbmVzOiBkaXJlY3RpdmVzLCBsYWJlbHMsIGRhdGEsIG9yIGNvZGVcbiAgICAvLyBUcmljayAtIGhvdyB0byBrbm93IGZvciBmb3J3YXJkIHJlZnMgd2hldGhlciBpdCdzIG5lYXIgb3IgZmFyP1xuICAgIC8vIFNvbHV0aW9uIC0gemVyb3BhZ2UgcmVmcyBtdXN0IGJlIGRlZmluZWQuXG4gICAgbGV0IG1hdGNoO1xuXG4gICAgaWYgKChtYXRjaCA9IC9eXFxzKlxcLmlmKG4/KWRlZlxccysoXFxTKykvaS5leGVjKGxpbmUpKSkge1xuICAgICAgY29uc3QgZGVmID0gbWF0Y2hbMl0gaW4gdGhpcy5sYWJlbHM7XG4gICAgICB0aGlzLmNvbmRpdGlvbnMucHVzaChtYXRjaFsxXSA/ICFkZWYgOiBkZWYpO1xuICAgICAgdGhpcy5hc3NlbWJsaW5nID0gdGhpcy5jb25kaXRpb25zLmV2ZXJ5KHggPT4geCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC5lbHNlL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIHRoaXMuY29uZGl0aW9ucy5wdXNoKCF0aGlzLmNvbmRpdGlvbnMucG9wKCkpO1xuICAgICAgdGhpcy5hc3NlbWJsaW5nID0gdGhpcy5jb25kaXRpb25zLmV2ZXJ5KHggPT4geCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC5lbmRpZi9pLmV4ZWMobGluZSkpKSB7XG4gICAgICB0aGlzLmNvbmRpdGlvbnMucG9wKCk7XG4gICAgICB0aGlzLmFzc2VtYmxpbmcgPSB0aGlzLmNvbmRpdGlvbnMuZXZlcnkoeCA9PiB4KTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLmFzc2VtYmxpbmcpIHtcbiAgICAgIC8vIG5vdGhpbmcgZWxzZSB0byBkbyBhdCB0aGlzIHBvaW50LlxuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL15cXHMqXFwub3JnXFxzKyhcXFMrKS9pLmV4ZWMobGluZSkpKSB7XG4gICAgICB0aGlzLmFkZExpbmUobmV3IE9yZ0xpbmUoKHRoaXMucGMgPSBwYXJzZU51bWJlcihtYXRjaFsxXSkpKSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC5za2lwXFxzKyguKykvaS5leGVjKGxpbmUpKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIHNob3J0Y3V0IGZvciAub3JnIChQQyArIG51bSlcbiAgICAgIHRoaXMuYWRkTGluZShuZXcgT3JnTGluZSgodGhpcy5wYyArPSB0aGlzLnBhcnNlTnVtYmVyKG1hdGNoWzFdKSkpKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLmFzc2VydFxccysoPFxccyopPyhcXFMrKS9pLmV4ZWMobGluZSkpKSB7XG4gICAgICB0aGlzLmFkZExpbmUobmV3IEFzc2VydExpbmUoKHRoaXMucGMgPSBwYXJzZU51bWJlcihtYXRjaFsyXSkpLCAhbWF0Y2hbMV0pKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLmJhbmtcXHMrKFxcUyspXFxzKyhcXFMrKVxccyo6XFxzKihcXFMrKS9pLmV4ZWMobGluZSkpKSB7XG4gICAgICBjb25zdCBbLCBwcmcsIGNwdSwgbGVuZ3RoXSA9IG1hdGNoO1xuICAgICAgdGhpcy5hZGRMaW5lKG5ldyBCYW5rTGluZShwYXJzZU51bWJlcihwcmcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZU51bWJlcihjcHUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZU51bWJlcihsZW5ndGgpKSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC4oYnl0ZXx3b3JkKVxccysoLiopL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIGNvbnN0IGwgPSAobWF0Y2hbMV0gPT09ICd3b3JkJyA/IFdvcmRMaW5lIDogQnl0ZUxpbmUpLnBhcnNlKG1hdGNoWzJdKTtcbiAgICAgIHRoaXMuYWRkTGluZShsKTtcbiAgICAgIHRoaXMucGMgKz0gbC5zaXplKCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC5yZXNcXHMrKFteLF0rKSg/OixcXHMqKC4rKSk/L2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIGNvbnN0IGwgPSBCeXRlTGluZS5wYXJzZVJlcyh0aGlzLnBhcnNlTnVtYmVyKG1hdGNoWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcnNlTnVtYmVyKG1hdGNoWzJdIHx8ICcwJykpO1xuICAgICAgdGhpcy5hZGRMaW5lKGwpO1xuICAgICAgdGhpcy5wYyArPSBsLnNpemUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eZGVmaW5lXFxzKyhcXFMrKVxccysoLiopLy5leGVjKGxpbmUpKSkge1xuICAgICAgY29uc3QgbGFiZWwgPSBtYXRjaFsxXTtcbiAgICAgIHRoaXMuYWRkTGFiZWwobGFiZWwsIHRoaXMucGFyc2VOdW1iZXIobWF0Y2hbMl0pKTsgLy8gbm90IHR3b3MgY29tcGxlbWVudCwgYnV0IHN0aWxsIGFic1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL14oXFxTKz8pOiguKikkLy5leGVjKGxpbmUpKSkge1xuICAgICAgLy8gbGFiZWwgLSBleHRyYWN0IGFuZCByZWNvcmQuXG4gICAgICBjb25zdCBsYWJlbCA9IG1hdGNoWzFdO1xuICAgICAgbGluZSA9ICcgJyArIG1hdGNoWzJdO1xuICAgICAgdGhpcy5hZGRMYWJlbChsYWJlbCwgfnRoaXMucGMpO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL14oKD86Wy0rXStcXHMrKSspKC4qKSQvLmV4ZWMobGluZSkpKSB7XG4gICAgICAvLyByZWxhdGl2ZSBsYWJlbHMgKG11bHRpcGxlIGFsbG93ZWQpIC0gZXh0cmFjdCBhbmQgcmVjb3JkLlxuICAgICAgY29uc3QgbGFiZWxzID0gbWF0Y2hbMV07XG4gICAgICBmb3IgKGNvbnN0IGxhYmVsIG9mIGxhYmVscy50cmltKCkuc3BsaXQoJyAnKSkge1xuICAgICAgICB0aGlzLmFkZExhYmVsKGxhYmVsLCB+dGhpcy5wYyk7XG4gICAgICB9XG4gICAgICBsaW5lID0gJyAnICsgbWF0Y2hbMl07XG4gICAgfVxuICAgIGlmICgobWF0Y2ggPSAvXlxccysoW2Etel17M30pKFxccysuKik/JC8uZXhlYyhsaW5lKSkpIHtcbiAgICAgIGNvbnN0IGwgPSBuZXcgT3Bjb2RlKG1hdGNoWzFdIGFzIE1uZW1vbmljLCAobWF0Y2hbMl0gfHwgJycpLnRyaW0oKSwgdGhpcy5wYyk7XG4gICAgICB0aGlzLmFkZExpbmUobCk7XG4gICAgICB0aGlzLnBjICs9IGwuc2l6ZSgpO1xuICAgIH0gZWxzZSBpZiAoL1xcUy8udGVzdChsaW5lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcGFyc2UgbGluZSAke2xpbmV9IGF0ICR7dGhpcy5maWxlbmFtZX06JHtcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lTnVtYmVyfWApO1xuICAgIH1cbiAgfVxuXG4gIC8vIE91dHB1dCBpcyBhbiBhcnJheSBvZiBDaHVua3NcbiAgYXNzZW1ibGUoKTogQ2h1bmtbXSB7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBDb250ZXh0KHRoaXMubGFiZWxzKTtcbiAgICBjb25zdCBvdXRwdXQ6IG51bWJlcltdID0gW107XG4gICAgY29uc3Qgb3V0cHV0TGluZXM6IEFic3RyYWN0TGluZVtdID0gW107XG4gICAgY29uc3QgY29sbGlzaW9uID0gKGxpbmU6IEFic3RyYWN0TGluZSwgcGM6IG51bWJlcik6IG5ldmVyID0+IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29sbGlzaW9uIGF0ICQke3BjLnRvU3RyaW5nKDE2KVxuICAgICAgICAgICAgICAgICAgICAgICB9OlxcbiAgd3JpdHRlbiBhdCAke291dHB1dExpbmVzW3BjXS5zb3VyY2UoKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiAgd3JpdHRlbiBhdCAke2xpbmUuc291cmNlKCl9YCk7XG4gICAgfTtcbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgdGhpcy5saW5lcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbGluZS5leHBhbmQoY29udGV4dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnN0IHN0YWNrID0gZS5zdGFjay5yZXBsYWNlKGBFcnJvcjogJHtlLm1lc3NhZ2V9YCwgJycpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZS5tZXNzYWdlO1xuICAgICAgICBjb25zdCBwb3MgPSBgIGZyb20gbGluZSAke2xpbmUub3JpZ0xpbmVOdW1iZXIgKyAxfTogXFxgJHtsaW5lLm9yaWdDb250ZW50fVxcYGA7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHttZXNzYWdlfSR7cG9zfSR7c3RhY2t9XFxuPT09PT09PT09PT09PT09PWApO1xuICAgICAgfVxuICAgICAgaWYgKGxpbmUgaW5zdGFuY2VvZiBPcmdMaW5lICYmIG91dHB1dFtsaW5lLnBjXSAhPSBudWxsKSBjb2xsaXNpb24obGluZSwgbGluZS5wYyk7XG4gICAgICBmb3IgKGNvbnN0IGIgb2YgbGluZS5ieXRlcygpKSB7XG4gICAgICAgIGlmIChvdXRwdXRbY29udGV4dC5wY10gIT0gbnVsbCkgY29sbGlzaW9uKGxpbmUsIGNvbnRleHQucGMpO1xuICAgICAgICBvdXRwdXRMaW5lc1tjb250ZXh0LnBjXSA9IGxpbmU7XG4gICAgICAgIG91dHB1dFtjb250ZXh0LnBjKytdID0gYjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gb3V0cHV0IGlzIGEgc3BhcnNlIGFycmF5IC0gZmluZCB0aGUgZmlyc3QgaW5kaWNlcy5cbiAgICBjb25zdCBzdGFydHMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGkgaW4gb3V0cHV0KSB7XG4gICAgICBpZiAoIShOdW1iZXIoaSkgLSAxIGluIG91dHB1dCkpIHN0YXJ0cy5wdXNoKE51bWJlcihpKSk7XG4gICAgfVxuICAgIC8vIG5vdyBvdXRwdXQgY2h1bmtzLlxuICAgIGNvbnN0IGNodW5rcyA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3RhcnQgb2Ygc3RhcnRzKSB7XG4gICAgICBjb25zdCBkYXRhID0gW107XG4gICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgaW4gb3V0cHV0OyBpKyspIHtcbiAgICAgICAgZGF0YS5wdXNoKG91dHB1dFtpXSk7XG4gICAgICB9XG4gICAgICBjaHVua3MucHVzaChuZXcgQ2h1bmsoc3RhcnQsIGRhdGEpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY29uZGl0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW50ZXJtaW5hdGVkIC5pZicpO1xuICAgIH1cbiAgICByZXR1cm4gY2h1bmtzO1xuICB9XG59XG5cbi8vIEJhc2UgY2xhc3Mgc28gdGhhdCB3ZSBjYW4gdHJhY2sgd2hlcmUgZXJyb3JzIGNvbWUgZnJvbVxuYWJzdHJhY3QgY2xhc3MgQWJzdHJhY3RMaW5lIHtcblxuICBvcmlnRmlsZTogc3RyaW5nID0gJyc7XG4gIG9yaWdMaW5lTnVtYmVyOiBudW1iZXIgPSAtMTtcbiAgb3JpZ0NvbnRlbnQ6IHN0cmluZyA9ICcnO1xuXG4gIG9yaWcoZmlsZTogc3RyaW5nLCBudW06IG51bWJlciwgY29udGVudDogc3RyaW5nKTogdGhpcyB7XG4gICAgdGhpcy5vcmlnRmlsZSA9IGZpbGU7XG4gICAgdGhpcy5vcmlnTGluZU51bWJlciA9IG51bTtcbiAgICB0aGlzLm9yaWdDb250ZW50ID0gY29udGVudDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGFic3RyYWN0IGV4cGFuZChjb250ZXh0OiBDb250ZXh0KTogdm9pZDtcbiAgYWJzdHJhY3QgYnl0ZXMoKTogbnVtYmVyW107XG4gIGFic3RyYWN0IHNpemUoKTogbnVtYmVyO1xuXG4gIHNvdXJjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0aGlzLm9yaWdGaWxlfToke3RoaXMub3JpZ0xpbmVOdW1iZXIgKyAxfSAgJHt0aGlzLm9yaWdDb250ZW50fWA7XG4gIH1cbn1cblxuY2xhc3MgQnl0ZUxpbmUgZXh0ZW5kcyBBYnN0cmFjdExpbmUge1xuICBzdGF0aWMgcGFyc2UobGluZTogc3RyaW5nKSB7XG4gICAgY29uc3QgYnl0ZXM6IG51bWJlcltdID0gW107XG4gICAgZm9yIChsZXQgcGFydCBvZiBsaW5lLnNwbGl0KCcsJykpIHtcbiAgICAgIHBhcnQgPSBwYXJ0LnRyaW0oKTtcbiAgICAgIGNvbnN0IG1hdGNoID0gL15cIiguKilcIiQvLmV4ZWMocGFydCk7XG4gICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgYnl0ZXMucHVzaCguLi5bLi4ubWF0Y2hbMV1dLm1hcChzID0+IHMuY2hhckNvZGVBdCgwKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnl0ZXMucHVzaChwYXJzZU51bWJlcihwYXJ0KSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgQnl0ZUxpbmUoYnl0ZXMpO1xuICB9XG5cbiAgc3RhdGljIHBhcnNlUmVzKGNvdW50OiBudW1iZXIsIGRlZmF1bHRWYWx1ZTogbnVtYmVyKSB7XG4gICAgcmV0dXJuIG5ldyBCeXRlTGluZShuZXcgQXJyYXk8bnVtYmVyPihjb3VudCkuZmlsbChkZWZhdWx0VmFsdWUpKTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgYnl0ZXNJbnRlcm5hbDogbnVtYmVyW10pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgYnl0ZXMoKTogbnVtYmVyW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5ieXRlc0ludGVybmFsXTtcbiAgfVxuXG4gIHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5ieXRlc0ludGVybmFsLmxlbmd0aDtcbiAgfVxuXG4gIGV4cGFuZCgpOiB2b2lkIHt9XG59XG5cbmNsYXNzIFdvcmRMaW5lIGV4dGVuZHMgQWJzdHJhY3RMaW5lIHtcbiAgc3RhdGljIHBhcnNlKGxpbmU6IHN0cmluZykge1xuICAgIGNvbnN0IHdvcmRzID0gW107XG4gICAgZm9yIChsZXQgcGFydCBvZiBsaW5lLnNwbGl0KCcsJykpIHtcbiAgICAgIHBhcnQgPSBwYXJ0LnRyaW0oKTtcbiAgICAgIHBhcnQgPSBwYXJ0LnJlcGxhY2UoL1soKV0vZywgJycpOyAvLyBoYW5kbGUgdGhlc2UgZGlmZmVyZW50bHk/IGNvbXBsZW1lbnQ/XG4gICAgICB3b3Jkcy5wdXNoKHBhcnNlTnVtYmVyKHBhcnQsIHRydWUpKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBXb3JkTGluZSh3b3Jkcyk7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHdvcmRzOiAobnVtYmVyIHwgc3RyaW5nKVtdKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGJ5dGVzKCk6IG51bWJlcltdIHtcbiAgICBjb25zdCBieXRlcyA9IFtdO1xuICAgIGZvciAoY29uc3QgdyBvZiB0aGlzLndvcmRzIGFzIG51bWJlcltdKSB7IC8vIGFscmVhZHkgbWFwcGVkXG4gICAgICBieXRlcy5wdXNoKHcgJiAweGZmKTtcbiAgICAgIGJ5dGVzLnB1c2godyA+Pj4gOCk7XG4gICAgfVxuICAgIHJldHVybiBieXRlcztcbiAgfVxuXG4gIHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy53b3Jkcy5sZW5ndGggKiAyO1xuICB9XG5cbiAgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMud29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy53b3Jkc1tpXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy53b3Jkc1tpXSA9IGNvbnRleHQubWFwKHRoaXMud29yZHNbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBPcmdMaW5lIGV4dGVuZHMgQWJzdHJhY3RMaW5lIHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcGM6IG51bWJlcikgeyBzdXBlcigpOyB9XG5cbiAgYnl0ZXMoKTogbnVtYmVyW10geyByZXR1cm4gW107IH1cblxuICBzaXplKCk6IG51bWJlciB7IHJldHVybiAwOyB9XG5cbiAgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkIHtcbiAgICAvLyBUT0RPIC0gY2FuIHdlIGFsbG93IHRoaXMucGMgdG8gYmUgYSBsYWJlbD9cbiAgICBjb250ZXh0LnBjID0gdGhpcy5wYztcbiAgfVxufVxuXG5jbGFzcyBBc3NlcnRMaW5lIGV4dGVuZHMgQWJzdHJhY3RMaW5lIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwYzogbnVtYmVyLFxuICAgICAgICAgICAgICBwcml2YXRlIHJlYWRvbmx5IGV4YWN0OiBib29sZWFuKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGJ5dGVzKCk6IG51bWJlcltdIHsgcmV0dXJuIFtdOyB9XG5cbiAgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gMDsgfVxuXG4gIGV4cGFuZChjb250ZXh0OiBDb250ZXh0KTogdm9pZCB7XG4gICAgLy8gVE9ETyAtIGNhbiB3ZSBhbGxvdyB0aGlzLnBjIHRvIGJlIGEgbGFiZWw/XG4gICAgaWYgKHRoaXMuZXhhY3QgPyBjb250ZXh0LnBjICE9PSB0aGlzLnBjIDogY29udGV4dC5wYyA+IHRoaXMucGMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzYWxpZ25tZW50OiBleHBlY3RlZCAke3RoaXMuZXhhY3QgPyAnJyA6ICc8ICd9JCR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBjLnRvU3RyaW5nKDE2KX0gYnV0IHdhcyAkJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQucGMudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZXhhY3QgJiYgTE9HKSB7XG4gICAgICBjb25zb2xlLmxvZyhgRnJlZTogJHt0aGlzLnBjIC0gY29udGV4dC5wY30gYnl0ZXMgYmV0d2VlbiAkJHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wYy50b1N0cmluZygxNil9IGFuZCAkJHt0aGlzLnBjLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgQmFua0xpbmUgZXh0ZW5kcyBBYnN0cmFjdExpbmUge1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBwcmc6IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgY3B1OiBudW1iZXIsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGJ5dGVzKCk6IG51bWJlcltdIHsgcmV0dXJuIFtdOyB9XG5cbiAgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gMDsgfVxuXG4gIGV4cGFuZChjb250ZXh0OiBDb250ZXh0KTogdm9pZCB7XG4gICAgY29udGV4dC51cGRhdGVCYW5rKHRoaXMucHJnLCB0aGlzLmNwdSwgdGhpcy5sZW5ndGgpO1xuICB9XG59XG5cbmNsYXNzIENvbnRleHQge1xuXG4gIHBjOiBudW1iZXIgPSAwO1xuICBjcHVUb1ByZzogKG51bWJlciB8IG51bGwpW10gPSBbXTtcbiAgcHJnVG9DcHU6IChudW1iZXIgfCBudWxsKVtdID0gW107XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbGFiZWxzOiBMYWJlbHMpIHt9XG5cbiAgLy8gTm90ZTogdGhlcmUncyBhbGwgc29ydHMgb2Ygd2F5cyB0aGlzIGNvdWxkIGJlIG1hZGUgbW9yZSBlZmZpY2llbnQsXG4gIC8vIGJ1dCBJIGRvbid0IHJlYWxseSBjYXJlIHNpbmNlIGl0J3Mgbm90IGluIGFuIGlubmVyIGxvb3AuXG4gIHVwZGF0ZUJhbmsocHJnOiBudW1iZXIsIGNwdTogbnVtYmVyLCBsZW5ndGg6IG51bWJlcik6IHZvaWQge1xuICAgIC8vIGludmFsaWRhdGUgcHJldmlvdXMgcmFuZ2UgZm9yIHRoaXMgQ1BVIGFkZHJlc3Nlc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGNwdUFkZHIgPSBjcHUgKyBpO1xuICAgICAgY29uc3QgcHJnQWRkciA9IHRoaXMuY3B1VG9QcmdbY3B1QWRkcl07XG4gICAgICBpZiAocHJnQWRkciAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMucHJnVG9DcHVbcHJnQWRkcl0gPSBudWxsO1xuICAgICAgICB0aGlzLmNwdVRvUHJnW2NwdUFkZHJdID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gcmVjb3JkIGN1cnJlbnQgcmFuZ2VcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjcHVBZGRyID0gY3B1ICsgaTtcbiAgICAgIGNvbnN0IHByZ0FkZHIgPSBwcmcgKyBpO1xuICAgICAgdGhpcy5wcmdUb0NwdVtwcmdBZGRyXSA9IGNwdUFkZHI7XG4gICAgICB0aGlzLmNwdVRvUHJnW2NwdUFkZHJdID0gcHJnQWRkcjtcbiAgICB9XG4gIH1cblxuICBtYXBMYWJlbChsYWJlbDogc3RyaW5nLCBwYz86IG51bWJlcik6IG51bWJlciB7XG4gICAgLy8gU3VwcG9ydCB2ZXJ5IHNpbXBsZSBhcml0aG1ldGljICgrLCAtLCA8LCBhbmQgPikuXG4gICAgbGV0IG1hdGNoID0gLyhbXi0rXSspKFstK10pKC4qKS8uZXhlYyhsYWJlbCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBjb25zdCBsZWZ0ID0gdGhpcy5tYXAocGFyc2VOdW1iZXIobWF0Y2hbMV0udHJpbSgpLCB0cnVlKSwgcGMpO1xuICAgICAgY29uc3QgcmlnaHQgPSB0aGlzLm1hcChwYXJzZU51bWJlcihtYXRjaFszXS50cmltKCksIHRydWUpLCBwYyk7XG4gICAgICByZXR1cm4gbWF0Y2hbMl0gPT09ICctJyA/IGxlZnQgLSByaWdodCA6IGxlZnQgKyByaWdodDtcbiAgICB9XG4gICAgbWF0Y2ggPSAvKFteKl0rKVsqXSguKikvLmV4ZWMobGFiZWwpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgbGVmdCA9IHRoaXMubWFwKHBhcnNlTnVtYmVyKG1hdGNoWzFdLnRyaW0oKSwgdHJ1ZSksIHBjKTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gdGhpcy5tYXAocGFyc2VOdW1iZXIobWF0Y2hbMl0udHJpbSgpLCB0cnVlKSwgcGMpO1xuICAgICAgcmV0dXJuIGxlZnQgKiByaWdodDtcbiAgICB9XG4gICAgbWF0Y2ggPSAvKFs8Pl0pKC4qKS8uZXhlYyhsYWJlbCk7IC8vIFRPRE8gLSBeIGZvciBiYW5rIGJ5dGU/XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBjb25zdCBhcmcgPSB0aGlzLm1hcChwYXJzZU51bWJlcihtYXRjaFsyXS50cmltKCksIHRydWUpLCBwYyk7XG4gICAgICByZXR1cm4gbWF0Y2hbMV0gPT09ICc8JyA/IGFyZyAmIDB4ZmYgOiAoYXJnID4+PiA4KSAmIDB4ZmY7XG4gICAgfVxuXG4gICAgLy8gTG9vayB1cCB3aGF0ZXZlcidzIGxlZnRvdmVyLlxuICAgIGxldCBhZGRycyA9IHRoaXMubGFiZWxzW2xhYmVsXTtcbiAgICBpZiAoIWFkZHJzKSB0aHJvdyBuZXcgRXJyb3IoYExhYmVsIG5vdCBmb3VuZDogJHtsYWJlbH1gKTtcbiAgICBpZiAocGMgPT0gbnVsbCkge1xuICAgICAgaWYgKGFkZHJzLmxlbmd0aCA+IDEpIHRocm93IG5ldyBFcnJvcihgQW1iaWd1b3VzIGxhYmVsOiAke2xhYmVsfWApO1xuICAgICAgcmV0dXJuIGFkZHJzWzBdO1xuICAgIH1cbiAgICAvLyBmaW5kIHRoZSByZWxldmFudCBsYWJlbC5cbiAgICBwYyA9IH4ocGMgKyAyKTtcbiAgICBjb25zdCBpbmRleCA9IGZpbmQoYWRkcnMsIHBjKTtcbiAgICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGFkZHJzW2luZGV4XTsgLy8gc2hvdWxkIG5ldmVyIGhhcHBlbi5cbiAgICBpZiAoaW5kZXggPT09IC0xKSByZXR1cm4gYWRkcnNbMF07XG4gICAgaWYgKGluZGV4ID09PSB+YWRkcnMubGVuZ3RoKSByZXR1cm4gYWRkcnNbYWRkcnMubGVuZ3RoIC0gMV07XG4gICAgYWRkcnMgPSBhZGRycy5zbGljZSh+aW5kZXggLSAxLCB+aW5kZXggKyAxKTtcbiAgICBpZiAobGFiZWwuc3RhcnRzV2l0aCgnLScpKSByZXR1cm4gYWRkcnNbMV07XG4gICAgaWYgKGxhYmVsLnN0YXJ0c1dpdGgoJysnKSkgcmV0dXJuIGFkZHJzWzBdO1xuICAgIGNvbnN0IG1pZCA9IChhZGRyc1swXSArIGFkZHJzWzFdKSAvIDI7XG4gICAgcmV0dXJuIHBjIDwgbWlkID8gYWRkcnNbMF0gOiBhZGRyc1sxXTtcbiAgfVxuXG4gIG1hcFByZ1RvQ3B1KHByZ0FkZHI6IG51bWJlcik6IG51bWJlciB7XG4gICAgY29uc3QgY3B1QWRkciA9IHRoaXMucHJnVG9DcHVbcHJnQWRkcl07XG4gICAgLy8gSWYgdGhpcyBlcnJvcnMsIHdlIHByb2JhYmx5IG5lZWQgdG8gYWRkIGEgLmJhbmsgZGlyZWN0aXZlLlxuICAgIGlmIChjcHVBZGRyID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgUFJHIGFkZHJlc3MgdW5tYXBwZWQ6ICQke3ByZ0FkZHIudG9TdHJpbmcoMTYpfWApO1xuICAgIHJldHVybiBjcHVBZGRyO1xuICB9XG5cbiAgLy8gcmV0dXJuIENQVSBhZGRyZXNzIG9yIHRocm93IC0gbWFpbiBleHRlcm5hbCBlbnRyeSBwb2ludC5cbiAgbWFwKHByZ0FkZHI6IHN0cmluZyB8IG51bWJlciwgcGM/OiBudW1iZXIpIHtcbiAgICBsZXQgYWRkciA9IHByZ0FkZHI7XG4gICAgaWYgKGFkZHIgPT0gbnVsbCkgcmV0dXJuIGFkZHI7XG4gICAgaWYgKHR5cGVvZiBhZGRyID09PSAnc3RyaW5nJykge1xuICAgICAgYWRkciA9IHRoaXMubWFwTGFiZWwoYWRkciwgcGMpO1xuICAgIH1cbiAgICBpZiAoYWRkciA8IDApIHsgLy8gdGhlIGxhYmVsIG1hcCByZXR1cm5zIH5hZGRyZXNzIGlmIGl0IHNob3VsZCBiZSBtYXBwZWRcbiAgICAgIGFkZHIgPSB0aGlzLm1hcFByZ1RvQ3B1KH5hZGRyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFkZHI7XG4gIH1cbn1cblxuLy8gQSBzaW5nbGUgY2hhbmdlLlxuY2xhc3MgQ2h1bmsgZXh0ZW5kcyBVaW50OEFycmF5IHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgc3RhcnQ6IG51bWJlciwgZGF0YTogVWludDhBcnJheSB8IG51bWJlcltdKSB7XG4gICAgc3VwZXIoZGF0YS5sZW5ndGgpO1xuICAgIHRoaXMuc2V0KGRhdGEpO1xuICB9XG5cbiAgYXBwbHkoZGF0YTogVWludDhBcnJheSk6IHZvaWQge1xuICAgIGRhdGEuc3ViYXJyYXkodGhpcy5zdGFydCwgdGhpcy5zdGFydCArIHRoaXMubGVuZ3RoKS5zZXQodGhpcyk7XG4gIH1cblxuICBzaGlmdChvZmZzZXQ6IG51bWJlcik6IENodW5rIHtcbiAgICBjb25zdCBjID0gbmV3IENodW5rKHRoaXMuc3RhcnQgKyBvZmZzZXQsIHRoaXMpO1xuICAgIHJldHVybiBjO1xuICB9XG59XG5cbi8vIEFuIElQUyBwYXRjaCAtIHRoaXMgaXRlcmF0ZXMgYXMgYSBidW5jaCBvZiBjaHVua3MuICBUbyBjb25jYXRlbmF0ZVxuLy8gdHdvIHBhdGNoZXMgKHAxIGFuZCBwMikgc2ltcGx5IGNhbGwgUGF0Y2guZnJvbShbLi4ucDEsIC4uLnAyXSlcbmNsYXNzIFBhdGNoIHtcbiAgc3RhdGljIGZyb20oY2h1bmtzOiBDaHVua1tdKSB7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIG1vdmluZyB0aGlzIHRvIHRoZSBlZ2VzdGlvbiBzaWRlLlxuICAgIGNvbnN0IGFycmF5cyA9IFtdO1xuICAgIGxldCBsZW5ndGggPSA4O1xuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgY2h1bmtzKSB7XG4gICAgICBjb25zdCBhcnIgPSBuZXcgVWludDhBcnJheShjaHVuay5sZW5ndGggKyA1KTtcbiAgICAgIGFyclswXSA9IGNodW5rLnN0YXJ0ID4+PiAxNjtcbiAgICAgIGFyclsxXSA9IChjaHVuay5zdGFydCA+Pj4gOCkgJiAweGZmO1xuICAgICAgYXJyWzJdID0gY2h1bmsuc3RhcnQgJiAweGZmO1xuICAgICAgYXJyWzNdID0gY2h1bmsubGVuZ3RoID4+PiA4O1xuICAgICAgYXJyWzRdID0gY2h1bmsubGVuZ3RoICYgMHhmZjtcbiAgICAgIGFyci5zZXQoY2h1bmssIDUpO1xuICAgICAgYXJyYXlzLnB1c2goYXJyKTtcbiAgICAgIGxlbmd0aCArPSBhcnIubGVuZ3RoO1xuICAgICAgLy8gY29uc29sZS5sb2coYFBhdGNoIGZyb20gJCR7Y2h1bmsuc3RhcnQudG9TdHJpbmcoMTYpfS4uJCR7XG4gICAgICAvLyAgICAgICAgICAgICAgKGNodW5rLnN0YXJ0K2NodW5rLmxlbmd0aCkudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgICBjb25zdCBkYXRhID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKTtcbiAgICBsZXQgaSA9IDU7XG4gICAgZGF0YVswXSA9IDB4NTA7XG4gICAgZGF0YVsxXSA9IDB4NDE7XG4gICAgZGF0YVsyXSA9IDB4NTQ7XG4gICAgZGF0YVszXSA9IDB4NDM7XG4gICAgZGF0YVs0XSA9IDB4NDg7XG4gICAgZm9yIChjb25zdCBhcnIgb2YgYXJyYXlzKSB7XG4gICAgICBkYXRhLnN1YmFycmF5KGksIGkgKyBhcnIubGVuZ3RoKS5zZXQoYXJyKTtcbiAgICAgIGkgKz0gYXJyLmxlbmd0aDtcbiAgICB9XG4gICAgZGF0YVtpXSA9IDB4NDU7XG4gICAgZGF0YVtpICsgMV0gPSAweDRmO1xuICAgIGRhdGFbaSArIDJdID0gMHg0NjtcbiAgICByZXR1cm4gbmV3IFBhdGNoKGRhdGEpO1xuICB9XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgZGF0YTogVWludDhBcnJheSkge31cblxuICBhcHBseShkYXRhOiBVaW50OEFycmF5KSB7XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiB0aGlzKSB7XG4gICAgICBjaHVuay5hcHBseShkYXRhKTtcbiAgICB9XG4gIH1cblxuICAqIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPENodW5rPiB7XG4gICAgbGV0IHBvcyA9IDU7XG4gICAgd2hpbGUgKHBvcyA8IHRoaXMuZGF0YS5sZW5ndGggLSAzKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHRoaXMuZGF0YVtwb3NdIDw8IDE2IHwgdGhpcy5kYXRhW3BvcyArIDFdIDw8IDggfCB0aGlzLmRhdGFbcG9zICsgMl07XG4gICAgICBjb25zdCBsZW4gPSB0aGlzLmRhdGFbcG9zICsgM10gPDwgOCB8IHRoaXMuZGF0YVtwb3MgKyA0XTtcbiAgICAgIHlpZWxkIG5ldyBDaHVuayhzdGFydCwgdGhpcy5kYXRhLnN1YmFycmF5KHBvcyArIDUsIHBvcyArIDUgKyBsZW4pKTtcbiAgICAgIHBvcyArPSBsZW4gKyA1O1xuICAgIH1cbiAgfVxuXG4gIHRvSGV4U3RyaW5nKCkge1xuICAgIHJldHVybiBbLi4udGhpcy5kYXRhXS5tYXAoeCA9PiB4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpKS5qb2luKCcnKTtcbiAgfVxufVxuXG4vLyBJbnB1dDogYW4gYXNzZW1ibHkgc3RyaW5nXG4vLyBPdXRwdXQ6IGEgcGF0Y2hcbi8vIFRPRE8gLSBjb25zaWRlciBhbHNvIG91dHB1dHRpbmcgdGhlIGRpY3Rpb25hcnkgb2YgbGFiZWxzPz8/XG5leHBvcnQgY29uc3QgYXNzZW1ibGUgPSAoc3RyOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcgPSAnaW5wdXQnKSA9PiB7XG4gIGNvbnN0IGFzbSA9IG5ldyBGaWxlKHt9LCBmaWxlbmFtZSk7XG4gIGZvciAoY29uc3QgbGluZSBvZiBzdHIuc3BsaXQoJ1xcbicpKSB7XG4gICAgYXNtLmluZ2VzdChsaW5lKTtcbiAgfVxuICBjb25zdCBjaHVua3MgPSBhc20uYXNzZW1ibGUoKTtcbiAgcmV0dXJuIFBhdGNoLmZyb20oY2h1bmtzKTtcbn07XG5cbmV4cG9ydCBjb25zdCBidWlsZFJvbVBhdGNoID0gKHByZzogUGF0Y2gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHI/OiBQYXRjaCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZ1NpemU6IG51bWJlciA9IDB4NDAwMDApID0+IHtcbiAgY29uc3QgcHJnQ2h1bmtzID0gWy4uLnByZ10ubWFwKGMgPT4gYy5zaGlmdCgweDEwKSk7XG4gIGNvbnN0IGNockNodW5rcyA9IFsuLi4oY2hyIHx8IFtdKV0ubWFwKGMgPT4gYy5zaGlmdCgweDEwICsgcHJnU2l6ZSkpO1xuICByZXR1cm4gUGF0Y2guZnJvbShbLi4ucHJnQ2h1bmtzLCAuLi5jaHJDaHVua3NdKTtcbn07XG5cbi8vIE9wY29kZSBkYXRhIGZvciA2NTAyXG4vLyBEb2VzIG5vdCBuZWVkIHRvIGJlIGFzIHRob3JvdWdoIGFzIEpTTkVTJ3MgZGF0YVxuXG5jbGFzcyBPcGNvZGUgZXh0ZW5kcyBBYnN0cmFjdExpbmUge1xuXG4gIGFyZzogT3Bjb2RlQXJnO1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBtbmVtb25pYzogTW5lbW9uaWMsXG4gICAgICAgICAgICAgIGFyZzogc3RyaW5nLFxuICAgICAgICAgICAgICBwcml2YXRlIHBjSW50ZXJuYWw6IG51bWJlcikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5hcmcgPSBmaW5kTW9kZShtbmVtb25pYyBhcyBNbmVtb25pYywgYXJnKTtcbiAgfVxuXG4gIC8vIHJlYWRvbmx5IGZyb20gdGhlIG91dHNpZGVcbiAgZ2V0IHBjKCk6IG51bWJlciB7IHJldHVybiB0aGlzLnBjSW50ZXJuYWw7IH1cblxuICBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIDEgKyB0aGlzLmFyZ1sxXTtcbiAgfVxuXG4gIGJ5dGVzKCk6IG51bWJlcltdIHtcbiAgICBsZXQgdmFsdWUgPSB0aGlzLmFyZ1syXSBhcyBudW1iZXI7IC8vIGFscmVhZHkgZXhwYW5kZWRcbiAgICBpZiAodGhpcy5hcmdbMF0gPT09ICdSZWxhdGl2ZScpIHtcbiAgICAgIHZhbHVlIC09IHRoaXMucGMgKyAyO1xuICAgICAgaWYgKCEodmFsdWUgPCAweDgwICYmIHZhbHVlID49IC0weDgwKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRvbyBmYXIgdG8gYnJhbmNoOiAke3ZhbHVlfSBhdCAke3RoaXMuc291cmNlKCl9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IG9wY29kZSA9IG9wY29kZXNbdGhpcy5tbmVtb25pY11bdGhpcy5hcmdbMF1dITtcbiAgICBpZiAob3Bjb2RlID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTm8gb3Bjb2RlOiAke3RoaXMubW5lbW9uaWN9ICR7dGhpcy5hcmdbMF19YCk7XG4gICAgY29uc3QgYnl0ZXMgPSBbb3Bjb2RlXTtcbiAgICBsZXQgY291bnQgPSB0aGlzLmFyZ1sxXTtcbiAgICB3aGlsZSAoY291bnQtLSkge1xuICAgICAgYnl0ZXMucHVzaCh2YWx1ZSAmIDB4ZmYpO1xuICAgICAgdmFsdWUgPj4+PSA4O1xuICAgIH1cbiAgICByZXR1cm4gYnl0ZXM7XG4gIH1cblxuICBleHBhbmQoY29udGV4dDogQ29udGV4dCk6IHZvaWQge1xuICAgIHRoaXMuYXJnWzJdID0gY29udGV4dC5tYXAodGhpcy5hcmdbMl0sIHRoaXMucGMpO1xuICAgIHRoaXMucGNJbnRlcm5hbCA9IGNvbnRleHQubWFwKH50aGlzLnBjKTtcbiAgfVxufVxuXG4vLyBiaW5hcnkgc2VhcmNoLiByZXR1cm5zIGluZGV4IG9yIGNvbXBsZW1lbnQgZm9yIHNwbGljZSBwb2ludFxuY29uc3QgZmluZCA9IChhcnI6IG51bWJlcltdLCB2YWw6IG51bWJlcik6IG51bWJlciA9PiB7XG4gIGxldCBhID0gMDtcbiAgbGV0IGIgPSBhcnIubGVuZ3RoIC0gMTtcbiAgaWYgKGIgPCAwKSByZXR1cm4gfjA7XG4gIGlmICh2YWwgPCBhcnJbMF0pIHJldHVybiB+MDtcbiAgY29uc3QgZmIgPSBhcnJbYl07XG4gIGlmICh2YWwgPT09IGZiKSByZXR1cm4gYjtcbiAgaWYgKHZhbCA+IGZiKSByZXR1cm4gfmFyci5sZW5ndGg7XG4gIHdoaWxlIChiIC0gYSA+IDEpIHtcbiAgICBjb25zdCBtaWQgPSAoYSArIGIpID4+IDE7XG4gICAgY29uc3QgZm1pZCA9IGFyclttaWRdO1xuICAgIGlmICh2YWwgPCBmbWlkKSB7XG4gICAgICBiID0gbWlkO1xuICAgIH0gZWxzZSB7XG4gICAgICBhID0gbWlkO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsID09PSBhcnJbYV0gPyBhIDogfmI7XG59O1xuXG50eXBlIEFkZHJlc3NpbmdNb2RlID1cbiAgJ0ltcGxpZWQnIHwgJ0ltbWVkaWF0ZScgfFxuICAnWmVyb1BhZ2UnIHwgJ1plcm9QYWdlWCcgfCAnWmVyb1BhZ2VZJyB8XG4gICdQcmVpbmRleGVkSW5kaXJlY3QnIHwgJ1Bvc3RpbmRleGVkSW5kaXJlY3QnIHwgJ0luZGlyZWN0QWJzb2x1dGUnIHxcbiAgJ0Fic29sdXRlWCcgfCAnQWJzb2x1dGVZJyB8XG4gICdBYnNvbHV0ZScgfCAnUmVsYXRpdmUnO1xudHlwZSBPcGNvZGVBcmcgPSBbQWRkcmVzc2luZ01vZGUsIC8qIGJ5dGVzOiAqLyBudW1iZXIsIC8qIGFyZzogKi8gbnVtYmVyIHwgc3RyaW5nXTtcblxuY29uc3QgZmluZE1vZGUgPSAobW5lbW9uaWM6IE1uZW1vbmljLCBhcmc6IHN0cmluZyk6IE9wY29kZUFyZyA9PiB7XG4gIGZvciAoY29uc3QgW3JlLCBmXSBvZiBtb2Rlcykge1xuICAgIGNvbnN0IG1hdGNoID0gcmUuZXhlYyhhcmcpO1xuICAgIGlmICghbWF0Y2gpIGNvbnRpbnVlO1xuICAgIGNvbnN0IG0gPSBmKG1hdGNoWzFdKTtcbiAgICBpZiAoIShtbmVtb25pYyBpbiBvcGNvZGVzKSkgdGhyb3cgbmV3IEVycm9yKGBCYWQgbW5lbW9uaWM6ICR7bW5lbW9uaWN9YCk7XG4gICAgaWYgKG1bMF0gaW4gb3Bjb2Rlc1ttbmVtb25pY10pIHJldHVybiBtO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgbW9kZSBmb3IgJHttbmVtb25pY30gJHthcmd9XG5FeHBlY3RlZCBvbmUgb2YgWyR7T2JqZWN0LmtleXMob3Bjb2Rlc1ttbmVtb25pY10pLmpvaW4oJywgJyl9XWApO1xufTtcblxuY29uc3QgbW9kZXM6IFtSZWdFeHAsIChhcmc6IHN0cmluZykgPT4gT3Bjb2RlQXJnXVtdID0gW1xuICAvLyBOT1RFOiByZWxhdGl2ZSBpcyB0cmlja3kgYmVjYXVzZSBpdCBvbmx5IGFwcGxpZXMgdG8ganVtcHNcbiAgWy9eJC8sICgpID0+IFsnSW1wbGllZCcsIDAsIDAgLyogdW51c2VkICovXV0sXG4gIFsvXiMoLispJC8sICh4KSA9PiBbJ0ltbWVkaWF0ZScsIDEsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXihcXCQuLikkLywgKHgpID0+IFsnWmVyb1BhZ2UnLCAxLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL14oXFwkLi4pLHgkLywgKHgpID0+IFsnWmVyb1BhZ2VYJywgMSwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eKFxcJC4uKSx5JC8sICh4KSA9PiBbJ1plcm9QYWdlWScsIDEsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXlxcKChcXCQuLikseFxcKSQvLCAoeCkgPT4gWydQcmVpbmRleGVkSW5kaXJlY3QnLCAxLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL15cXCgoXFwkLi4pXFwpLHkkLywgKHgpID0+IFsnUG9zdGluZGV4ZWRJbmRpcmVjdCcsIDEsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXlxcKCguKylcXCkkLywgKHgpID0+IFsnSW5kaXJlY3RBYnNvbHV0ZScsIDIsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXiguKykseCQvLCAoeCkgPT4gWydBYnNvbHV0ZVgnLCAyLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL14oLispLHkkLywgKHgpID0+IFsnQWJzb2x1dGVZJywgMiwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eKC4rKSQvLCAoeCkgPT4gWydBYnNvbHV0ZScsIDIsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXiguKykkLywgKHgpID0+IFsnUmVsYXRpdmUnLCAxLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuXTtcblxuZnVuY3Rpb24gcGFyc2VOdW1iZXIoc3RyOiBzdHJpbmcpOiBudW1iZXI7XG5mdW5jdGlvbiBwYXJzZU51bWJlcihzdHI6IHN0cmluZywgYWxsb3dMYWJlbHM6IHRydWUpOiBudW1iZXIgfCBzdHJpbmc7XG5mdW5jdGlvbiBwYXJzZU51bWJlcihzdHI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgIGFsbG93TGFiZWxzOiBib29sZWFuID0gZmFsc2UpOiBudW1iZXIgfCBzdHJpbmcge1xuICBpZiAoc3RyLnN0YXJ0c1dpdGgoJyQnKSkgcmV0dXJuIE51bWJlci5wYXJzZUludChzdHIuc3Vic3RyaW5nKDEpLCAxNik7XG4gIGlmIChzdHIuc3RhcnRzV2l0aCgnJScpKSByZXR1cm4gTnVtYmVyLnBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMSksIDIpO1xuICBpZiAoc3RyLnN0YXJ0c1dpdGgoJzAnKSkgcmV0dXJuIE51bWJlci5wYXJzZUludChzdHIsIDgpO1xuICBjb25zdCByZXN1bHQgPSBOdW1iZXIucGFyc2VJbnQoc3RyLCAxMCk7XG4gIGlmICghTnVtYmVyLmlzTmFOKHJlc3VsdCkpIHJldHVybiByZXN1bHQ7XG4gIGlmIChhbGxvd0xhYmVscykgcmV0dXJuIHN0cjtcbiAgdGhyb3cgbmV3IEVycm9yKGBCYWQgbnVtYmVyOiAke3N0cn1gKTtcbn1cblxudHlwZSBNbmVtb25pYyA9XG4gICdhZGMnIHwgJ2FuZCcgfCAnYXNsJyB8ICdiY2MnIHwgJ2JjcycgfCAnYmVxJyB8ICdiaXQnIHwgJ2JtaScgfFxuICAnYm5lJyB8ICdicGwnIHwgJ2JyaycgfCAnYnZjJyB8ICdidnMnIHwgJ2NsYycgfCAnY2xkJyB8ICdjbGknIHxcbiAgJ2NsdicgfCAnY21wJyB8ICdjcHgnIHwgJ2NweScgfCAnZGVjJyB8ICdkZXgnIHwgJ2RleScgfCAnZW9yJyB8XG4gICdpbmMnIHwgJ2lueCcgfCAnaW55JyB8ICdqbXAnIHwgJ2pzcicgfCAnbGRhJyB8ICdsZHgnIHwgJ2xkeScgfFxuICAnbHNyJyB8ICdub3AnIHwgJ29yYScgfCAncGhhJyB8ICdwaHAnIHwgJ3BsYScgfCAncGxwJyB8ICdyb2wnIHxcbiAgJ3JvcicgfCAncnRpJyB8ICdydHMnIHwgJ3NiYycgfCAnc2VjJyB8ICdzZWQnIHwgJ3NlaScgfCAnc3RhJyB8XG4gICdzdHgnIHwgJ3N0eScgfCAndGF4JyB8ICd0YXknIHwgJ3RzeCcgfCAndHhhJyB8ICd0eHMnIHwgJ3R5YSc7XG5cbnR5cGUgT3Bjb2RlTGlzdCA9IHtbbW5lbW9uaWMgaW4gTW5lbW9uaWNdOiB7W21vZGUgaW4gQWRkcmVzc2luZ01vZGVdPzogbnVtYmVyfX07XG5jb25zdCBvcGNvZGVzOiBPcGNvZGVMaXN0ID0ge1xuICBhZGM6IHtcbiAgICBBYnNvbHV0ZTogMHg2ZCxcbiAgICBBYnNvbHV0ZVg6IDB4N2QsXG4gICAgQWJzb2x1dGVZOiAweDc5LFxuICAgIEltbWVkaWF0ZTogMHg2OSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweDcxLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHg2MSxcbiAgICBaZXJvUGFnZTogMHg2NSxcbiAgICBaZXJvUGFnZVg6IDB4NzUsXG4gIH0sXG4gIGFuZDoge1xuICAgIEFic29sdXRlOiAweDJkLFxuICAgIEFic29sdXRlWDogMHgzZCxcbiAgICBBYnNvbHV0ZVk6IDB4MzksXG4gICAgSW1tZWRpYXRlOiAweDI5LFxuICAgIFBvc3RpbmRleGVkSW5kaXJlY3Q6IDB4MzEsXG4gICAgUHJlaW5kZXhlZEluZGlyZWN0OiAweDIxLFxuICAgIFplcm9QYWdlOiAweDI1LFxuICAgIFplcm9QYWdlWDogMHgzNSxcbiAgfSxcbiAgYXNsOiB7XG4gICAgQWJzb2x1dGU6IDB4MGUsXG4gICAgQWJzb2x1dGVYOiAweDFlLFxuICAgIEltcGxpZWQ6IDB4MGEsXG4gICAgWmVyb1BhZ2U6IDB4MDYsXG4gICAgWmVyb1BhZ2VYOiAweDE2LFxuICB9LFxuICBiY2M6IHtSZWxhdGl2ZTogMHg5MH0sXG4gIGJjczoge1JlbGF0aXZlOiAweGIwfSxcbiAgYmVxOiB7UmVsYXRpdmU6IDB4ZjB9LFxuICBiaXQ6IHtcbiAgICBBYnNvbHV0ZTogMHgyYyxcbiAgICBaZXJvUGFnZTogMHgyNCxcbiAgfSxcbiAgYm1pOiB7UmVsYXRpdmU6IDB4MzB9LFxuICBibmU6IHtSZWxhdGl2ZTogMHhkMH0sXG4gIGJwbDoge1JlbGF0aXZlOiAweDEwfSxcbiAgYnJrOiB7SW1wbGllZDogMHgwMH0sXG4gIGJ2Yzoge1JlbGF0aXZlOiAweDUwfSxcbiAgYnZzOiB7UmVsYXRpdmU6IDB4NzB9LFxuICBjbGM6IHtJbXBsaWVkOiAweDE4fSxcbiAgY2xkOiB7SW1wbGllZDogMHhkOH0sXG4gIGNsaToge0ltcGxpZWQ6IDB4NTh9LFxuICBjbHY6IHtJbXBsaWVkOiAweGI4fSxcbiAgY21wOiB7XG4gICAgQWJzb2x1dGU6IDB4Y2QsXG4gICAgQWJzb2x1dGVYOiAweGRkLFxuICAgIEFic29sdXRlWTogMHhkOSxcbiAgICBJbW1lZGlhdGU6IDB4YzksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHhkMSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4YzEsXG4gICAgWmVyb1BhZ2U6IDB4YzUsXG4gICAgWmVyb1BhZ2VYOiAweGQ1LFxuICB9LFxuICBjcHg6IHtcbiAgICBBYnNvbHV0ZTogMHhlYyxcbiAgICBJbW1lZGlhdGU6IDB4ZTAsXG4gICAgWmVyb1BhZ2U6IDB4ZTQsXG4gIH0sXG4gIGNweToge1xuICAgIEFic29sdXRlOiAweGNjLFxuICAgIEltbWVkaWF0ZTogMHhjMCxcbiAgICBaZXJvUGFnZTogMHhjNCxcbiAgfSxcbiAgZGVjOiB7XG4gICAgQWJzb2x1dGU6IDB4Y2UsXG4gICAgQWJzb2x1dGVYOiAweGRlLFxuICAgIFplcm9QYWdlOiAweGM2LFxuICAgIFplcm9QYWdlWDogMHhkNixcbiAgfSxcbiAgZGV4OiB7SW1wbGllZDogMHhjYX0sXG4gIGRleToge0ltcGxpZWQ6IDB4ODh9LFxuICBlb3I6IHtcbiAgICBBYnNvbHV0ZTogMHg0ZCxcbiAgICBBYnNvbHV0ZVg6IDB4NWQsXG4gICAgQWJzb2x1dGVZOiAweDU5LFxuICAgIEltbWVkaWF0ZTogMHg0OSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweDUxLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHg0MSxcbiAgICBaZXJvUGFnZTogMHg0NSxcbiAgICBaZXJvUGFnZVg6IDB4NTUsXG4gIH0sXG4gIGluYzoge1xuICAgIEFic29sdXRlOiAweGVlLFxuICAgIEFic29sdXRlWDogMHhmZSxcbiAgICBaZXJvUGFnZTogMHhlNixcbiAgICBaZXJvUGFnZVg6IDB4ZjYsXG4gIH0sXG4gIGlueDoge0ltcGxpZWQ6IDB4ZTh9LFxuICBpbnk6IHtJbXBsaWVkOiAweGM4fSxcbiAgam1wOiB7XG4gICAgQWJzb2x1dGU6IDB4NGMsXG4gICAgSW5kaXJlY3RBYnNvbHV0ZTogMHg2YyxcbiAgfSxcbiAganNyOiB7QWJzb2x1dGU6IDB4MjB9LFxuICBsZGE6IHtcbiAgICBBYnNvbHV0ZTogMHhhZCxcbiAgICBBYnNvbHV0ZVg6IDB4YmQsXG4gICAgQWJzb2x1dGVZOiAweGI5LFxuICAgIEltbWVkaWF0ZTogMHhhOSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweGIxLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHhhMSxcbiAgICBaZXJvUGFnZTogMHhhNSxcbiAgICBaZXJvUGFnZVg6IDB4YjUsXG4gIH0sXG4gIGxkeDoge1xuICAgIEFic29sdXRlOiAweGFlLFxuICAgIEFic29sdXRlWTogMHhiZSxcbiAgICBJbW1lZGlhdGU6IDB4YTIsXG4gICAgWmVyb1BhZ2U6IDB4YTYsXG4gICAgWmVyb1BhZ2VZOiAweGI2LFxuICB9LFxuICBsZHk6IHtcbiAgICBBYnNvbHV0ZTogMHhhYyxcbiAgICBBYnNvbHV0ZVg6IDB4YmMsXG4gICAgSW1tZWRpYXRlOiAweGEwLFxuICAgIFplcm9QYWdlOiAweGE0LFxuICAgIFplcm9QYWdlWDogMHhiNCxcbiAgfSxcbiAgbHNyOiB7XG4gICAgQWJzb2x1dGU6IDB4NGUsXG4gICAgQWJzb2x1dGVYOiAweDVlLFxuICAgIEltcGxpZWQ6IDB4NGEsXG4gICAgWmVyb1BhZ2U6IDB4NDYsXG4gICAgWmVyb1BhZ2VYOiAweDU2LFxuICB9LFxuICBub3A6IHtJbXBsaWVkOiAweGVhfSxcbiAgb3JhOiB7XG4gICAgQWJzb2x1dGU6IDB4MGQsXG4gICAgQWJzb2x1dGVYOiAweDFkLFxuICAgIEFic29sdXRlWTogMHgxOSxcbiAgICBJbW1lZGlhdGU6IDB4MDksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHgxMSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4MDEsXG4gICAgWmVyb1BhZ2U6IDB4MDUsXG4gICAgWmVyb1BhZ2VYOiAweDE1LFxuICB9LFxuICBwaGE6IHtJbXBsaWVkOiAweDQ4fSxcbiAgcGhwOiB7SW1wbGllZDogMHgwOH0sXG4gIHBsYToge0ltcGxpZWQ6IDB4Njh9LFxuICBwbHA6IHtJbXBsaWVkOiAweDI4fSxcbiAgcm9sOiB7XG4gICAgQWJzb2x1dGU6IDB4MmUsXG4gICAgQWJzb2x1dGVYOiAweDNlLFxuICAgIEltcGxpZWQ6IDB4MmEsXG4gICAgWmVyb1BhZ2U6IDB4MjYsXG4gICAgWmVyb1BhZ2VYOiAweDM2LFxuICB9LFxuICByb3I6IHtcbiAgICBBYnNvbHV0ZTogMHg2ZSxcbiAgICBBYnNvbHV0ZVg6IDB4N2UsXG4gICAgSW1wbGllZDogMHg2YSxcbiAgICBaZXJvUGFnZTogMHg2NixcbiAgICBaZXJvUGFnZVg6IDB4NzYsXG4gIH0sXG4gIHJ0aToge0ltcGxpZWQ6IDB4NDB9LFxuICBydHM6IHtJbXBsaWVkOiAweDYwfSxcbiAgc2JjOiB7XG4gICAgQWJzb2x1dGU6IDB4ZWQsXG4gICAgQWJzb2x1dGVYOiAweGZkLFxuICAgIEFic29sdXRlWTogMHhmOSxcbiAgICBJbW1lZGlhdGU6IDB4ZTksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHhmMSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4ZTEsXG4gICAgWmVyb1BhZ2U6IDB4ZTUsXG4gICAgWmVyb1BhZ2VYOiAweGY1LFxuICB9LFxuICBzZWM6IHtJbXBsaWVkOiAweDM4fSxcbiAgc2VkOiB7SW1wbGllZDogMHhmOH0sXG4gIHNlaToge0ltcGxpZWQ6IDB4Nzh9LFxuICBzdGE6IHtcbiAgICBBYnNvbHV0ZTogMHg4ZCxcbiAgICBBYnNvbHV0ZVg6IDB4OWQsXG4gICAgQWJzb2x1dGVZOiAweDk5LFxuICAgIFBvc3RpbmRleGVkSW5kaXJlY3Q6IDB4OTEsXG4gICAgUHJlaW5kZXhlZEluZGlyZWN0OiAweDgxLFxuICAgIFplcm9QYWdlOiAweDg1LFxuICAgIFplcm9QYWdlWDogMHg5NSxcbiAgfSxcbiAgc3R4OiB7XG4gICAgQWJzb2x1dGU6IDB4OGUsXG4gICAgWmVyb1BhZ2U6IDB4ODYsXG4gICAgWmVyb1BhZ2VZOiAweDk2LFxuICB9LFxuICBzdHk6IHtcbiAgICBBYnNvbHV0ZTogMHg4YyxcbiAgICBaZXJvUGFnZTogMHg4NCxcbiAgICBaZXJvUGFnZVg6IDB4OTQsXG4gIH0sXG4gIHRheDoge0ltcGxpZWQ6IDB4YWF9LFxuICB0YXk6IHtJbXBsaWVkOiAweGE4fSxcbiAgdHN4OiB7SW1wbGllZDogMHhiYX0sXG4gIHR4YToge0ltcGxpZWQ6IDB4OGF9LFxuICB0eHM6IHtJbXBsaWVkOiAweDlhfSxcbiAgdHlhOiB7SW1wbGllZDogMHg5OH0sXG59O1xuIl19