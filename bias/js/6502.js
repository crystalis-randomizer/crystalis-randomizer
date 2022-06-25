const LOG = true;
export class Assembler {
    constructor() {
        this.labels = {};
        this.allChunks = [];
        this.allBlocks = [];
    }
    assemble(str, filename = 'input') {
        const f = new File(this.labels, filename);
        for (const line of str.split('\n')) {
            f.ingest(line);
        }
        const chunks = f.assemble();
        this.allChunks.push(...chunks.filter(c => c instanceof Chunk));
    }
    chunks() {
        return [...this.allChunks];
    }
    blocks() {
        return [...this.allBlocks];
    }
    patch() {
        if (this.allBlocks.length)
            throw new Error(`No patch() with blocks`);
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
                bytes.push(parseNumber(part, true));
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
    expand(context) {
        for (let i = 0; i < this.bytesInternal.length; i++) {
            if (typeof this.bytesInternal[i] === 'string') {
                this.bytesInternal[i] = context.map(this.bytesInternal[i]) & 0xff;
            }
        }
    }
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
        let expandParens = label.replace(/\(([^)]*)\)/g, (_, l) => String(this.mapLabel(l, pc)));
        if (expandParens !== label)
            return this.mapLabel(expandParens, pc);
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
        const num = Number(label);
        if (!isNaN(num))
            return num;
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
        try {
            this.pcInternal = context.map(~this.pc);
        }
        catch (err) { }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiNjUwMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy82NTAyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQztBQThDakIsTUFBTSxPQUFPLFNBQVM7SUFBdEI7UUFFVyxXQUFNLEdBQVcsRUFBRSxDQUFDO1FBQ3JCLGNBQVMsR0FBWSxFQUFFLENBQUM7UUFDeEIsY0FBUyxHQUFZLEVBQUUsQ0FBQztJQWlEbEMsQ0FBQztJQTVDQyxRQUFRLENBQUMsR0FBVyxFQUFFLFdBQW1CLE9BQU87UUFDOUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNoQjtRQUNELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQztJQUVqRSxDQUFDO0lBRUQsTUFBTTtRQUNKLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsTUFBTTtRQUNKLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsS0FBSztRQUNILElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3JFLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxD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Q0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDL0QsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1NBQ3ZEO1FBQ0QsS0FBSyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQyxJQUFJLEtBQUssRUFBRTtZQUNULE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDL0QsT0FBTyxJQUFJLEdBQUcsS0FBSyxDQUFDO1NBQ3JCO1FBQ0QsS0FBSyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxLQUFLLEVBQUU7WUFDVCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDN0QsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFH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RSxDQUFDLEVBQUUsQ0FBQyxDQUFjLENBQUM7SUFDNUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDN0QsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDN0QsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzRSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMs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eEIsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtLQUNoQjtJQUNELEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7UUFDZixTQUFTLEVBQUUsSUFBSTtRQUNmLG1CQUFtQixFQUFFLElBQUk7UUFDekIsa0JBQWtCLEVBQUUsSUFBSTtRQUN4QixRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO0tBQ2hCO0lBQ0QsR0FBRyxFQUFFO1FBQ0gsUUFBUSxFQUFFLElBQUk7UUFDZCxRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO0tBQ2hCO0lBQ0QsR0FBRyxFQUFFO1FBQ0gsUUFBUSxFQUFFLElBQUk7UUFDZCxRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO0tBQ2hCO0lBQ0QsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7Q0FDckIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IExPRyA9IHRydWU7XG5cbmludGVyZmFjZSBEZWZpbmVkTGFiZWwge1xuICB0eXBlOiAnYnl0ZSc7XG4gIGJ5dGU6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIEltbWVkaWF0ZUxhYmVsIHtcbiAgdHlwZTogJ2ltbWVkaWF0ZSc7XG4gIGFkZHJlc3M6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIERlZmVycmVkTGFiZWwge1xuICB0eXBlOiAnZGVmZXJyZWQnO1xuICBibG9jazogc3RyaW5nOyAvLyBOT1RFOiBhbGwgYmxvY2tzIHJlcXVpcmUgYSBsYWJlbCBhcyB0aGUgZmlyc3QgbGluZS5cbiAgZGVwczogU2V0PHN0cmluZz47XG4gIGJhc2U6IFByb21pc2U8bnVtYmVyPjtcbiAgb2Zmc2V0OiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBEZWZlcnJlZEJ5dGUge1xuICAvLyB1c2VkIGZvciBlLmcuIDxMYWJlbCBvbiBhIGJsb2NrLi4uXG4gIHR5cGU6ICdkZWZlcnJlZC1ieXRlJztcbiAgYmxvY2s6IHN0cmluZztcbiAgZGVwczogU2V0PHN0cmluZz47XG4gIGJhc2U6IFByb21pc2U8bnVtYmVyPjtcbiAgb3A6IChiYXNlOiBudW1iZXIpID0+IG51bWJlcjtcbn1cblxuLy8gVE9ETyAtIGFjdHVhbGx5IHVzZVxuZXhwb3J0IHR5cGUgTGFiZWwgPSBEZWZpbmVkTGFiZWwgfCBJbW1lZGlhdGVMYWJlbCB8IERlZmVycmVkTGFiZWwgfCBEZWZlcnJlZEJ5dGU7XG5cbi8vIE11bHRpbWFwIGZyb20gbGFiZWwgdG8gYWRkcmVzcy5cbi8vIE5lZ2F0aXZlIGFkZHJlc3NlcyBhcmUgUFJHIFJPTSBhbmQgbmVlZCB0byBiZSBtYXBwZWQuXG5pbnRlcmZhY2UgTGFiZWxzIHtcbiAgW2xhYmVsOiBzdHJpbmddOiBudW1iZXJbXTsgLy8gVE9ETyAtIExhYmVsW11cbn1cblxuaW50ZXJmYWNlIEJsb2NrIHtcbiAgcmFuZ2U6IHJlYWRvbmx5IFtudW1iZXIsIG51bWJlcl07XG4gIGJ5dGVzOiBQcm9taXNlPFVpbnQ4QXJyYXk+O1xuICBsYWJlbDogc3RyaW5nO1xuICB3cml0dGVuOiBQcm9taXNlPHZvaWQ+O1xuICBhZGRyZXNzPzogbnVtYmVyOyAvLyBmaWxsZWQgaW4gb25jZSBpdCdzIGFzc2lnbmVkICh0aGlzLndyaXR0ZW4gcmVzb2x2ZWQpLlxufVxuXG5leHBvcnQgY2xhc3MgQXNzZW1ibGVyIHtcblxuICByZWFkb25seSBsYWJlbHM6IExhYmVscyA9IHt9O1xuICBwcml2YXRlIGFsbENodW5rczogQ2h1bmtbXSA9IFtdO1xuICBwcml2YXRlIGFsbEJsb2NrczogQmxvY2tbXSA9IFtdO1xuXG4gIC8vIElucHV0OiBhbiBhc3NlbWJseSBzdHJpbmdcbiAgLy8gT3V0cHV0OiBhZGRzIGNodW5rcyB0byB0aGUgc3RhdGUuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBhbHNvIG91dHB1dHRpbmcgdGhlIGRpY3Rpb25hcnkgb2YgbGFiZWxzPz8/XG4gIGFzc2VtYmxlKHN0cjogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nID0gJ2lucHV0Jyk6IHZvaWQge1xuICAgIGNvbnN0IGYgPSBuZXcgRmlsZSh0aGlzLmxhYmVscywgZmlsZW5hbWUpO1xuICAgIGZvciAoY29uc3QgbGluZSBvZiBzdHIuc3BsaXQoJ1xcbicpKSB7XG4gICAgICBmLmluZ2VzdChsaW5lKTtcbiAgICB9XG4gICAgY29uc3QgY2h1bmtzID0gZi5hc3NlbWJsZSgpO1xuICAgIHRoaXMuYWxsQ2h1bmtzLnB1c2goLi4uY2h1bmtzLmZpbHRlcihjID0+IGMgaW5zdGFuY2VvZiBDaHVuaykpO1xuICAgIC8vIHRoaXMuYWxsQmxvY2tzLnB1c2goLi4uY2h1bmtzLmZpbHRlcihjID0+ICEoYyBpbnN0YW5jZW9mIENodW5rKSkpO1xuICB9XG5cbiAgY2h1bmtzKCk6IENodW5rW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5hbGxDaHVua3NdO1xuICB9XG5cbiAgYmxvY2tzKCk6IEJsb2NrW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5hbGxCbG9ja3NdO1xuICB9XG5cbiAgcGF0Y2goKTogUGF0Y2gge1xuICAgIGlmICh0aGlzLmFsbEJsb2Nrcy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcihgTm8gcGF0Y2goKSB3aXRoIGJsb2Nrc2ApO1xuICAgIHJldHVybiBQYXRjaC5mcm9tKHRoaXMuYWxsQ2h1bmtzKTtcbiAgfVxuXG4gIHBhdGNoUm9tKHJvbTogVWludDhBcnJheSk6IHZvaWQge1xuICAgIGJ1aWxkUm9tUGF0Y2godGhpcy5wYXRjaCgpKS5hcHBseShyb20pO1xuICAgIHRoaXMuYWxsQ2h1bmtzID0gW107XG4gIH1cblxuICAvLyBFbnN1cmVzIHRoYXQgbGFiZWwgaXMgdW5pcXVlXG4gIGV4cGFuZChsYWJlbDogc3RyaW5nKTogbnVtYmVyIHsgLy8gVE9ETyAtIExhYmVsXG4gICAgY29uc3QgW2FkZHIgPSBudWxsLCAuLi5yZXN0XSA9IHRoaXMubGFiZWxzW2xhYmVsXSB8fCBbXTtcbiAgICBpZiAoYWRkciA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgbGFiZWw6ICR7bGFiZWx9YCk7XG4gICAgaWYgKHJlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYE5vbi11bmlxdWUgbGFiZWw6ICR7bGFiZWx9YCk7XG4gICAgcmV0dXJuIGFkZHIgPCAwID8gfmFkZHIgOiBhZGRyO1xuICAgIC8vIHN3aXRjaCAoYWRkci50eXBlKSB7XG4gICAgLy8gICBjYXNlICdieXRlJzpcbiAgICAvLyAgICAgcmV0dXJuIGFkZHIuYnl0ZTtcbiAgICAvLyAgIGNhc2UgJ2ltbWVkaWF0ZSc6XG4gICAgLy8gICAgIHJldHVybiBhZGRyLmFkZHJlc3M7XG4gICAgLy8gICBjYXNlICdkZWZlcnJlZCc6XG4gICAgLy8gICAgIHJldHVybiBhZGRyO1xuICAgIC8vIH1cbiAgICAvLyByZXR1cm4gYWRkciA8IDAgPyB+YWRkciA6IGFkZHI7XG4gIH1cbn1cblxuLy8gQSBzaW5nbGUgY2h1bmsgb2YgYXNzZW1ibHlcbmNsYXNzIEZpbGUge1xuXG4gIHJlYWRvbmx5IGxpbmVzOiBBYnN0cmFjdExpbmVbXSA9IFtdO1xuICBwYzogbnVtYmVyID0gMDtcbiAgbGluZU51bWJlcjogbnVtYmVyID0gLTE7XG4gIGxpbmVDb250ZW50czogc3RyaW5nID0gJyc7XG5cbiAgLy8gRm9yIGNvbmRpdGlvbmFsIGFzc2VtYmx5XG4gIGNvbmRpdGlvbnM6IGJvb2xlYW5bXSA9IFtdO1xuICBhc3NlbWJsaW5nOiBib29sZWFuID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBsYWJlbHM6IExhYmVscywgcmVhZG9ubHkgZmlsZW5hbWU6IHN0cmluZykge31cblxuICBhZGRMaW5lKGxpbmU6IEFic3RyYWN0TGluZSk6IHZvaWQge1xuICAgIHRoaXMubGluZXMucHVzaChsaW5lLm9yaWcodGhpcy5maWxlbmFtZSwgdGhpcy5saW5lTnVtYmVyLCB0aGlzLmxpbmVDb250ZW50cykpO1xuICB9XG5cbiAgYWRkTGFiZWwobGFiZWw6IHN0cmluZywgYWRkcmVzczogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiBhZGRyZXNzICE9PSAnbnVtYmVyJykgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBhIG51bWJlcicpO1xuICAgIGNvbnN0IGFyciA9IHRoaXMubGFiZWxzW2xhYmVsXSB8fCAodGhpcy5sYWJlbHNbbGFiZWxdID0gW10pO1xuICAgIGNvbnN0IGluZGV4ID0gZmluZChhcnIsIGFkZHJlc3MpO1xuICAgIGlmIChpbmRleCA8IDApIGFyci5zcGxpY2UofmluZGV4LCAwLCBhZGRyZXNzKTtcbiAgfVxuXG4gIHBhcnNlTnVtYmVyKG51bTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAvLyBNYWtlIGEgdGVtcG9yYXJ5IGNvbnRleHQ6IGNhbiBvbmx5IGV4cGFuZCBjb25zdGFudHMuLi5cbiAgICAvLyBUT0RPIC0gbWFrZSBhIGJldHRlciBkaXN0aW5jdGlvbiBiZXR3ZWVuIGNvbnN0YW50cy9tYWNyb3MgdnMuIGxhYmVsc1xuICAgIC8vICAgICAgLSB0aGVuIGFsbG93IGV4cGFuZGluZyBtYWNyb3MgYnV0IG5vdCBsYWJlbHMuXG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VOdW1iZXIobnVtLCB0cnVlKTtcbiAgICByZXR1cm4gdHlwZW9mIHBhcnNlZCA9PT0gJ251bWJlcicgP1xuICAgICAgICBwYXJzZWQgOiBuZXcgQ29udGV4dCh0aGlzLmxhYmVscykubWFwTGFiZWwocGFyc2VkKTtcbiAgfVxuXG4gIGluZ2VzdChsaW5lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIrKztcbiAgICB0aGlzLmxpbmVDb250ZW50cyA9IGxpbmU7XG4gICAgLy8gcmVtb3ZlIGNvbW1lbnRzXG4gICAgbGluZSA9IGxpbmUucmVwbGFjZSgvOy4qLywgJycpO1xuICAgIC8vIHRyaW0gdGhlIHN0cmluZywgbGVhdmUgYXQgbW9zdCBvbmUgc3BhY2UgYXQgc3RhcnRcbiAgICBsaW5lID0gbGluZS5yZXBsYWNlKC9cXHMrL2csICcgJyk7XG4gICAgbGluZSA9IGxpbmUucmVwbGFjZSgvXFxzJC9nLCAnJyk7XG5cbiAgICAvLyBMb29rIGZvciBkaWZmZXJlbnQga2luZHMgb2YgbGluZXM6IGRpcmVjdGl2ZXMsIGxhYmVscywgZGF0YSwgb3IgY29kZVxuICAgIC8vIFRyaWNrIC0gaG93IHRvIGtub3cgZm9yIGZvcndhcmQgcmVmcyB3aGV0aGVyIGl0J3MgbmVhciBvciBmYXI/XG4gICAgLy8gU29sdXRpb24gLSB6ZXJvcGFnZSByZWZzIG11c3QgYmUgZGVmaW5lZC5cbiAgICBsZXQgbWF0Y2g7XG5cbiAgICBpZiAoKG1hdGNoID0gL15cXHMqXFwuaWYobj8pZGVmXFxzKyhcXFMrKS9pLmV4ZWMobGluZSkpKSB7XG4gICAgICBjb25zdCBkZWYgPSBtYXRjaFsyXSBpbiB0aGlzLmxhYmVscztcbiAgICAgIHRoaXMuY29uZGl0aW9ucy5wdXNoKG1hdGNoWzFdID8gIWRlZiA6IGRlZik7XG4gICAgICB0aGlzLmFzc2VtYmxpbmcgPSB0aGlzLmNvbmRpdGlvbnMuZXZlcnkoeCA9PiB4KTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLmVsc2UvaS5leGVjKGxpbmUpKSkge1xuICAgICAgdGhpcy5jb25kaXRpb25zLnB1c2goIXRoaXMuY29uZGl0aW9ucy5wb3AoKSk7XG4gICAgICB0aGlzLmFzc2VtYmxpbmcgPSB0aGlzLmNvbmRpdGlvbnMuZXZlcnkoeCA9PiB4KTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLmVuZGlmL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIHRoaXMuY29uZGl0aW9ucy5wb3AoKTtcbiAgICAgIHRoaXMuYXNzZW1ibGluZyA9IHRoaXMuY29uZGl0aW9ucy5ldmVyeSh4ID0+IHgpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuYXNzZW1ibGluZykge1xuICAgICAgLy8gbm90aGluZyBlbHNlIHRvIGRvIGF0IHRoaXMgcG9pbnQuXG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC5vcmdcXHMrKFxcUyspL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIHRoaXMuYWRkTGluZShuZXcgT3JnTGluZSgodGhpcy5wYyA9IHBhcnNlTnVtYmVyKG1hdGNoWzFdKSkpKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLnNraXBcXHMrKC4rKS9pLmV4ZWMobGluZSkpKSB7XG4gICAgICAvLyB0aGlzIGlzIGEgc2hvcnRjdXQgZm9yIC5vcmcgKFBDICsgbnVtKVxuICAgICAgdGhpcy5hZGRMaW5lKG5ldyBPcmdMaW5lKCh0aGlzLnBjICs9IHRoaXMucGFyc2VOdW1iZXIobWF0Y2hbMV0pKSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL15cXHMqXFwuYXNzZXJ0XFxzKyg8XFxzKik/KFxcUyspL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIHRoaXMuYWRkTGluZShuZXcgQXNzZXJ0TGluZSgodGhpcy5wYyA9IHBhcnNlTnVtYmVyKG1hdGNoWzJdKSksICFtYXRjaFsxXSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL15cXHMqXFwuYmFua1xccysoXFxTKylcXHMrKFxcUyspXFxzKjpcXHMqKFxcUyspL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIGNvbnN0IFssIHByZywgY3B1LCBsZW5ndGhdID0gbWF0Y2g7XG4gICAgICB0aGlzLmFkZExpbmUobmV3IEJhbmtMaW5lKHBhcnNlTnVtYmVyKHByZyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlTnVtYmVyKGNwdSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlTnVtYmVyKGxlbmd0aCkpKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLihieXRlfHdvcmQpXFxzKyguKikvaS5leGVjKGxpbmUpKSkge1xuICAgICAgY29uc3QgbCA9IChtYXRjaFsxXSA9PT0gJ3dvcmQnID8gV29yZExpbmUgOiBCeXRlTGluZSkucGFyc2UobWF0Y2hbMl0pO1xuICAgICAgdGhpcy5hZGRMaW5lKGwpO1xuICAgICAgdGhpcy5wYyArPSBsLnNpemUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLnJlc1xccysoW14sXSspKD86LFxccyooLispKT8vaS5leGVjKGxpbmUpKSkge1xuICAgICAgY29uc3QgbCA9IEJ5dGVMaW5lLnBhcnNlUmVzKHRoaXMucGFyc2VOdW1iZXIobWF0Y2hbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyc2VOdW1iZXIobWF0Y2hbMl0gfHwgJzAnKSk7XG4gICAgICB0aGlzLmFkZExpbmUobCk7XG4gICAgICB0aGlzLnBjICs9IGwuc2l6ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL15kZWZpbmVcXHMrKFxcUyspXFxzKyguKikvLmV4ZWMobGluZSkpKSB7XG4gICAgICBjb25zdCBsYWJlbCA9IG1hdGNoWzFdO1xuICAgICAgdGhpcy5hZGRMYWJlbChsYWJlbCwgdGhpcy5wYXJzZU51bWJlcihtYXRjaFsyXSkpOyAvLyBub3QgdHdvcyBjb21wbGVtZW50LCBidXQgc3RpbGwgYWJzXG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXihcXFMrPyk6KC4qKSQvLmV4ZWMobGluZSkpKSB7XG4gICAgICAvLyBsYWJlbCAtIGV4dHJhY3QgYW5kIHJlY29yZC5cbiAgICAgIGNvbnN0IGxhYmVsID0gbWF0Y2hbMV07XG4gICAgICBsaW5lID0gJyAnICsgbWF0Y2hbMl07XG4gICAgICB0aGlzLmFkZExhYmVsKGxhYmVsLCB+dGhpcy5wYyk7XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXigoPzpbLStdK1xccyspKykoLiopJC8uZXhlYyhsaW5lKSkpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGxhYmVscyAobXVsdGlwbGUgYWxsb3dlZCkgLSBleHRyYWN0IGFuZCByZWNvcmQuXG4gICAgICBjb25zdCBsYWJlbHMgPSBtYXRjaFsxXTtcbiAgICAgIGZvciAoY29uc3QgbGFiZWwgb2YgbGFiZWxzLnRyaW0oKS5zcGxpdCgnICcpKSB7XG4gICAgICAgIHRoaXMuYWRkTGFiZWwobGFiZWwsIH50aGlzLnBjKTtcbiAgICAgIH1cbiAgICAgIGxpbmUgPSAnICcgKyBtYXRjaFsyXTtcbiAgICB9XG4gICAgaWYgKChtYXRjaCA9IC9eXFxzKyhbYS16XXszfSkoXFxzKy4qKT8kLy5leGVjKGxpbmUpKSkge1xuICAgICAgY29uc3QgbCA9IG5ldyBPcGNvZGUobWF0Y2hbMV0gYXMgTW5lbW9uaWMsIChtYXRjaFsyXSB8fCAnJykudHJpbSgpLCB0aGlzLnBjKTtcbiAgICAgIHRoaXMuYWRkTGluZShsKTtcbiAgICAgIHRoaXMucGMgKz0gbC5zaXplKCk7XG4gICAgfSBlbHNlIGlmICgvXFxTLy50ZXN0KGxpbmUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBwYXJzZSBsaW5lICR7bGluZX0gYXQgJHt0aGlzLmZpbGVuYW1lfToke1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVOdW1iZXJ9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8gT3V0cHV0IGlzIGFuIGFycmF5IG9mIENodW5rc1xuICBhc3NlbWJsZSgpOiBDaHVua1tdIHtcbiAgICBjb25zdCBjb250ZXh0ID0gbmV3IENvbnRleHQodGhpcy5sYWJlbHMpO1xuICAgIGNvbnN0IG91dHB1dDogbnVtYmVyW10gPSBbXTtcbiAgICBjb25zdCBvdXRwdXRMaW5lczogQWJzdHJhY3RMaW5lW10gPSBbXTtcbiAgICBjb25zdCBjb2xsaXNpb24gPSAobGluZTogQWJzdHJhY3RMaW5lLCBwYzogbnVtYmVyKTogbmV2ZXIgPT4ge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb2xsaXNpb24gYXQgJCR7cGMudG9TdHJpbmcoMTYpXG4gICAgICAgICAgICAgICAgICAgICAgIH06XFxuICB3cml0dGVuIGF0ICR7b3V0cHV0TGluZXNbcGNdLnNvdXJjZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XFxuICB3cml0dGVuIGF0ICR7bGluZS5zb3VyY2UoKX1gKTtcbiAgICB9O1xuICAgIGZvciAoY29uc3QgbGluZSBvZiB0aGlzLmxpbmVzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBsaW5lLmV4cGFuZChjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc3Qgc3RhY2sgPSBlLnN0YWNrLnJlcGxhY2UoYEVycm9yOiAke2UubWVzc2FnZX1gLCAnJyk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlLm1lc3NhZ2U7XG4gICAgICAgIGNvbnN0IHBvcyA9IGAgZnJvbSBsaW5lICR7bGluZS5vcmlnTGluZU51bWJlciArIDF9OiBcXGAke2xpbmUub3JpZ0NvbnRlbnR9XFxgYDtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke21lc3NhZ2V9JHtwb3N9JHtzdGFja31cXG49PT09PT09PT09PT09PT09YCk7XG4gICAgICB9XG4gICAgICBpZiAobGluZSBpbnN0YW5jZW9mIE9yZ0xpbmUgJiYgb3V0cHV0W2xpbmUucGNdICE9IG51bGwpIGNvbGxpc2lvbihsaW5lLCBsaW5lLnBjKTtcbiAgICAgIGZvciAoY29uc3QgYiBvZiBsaW5lLmJ5dGVzKCkpIHtcbiAgICAgICAgaWYgKG91dHB1dFtjb250ZXh0LnBjXSAhPSBudWxsKSBjb2xsaXNpb24obGluZSwgY29udGV4dC5wYyk7XG4gICAgICAgIG91dHB1dExpbmVzW2NvbnRleHQucGNdID0gbGluZTtcbiAgICAgICAgb3V0cHV0W2NvbnRleHQucGMrK10gPSBiO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBvdXRwdXQgaXMgYSBzcGFyc2UgYXJyYXkgLSBmaW5kIHRoZSBmaXJzdCBpbmRpY2VzLlxuICAgIGNvbnN0IHN0YXJ0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgaSBpbiBvdXRwdXQpIHtcbiAgICAgIGlmICghKE51bWJlcihpKSAtIDEgaW4gb3V0cHV0KSkgc3RhcnRzLnB1c2goTnVtYmVyKGkpKTtcbiAgICB9XG4gICAgLy8gbm93IG91dHB1dCBjaHVua3MuXG4gICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgZm9yIChjb25zdCBzdGFydCBvZiBzdGFydHMpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSBpbiBvdXRwdXQ7IGkrKykge1xuICAgICAgICBkYXRhLnB1c2gob3V0cHV0W2ldKTtcbiAgICAgIH1cbiAgICAgIGNodW5rcy5wdXNoKG5ldyBDaHVuayhzdGFydCwgZGF0YSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jb25kaXRpb25zLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnRlcm1pbmF0ZWQgLmlmJyk7XG4gICAgfVxuICAgIHJldHVybiBjaHVua3M7XG4gIH1cbn1cblxuLy8gQmFzZSBjbGFzcyBzbyB0aGF0IHdlIGNhbiB0cmFjayB3aGVyZSBlcnJvcnMgY29tZSBmcm9tXG5hYnN0cmFjdCBjbGFzcyBBYnN0cmFjdExpbmUge1xuXG4gIG9yaWdGaWxlOiBzdHJpbmcgPSAnJztcbiAgb3JpZ0xpbmVOdW1iZXI6IG51bWJlciA9IC0xO1xuICBvcmlnQ29udGVudDogc3RyaW5nID0gJyc7XG5cbiAgb3JpZyhmaWxlOiBzdHJpbmcsIG51bTogbnVtYmVyLCBjb250ZW50OiBzdHJpbmcpOiB0aGlzIHtcbiAgICB0aGlzLm9yaWdGaWxlID0gZmlsZTtcbiAgICB0aGlzLm9yaWdMaW5lTnVtYmVyID0gbnVtO1xuICAgIHRoaXMub3JpZ0NvbnRlbnQgPSBjb250ZW50O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYWJzdHJhY3QgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkO1xuICBhYnN0cmFjdCBieXRlcygpOiBudW1iZXJbXTtcbiAgYWJzdHJhY3Qgc2l6ZSgpOiBudW1iZXI7XG5cbiAgc291cmNlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3RoaXMub3JpZ0ZpbGV9OiR7dGhpcy5vcmlnTGluZU51bWJlciArIDF9ICAke3RoaXMub3JpZ0NvbnRlbnR9YDtcbiAgfVxufVxuXG5jbGFzcyBCeXRlTGluZSBleHRlbmRzIEFic3RyYWN0TGluZSB7XG4gIHN0YXRpYyBwYXJzZShsaW5lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBieXRlczogQXJyYXk8bnVtYmVyfHN0cmluZz4gPSBbXTtcbiAgICBmb3IgKGxldCBwYXJ0IG9mIGxpbmUuc3BsaXQoJywnKSkge1xuICAgICAgcGFydCA9IHBhcnQudHJpbSgpO1xuICAgICAgY29uc3QgbWF0Y2ggPSAvXlwiKC4qKVwiJC8uZXhlYyhwYXJ0KTtcbiAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICBieXRlcy5wdXNoKC4uLlsuLi5tYXRjaFsxXV0ubWFwKHMgPT4gcy5jaGFyQ29kZUF0KDApKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBieXRlcy5wdXNoKHBhcnNlTnVtYmVyKHBhcnQsIHRydWUpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBCeXRlTGluZShieXRlcyk7XG4gIH1cblxuICBzdGF0aWMgcGFyc2VSZXMoY291bnQ6IG51bWJlciwgZGVmYXVsdFZhbHVlOiBudW1iZXIpIHtcbiAgICByZXR1cm4gbmV3IEJ5dGVMaW5lKG5ldyBBcnJheTxudW1iZXI+KGNvdW50KS5maWxsKGRlZmF1bHRWYWx1ZSkpO1xuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBieXRlc0ludGVybmFsOiBBcnJheTxudW1iZXJ8c3RyaW5nPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBieXRlcygpOiBudW1iZXJbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmJ5dGVzSW50ZXJuYWxdIGFzIG51bWJlcltdO1xuICB9XG5cbiAgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmJ5dGVzSW50ZXJuYWwubGVuZ3RoO1xuICB9XG5cbiAgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnl0ZXNJbnRlcm5hbC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLmJ5dGVzSW50ZXJuYWxbaV0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuYnl0ZXNJbnRlcm5hbFtpXSA9IGNvbnRleHQubWFwKHRoaXMuYnl0ZXNJbnRlcm5hbFtpXSkgJiAweGZmO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBXb3JkTGluZSBleHRlbmRzIEFic3RyYWN0TGluZSB7XG4gIHN0YXRpYyBwYXJzZShsaW5lOiBzdHJpbmcpIHtcbiAgICBjb25zdCB3b3JkcyA9IFtdO1xuICAgIGZvciAobGV0IHBhcnQgb2YgbGluZS5zcGxpdCgnLCcpKSB7XG4gICAgICBwYXJ0ID0gcGFydC50cmltKCk7XG4gICAgICBwYXJ0ID0gcGFydC5yZXBsYWNlKC9bKCldL2csICcnKTsgLy8gaGFuZGxlIHRoZXNlIGRpZmZlcmVudGx5PyBjb21wbGVtZW50P1xuICAgICAgd29yZHMucHVzaChwYXJzZU51bWJlcihwYXJ0LCB0cnVlKSk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgV29yZExpbmUod29yZHMpO1xuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSB3b3JkczogKG51bWJlciB8IHN0cmluZylbXSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBieXRlcygpOiBudW1iZXJbXSB7XG4gICAgY29uc3QgYnl0ZXMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgdGhpcy53b3JkcyBhcyBudW1iZXJbXSkgeyAvLyBhbHJlYWR5IG1hcHBlZFxuICAgICAgYnl0ZXMucHVzaCh3ICYgMHhmZik7XG4gICAgICBieXRlcy5wdXNoKHcgPj4+IDgpO1xuICAgIH1cbiAgICByZXR1cm4gYnl0ZXM7XG4gIH1cblxuICBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMud29yZHMubGVuZ3RoICogMjtcbiAgfVxuXG4gIGV4cGFuZChjb250ZXh0OiBDb250ZXh0KTogdm9pZCB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLndvcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMud29yZHNbaV0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMud29yZHNbaV0gPSBjb250ZXh0Lm1hcCh0aGlzLndvcmRzW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgT3JnTGluZSBleHRlbmRzIEFic3RyYWN0TGluZSB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHBjOiBudW1iZXIpIHsgc3VwZXIoKTsgfVxuXG4gIGJ5dGVzKCk6IG51bWJlcltdIHsgcmV0dXJuIFtdOyB9XG5cbiAgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gMDsgfVxuXG4gIGV4cGFuZChjb250ZXh0OiBDb250ZXh0KTogdm9pZCB7XG4gICAgLy8gVE9ETyAtIGNhbiB3ZSBhbGxvdyB0aGlzLnBjIHRvIGJlIGEgbGFiZWw/XG4gICAgY29udGV4dC5wYyA9IHRoaXMucGM7XG4gIH1cbn1cblxuY2xhc3MgQXNzZXJ0TGluZSBleHRlbmRzIEFic3RyYWN0TGluZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGM6IG51bWJlcixcbiAgICAgICAgICAgICAgcHJpdmF0ZSByZWFkb25seSBleGFjdDogYm9vbGVhbikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBieXRlcygpOiBudW1iZXJbXSB7IHJldHVybiBbXTsgfVxuXG4gIHNpemUoKTogbnVtYmVyIHsgcmV0dXJuIDA7IH1cblxuICBleHBhbmQoY29udGV4dDogQ29udGV4dCk6IHZvaWQge1xuICAgIC8vIFRPRE8gLSBjYW4gd2UgYWxsb3cgdGhpcy5wYyB0byBiZSBhIGxhYmVsP1xuICAgIGlmICh0aGlzLmV4YWN0ID8gY29udGV4dC5wYyAhPT0gdGhpcy5wYyA6IGNvbnRleHQucGMgPiB0aGlzLnBjKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc2FsaWdubWVudDogZXhwZWN0ZWQgJHt0aGlzLmV4YWN0ID8gJycgOiAnPCAnfSQke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYy50b1N0cmluZygxNil9IGJ1dCB3YXMgJCR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnBjLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmV4YWN0ICYmIExPRykge1xuICAgICAgY29uc29sZS5sb2coYEZyZWU6ICR7dGhpcy5wYyAtIGNvbnRleHQucGN9IGJ5dGVzIGJldHdlZW4gJCR7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQucGMudG9TdHJpbmcoMTYpfSBhbmQgJCR7dGhpcy5wYy50b1N0cmluZygxNil9YCk7XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEJhbmtMaW5lIGV4dGVuZHMgQWJzdHJhY3RMaW5lIHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcHJnOiBudW1iZXIsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGNwdTogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBsZW5ndGg6IG51bWJlcikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBieXRlcygpOiBudW1iZXJbXSB7IHJldHVybiBbXTsgfVxuXG4gIHNpemUoKTogbnVtYmVyIHsgcmV0dXJuIDA7IH1cblxuICBleHBhbmQoY29udGV4dDogQ29udGV4dCk6IHZvaWQge1xuICAgIGNvbnRleHQudXBkYXRlQmFuayh0aGlzLnByZywgdGhpcy5jcHUsIHRoaXMubGVuZ3RoKTtcbiAgfVxufVxuXG5jbGFzcyBDb250ZXh0IHtcblxuICBwYzogbnVtYmVyID0gMDtcbiAgY3B1VG9Qcmc6IChudW1iZXIgfCBudWxsKVtdID0gW107XG4gIHByZ1RvQ3B1OiAobnVtYmVyIHwgbnVsbClbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGxhYmVsczogTGFiZWxzKSB7fVxuXG4gIC8vIE5vdGU6IHRoZXJlJ3MgYWxsIHNvcnRzIG9mIHdheXMgdGhpcyBjb3VsZCBiZSBtYWRlIG1vcmUgZWZmaWNpZW50LFxuICAvLyBidXQgSSBkb24ndCByZWFsbHkgY2FyZSBzaW5jZSBpdCdzIG5vdCBpbiBhbiBpbm5lciBsb29wLlxuICB1cGRhdGVCYW5rKHByZzogbnVtYmVyLCBjcHU6IG51bWJlciwgbGVuZ3RoOiBudW1iZXIpOiB2b2lkIHtcbiAgICAvLyBpbnZhbGlkYXRlIHByZXZpb3VzIHJhbmdlIGZvciB0aGlzIENQVSBhZGRyZXNzZXNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjcHVBZGRyID0gY3B1ICsgaTtcbiAgICAgIGNvbnN0IHByZ0FkZHIgPSB0aGlzLmNwdVRvUHJnW2NwdUFkZHJdO1xuICAgICAgaWYgKHByZ0FkZHIgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLnByZ1RvQ3B1W3ByZ0FkZHJdID0gbnVsbDtcbiAgICAgICAgdGhpcy5jcHVUb1ByZ1tjcHVBZGRyXSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIHJlY29yZCBjdXJyZW50IHJhbmdlXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgY3B1QWRkciA9IGNwdSArIGk7XG4gICAgICBjb25zdCBwcmdBZGRyID0gcHJnICsgaTtcbiAgICAgIHRoaXMucHJnVG9DcHVbcHJnQWRkcl0gPSBjcHVBZGRyO1xuICAgICAgdGhpcy5jcHVUb1ByZ1tjcHVBZGRyXSA9IHByZ0FkZHI7XG4gICAgfVxuICB9XG5cbiAgbWFwTGFiZWwobGFiZWw6IHN0cmluZywgcGM/OiBudW1iZXIpOiBudW1iZXIge1xuICAgIC8vIFJlY3Vyc2l2ZWx5IGV4cGFuZCBhbnkgcGFyZW50aGVzaXplZCBleHByZXNzaW9ucy5cbiAgICBsZXQgZXhwYW5kUGFyZW5zID0gbGFiZWwucmVwbGFjZSgvXFwoKFteKV0qKVxcKS9nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChfLGwpID0+IFN0cmluZyh0aGlzLm1hcExhYmVsKGwsIHBjKSkpO1xuICAgIGlmIChleHBhbmRQYXJlbnMgIT09IGxhYmVsKSByZXR1cm4gdGhpcy5tYXBMYWJlbChleHBhbmRQYXJlbnMsIHBjKTtcbiAgICAvLyBTdXBwb3J0IHZlcnkgc2ltcGxlIGFyaXRobWV0aWMgKCssIC0sIDwsIGFuZCA+KS5cbiAgICBsZXQgbWF0Y2ggPSAvKFteLStdKykoWy0rXSkoLiopLy5leGVjKGxhYmVsKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGNvbnN0IGxlZnQgPSB0aGlzLm1hcChwYXJzZU51bWJlcihtYXRjaFsxXS50cmltKCksIHRydWUpLCBwYyk7XG4gICAgICBjb25zdCByaWdodCA9IHRoaXMubWFwKHBhcnNlTnVtYmVyKG1hdGNoWzNdLnRyaW0oKSwgdHJ1ZSksIHBjKTtcbiAgICAgIHJldHVybiBtYXRjaFsyXSA9PT0gJy0nID8gbGVmdCAtIHJpZ2h0IDogbGVmdCArIHJpZ2h0O1xuICAgIH1cbiAgICBtYXRjaCA9IC8oW14qXSspWypdKC4qKS8uZXhlYyhsYWJlbCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBjb25zdCBsZWZ0ID0gdGhpcy5tYXAocGFyc2VOdW1iZXIobWF0Y2hbMV0udHJpbSgpLCB0cnVlKSwgcGMpO1xuICAgICAgY29uc3QgcmlnaHQgPSB0aGlzLm1hcChwYXJzZU51bWJlcihtYXRjaFsyXS50cmltKCksIHRydWUpLCBwYyk7XG4gICAgICByZXR1cm4gbGVmdCAqIHJpZ2h0O1xuICAgIH1cbiAgICBtYXRjaCA9IC8oWzw+XSkoLiopLy5leGVjKGxhYmVsKTsgLy8gVE9ETyAtIF4gZm9yIGJhbmsgYnl0ZT9cbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGNvbnN0IGFyZyA9IHRoaXMubWFwKHBhcnNlTnVtYmVyKG1hdGNoWzJdLnRyaW0oKSwgdHJ1ZSksIHBjKTtcbiAgICAgIHJldHVybiBtYXRjaFsxXSA9PT0gJzwnID8gYXJnICYgMHhmZiA6IChhcmcgPj4+IDgpICYgMHhmZjtcbiAgICB9XG5cbiAgICAvLyBBcmUgd2UgbGVmdCB3aXRoIGEgbnVtYmVyP1xuICAgIGNvbnN0IG51bSA9IE51bWJlcihsYWJlbCk7XG4gICAgaWYgKCFpc05hTihudW0pKSByZXR1cm4gbnVtO1xuXG4gICAgLy8gTG9vayB1cCB3aGF0ZXZlcidzIGxlZnRvdmVyLlxuICAgIGxldCBhZGRycyA9IHRoaXMubGFiZWxzW2xhYmVsXTtcbiAgICBpZiAoIWFkZHJzKSB0aHJvdyBuZXcgRXJyb3IoYExhYmVsIG5vdCBmb3VuZDogJHtsYWJlbH1gKTtcbiAgICBpZiAocGMgPT0gbnVsbCkge1xuICAgICAgaWYgKGFkZHJzLmxlbmd0aCA+IDEpIHRocm93IG5ldyBFcnJvcihgQW1iaWd1b3VzIGxhYmVsOiAke2xhYmVsfWApO1xuICAgICAgcmV0dXJuIGFkZHJzWzBdO1xuICAgIH1cbiAgICAvLyBmaW5kIHRoZSByZWxldmFudCBsYWJlbC5cbiAgICBwYyA9IH4ocGMgKyAyKTtcbiAgICBjb25zdCBpbmRleCA9IGZpbmQoYWRkcnMsIHBjKTtcbiAgICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGFkZHJzW2luZGV4XTsgLy8gc2hvdWxkIG5ldmVyIGhhcHBlbi5cbiAgICBpZiAoaW5kZXggPT09IC0xKSByZXR1cm4gYWRkcnNbMF07XG4gICAgaWYgKGluZGV4ID09PSB+YWRkcnMubGVuZ3RoKSByZXR1cm4gYWRkcnNbYWRkcnMubGVuZ3RoIC0gMV07XG4gICAgYWRkcnMgPSBhZGRycy5zbGljZSh+aW5kZXggLSAxLCB+aW5kZXggKyAxKTtcbiAgICBpZiAobGFiZWwuc3RhcnRzV2l0aCgnLScpKSByZXR1cm4gYWRkcnNbMV07XG4gICAgaWYgKGxhYmVsLnN0YXJ0c1dpdGgoJysnKSkgcmV0dXJuIGFkZHJzWzBdO1xuICAgIGNvbnN0IG1pZCA9IChhZGRyc1swXSArIGFkZHJzWzFdKSAvIDI7XG4gICAgcmV0dXJuIHBjIDwgbWlkID8gYWRkcnNbMF0gOiBhZGRyc1sxXTtcbiAgfVxuXG4gIG1hcFByZ1RvQ3B1KHByZ0FkZHI6IG51bWJlcik6IG51bWJlciB7XG4gICAgY29uc3QgY3B1QWRkciA9IHRoaXMucHJnVG9DcHVbcHJnQWRkcl07XG4gICAgLy8gSWYgdGhpcyBlcnJvcnMsIHdlIHByb2JhYmx5IG5lZWQgdG8gYWRkIGEgLmJhbmsgZGlyZWN0aXZlLlxuICAgIGlmIChjcHVBZGRyID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgUFJHIGFkZHJlc3MgdW5tYXBwZWQ6ICQke3ByZ0FkZHIudG9TdHJpbmcoMTYpfWApO1xuICAgIHJldHVybiBjcHVBZGRyO1xuICB9XG5cbiAgLy8gcmV0dXJuIENQVSBhZGRyZXNzIG9yIHRocm93IC0gbWFpbiBleHRlcm5hbCBlbnRyeSBwb2ludC5cbiAgbWFwKHByZ0FkZHI6IHN0cmluZyB8IG51bWJlciwgcGM/OiBudW1iZXIpIHtcbiAgICBsZXQgYWRkciA9IHByZ0FkZHI7XG4gICAgaWYgKGFkZHIgPT0gbnVsbCkgcmV0dXJuIGFkZHI7XG4gICAgaWYgKHR5cGVvZiBhZGRyID09PSAnc3RyaW5nJykge1xuICAgICAgYWRkciA9IHRoaXMubWFwTGFiZWwoYWRkciwgcGMpO1xuICAgIH1cbiAgICBpZiAoYWRkciA8IDApIHsgLy8gdGhlIGxhYmVsIG1hcCByZXR1cm5zIH5hZGRyZXNzIGlmIGl0IHNob3VsZCBiZSBtYXBwZWRcbiAgICAgIGFkZHIgPSB0aGlzLm1hcFByZ1RvQ3B1KH5hZGRyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFkZHI7XG4gIH1cbn1cblxuLy8gQSBzaW5nbGUgY2hhbmdlLlxuY2xhc3MgQ2h1bmsgZXh0ZW5kcyBVaW50OEFycmF5IHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgc3RhcnQ6IG51bWJlciwgZGF0YTogVWludDhBcnJheSB8IG51bWJlcltdKSB7XG4gICAgc3VwZXIoZGF0YS5sZW5ndGgpO1xuICAgIHRoaXMuc2V0KGRhdGEpO1xuICB9XG5cbiAgYXBwbHkoZGF0YTogVWludDhBcnJheSk6IHZvaWQge1xuICAgIGRhdGEuc3ViYXJyYXkodGhpcy5zdGFydCwgdGhpcy5zdGFydCArIHRoaXMubGVuZ3RoKS5zZXQodGhpcyk7XG4gIH1cblxuICBzaGlmdChvZmZzZXQ6IG51bWJlcik6IENodW5rIHtcbiAgICBjb25zdCBjID0gbmV3IENodW5rKHRoaXMuc3RhcnQgKyBvZmZzZXQsIHRoaXMpO1xuICAgIHJldHVybiBjO1xuICB9XG59XG5cbi8vIEFuIElQUyBwYXRjaCAtIHRoaXMgaXRlcmF0ZXMgYXMgYSBidW5jaCBvZiBjaHVua3MuICBUbyBjb25jYXRlbmF0ZVxuLy8gdHdvIHBhdGNoZXMgKHAxIGFuZCBwMikgc2ltcGx5IGNhbGwgUGF0Y2guZnJvbShbLi4ucDEsIC4uLnAyXSlcbmNsYXNzIFBhdGNoIHtcbiAgc3RhdGljIGZyb20oY2h1bmtzOiBDaHVua1tdKSB7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIG1vdmluZyB0aGlzIHRvIHRoZSBlZ2VzdGlvbiBzaWRlLlxuICAgIGNvbnN0IGFycmF5cyA9IFtdO1xuICAgIGxldCBsZW5ndGggPSA4O1xuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgY2h1bmtzKSB7XG4gICAgICBjb25zdCBhcnIgPSBuZXcgVWludDhBcnJheShjaHVuay5sZW5ndGggKyA1KTtcbiAgICAgIGFyclswXSA9IGNodW5rLnN0YXJ0ID4+PiAxNjtcbiAgICAgIGFyclsxXSA9IChjaHVuay5zdGFydCA+Pj4gOCkgJiAweGZmO1xuICAgICAgYXJyWzJdID0gY2h1bmsuc3RhcnQgJiAweGZmO1xuICAgICAgYXJyWzNdID0gY2h1bmsubGVuZ3RoID4+PiA4O1xuICAgICAgYXJyWzRdID0gY2h1bmsubGVuZ3RoICYgMHhmZjtcbiAgICAgIGFyci5zZXQoY2h1bmssIDUpO1xuICAgICAgYXJyYXlzLnB1c2goYXJyKTtcbiAgICAgIGxlbmd0aCArPSBhcnIubGVuZ3RoO1xuICAgICAgLy8gY29uc29sZS5sb2coYFBhdGNoIGZyb20gJCR7Y2h1bmsuc3RhcnQudG9TdHJpbmcoMTYpfS4uJCR7XG4gICAgICAvLyAgICAgICAgICAgICAgKGNodW5rLnN0YXJ0K2NodW5rLmxlbmd0aCkudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgICBjb25zdCBkYXRhID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKTtcbiAgICBsZXQgaSA9IDU7XG4gICAgZGF0YVswXSA9IDB4NTA7XG4gICAgZGF0YVsxXSA9IDB4NDE7XG4gICAgZGF0YVsyXSA9IDB4NTQ7XG4gICAgZGF0YVszXSA9IDB4NDM7XG4gICAgZGF0YVs0XSA9IDB4NDg7XG4gICAgZm9yIChjb25zdCBhcnIgb2YgYXJyYXlzKSB7XG4gICAgICBkYXRhLnN1YmFycmF5KGksIGkgKyBhcnIubGVuZ3RoKS5zZXQoYXJyKTtcbiAgICAgIGkgKz0gYXJyLmxlbmd0aDtcbiAgICB9XG4gICAgZGF0YVtpXSA9IDB4NDU7XG4gICAgZGF0YVtpICsgMV0gPSAweDRmO1xuICAgIGRhdGFbaSArIDJdID0gMHg0NjtcbiAgICByZXR1cm4gbmV3IFBhdGNoKGRhdGEpO1xuICB9XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgZGF0YTogVWludDhBcnJheSkge31cblxuICBhcHBseShkYXRhOiBVaW50OEFycmF5KSB7XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiB0aGlzKSB7XG4gICAgICBjaHVuay5hcHBseShkYXRhKTtcbiAgICB9XG4gIH1cblxuICAqIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPENodW5rPiB7XG4gICAgbGV0IHBvcyA9IDU7XG4gICAgd2hpbGUgKHBvcyA8IHRoaXMuZGF0YS5sZW5ndGggLSAzKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHRoaXMuZGF0YVtwb3NdIDw8IDE2IHwgdGhpcy5kYXRhW3BvcyArIDFdIDw8IDggfCB0aGlzLmRhdGFbcG9zICsgMl07XG4gICAgICBjb25zdCBsZW4gPSB0aGlzLmRhdGFbcG9zICsgM10gPDwgOCB8IHRoaXMuZGF0YVtwb3MgKyA0XTtcbiAgICAgIHlpZWxkIG5ldyBDaHVuayhzdGFydCwgdGhpcy5kYXRhLnN1YmFycmF5KHBvcyArIDUsIHBvcyArIDUgKyBsZW4pKTtcbiAgICAgIHBvcyArPSBsZW4gKyA1O1xuICAgIH1cbiAgfVxuXG4gIHRvSGV4U3RyaW5nKCkge1xuICAgIHJldHVybiBbLi4udGhpcy5kYXRhXS5tYXAoeCA9PiB4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpKS5qb2luKCcnKTtcbiAgfVxufVxuXG4vLyBJbnB1dDogYW4gYXNzZW1ibHkgc3RyaW5nXG4vLyBPdXRwdXQ6IGEgcGF0Y2hcbi8vIFRPRE8gLSBjb25zaWRlciBhbHNvIG91dHB1dHRpbmcgdGhlIGRpY3Rpb25hcnkgb2YgbGFiZWxzPz8/XG5leHBvcnQgY29uc3QgYXNzZW1ibGUgPSAoc3RyOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcgPSAnaW5wdXQnKSA9PiB7XG4gIGNvbnN0IGFzbSA9IG5ldyBGaWxlKHt9LCBmaWxlbmFtZSk7XG4gIGZvciAoY29uc3QgbGluZSBvZiBzdHIuc3BsaXQoJ1xcbicpKSB7XG4gICAgYXNtLmluZ2VzdChsaW5lKTtcbiAgfVxuICBjb25zdCBjaHVua3MgPSBhc20uYXNzZW1ibGUoKTtcbiAgcmV0dXJuIFBhdGNoLmZyb20oY2h1bmtzKTtcbn07XG5cbmV4cG9ydCBjb25zdCBidWlsZFJvbVBhdGNoID0gKHByZzogUGF0Y2gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHI/OiBQYXRjaCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZ1NpemU6IG51bWJlciA9IDB4NDAwMDApID0+IHtcbiAgY29uc3QgcHJnQ2h1bmtzID0gWy4uLnByZ10ubWFwKGMgPT4gYy5zaGlmdCgweDEwKSk7XG4gIGNvbnN0IGNockNodW5rcyA9IFsuLi4oY2hyIHx8IFtdKV0ubWFwKGMgPT4gYy5zaGlmdCgweDEwICsgcHJnU2l6ZSkpO1xuICByZXR1cm4gUGF0Y2guZnJvbShbLi4ucHJnQ2h1bmtzLCAuLi5jaHJDaHVua3NdKTtcbn07XG5cbi8vIE9wY29kZSBkYXRhIGZvciA2NTAyXG4vLyBEb2VzIG5vdCBuZWVkIHRvIGJlIGFzIHRob3JvdWdoIGFzIEpTTkVTJ3MgZGF0YVxuXG5jbGFzcyBPcGNvZGUgZXh0ZW5kcyBBYnN0cmFjdExpbmUge1xuXG4gIGFyZzogT3Bjb2RlQXJnO1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBtbmVtb25pYzogTW5lbW9uaWMsXG4gICAgICAgICAgICAgIGFyZzogc3RyaW5nLFxuICAgICAgICAgICAgICBwcml2YXRlIHBjSW50ZXJuYWw6IG51bWJlcikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5hcmcgPSBmaW5kTW9kZShtbmVtb25pYyBhcyBNbmVtb25pYywgYXJnKTtcbiAgfVxuXG4gIC8vIHJlYWRvbmx5IGZyb20gdGhlIG91dHNpZGVcbiAgZ2V0IHBjKCk6IG51bWJlciB7IHJldHVybiB0aGlzLnBjSW50ZXJuYWw7IH1cblxuICBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIDEgKyB0aGlzLmFyZ1sxXTtcbiAgfVxuXG4gIGJ5dGVzKCk6IG51bWJlcltdIHtcbiAgICBsZXQgdmFsdWUgPSB0aGlzLmFyZ1syXSBhcyBudW1iZXI7IC8vIGFscmVhZHkgZXhwYW5kZWRcbiAgICBpZiAodGhpcy5hcmdbMF0gPT09ICdSZWxhdGl2ZScpIHtcbiAgICAgIHZhbHVlIC09IHRoaXMucGMgKyAyO1xuICAgICAgaWYgKCEodmFsdWUgPCAweDgwICYmIHZhbHVlID49IC0weDgwKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRvbyBmYXIgdG8gYnJhbmNoOiAke3ZhbHVlfSBhdCAke3RoaXMuc291cmNlKCl9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IG9wY29kZSA9IG9wY29kZXNbdGhpcy5tbmVtb25pY11bdGhpcy5hcmdbMF1dITtcbiAgICBpZiAob3Bjb2RlID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTm8gb3Bjb2RlOiAke3RoaXMubW5lbW9uaWN9ICR7dGhpcy5hcmdbMF19YCk7XG4gICAgY29uc3QgYnl0ZXMgPSBbb3Bjb2RlXTtcbiAgICBsZXQgY291bnQgPSB0aGlzLmFyZ1sxXTtcbiAgICB3aGlsZSAoY291bnQtLSkge1xuICAgICAgYnl0ZXMucHVzaCh2YWx1ZSAmIDB4ZmYpO1xuICAgICAgdmFsdWUgPj4+PSA4O1xuICAgIH1cbiAgICByZXR1cm4gYnl0ZXM7XG4gIH1cblxuICBleHBhbmQoY29udGV4dDogQ29udGV4dCk6IHZvaWQge1xuICAgIHRoaXMuYXJnWzJdID0gY29udGV4dC5tYXAodGhpcy5hcmdbMl0sIHRoaXMucGMpO1xuICAgIHRyeSB7XG4gICAgICB0aGlzLnBjSW50ZXJuYWwgPSBjb250ZXh0Lm1hcCh+dGhpcy5wYyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7IC8qIG9rICovIH1cbiAgfVxufVxuXG4vLyBiaW5hcnkgc2VhcmNoLiByZXR1cm5zIGluZGV4IG9yIGNvbXBsZW1lbnQgZm9yIHNwbGljZSBwb2ludFxuY29uc3QgZmluZCA9IChhcnI6IG51bWJlcltdLCB2YWw6IG51bWJlcik6IG51bWJlciA9PiB7XG4gIGxldCBhID0gMDtcbiAgbGV0IGIgPSBhcnIubGVuZ3RoIC0gMTtcbiAgaWYgKGIgPCAwKSByZXR1cm4gfjA7XG4gIGlmICh2YWwgPCBhcnJbMF0pIHJldHVybiB+MDtcbiAgY29uc3QgZmIgPSBhcnJbYl07XG4gIGlmICh2YWwgPT09IGZiKSByZXR1cm4gYjtcbiAgaWYgKHZhbCA+IGZiKSByZXR1cm4gfmFyci5sZW5ndGg7XG4gIHdoaWxlIChiIC0gYSA+IDEpIHtcbiAgICBjb25zdCBtaWQgPSAoYSArIGIpID4+IDE7XG4gICAgY29uc3QgZm1pZCA9IGFyclttaWRdO1xuICAgIGlmICh2YWwgPCBmbWlkKSB7XG4gICAgICBiID0gbWlkO1xuICAgIH0gZWxzZSB7XG4gICAgICBhID0gbWlkO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsID09PSBhcnJbYV0gPyBhIDogfmI7XG59O1xuXG50eXBlIEFkZHJlc3NpbmdNb2RlID1cbiAgJ0ltcGxpZWQnIHwgJ0ltbWVkaWF0ZScgfFxuICAnWmVyb1BhZ2UnIHwgJ1plcm9QYWdlWCcgfCAnWmVyb1BhZ2VZJyB8XG4gICdQcmVpbmRleGVkSW5kaXJlY3QnIHwgJ1Bvc3RpbmRleGVkSW5kaXJlY3QnIHwgJ0luZGlyZWN0QWJzb2x1dGUnIHxcbiAgJ0Fic29sdXRlWCcgfCAnQWJzb2x1dGVZJyB8XG4gICdBYnNvbHV0ZScgfCAnUmVsYXRpdmUnO1xudHlwZSBPcGNvZGVBcmcgPSBbQWRkcmVzc2luZ01vZGUsIC8qIGJ5dGVzOiAqLyBudW1iZXIsIC8qIGFyZzogKi8gbnVtYmVyIHwgc3RyaW5nXTtcblxuY29uc3QgZmluZE1vZGUgPSAobW5lbW9uaWM6IE1uZW1vbmljLCBhcmc6IHN0cmluZyk6IE9wY29kZUFyZyA9PiB7XG4gIGZvciAoY29uc3QgW3JlLCBmXSBvZiBtb2Rlcykge1xuICAgIGNvbnN0IG1hdGNoID0gcmUuZXhlYyhhcmcpO1xuICAgIGlmICghbWF0Y2gpIGNvbnRpbnVlO1xuICAgIGNvbnN0IG0gPSBmKG1hdGNoWzFdKTtcbiAgICBpZiAoIShtbmVtb25pYyBpbiBvcGNvZGVzKSkgdGhyb3cgbmV3IEVycm9yKGBCYWQgbW5lbW9uaWM6ICR7bW5lbW9uaWN9YCk7XG4gICAgaWYgKG1bMF0gaW4gb3Bjb2Rlc1ttbmVtb25pY10pIHJldHVybiBtO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgbW9kZSBmb3IgJHttbmVtb25pY30gJHthcmd9XG5FeHBlY3RlZCBvbmUgb2YgWyR7T2JqZWN0LmtleXMob3Bjb2Rlc1ttbmVtb25pY10pLmpvaW4oJywgJyl9XWApO1xufTtcblxuY29uc3QgbW9kZXM6IFtSZWdFeHAsIChhcmc6IHN0cmluZykgPT4gT3Bjb2RlQXJnXVtdID0gW1xuICAvLyBOT1RFOiByZWxhdGl2ZSBpcyB0cmlja3kgYmVjYXVzZSBpdCBvbmx5IGFwcGxpZXMgdG8ganVtcHNcbiAgWy9eJC8sICgpID0+IFsnSW1wbGllZCcsIDAsIDAgLyogdW51c2VkICovXV0sXG4gIFsvXiMoLispJC8sICh4KSA9PiBbJ0ltbWVkaWF0ZScsIDEsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXihcXCQuLikkLywgKHgpID0+IFsnWmVyb1BhZ2UnLCAxLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL14oXFwkLi4pLHgkLywgKHgpID0+IFsnWmVyb1BhZ2VYJywgMSwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eKFxcJC4uKSx5JC8sICh4KSA9PiBbJ1plcm9QYWdlWScsIDEsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXlxcKChcXCQuLikseFxcKSQvLCAoeCkgPT4gWydQcmVpbmRleGVkSW5kaXJlY3QnLCAxLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL15cXCgoXFwkLi4pXFwpLHkkLywgKHgpID0+IFsnUG9zdGluZGV4ZWRJbmRpcmVjdCcsIDEsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXlxcKCguKylcXCkkLywgKHgpID0+IFsnSW5kaXJlY3RBYnNvbHV0ZScsIDIsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXiguKykseCQvLCAoeCkgPT4gWydBYnNvbHV0ZVgnLCAyLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL14oLispLHkkLywgKHgpID0+IFsnQWJzb2x1dGVZJywgMiwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eKC4rKSQvLCAoeCkgPT4gWydBYnNvbHV0ZScsIDIsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXiguKykkLywgKHgpID0+IFsnUmVsYXRpdmUnLCAxLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuXTtcblxuZnVuY3Rpb24gcGFyc2VOdW1iZXIoc3RyOiBzdHJpbmcpOiBudW1iZXI7XG5mdW5jdGlvbiBwYXJzZU51bWJlcihzdHI6IHN0cmluZywgYWxsb3dMYWJlbHM6IHRydWUpOiBudW1iZXIgfCBzdHJpbmc7XG5mdW5jdGlvbiBwYXJzZU51bWJlcihzdHI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgIGFsbG93TGFiZWxzOiBib29sZWFuID0gZmFsc2UpOiBudW1iZXIgfCBzdHJpbmcge1xuICBpZiAoc3RyLnN0YXJ0c1dpdGgoJyQnKSkgcmV0dXJuIE51bWJlci5wYXJzZUludChzdHIuc3Vic3RyaW5nKDEpLCAxNik7XG4gIGlmIChzdHIuc3RhcnRzV2l0aCgnJScpKSByZXR1cm4gTnVtYmVyLnBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMSksIDIpO1xuICBpZiAoc3RyLnN0YXJ0c1dpdGgoJzAnKSkgcmV0dXJuIE51bWJlci5wYXJzZUludChzdHIsIDgpO1xuICBjb25zdCByZXN1bHQgPSBOdW1iZXIucGFyc2VJbnQoc3RyLCAxMCk7XG4gIGlmICghTnVtYmVyLmlzTmFOKHJlc3VsdCkpIHJldHVybiByZXN1bHQ7XG4gIGlmIChhbGxvd0xhYmVscykgcmV0dXJuIHN0cjtcbiAgdGhyb3cgbmV3IEVycm9yKGBCYWQgbnVtYmVyOiAke3N0cn1gKTtcbn1cblxudHlwZSBNbmVtb25pYyA9XG4gICdhZGMnIHwgJ2FuZCcgfCAnYXNsJyB8ICdiY2MnIHwgJ2JjcycgfCAnYmVxJyB8ICdiaXQnIHwgJ2JtaScgfFxuICAnYm5lJyB8ICdicGwnIHwgJ2JyaycgfCAnYnZjJyB8ICdidnMnIHwgJ2NsYycgfCAnY2xkJyB8ICdjbGknIHxcbiAgJ2NsdicgfCAnY21wJyB8ICdjcHgnIHwgJ2NweScgfCAnZGVjJyB8ICdkZXgnIHwgJ2RleScgfCAnZW9yJyB8XG4gICdpbmMnIHwgJ2lueCcgfCAnaW55JyB8ICdqbXAnIHwgJ2pzcicgfCAnbGRhJyB8ICdsZHgnIHwgJ2xkeScgfFxuICAnbHNyJyB8ICdub3AnIHwgJ29yYScgfCAncGhhJyB8ICdwaHAnIHwgJ3BsYScgfCAncGxwJyB8ICdyb2wnIHxcbiAgJ3JvcicgfCAncnRpJyB8ICdydHMnIHwgJ3NiYycgfCAnc2VjJyB8ICdzZWQnIHwgJ3NlaScgfCAnc3RhJyB8XG4gICdzdHgnIHwgJ3N0eScgfCAndGF4JyB8ICd0YXknIHwgJ3RzeCcgfCAndHhhJyB8ICd0eHMnIHwgJ3R5YSc7XG5cbnR5cGUgT3Bjb2RlTGlzdCA9IHtbbW5lbW9uaWMgaW4gTW5lbW9uaWNdOiB7W21vZGUgaW4gQWRkcmVzc2luZ01vZGVdPzogbnVtYmVyfX07XG5jb25zdCBvcGNvZGVzOiBPcGNvZGVMaXN0ID0ge1xuICBhZGM6IHtcbiAgICBBYnNvbHV0ZTogMHg2ZCxcbiAgICBBYnNvbHV0ZVg6IDB4N2QsXG4gICAgQWJzb2x1dGVZOiAweDc5LFxuICAgIEltbWVkaWF0ZTogMHg2OSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweDcxLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHg2MSxcbiAgICBaZXJvUGFnZTogMHg2NSxcbiAgICBaZXJvUGFnZVg6IDB4NzUsXG4gIH0sXG4gIGFuZDoge1xuICAgIEFic29sdXRlOiAweDJkLFxuICAgIEFic29sdXRlWDogMHgzZCxcbiAgICBBYnNvbHV0ZVk6IDB4MzksXG4gICAgSW1tZWRpYXRlOiAweDI5LFxuICAgIFBvc3RpbmRleGVkSW5kaXJlY3Q6IDB4MzEsXG4gICAgUHJlaW5kZXhlZEluZGlyZWN0OiAweDIxLFxuICAgIFplcm9QYWdlOiAweDI1LFxuICAgIFplcm9QYWdlWDogMHgzNSxcbiAgfSxcbiAgYXNsOiB7XG4gICAgQWJzb2x1dGU6IDB4MGUsXG4gICAgQWJzb2x1dGVYOiAweDFlLFxuICAgIEltcGxpZWQ6IDB4MGEsXG4gICAgWmVyb1BhZ2U6IDB4MDYsXG4gICAgWmVyb1BhZ2VYOiAweDE2LFxuICB9LFxuICBiY2M6IHtSZWxhdGl2ZTogMHg5MH0sXG4gIGJjczoge1JlbGF0aXZlOiAweGIwfSxcbiAgYmVxOiB7UmVsYXRpdmU6IDB4ZjB9LFxuICBiaXQ6IHtcbiAgICBBYnNvbHV0ZTogMHgyYyxcbiAgICBaZXJvUGFnZTogMHgyNCxcbiAgfSxcbiAgYm1pOiB7UmVsYXRpdmU6IDB4MzB9LFxuICBibmU6IHtSZWxhdGl2ZTogMHhkMH0sXG4gIGJwbDoge1JlbGF0aXZlOiAweDEwfSxcbiAgYnJrOiB7SW1wbGllZDogMHgwMH0sXG4gIGJ2Yzoge1JlbGF0aXZlOiAweDUwfSxcbiAgYnZzOiB7UmVsYXRpdmU6IDB4NzB9LFxuICBjbGM6IHtJbXBsaWVkOiAweDE4fSxcbiAgY2xkOiB7SW1wbGllZDogMHhkOH0sXG4gIGNsaToge0ltcGxpZWQ6IDB4NTh9LFxuICBjbHY6IHtJbXBsaWVkOiAweGI4fSxcbiAgY21wOiB7XG4gICAgQWJzb2x1dGU6IDB4Y2QsXG4gICAgQWJzb2x1dGVYOiAweGRkLFxuICAgIEFic29sdXRlWTogMHhkOSxcbiAgICBJbW1lZGlhdGU6IDB4YzksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHhkMSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4YzEsXG4gICAgWmVyb1BhZ2U6IDB4YzUsXG4gICAgWmVyb1BhZ2VYOiAweGQ1LFxuICB9LFxuICBjcHg6IHtcbiAgICBBYnNvbHV0ZTogMHhlYyxcbiAgICBJbW1lZGlhdGU6IDB4ZTAsXG4gICAgWmVyb1BhZ2U6IDB4ZTQsXG4gIH0sXG4gIGNweToge1xuICAgIEFic29sdXRlOiAweGNjLFxuICAgIEltbWVkaWF0ZTogMHhjMCxcbiAgICBaZXJvUGFnZTogMHhjNCxcbiAgfSxcbiAgZGVjOiB7XG4gICAgQWJzb2x1dGU6IDB4Y2UsXG4gICAgQWJzb2x1dGVYOiAweGRlLFxuICAgIFplcm9QYWdlOiAweGM2LFxuICAgIFplcm9QYWdlWDogMHhkNixcbiAgfSxcbiAgZGV4OiB7SW1wbGllZDogMHhjYX0sXG4gIGRleToge0ltcGxpZWQ6IDB4ODh9LFxuICBlb3I6IHtcbiAgICBBYnNvbHV0ZTogMHg0ZCxcbiAgICBBYnNvbHV0ZVg6IDB4NWQsXG4gICAgQWJzb2x1dGVZOiAweDU5LFxuICAgIEltbWVkaWF0ZTogMHg0OSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweDUxLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHg0MSxcbiAgICBaZXJvUGFnZTogMHg0NSxcbiAgICBaZXJvUGFnZVg6IDB4NTUsXG4gIH0sXG4gIGluYzoge1xuICAgIEFic29sdXRlOiAweGVlLFxuICAgIEFic29sdXRlWDogMHhmZSxcbiAgICBaZXJvUGFnZTogMHhlNixcbiAgICBaZXJvUGFnZVg6IDB4ZjYsXG4gIH0sXG4gIGlueDoge0ltcGxpZWQ6IDB4ZTh9LFxuICBpbnk6IHtJbXBsaWVkOiAweGM4fSxcbiAgam1wOiB7XG4gICAgQWJzb2x1dGU6IDB4NGMsXG4gICAgSW5kaXJlY3RBYnNvbHV0ZTogMHg2YyxcbiAgfSxcbiAganNyOiB7QWJzb2x1dGU6IDB4MjB9LFxuICBsZGE6IHtcbiAgICBBYnNvbHV0ZTogMHhhZCxcbiAgICBBYnNvbHV0ZVg6IDB4YmQsXG4gICAgQWJzb2x1dGVZOiAweGI5LFxuICAgIEltbWVkaWF0ZTogMHhhOSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweGIxLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHhhMSxcbiAgICBaZXJvUGFnZTogMHhhNSxcbiAgICBaZXJvUGFnZVg6IDB4YjUsXG4gIH0sXG4gIGxkeDoge1xuICAgIEFic29sdXRlOiAweGFlLFxuICAgIEFic29sdXRlWTogMHhiZSxcbiAgICBJbW1lZGlhdGU6IDB4YTIsXG4gICAgWmVyb1BhZ2U6IDB4YTYsXG4gICAgWmVyb1BhZ2VZOiAweGI2LFxuICB9LFxuICBsZHk6IHtcbiAgICBBYnNvbHV0ZTogMHhhYyxcbiAgICBBYnNvbHV0ZVg6IDB4YmMsXG4gICAgSW1tZWRpYXRlOiAweGEwLFxuICAgIFplcm9QYWdlOiAweGE0LFxuICAgIFplcm9QYWdlWDogMHhiNCxcbiAgfSxcbiAgbHNyOiB7XG4gICAgQWJzb2x1dGU6IDB4NGUsXG4gICAgQWJzb2x1dGVYOiAweDVlLFxuICAgIEltcGxpZWQ6IDB4NGEsXG4gICAgWmVyb1BhZ2U6IDB4NDYsXG4gICAgWmVyb1BhZ2VYOiAweDU2LFxuICB9LFxuICBub3A6IHtJbXBsaWVkOiAweGVhfSxcbiAgb3JhOiB7XG4gICAgQWJzb2x1dGU6IDB4MGQsXG4gICAgQWJzb2x1dGVYOiAweDFkLFxuICAgIEFic29sdXRlWTogMHgxOSxcbiAgICBJbW1lZGlhdGU6IDB4MDksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHgxMSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4MDEsXG4gICAgWmVyb1BhZ2U6IDB4MDUsXG4gICAgWmVyb1BhZ2VYOiAweDE1LFxuICB9LFxuICBwaGE6IHtJbXBsaWVkOiAweDQ4fSxcbiAgcGhwOiB7SW1wbGllZDogMHgwOH0sXG4gIHBsYToge0ltcGxpZWQ6IDB4Njh9LFxuICBwbHA6IHtJbXBsaWVkOiAweDI4fSxcbiAgcm9sOiB7XG4gICAgQWJzb2x1dGU6IDB4MmUsXG4gICAgQWJzb2x1dGVYOiAweDNlLFxuICAgIEltcGxpZWQ6IDB4MmEsXG4gICAgWmVyb1BhZ2U6IDB4MjYsXG4gICAgWmVyb1BhZ2VYOiAweDM2LFxuICB9LFxuICByb3I6IHtcbiAgICBBYnNvbHV0ZTogMHg2ZSxcbiAgICBBYnNvbHV0ZVg6IDB4N2UsXG4gICAgSW1wbGllZDogMHg2YSxcbiAgICBaZXJvUGFnZTogMHg2NixcbiAgICBaZXJvUGFnZVg6IDB4NzYsXG4gIH0sXG4gIHJ0aToge0ltcGxpZWQ6IDB4NDB9LFxuICBydHM6IHtJbXBsaWVkOiAweDYwfSxcbiAgc2JjOiB7XG4gICAgQWJzb2x1dGU6IDB4ZWQsXG4gICAgQWJzb2x1dGVYOiAweGZkLFxuICAgIEFic29sdXRlWTogMHhmOSxcbiAgICBJbW1lZGlhdGU6IDB4ZTksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHhmMSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4ZTEsXG4gICAgWmVyb1BhZ2U6IDB4ZTUsXG4gICAgWmVyb1BhZ2VYOiAweGY1LFxuICB9LFxuICBzZWM6IHtJbXBsaWVkOiAweDM4fSxcbiAgc2VkOiB7SW1wbGllZDogMHhmOH0sXG4gIHNlaToge0ltcGxpZWQ6IDB4Nzh9LFxuICBzdGE6IHtcbiAgICBBYnNvbHV0ZTogMHg4ZCxcbiAgICBBYnNvbHV0ZVg6IDB4OWQsXG4gICAgQWJzb2x1dGVZOiAweDk5LFxuICAgIFBvc3RpbmRleGVkSW5kaXJlY3Q6IDB4OTEsXG4gICAgUHJlaW5kZXhlZEluZGlyZWN0OiAweDgxLFxuICAgIFplcm9QYWdlOiAweDg1LFxuICAgIFplcm9QYWdlWDogMHg5NSxcbiAgfSxcbiAgc3R4OiB7XG4gICAgQWJzb2x1dGU6IDB4OGUsXG4gICAgWmVyb1BhZ2U6IDB4ODYsXG4gICAgWmVyb1BhZ2VZOiAweDk2LFxuICB9LFxuICBzdHk6IHtcbiAgICBBYnNvbHV0ZTogMHg4YyxcbiAgICBaZXJvUGFnZTogMHg4NCxcbiAgICBaZXJvUGFnZVg6IDB4OTQsXG4gIH0sXG4gIHRheDoge0ltcGxpZWQ6IDB4YWF9LFxuICB0YXk6IHtJbXBsaWVkOiAweGE4fSxcbiAgdHN4OiB7SW1wbGllZDogMHhiYX0sXG4gIHR4YToge0ltcGxpZWQ6IDB4OGF9LFxuICB0eHM6IHtJbXBsaWVkOiAweDlhfSxcbiAgdHlhOiB7SW1wbGllZDogMHg5OH0sXG59O1xuIl19