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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiNjUwMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy82NTAyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQztBQVFqQixNQUFNLE9BQU8sU0FBUztJQUF0QjtRQUVXLFdBQU0sR0FBVyxFQUFFLENBQUM7UUFDckIsY0FBUyxHQUFZLEVBQUUsQ0FBQztJQWtDbEMsQ0FBQztJQTdCQyxRQUFRLENBQUMsR0FBVyxFQUFFLFdBQW1CLE9BQU87UUFDOUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNoQjtRQUNELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxNQUFNO1FBQ0osT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxLQUFLO1FBQ0gsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsUUFBUSxDQUFDLEdBQWU7UUFDdEIsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBR0QsTUFBTSxDQUFDLEtBQWE7UUFDbEIsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLEVBQUUsR0FBRyxJQUFJLENB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QUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFF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LFNBQVMsRUFBRSxJQUFJO1FBQ2YsbUJBQW1CLEVBQUUsSUFBSTtRQUN6QixrQkFBa0IsRUFBRSxJQUFJO1FBQ3hCLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztDQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgTE9HID0gdHJ1ZTtcblxuLy8gTXVsdGltYXAgZnJvbSBsYWJlbCB0byBhZGRyZXNzLlxuLy8gTmVnYXRpdmUgYWRkcmVzc2VzIGFyZSBQUkcgUk9NIGFuZCBuZWVkIHRvIGJlIG1hcHBlZC5cbmludGVyZmFjZSBMYWJlbHMge1xuICBbbGFiZWw6IHN0cmluZ106IG51bWJlcltdO1xufVxuXG5leHBvcnQgY2xhc3MgQXNzZW1ibGVyIHtcblxuICByZWFkb25seSBsYWJlbHM6IExhYmVscyA9IHt9O1xuICBwcml2YXRlIGFsbENodW5rczogQ2h1bmtbXSA9IFtdO1xuXG4gIC8vIElucHV0OiBhbiBhc3NlbWJseSBzdHJpbmdcbiAgLy8gT3V0cHV0OiBhZGRzIGNodW5rcyB0byB0aGUgc3RhdGUuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBhbHNvIG91dHB1dHRpbmcgdGhlIGRpY3Rpb25hcnkgb2YgbGFiZWxzPz8/XG4gIGFzc2VtYmxlKHN0cjogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nID0gJ2lucHV0Jyk6IHZvaWQge1xuICAgIGNvbnN0IGYgPSBuZXcgRmlsZSh0aGlzLmxhYmVscywgZmlsZW5hbWUpO1xuICAgIGZvciAoY29uc3QgbGluZSBvZiBzdHIuc3BsaXQoJ1xcbicpKSB7XG4gICAgICBmLmluZ2VzdChsaW5lKTtcbiAgICB9XG4gICAgY29uc3QgY2h1bmtzID0gZi5hc3NlbWJsZSgpO1xuICAgIHRoaXMuYWxsQ2h1bmtzLnB1c2goLi4uY2h1bmtzKTtcbiAgfVxuXG4gIGNodW5rcygpOiBDaHVua1tdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuYWxsQ2h1bmtzXTtcbiAgfVxuXG4gIHBhdGNoKCk6IFBhdGNoIHtcbiAgICByZXR1cm4gUGF0Y2guZnJvbSh0aGlzLmFsbENodW5rcyk7XG4gIH1cblxuICBwYXRjaFJvbShyb206IFVpbnQ4QXJyYXkpOiB2b2lkIHtcbiAgICBidWlsZFJvbVBhdGNoKHRoaXMucGF0Y2goKSkuYXBwbHkocm9tKTtcbiAgICB0aGlzLmFsbENodW5rcyA9IFtdO1xuICB9XG5cbiAgLy8gRW5zdXJlcyB0aGF0IGxhYmVsIGlzIHVuaXF1ZVxuICBleHBhbmQobGFiZWw6IHN0cmluZyk6IG51bWJlciB7XG4gICAgY29uc3QgW2FkZHIgPSBudWxsLCAuLi5yZXN0XSA9IHRoaXMubGFiZWxzW2xhYmVsXSB8fCBbXTtcbiAgICBpZiAoYWRkciA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgbGFiZWw6ICR7bGFiZWx9YCk7XG4gICAgaWYgKHJlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYE5vbi11bmlxdWUgbGFiZWw6ICR7bGFiZWx9YCk7XG4gICAgcmV0dXJuIGFkZHIgPCAwID8gfmFkZHIgOiBhZGRyO1xuICB9XG59XG5cbi8vIEEgc2luZ2xlIGNodW5rIG9mIGFzc2VtYmx5XG5jbGFzcyBGaWxlIHtcblxuICByZWFkb25seSBsaW5lczogQWJzdHJhY3RMaW5lW10gPSBbXTtcbiAgcGM6IG51bWJlciA9IDA7XG4gIGxpbmVOdW1iZXI6IG51bWJlciA9IC0xO1xuICBsaW5lQ29udGVudHM6IHN0cmluZyA9ICcnO1xuXG4gIC8vIEZvciBjb25kaXRpb25hbCBhc3NlbWJseVxuICBjb25kaXRpb25zOiBib29sZWFuW10gPSBbXTtcbiAgYXNzZW1ibGluZzogYm9vbGVhbiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbGFiZWxzOiBMYWJlbHMsIHJlYWRvbmx5IGZpbGVuYW1lOiBzdHJpbmcpIHt9XG5cbiAgYWRkTGluZShsaW5lOiBBYnN0cmFjdExpbmUpOiB2b2lkIHtcbiAgICB0aGlzLmxpbmVzLnB1c2gobGluZS5vcmlnKHRoaXMuZmlsZW5hbWUsIHRoaXMubGluZU51bWJlciwgdGhpcy5saW5lQ29udGVudHMpKTtcbiAgfVxuXG4gIGFkZExhYmVsKGxhYmVsOiBzdHJpbmcsIGFkZHJlc3M6IG51bWJlcik6IHZvaWQge1xuICAgIGlmICh0eXBlb2YgYWRkcmVzcyAhPT0gJ251bWJlcicpIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgYSBudW1iZXInKTtcbiAgICBjb25zdCBhcnIgPSB0aGlzLmxhYmVsc1tsYWJlbF0gfHwgKHRoaXMubGFiZWxzW2xhYmVsXSA9IFtdKTtcbiAgICBjb25zdCBpbmRleCA9IGZpbmQoYXJyLCBhZGRyZXNzKTtcbiAgICBpZiAoaW5kZXggPCAwKSBhcnIuc3BsaWNlKH5pbmRleCwgMCwgYWRkcmVzcyk7XG4gIH1cblxuICBwYXJzZU51bWJlcihudW06IHN0cmluZyk6IG51bWJlciB7XG4gICAgLy8gTWFrZSBhIHRlbXBvcmFyeSBjb250ZXh0OiBjYW4gb25seSBleHBhbmQgY29uc3RhbnRzLi4uXG4gICAgLy8gVE9ETyAtIG1ha2UgYSBiZXR0ZXIgZGlzdGluY3Rpb24gYmV0d2VlbiBjb25zdGFudHMvbWFjcm9zIHZzLiBsYWJlbHNcbiAgICAvLyAgICAgIC0gdGhlbiBhbGxvdyBleHBhbmRpbmcgbWFjcm9zIGJ1dCBub3QgbGFiZWxzLlxuICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTnVtYmVyKG51bSwgdHJ1ZSk7XG4gICAgcmV0dXJuIHR5cGVvZiBwYXJzZWQgPT09ICdudW1iZXInID9cbiAgICAgICAgcGFyc2VkIDogbmV3IENvbnRleHQodGhpcy5sYWJlbHMpLm1hcExhYmVsKHBhcnNlZCk7XG4gIH1cblxuICBpbmdlc3QobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5saW5lTnVtYmVyKys7XG4gICAgdGhpcy5saW5lQ29udGVudHMgPSBsaW5lO1xuICAgIC8vIHJlbW92ZSBjb21tZW50c1xuICAgIGxpbmUgPSBsaW5lLnJlcGxhY2UoLzsuKi8sICcnKTtcbiAgICAvLyB0cmltIHRoZSBzdHJpbmcsIGxlYXZlIGF0IG1vc3Qgb25lIHNwYWNlIGF0IHN0YXJ0XG4gICAgbGluZSA9IGxpbmUucmVwbGFjZSgvXFxzKy9nLCAnICcpO1xuICAgIGxpbmUgPSBsaW5lLnJlcGxhY2UoL1xccyQvZywgJycpO1xuXG4gICAgLy8gTG9vayBmb3IgZGlmZmVyZW50IGtpbmRzIG9mIGxpbmVzOiBkaXJlY3RpdmVzLCBsYWJlbHMsIGRhdGEsIG9yIGNvZGVcbiAgICAvLyBUcmljayAtIGhvdyB0byBrbm93IGZvciBmb3J3YXJkIHJlZnMgd2hldGhlciBpdCdzIG5lYXIgb3IgZmFyP1xuICAgIC8vIFNvbHV0aW9uIC0gemVyb3BhZ2UgcmVmcyBtdXN0IGJlIGRlZmluZWQuXG4gICAgbGV0IG1hdGNoO1xuXG4gICAgaWYgKChtYXRjaCA9IC9eXFxzKlxcLmlmKG4/KWRlZlxccysoXFxTKykvaS5leGVjKGxpbmUpKSkge1xuICAgICAgY29uc3QgZGVmID0gbWF0Y2hbMl0gaW4gdGhpcy5sYWJlbHM7XG4gICAgICB0aGlzLmNvbmRpdGlvbnMucHVzaChtYXRjaFsxXSA/ICFkZWYgOiBkZWYpO1xuICAgICAgdGhpcy5hc3NlbWJsaW5nID0gdGhpcy5jb25kaXRpb25zLmV2ZXJ5KHggPT4geCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC5lbHNlL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIHRoaXMuY29uZGl0aW9ucy5wdXNoKCF0aGlzLmNvbmRpdGlvbnMucG9wKCkpO1xuICAgICAgdGhpcy5hc3NlbWJsaW5nID0gdGhpcy5jb25kaXRpb25zLmV2ZXJ5KHggPT4geCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC5lbmRpZi9pLmV4ZWMobGluZSkpKSB7XG4gICAgICB0aGlzLmNvbmRpdGlvbnMucG9wKCk7XG4gICAgICB0aGlzLmFzc2VtYmxpbmcgPSB0aGlzLmNvbmRpdGlvbnMuZXZlcnkoeCA9PiB4KTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLmFzc2VtYmxpbmcpIHtcbiAgICAgIC8vIG5vdGhpbmcgZWxzZSB0byBkbyBhdCB0aGlzIHBvaW50LlxuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL15cXHMqXFwub3JnXFxzKyhcXFMrKS9pLmV4ZWMobGluZSkpKSB7XG4gICAgICB0aGlzLmFkZExpbmUobmV3IE9yZ0xpbmUoKHRoaXMucGMgPSBwYXJzZU51bWJlcihtYXRjaFsxXSkpKSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC5za2lwXFxzKyguKykvaS5leGVjKGxpbmUpKSkge1xuICAgICAgLy8gdGhpcyBpcyBhIHNob3J0Y3V0IGZvciAub3JnIChQQyArIG51bSlcbiAgICAgIHRoaXMuYWRkTGluZShuZXcgT3JnTGluZSgodGhpcy5wYyArPSB0aGlzLnBhcnNlTnVtYmVyKG1hdGNoWzFdKSkpKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLmFzc2VydFxccysoPFxccyopPyhcXFMrKS9pLmV4ZWMobGluZSkpKSB7XG4gICAgICB0aGlzLmFkZExpbmUobmV3IEFzc2VydExpbmUoKHRoaXMucGMgPSBwYXJzZU51bWJlcihtYXRjaFsyXSkpLCAhbWF0Y2hbMV0pKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLmJhbmtcXHMrKFxcUyspXFxzKyhcXFMrKVxccyo6XFxzKihcXFMrKS9pLmV4ZWMobGluZSkpKSB7XG4gICAgICBjb25zdCBbLCBwcmcsIGNwdSwgbGVuZ3RoXSA9IG1hdGNoO1xuICAgICAgdGhpcy5hZGRMaW5lKG5ldyBCYW5rTGluZShwYXJzZU51bWJlcihwcmcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZU51bWJlcihjcHUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZU51bWJlcihsZW5ndGgpKSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC4oYnl0ZXx3b3JkKVxccysoLiopL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIGNvbnN0IGwgPSAobWF0Y2hbMV0gPT09ICd3b3JkJyA/IFdvcmRMaW5lIDogQnl0ZUxpbmUpLnBhcnNlKG1hdGNoWzJdKTtcbiAgICAgIHRoaXMuYWRkTGluZShsKTtcbiAgICAgIHRoaXMucGMgKz0gbC5zaXplKCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC5yZXNcXHMrKFteLF0rKSg/OixcXHMqKC4rKSk/L2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIGNvbnN0IGwgPSBCeXRlTGluZS5wYXJzZVJlcyh0aGlzLnBhcnNlTnVtYmVyKG1hdGNoWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcnNlTnVtYmVyKG1hdGNoWzJdIHx8ICcwJykpO1xuICAgICAgdGhpcy5hZGRMaW5lKGwpO1xuICAgICAgdGhpcy5wYyArPSBsLnNpemUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eZGVmaW5lXFxzKyhcXFMrKVxccysoLiopLy5leGVjKGxpbmUpKSkge1xuICAgICAgY29uc3QgbGFiZWwgPSBtYXRjaFsxXTtcbiAgICAgIHRoaXMuYWRkTGFiZWwobGFiZWwsIHRoaXMucGFyc2VOdW1iZXIobWF0Y2hbMl0pKTsgLy8gbm90IHR3b3MgY29tcGxlbWVudCwgYnV0IHN0aWxsIGFic1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL14oXFxTKz8pOiguKikkLy5leGVjKGxpbmUpKSkge1xuICAgICAgLy8gbGFiZWwgLSBleHRyYWN0IGFuZCByZWNvcmQuXG4gICAgICBjb25zdCBsYWJlbCA9IG1hdGNoWzFdO1xuICAgICAgbGluZSA9ICcgJyArIG1hdGNoWzJdO1xuICAgICAgdGhpcy5hZGRMYWJlbChsYWJlbCwgfnRoaXMucGMpO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL14oKD86Wy0rXStcXHMrKSspKC4qKSQvLmV4ZWMobGluZSkpKSB7XG4gICAgICAvLyByZWxhdGl2ZSBsYWJlbHMgKG11bHRpcGxlIGFsbG93ZWQpIC0gZXh0cmFjdCBhbmQgcmVjb3JkLlxuICAgICAgY29uc3QgbGFiZWxzID0gbWF0Y2hbMV07XG4gICAgICBmb3IgKGNvbnN0IGxhYmVsIG9mIGxhYmVscy50cmltKCkuc3BsaXQoJyAnKSkge1xuICAgICAgICB0aGlzLmFkZExhYmVsKGxhYmVsLCB+dGhpcy5wYyk7XG4gICAgICB9XG4gICAgICBsaW5lID0gJyAnICsgbWF0Y2hbMl07XG4gICAgfVxuICAgIGlmICgobWF0Y2ggPSAvXlxccysoW2Etel17M30pKFxccysuKik/JC8uZXhlYyhsaW5lKSkpIHtcbiAgICAgIGNvbnN0IGwgPSBuZXcgT3Bjb2RlKG1hdGNoWzFdIGFzIE1uZW1vbmljLCAobWF0Y2hbMl0gfHwgJycpLnRyaW0oKSwgdGhpcy5wYyk7XG4gICAgICB0aGlzLmFkZExpbmUobCk7XG4gICAgICB0aGlzLnBjICs9IGwuc2l6ZSgpO1xuICAgIH0gZWxzZSBpZiAoL1xcUy8udGVzdChsaW5lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcGFyc2UgbGluZSAke2xpbmV9IGF0ICR7dGhpcy5maWxlbmFtZX06JHtcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lTnVtYmVyfWApO1xuICAgIH1cbiAgfVxuXG4gIC8vIE91dHB1dCBpcyBhbiBhcnJheSBvZiBDaHVua3NcbiAgYXNzZW1ibGUoKTogQ2h1bmtbXSB7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBDb250ZXh0KHRoaXMubGFiZWxzKTtcbiAgICBjb25zdCBvdXRwdXQ6IG51bWJlcltdID0gW107XG4gICAgY29uc3Qgb3V0cHV0TGluZXM6IEFic3RyYWN0TGluZVtdID0gW107XG4gICAgY29uc3QgY29sbGlzaW9uID0gKGxpbmU6IEFic3RyYWN0TGluZSwgcGM6IG51bWJlcik6IG5ldmVyID0+IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29sbGlzaW9uIGF0ICQke3BjLnRvU3RyaW5nKDE2KVxuICAgICAgICAgICAgICAgICAgICAgICB9OlxcbiAgd3JpdHRlbiBhdCAke291dHB1dExpbmVzW3BjXS5zb3VyY2UoKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiAgd3JpdHRlbiBhdCAke2xpbmUuc291cmNlKCl9YCk7XG4gICAgfTtcbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgdGhpcy5saW5lcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbGluZS5leHBhbmQoY29udGV4dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnN0IHN0YWNrID0gZS5zdGFjay5yZXBsYWNlKGBFcnJvcjogJHtlLm1lc3NhZ2V9YCwgJycpO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZS5tZXNzYWdlO1xuICAgICAgICBjb25zdCBwb3MgPSBgIGZyb20gbGluZSAke2xpbmUub3JpZ0xpbmVOdW1iZXIgKyAxfTogXFxgJHtsaW5lLm9yaWdDb250ZW50fVxcYGA7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHttZXNzYWdlfSR7cG9zfSR7c3RhY2t9XFxuPT09PT09PT09PT09PT09PWApO1xuICAgICAgfVxuICAgICAgaWYgKGxpbmUgaW5zdGFuY2VvZiBPcmdMaW5lICYmIG91dHB1dFtsaW5lLnBjXSAhPSBudWxsKSBjb2xsaXNpb24obGluZSwgbGluZS5wYyk7XG4gICAgICBmb3IgKGNvbnN0IGIgb2YgbGluZS5ieXRlcygpKSB7XG4gICAgICAgIGlmIChvdXRwdXRbY29udGV4dC5wY10gIT0gbnVsbCkgY29sbGlzaW9uKGxpbmUsIGNvbnRleHQucGMpO1xuICAgICAgICBvdXRwdXRMaW5lc1tjb250ZXh0LnBjXSA9IGxpbmU7XG4gICAgICAgIG91dHB1dFtjb250ZXh0LnBjKytdID0gYjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gb3V0cHV0IGlzIGEgc3BhcnNlIGFycmF5IC0gZmluZCB0aGUgZmlyc3QgaW5kaWNlcy5cbiAgICBjb25zdCBzdGFydHMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGkgaW4gb3V0cHV0KSB7XG4gICAgICBpZiAoIShOdW1iZXIoaSkgLSAxIGluIG91dHB1dCkpIHN0YXJ0cy5wdXNoKE51bWJlcihpKSk7XG4gICAgfVxuICAgIC8vIG5vdyBvdXRwdXQgY2h1bmtzLlxuICAgIGNvbnN0IGNodW5rcyA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3RhcnQgb2Ygc3RhcnRzKSB7XG4gICAgICBjb25zdCBkYXRhID0gW107XG4gICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgaW4gb3V0cHV0OyBpKyspIHtcbiAgICAgICAgZGF0YS5wdXNoKG91dHB1dFtpXSk7XG4gICAgICB9XG4gICAgICBjaHVua3MucHVzaChuZXcgQ2h1bmsoc3RhcnQsIGRhdGEpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY29uZGl0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW50ZXJtaW5hdGVkIC5pZicpO1xuICAgIH1cbiAgICByZXR1cm4gY2h1bmtzO1xuICB9XG59XG5cbi8vIEJhc2UgY2xhc3Mgc28gdGhhdCB3ZSBjYW4gdHJhY2sgd2hlcmUgZXJyb3JzIGNvbWUgZnJvbVxuYWJzdHJhY3QgY2xhc3MgQWJzdHJhY3RMaW5lIHtcblxuICBvcmlnRmlsZTogc3RyaW5nID0gJyc7XG4gIG9yaWdMaW5lTnVtYmVyOiBudW1iZXIgPSAtMTtcbiAgb3JpZ0NvbnRlbnQ6IHN0cmluZyA9ICcnO1xuXG4gIG9yaWcoZmlsZTogc3RyaW5nLCBudW06IG51bWJlciwgY29udGVudDogc3RyaW5nKTogdGhpcyB7XG4gICAgdGhpcy5vcmlnRmlsZSA9IGZpbGU7XG4gICAgdGhpcy5vcmlnTGluZU51bWJlciA9IG51bTtcbiAgICB0aGlzLm9yaWdDb250ZW50ID0gY29udGVudDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGFic3RyYWN0IGV4cGFuZChjb250ZXh0OiBDb250ZXh0KTogdm9pZDtcbiAgYWJzdHJhY3QgYnl0ZXMoKTogbnVtYmVyW107XG4gIGFic3RyYWN0IHNpemUoKTogbnVtYmVyO1xuXG4gIHNvdXJjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0aGlzLm9yaWdGaWxlfToke3RoaXMub3JpZ0xpbmVOdW1iZXIgKyAxfSAgJHt0aGlzLm9yaWdDb250ZW50fWA7XG4gIH1cbn1cblxuY2xhc3MgQnl0ZUxpbmUgZXh0ZW5kcyBBYnN0cmFjdExpbmUge1xuICBzdGF0aWMgcGFyc2UobGluZTogc3RyaW5nKSB7XG4gICAgY29uc3QgYnl0ZXM6IEFycmF5PG51bWJlcnxzdHJpbmc+ID0gW107XG4gICAgZm9yIChsZXQgcGFydCBvZiBsaW5lLnNwbGl0KCcsJykpIHtcbiAgICAgIHBhcnQgPSBwYXJ0LnRyaW0oKTtcbiAgICAgIGNvbnN0IG1hdGNoID0gL15cIiguKilcIiQvLmV4ZWMocGFydCk7XG4gICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgYnl0ZXMucHVzaCguLi5bLi4ubWF0Y2hbMV1dLm1hcChzID0+IHMuY2hhckNvZGVBdCgwKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnl0ZXMucHVzaChwYXJzZU51bWJlcihwYXJ0LCB0cnVlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgQnl0ZUxpbmUoYnl0ZXMpO1xuICB9XG5cbiAgc3RhdGljIHBhcnNlUmVzKGNvdW50OiBudW1iZXIsIGRlZmF1bHRWYWx1ZTogbnVtYmVyKSB7XG4gICAgcmV0dXJuIG5ldyBCeXRlTGluZShuZXcgQXJyYXk8bnVtYmVyPihjb3VudCkuZmlsbChkZWZhdWx0VmFsdWUpKTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgYnl0ZXNJbnRlcm5hbDogQXJyYXk8bnVtYmVyfHN0cmluZz4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgYnl0ZXMoKTogbnVtYmVyW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5ieXRlc0ludGVybmFsXSBhcyBudW1iZXJbXTtcbiAgfVxuXG4gIHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5ieXRlc0ludGVybmFsLmxlbmd0aDtcbiAgfVxuXG4gIGV4cGFuZChjb250ZXh0OiBDb250ZXh0KTogdm9pZCB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmJ5dGVzSW50ZXJuYWwubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5ieXRlc0ludGVybmFsW2ldID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLmJ5dGVzSW50ZXJuYWxbaV0gPSBjb250ZXh0Lm1hcCh0aGlzLmJ5dGVzSW50ZXJuYWxbaV0pICYgMHhmZjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgV29yZExpbmUgZXh0ZW5kcyBBYnN0cmFjdExpbmUge1xuICBzdGF0aWMgcGFyc2UobGluZTogc3RyaW5nKSB7XG4gICAgY29uc3Qgd29yZHMgPSBbXTtcbiAgICBmb3IgKGxldCBwYXJ0IG9mIGxpbmUuc3BsaXQoJywnKSkge1xuICAgICAgcGFydCA9IHBhcnQudHJpbSgpO1xuICAgICAgcGFydCA9IHBhcnQucmVwbGFjZSgvWygpXS9nLCAnJyk7IC8vIGhhbmRsZSB0aGVzZSBkaWZmZXJlbnRseT8gY29tcGxlbWVudD9cbiAgICAgIHdvcmRzLnB1c2gocGFyc2VOdW1iZXIocGFydCwgdHJ1ZSkpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFdvcmRMaW5lKHdvcmRzKTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgd29yZHM6IChudW1iZXIgfCBzdHJpbmcpW10pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgYnl0ZXMoKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IGJ5dGVzID0gW107XG4gICAgZm9yIChjb25zdCB3IG9mIHRoaXMud29yZHMgYXMgbnVtYmVyW10pIHsgLy8gYWxyZWFkeSBtYXBwZWRcbiAgICAgIGJ5dGVzLnB1c2godyAmIDB4ZmYpO1xuICAgICAgYnl0ZXMucHVzaCh3ID4+PiA4KTtcbiAgICB9XG4gICAgcmV0dXJuIGJ5dGVzO1xuICB9XG5cbiAgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLndvcmRzLmxlbmd0aCAqIDI7XG4gIH1cblxuICBleHBhbmQoY29udGV4dDogQ29udGV4dCk6IHZvaWQge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy53b3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLndvcmRzW2ldID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLndvcmRzW2ldID0gY29udGV4dC5tYXAodGhpcy53b3Jkc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIE9yZ0xpbmUgZXh0ZW5kcyBBYnN0cmFjdExpbmUge1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBwYzogbnVtYmVyKSB7IHN1cGVyKCk7IH1cblxuICBieXRlcygpOiBudW1iZXJbXSB7IHJldHVybiBbXTsgfVxuXG4gIHNpemUoKTogbnVtYmVyIHsgcmV0dXJuIDA7IH1cblxuICBleHBhbmQoY29udGV4dDogQ29udGV4dCk6IHZvaWQge1xuICAgIC8vIFRPRE8gLSBjYW4gd2UgYWxsb3cgdGhpcy5wYyB0byBiZSBhIGxhYmVsP1xuICAgIGNvbnRleHQucGMgPSB0aGlzLnBjO1xuICB9XG59XG5cbmNsYXNzIEFzc2VydExpbmUgZXh0ZW5kcyBBYnN0cmFjdExpbmUge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBjOiBudW1iZXIsXG4gICAgICAgICAgICAgIHByaXZhdGUgcmVhZG9ubHkgZXhhY3Q6IGJvb2xlYW4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgYnl0ZXMoKTogbnVtYmVyW10geyByZXR1cm4gW107IH1cblxuICBzaXplKCk6IG51bWJlciB7IHJldHVybiAwOyB9XG5cbiAgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkIHtcbiAgICAvLyBUT0RPIC0gY2FuIHdlIGFsbG93IHRoaXMucGMgdG8gYmUgYSBsYWJlbD9cbiAgICBpZiAodGhpcy5leGFjdCA/IGNvbnRleHQucGMgIT09IHRoaXMucGMgOiBjb250ZXh0LnBjID4gdGhpcy5wYykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNhbGlnbm1lbnQ6IGV4cGVjdGVkICR7dGhpcy5leGFjdCA/ICcnIDogJzwgJ30kJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGMudG9TdHJpbmcoMTYpfSBidXQgd2FzICQke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wYy50b1N0cmluZygxNil9YCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5leGFjdCAmJiBMT0cpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBGcmVlOiAke3RoaXMucGMgLSBjb250ZXh0LnBjfSBieXRlcyBiZXR3ZWVuICQke1xuICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnBjLnRvU3RyaW5nKDE2KX0gYW5kICQke3RoaXMucGMudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBCYW5rTGluZSBleHRlbmRzIEFic3RyYWN0TGluZSB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHByZzogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBjcHU6IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXIpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgYnl0ZXMoKTogbnVtYmVyW10geyByZXR1cm4gW107IH1cblxuICBzaXplKCk6IG51bWJlciB7IHJldHVybiAwOyB9XG5cbiAgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkIHtcbiAgICBjb250ZXh0LnVwZGF0ZUJhbmsodGhpcy5wcmcsIHRoaXMuY3B1LCB0aGlzLmxlbmd0aCk7XG4gIH1cbn1cblxuY2xhc3MgQ29udGV4dCB7XG5cbiAgcGM6IG51bWJlciA9IDA7XG4gIGNwdVRvUHJnOiAobnVtYmVyIHwgbnVsbClbXSA9IFtdO1xuICBwcmdUb0NwdTogKG51bWJlciB8IG51bGwpW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBsYWJlbHM6IExhYmVscykge31cblxuICAvLyBOb3RlOiB0aGVyZSdzIGFsbCBzb3J0cyBvZiB3YXlzIHRoaXMgY291bGQgYmUgbWFkZSBtb3JlIGVmZmljaWVudCxcbiAgLy8gYnV0IEkgZG9uJ3QgcmVhbGx5IGNhcmUgc2luY2UgaXQncyBub3QgaW4gYW4gaW5uZXIgbG9vcC5cbiAgdXBkYXRlQmFuayhwcmc6IG51bWJlciwgY3B1OiBudW1iZXIsIGxlbmd0aDogbnVtYmVyKTogdm9pZCB7XG4gICAgLy8gaW52YWxpZGF0ZSBwcmV2aW91cyByYW5nZSBmb3IgdGhpcyBDUFUgYWRkcmVzc2VzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgY3B1QWRkciA9IGNwdSArIGk7XG4gICAgICBjb25zdCBwcmdBZGRyID0gdGhpcy5jcHVUb1ByZ1tjcHVBZGRyXTtcbiAgICAgIGlmIChwcmdBZGRyICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5wcmdUb0NwdVtwcmdBZGRyXSA9IG51bGw7XG4gICAgICAgIHRoaXMuY3B1VG9QcmdbY3B1QWRkcl0gPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyByZWNvcmQgY3VycmVudCByYW5nZVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGNwdUFkZHIgPSBjcHUgKyBpO1xuICAgICAgY29uc3QgcHJnQWRkciA9IHByZyArIGk7XG4gICAgICB0aGlzLnByZ1RvQ3B1W3ByZ0FkZHJdID0gY3B1QWRkcjtcbiAgICAgIHRoaXMuY3B1VG9QcmdbY3B1QWRkcl0gPSBwcmdBZGRyO1xuICAgIH1cbiAgfVxuXG4gIG1hcExhYmVsKGxhYmVsOiBzdHJpbmcsIHBjPzogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAvLyBSZWN1cnNpdmVseSBleHBhbmQgYW55IHBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvbnMuXG4gICAgbGV0IGV4cGFuZFBhcmVucyA9IGxhYmVsLnJlcGxhY2UoL1xcKChbXildKilcXCkvZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoXyxsKSA9PiBTdHJpbmcodGhpcy5tYXBMYWJlbChsLCBwYykpKTtcbiAgICBpZiAoZXhwYW5kUGFyZW5zICE9PSBsYWJlbCkgcmV0dXJuIHRoaXMubWFwTGFiZWwoZXhwYW5kUGFyZW5zLCBwYyk7XG4gICAgLy8gU3VwcG9ydCB2ZXJ5IHNpbXBsZSBhcml0aG1ldGljICgrLCAtLCA8LCBhbmQgPikuXG4gICAgbGV0IG1hdGNoID0gLyhbXi0rXSspKFstK10pKC4qKS8uZXhlYyhsYWJlbCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBjb25zdCBsZWZ0ID0gdGhpcy5tYXAocGFyc2VOdW1iZXIobWF0Y2hbMV0udHJpbSgpLCB0cnVlKSwgcGMpO1xuICAgICAgY29uc3QgcmlnaHQgPSB0aGlzLm1hcChwYXJzZU51bWJlcihtYXRjaFszXS50cmltKCksIHRydWUpLCBwYyk7XG4gICAgICByZXR1cm4gbWF0Y2hbMl0gPT09ICctJyA/IGxlZnQgLSByaWdodCA6IGxlZnQgKyByaWdodDtcbiAgICB9XG4gICAgbWF0Y2ggPSAvKFteKl0rKVsqXSguKikvLmV4ZWMobGFiZWwpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgbGVmdCA9IHRoaXMubWFwKHBhcnNlTnVtYmVyKG1hdGNoWzFdLnRyaW0oKSwgdHJ1ZSksIHBjKTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gdGhpcy5tYXAocGFyc2VOdW1iZXIobWF0Y2hbMl0udHJpbSgpLCB0cnVlKSwgcGMpO1xuICAgICAgcmV0dXJuIGxlZnQgKiByaWdodDtcbiAgICB9XG4gICAgbWF0Y2ggPSAvKFs8Pl0pKC4qKS8uZXhlYyhsYWJlbCk7IC8vIFRPRE8gLSBeIGZvciBiYW5rIGJ5dGU/XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBjb25zdCBhcmcgPSB0aGlzLm1hcChwYXJzZU51bWJlcihtYXRjaFsyXS50cmltKCksIHRydWUpLCBwYyk7XG4gICAgICByZXR1cm4gbWF0Y2hbMV0gPT09ICc8JyA/IGFyZyAmIDB4ZmYgOiAoYXJnID4+PiA4KSAmIDB4ZmY7XG4gICAgfVxuXG4gICAgLy8gQXJlIHdlIGxlZnQgd2l0aCBhIG51bWJlcj9cbiAgICBjb25zdCBudW0gPSBOdW1iZXIobGFiZWwpO1xuICAgIGlmICghaXNOYU4obnVtKSkgcmV0dXJuIG51bTtcblxuICAgIC8vIExvb2sgdXAgd2hhdGV2ZXIncyBsZWZ0b3Zlci5cbiAgICBsZXQgYWRkcnMgPSB0aGlzLmxhYmVsc1tsYWJlbF07XG4gICAgaWYgKCFhZGRycykgdGhyb3cgbmV3IEVycm9yKGBMYWJlbCBub3QgZm91bmQ6ICR7bGFiZWx9YCk7XG4gICAgaWYgKHBjID09IG51bGwpIHtcbiAgICAgIGlmIChhZGRycy5sZW5ndGggPiAxKSB0aHJvdyBuZXcgRXJyb3IoYEFtYmlndW91cyBsYWJlbDogJHtsYWJlbH1gKTtcbiAgICAgIHJldHVybiBhZGRyc1swXTtcbiAgICB9XG4gICAgLy8gZmluZCB0aGUgcmVsZXZhbnQgbGFiZWwuXG4gICAgcGMgPSB+KHBjICsgMik7XG4gICAgY29uc3QgaW5kZXggPSBmaW5kKGFkZHJzLCBwYyk7XG4gICAgaWYgKGluZGV4ID49IDApIHJldHVybiBhZGRyc1tpbmRleF07IC8vIHNob3VsZCBuZXZlciBoYXBwZW4uXG4gICAgaWYgKGluZGV4ID09PSAtMSkgcmV0dXJuIGFkZHJzWzBdO1xuICAgIGlmIChpbmRleCA9PT0gfmFkZHJzLmxlbmd0aCkgcmV0dXJuIGFkZHJzW2FkZHJzLmxlbmd0aCAtIDFdO1xuICAgIGFkZHJzID0gYWRkcnMuc2xpY2UofmluZGV4IC0gMSwgfmluZGV4ICsgMSk7XG4gICAgaWYgKGxhYmVsLnN0YXJ0c1dpdGgoJy0nKSkgcmV0dXJuIGFkZHJzWzFdO1xuICAgIGlmIChsYWJlbC5zdGFydHNXaXRoKCcrJykpIHJldHVybiBhZGRyc1swXTtcbiAgICBjb25zdCBtaWQgPSAoYWRkcnNbMF0gKyBhZGRyc1sxXSkgLyAyO1xuICAgIHJldHVybiBwYyA8IG1pZCA/IGFkZHJzWzBdIDogYWRkcnNbMV07XG4gIH1cblxuICBtYXBQcmdUb0NwdShwcmdBZGRyOiBudW1iZXIpOiBudW1iZXIge1xuICAgIGNvbnN0IGNwdUFkZHIgPSB0aGlzLnByZ1RvQ3B1W3ByZ0FkZHJdO1xuICAgIC8vIElmIHRoaXMgZXJyb3JzLCB3ZSBwcm9iYWJseSBuZWVkIHRvIGFkZCBhIC5iYW5rIGRpcmVjdGl2ZS5cbiAgICBpZiAoY3B1QWRkciA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYFBSRyBhZGRyZXNzIHVubWFwcGVkOiAkJHtwcmdBZGRyLnRvU3RyaW5nKDE2KX1gKTtcbiAgICByZXR1cm4gY3B1QWRkcjtcbiAgfVxuXG4gIC8vIHJldHVybiBDUFUgYWRkcmVzcyBvciB0aHJvdyAtIG1haW4gZXh0ZXJuYWwgZW50cnkgcG9pbnQuXG4gIG1hcChwcmdBZGRyOiBzdHJpbmcgfCBudW1iZXIsIHBjPzogbnVtYmVyKSB7XG4gICAgbGV0IGFkZHIgPSBwcmdBZGRyO1xuICAgIGlmIChhZGRyID09IG51bGwpIHJldHVybiBhZGRyO1xuICAgIGlmICh0eXBlb2YgYWRkciA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGFkZHIgPSB0aGlzLm1hcExhYmVsKGFkZHIsIHBjKTtcbiAgICB9XG4gICAgaWYgKGFkZHIgPCAwKSB7IC8vIHRoZSBsYWJlbCBtYXAgcmV0dXJucyB+YWRkcmVzcyBpZiBpdCBzaG91bGQgYmUgbWFwcGVkXG4gICAgICBhZGRyID0gdGhpcy5tYXBQcmdUb0NwdSh+YWRkcik7XG4gICAgfVxuICAgIHJldHVybiBhZGRyO1xuICB9XG59XG5cbi8vIEEgc2luZ2xlIGNoYW5nZS5cbmNsYXNzIENodW5rIGV4dGVuZHMgVWludDhBcnJheSB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHN0YXJ0OiBudW1iZXIsIGRhdGE6IFVpbnQ4QXJyYXkgfCBudW1iZXJbXSkge1xuICAgIHN1cGVyKGRhdGEubGVuZ3RoKTtcbiAgICB0aGlzLnNldChkYXRhKTtcbiAgfVxuXG4gIGFwcGx5KGRhdGE6IFVpbnQ4QXJyYXkpOiB2b2lkIHtcbiAgICBkYXRhLnN1YmFycmF5KHRoaXMuc3RhcnQsIHRoaXMuc3RhcnQgKyB0aGlzLmxlbmd0aCkuc2V0KHRoaXMpO1xuICB9XG5cbiAgc2hpZnQob2Zmc2V0OiBudW1iZXIpOiBDaHVuayB7XG4gICAgY29uc3QgYyA9IG5ldyBDaHVuayh0aGlzLnN0YXJ0ICsgb2Zmc2V0LCB0aGlzKTtcbiAgICByZXR1cm4gYztcbiAgfVxufVxuXG4vLyBBbiBJUFMgcGF0Y2ggLSB0aGlzIGl0ZXJhdGVzIGFzIGEgYnVuY2ggb2YgY2h1bmtzLiAgVG8gY29uY2F0ZW5hdGVcbi8vIHR3byBwYXRjaGVzIChwMSBhbmQgcDIpIHNpbXBseSBjYWxsIFBhdGNoLmZyb20oWy4uLnAxLCAuLi5wMl0pXG5jbGFzcyBQYXRjaCB7XG4gIHN0YXRpYyBmcm9tKGNodW5rczogQ2h1bmtbXSkge1xuICAgIC8vIFRPRE8gLSBjb25zaWRlciBtb3ZpbmcgdGhpcyB0byB0aGUgZWdlc3Rpb24gc2lkZS5cbiAgICBjb25zdCBhcnJheXMgPSBbXTtcbiAgICBsZXQgbGVuZ3RoID0gODtcbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIGNodW5rcykge1xuICAgICAgY29uc3QgYXJyID0gbmV3IFVpbnQ4QXJyYXkoY2h1bmsubGVuZ3RoICsgNSk7XG4gICAgICBhcnJbMF0gPSBjaHVuay5zdGFydCA+Pj4gMTY7XG4gICAgICBhcnJbMV0gPSAoY2h1bmsuc3RhcnQgPj4+IDgpICYgMHhmZjtcbiAgICAgIGFyclsyXSA9IGNodW5rLnN0YXJ0ICYgMHhmZjtcbiAgICAgIGFyclszXSA9IGNodW5rLmxlbmd0aCA+Pj4gODtcbiAgICAgIGFycls0XSA9IGNodW5rLmxlbmd0aCAmIDB4ZmY7XG4gICAgICBhcnIuc2V0KGNodW5rLCA1KTtcbiAgICAgIGFycmF5cy5wdXNoKGFycik7XG4gICAgICBsZW5ndGggKz0gYXJyLmxlbmd0aDtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGBQYXRjaCBmcm9tICQke2NodW5rLnN0YXJ0LnRvU3RyaW5nKDE2KX0uLiQke1xuICAgICAgLy8gICAgICAgICAgICAgIChjaHVuay5zdGFydCtjaHVuay5sZW5ndGgpLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IG5ldyBVaW50OEFycmF5KGxlbmd0aCk7XG4gICAgbGV0IGkgPSA1O1xuICAgIGRhdGFbMF0gPSAweDUwO1xuICAgIGRhdGFbMV0gPSAweDQxO1xuICAgIGRhdGFbMl0gPSAweDU0O1xuICAgIGRhdGFbM10gPSAweDQzO1xuICAgIGRhdGFbNF0gPSAweDQ4O1xuICAgIGZvciAoY29uc3QgYXJyIG9mIGFycmF5cykge1xuICAgICAgZGF0YS5zdWJhcnJheShpLCBpICsgYXJyLmxlbmd0aCkuc2V0KGFycik7XG4gICAgICBpICs9IGFyci5sZW5ndGg7XG4gICAgfVxuICAgIGRhdGFbaV0gPSAweDQ1O1xuICAgIGRhdGFbaSArIDFdID0gMHg0ZjtcbiAgICBkYXRhW2kgKyAyXSA9IDB4NDY7XG4gICAgcmV0dXJuIG5ldyBQYXRjaChkYXRhKTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGRhdGE6IFVpbnQ4QXJyYXkpIHt9XG5cbiAgYXBwbHkoZGF0YTogVWludDhBcnJheSkge1xuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgdGhpcykge1xuICAgICAgY2h1bmsuYXBwbHkoZGF0YSk7XG4gICAgfVxuICB9XG5cbiAgKiBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxDaHVuaz4ge1xuICAgIGxldCBwb3MgPSA1O1xuICAgIHdoaWxlIChwb3MgPCB0aGlzLmRhdGEubGVuZ3RoIC0gMykge1xuICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLmRhdGFbcG9zXSA8PCAxNiB8IHRoaXMuZGF0YVtwb3MgKyAxXSA8PCA4IHwgdGhpcy5kYXRhW3BvcyArIDJdO1xuICAgICAgY29uc3QgbGVuID0gdGhpcy5kYXRhW3BvcyArIDNdIDw8IDggfCB0aGlzLmRhdGFbcG9zICsgNF07XG4gICAgICB5aWVsZCBuZXcgQ2h1bmsoc3RhcnQsIHRoaXMuZGF0YS5zdWJhcnJheShwb3MgKyA1LCBwb3MgKyA1ICsgbGVuKSk7XG4gICAgICBwb3MgKz0gbGVuICsgNTtcbiAgICB9XG4gIH1cblxuICB0b0hleFN0cmluZygpIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuZGF0YV0ubWFwKHggPT4geC50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKSkuam9pbignJyk7XG4gIH1cbn1cblxuLy8gSW5wdXQ6IGFuIGFzc2VtYmx5IHN0cmluZ1xuLy8gT3V0cHV0OiBhIHBhdGNoXG4vLyBUT0RPIC0gY29uc2lkZXIgYWxzbyBvdXRwdXR0aW5nIHRoZSBkaWN0aW9uYXJ5IG9mIGxhYmVscz8/P1xuZXhwb3J0IGNvbnN0IGFzc2VtYmxlID0gKHN0cjogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nID0gJ2lucHV0JykgPT4ge1xuICBjb25zdCBhc20gPSBuZXcgRmlsZSh7fSwgZmlsZW5hbWUpO1xuICBmb3IgKGNvbnN0IGxpbmUgb2Ygc3RyLnNwbGl0KCdcXG4nKSkge1xuICAgIGFzbS5pbmdlc3QobGluZSk7XG4gIH1cbiAgY29uc3QgY2h1bmtzID0gYXNtLmFzc2VtYmxlKCk7XG4gIHJldHVybiBQYXRjaC5mcm9tKGNodW5rcyk7XG59O1xuXG5leHBvcnQgY29uc3QgYnVpbGRSb21QYXRjaCA9IChwcmc6IFBhdGNoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyPzogUGF0Y2gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmdTaXplOiBudW1iZXIgPSAweDQwMDAwKSA9PiB7XG4gIGNvbnN0IHByZ0NodW5rcyA9IFsuLi5wcmddLm1hcChjID0+IGMuc2hpZnQoMHgxMCkpO1xuICBjb25zdCBjaHJDaHVua3MgPSBbLi4uKGNociB8fCBbXSldLm1hcChjID0+IGMuc2hpZnQoMHgxMCArIHByZ1NpemUpKTtcbiAgcmV0dXJuIFBhdGNoLmZyb20oWy4uLnByZ0NodW5rcywgLi4uY2hyQ2h1bmtzXSk7XG59O1xuXG4vLyBPcGNvZGUgZGF0YSBmb3IgNjUwMlxuLy8gRG9lcyBub3QgbmVlZCB0byBiZSBhcyB0aG9yb3VnaCBhcyBKU05FUydzIGRhdGFcblxuY2xhc3MgT3Bjb2RlIGV4dGVuZHMgQWJzdHJhY3RMaW5lIHtcblxuICBhcmc6IE9wY29kZUFyZztcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbW5lbW9uaWM6IE1uZW1vbmljLFxuICAgICAgICAgICAgICBhcmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgcHJpdmF0ZSBwY0ludGVybmFsOiBudW1iZXIpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuYXJnID0gZmluZE1vZGUobW5lbW9uaWMgYXMgTW5lbW9uaWMsIGFyZyk7XG4gIH1cblxuICAvLyByZWFkb25seSBmcm9tIHRoZSBvdXRzaWRlXG4gIGdldCBwYygpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5wY0ludGVybmFsOyB9XG5cbiAgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiAxICsgdGhpcy5hcmdbMV07XG4gIH1cblxuICBieXRlcygpOiBudW1iZXJbXSB7XG4gICAgbGV0IHZhbHVlID0gdGhpcy5hcmdbMl0gYXMgbnVtYmVyOyAvLyBhbHJlYWR5IGV4cGFuZGVkXG4gICAgaWYgKHRoaXMuYXJnWzBdID09PSAnUmVsYXRpdmUnKSB7XG4gICAgICB2YWx1ZSAtPSB0aGlzLnBjICsgMjtcbiAgICAgIGlmICghKHZhbHVlIDwgMHg4MCAmJiB2YWx1ZSA+PSAtMHg4MCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUb28gZmFyIHRvIGJyYW5jaDogJHt2YWx1ZX0gYXQgJHt0aGlzLnNvdXJjZSgpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBvcGNvZGUgPSBvcGNvZGVzW3RoaXMubW5lbW9uaWNdW3RoaXMuYXJnWzBdXSE7XG4gICAgaWYgKG9wY29kZSA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE5vIG9wY29kZTogJHt0aGlzLm1uZW1vbmljfSAke3RoaXMuYXJnWzBdfWApO1xuICAgIGNvbnN0IGJ5dGVzID0gW29wY29kZV07XG4gICAgbGV0IGNvdW50ID0gdGhpcy5hcmdbMV07XG4gICAgd2hpbGUgKGNvdW50LS0pIHtcbiAgICAgIGJ5dGVzLnB1c2godmFsdWUgJiAweGZmKTtcbiAgICAgIHZhbHVlID4+Pj0gODtcbiAgICB9XG4gICAgcmV0dXJuIGJ5dGVzO1xuICB9XG5cbiAgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkIHtcbiAgICB0aGlzLmFyZ1syXSA9IGNvbnRleHQubWFwKHRoaXMuYXJnWzJdLCB0aGlzLnBjKTtcbiAgICB0cnkge1xuICAgICAgdGhpcy5wY0ludGVybmFsID0gY29udGV4dC5tYXAofnRoaXMucGMpO1xuICAgIH0gY2F0Y2ggKGVycikgeyAvKiBvayAqLyB9XG4gIH1cbn1cblxuLy8gYmluYXJ5IHNlYXJjaC4gcmV0dXJucyBpbmRleCBvciBjb21wbGVtZW50IGZvciBzcGxpY2UgcG9pbnRcbmNvbnN0IGZpbmQgPSAoYXJyOiBudW1iZXJbXSwgdmFsOiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICBsZXQgYSA9IDA7XG4gIGxldCBiID0gYXJyLmxlbmd0aCAtIDE7XG4gIGlmIChiIDwgMCkgcmV0dXJuIH4wO1xuICBpZiAodmFsIDwgYXJyWzBdKSByZXR1cm4gfjA7XG4gIGNvbnN0IGZiID0gYXJyW2JdO1xuICBpZiAodmFsID09PSBmYikgcmV0dXJuIGI7XG4gIGlmICh2YWwgPiBmYikgcmV0dXJuIH5hcnIubGVuZ3RoO1xuICB3aGlsZSAoYiAtIGEgPiAxKSB7XG4gICAgY29uc3QgbWlkID0gKGEgKyBiKSA+PiAxO1xuICAgIGNvbnN0IGZtaWQgPSBhcnJbbWlkXTtcbiAgICBpZiAodmFsIDwgZm1pZCkge1xuICAgICAgYiA9IG1pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgYSA9IG1pZDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbCA9PT0gYXJyW2FdID8gYSA6IH5iO1xufTtcblxudHlwZSBBZGRyZXNzaW5nTW9kZSA9XG4gICdJbXBsaWVkJyB8ICdJbW1lZGlhdGUnIHxcbiAgJ1plcm9QYWdlJyB8ICdaZXJvUGFnZVgnIHwgJ1plcm9QYWdlWScgfFxuICAnUHJlaW5kZXhlZEluZGlyZWN0JyB8ICdQb3N0aW5kZXhlZEluZGlyZWN0JyB8ICdJbmRpcmVjdEFic29sdXRlJyB8XG4gICdBYnNvbHV0ZVgnIHwgJ0Fic29sdXRlWScgfFxuICAnQWJzb2x1dGUnIHwgJ1JlbGF0aXZlJztcbnR5cGUgT3Bjb2RlQXJnID0gW0FkZHJlc3NpbmdNb2RlLCAvKiBieXRlczogKi8gbnVtYmVyLCAvKiBhcmc6ICovIG51bWJlciB8IHN0cmluZ107XG5cbmNvbnN0IGZpbmRNb2RlID0gKG1uZW1vbmljOiBNbmVtb25pYywgYXJnOiBzdHJpbmcpOiBPcGNvZGVBcmcgPT4ge1xuICBmb3IgKGNvbnN0IFtyZSwgZl0gb2YgbW9kZXMpIHtcbiAgICBjb25zdCBtYXRjaCA9IHJlLmV4ZWMoYXJnKTtcbiAgICBpZiAoIW1hdGNoKSBjb250aW51ZTtcbiAgICBjb25zdCBtID0gZihtYXRjaFsxXSk7XG4gICAgaWYgKCEobW5lbW9uaWMgaW4gb3Bjb2RlcykpIHRocm93IG5ldyBFcnJvcihgQmFkIG1uZW1vbmljOiAke21uZW1vbmljfWApO1xuICAgIGlmIChtWzBdIGluIG9wY29kZXNbbW5lbW9uaWNdKSByZXR1cm4gbTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIG1vZGUgZm9yICR7bW5lbW9uaWN9ICR7YXJnfVxuRXhwZWN0ZWQgb25lIG9mIFske09iamVjdC5rZXlzKG9wY29kZXNbbW5lbW9uaWNdKS5qb2luKCcsICcpfV1gKTtcbn07XG5cbmNvbnN0IG1vZGVzOiBbUmVnRXhwLCAoYXJnOiBzdHJpbmcpID0+IE9wY29kZUFyZ11bXSA9IFtcbiAgLy8gTk9URTogcmVsYXRpdmUgaXMgdHJpY2t5IGJlY2F1c2UgaXQgb25seSBhcHBsaWVzIHRvIGp1bXBzXG4gIFsvXiQvLCAoKSA9PiBbJ0ltcGxpZWQnLCAwLCAwIC8qIHVudXNlZCAqL11dLFxuICBbL14jKC4rKSQvLCAoeCkgPT4gWydJbW1lZGlhdGUnLCAxLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL14oXFwkLi4pJC8sICh4KSA9PiBbJ1plcm9QYWdlJywgMSwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eKFxcJC4uKSx4JC8sICh4KSA9PiBbJ1plcm9QYWdlWCcsIDEsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXihcXCQuLikseSQvLCAoeCkgPT4gWydaZXJvUGFnZVknLCAxLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL15cXCgoXFwkLi4pLHhcXCkkLywgKHgpID0+IFsnUHJlaW5kZXhlZEluZGlyZWN0JywgMSwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eXFwoKFxcJC4uKVxcKSx5JC8sICh4KSA9PiBbJ1Bvc3RpbmRleGVkSW5kaXJlY3QnLCAxLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL15cXCgoLispXFwpJC8sICh4KSA9PiBbJ0luZGlyZWN0QWJzb2x1dGUnLCAyLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL14oLispLHgkLywgKHgpID0+IFsnQWJzb2x1dGVYJywgMiwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eKC4rKSx5JC8sICh4KSA9PiBbJ0Fic29sdXRlWScsIDIsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXiguKykkLywgKHgpID0+IFsnQWJzb2x1dGUnLCAyLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL14oLispJC8sICh4KSA9PiBbJ1JlbGF0aXZlJywgMSwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbl07XG5cbmZ1bmN0aW9uIHBhcnNlTnVtYmVyKHN0cjogc3RyaW5nKTogbnVtYmVyO1xuZnVuY3Rpb24gcGFyc2VOdW1iZXIoc3RyOiBzdHJpbmcsIGFsbG93TGFiZWxzOiB0cnVlKTogbnVtYmVyIHwgc3RyaW5nO1xuZnVuY3Rpb24gcGFyc2VOdW1iZXIoc3RyOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICBhbGxvd0xhYmVsczogYm9vbGVhbiA9IGZhbHNlKTogbnVtYmVyIHwgc3RyaW5nIHtcbiAgaWYgKHN0ci5zdGFydHNXaXRoKCckJykpIHJldHVybiBOdW1iZXIucGFyc2VJbnQoc3RyLnN1YnN0cmluZygxKSwgMTYpO1xuICBpZiAoc3RyLnN0YXJ0c1dpdGgoJyUnKSkgcmV0dXJuIE51bWJlci5wYXJzZUludChzdHIuc3Vic3RyaW5nKDEpLCAyKTtcbiAgaWYgKHN0ci5zdGFydHNXaXRoKCcwJykpIHJldHVybiBOdW1iZXIucGFyc2VJbnQoc3RyLCA4KTtcbiAgY29uc3QgcmVzdWx0ID0gTnVtYmVyLnBhcnNlSW50KHN0ciwgMTApO1xuICBpZiAoIU51bWJlci5pc05hTihyZXN1bHQpKSByZXR1cm4gcmVzdWx0O1xuICBpZiAoYWxsb3dMYWJlbHMpIHJldHVybiBzdHI7XG4gIHRocm93IG5ldyBFcnJvcihgQmFkIG51bWJlcjogJHtzdHJ9YCk7XG59XG5cbnR5cGUgTW5lbW9uaWMgPVxuICAnYWRjJyB8ICdhbmQnIHwgJ2FzbCcgfCAnYmNjJyB8ICdiY3MnIHwgJ2JlcScgfCAnYml0JyB8ICdibWknIHxcbiAgJ2JuZScgfCAnYnBsJyB8ICdicmsnIHwgJ2J2YycgfCAnYnZzJyB8ICdjbGMnIHwgJ2NsZCcgfCAnY2xpJyB8XG4gICdjbHYnIHwgJ2NtcCcgfCAnY3B4JyB8ICdjcHknIHwgJ2RlYycgfCAnZGV4JyB8ICdkZXknIHwgJ2VvcicgfFxuICAnaW5jJyB8ICdpbngnIHwgJ2lueScgfCAnam1wJyB8ICdqc3InIHwgJ2xkYScgfCAnbGR4JyB8ICdsZHknIHxcbiAgJ2xzcicgfCAnbm9wJyB8ICdvcmEnIHwgJ3BoYScgfCAncGhwJyB8ICdwbGEnIHwgJ3BscCcgfCAncm9sJyB8XG4gICdyb3InIHwgJ3J0aScgfCAncnRzJyB8ICdzYmMnIHwgJ3NlYycgfCAnc2VkJyB8ICdzZWknIHwgJ3N0YScgfFxuICAnc3R4JyB8ICdzdHknIHwgJ3RheCcgfCAndGF5JyB8ICd0c3gnIHwgJ3R4YScgfCAndHhzJyB8ICd0eWEnO1xuXG50eXBlIE9wY29kZUxpc3QgPSB7W21uZW1vbmljIGluIE1uZW1vbmljXToge1ttb2RlIGluIEFkZHJlc3NpbmdNb2RlXT86IG51bWJlcn19O1xuY29uc3Qgb3Bjb2RlczogT3Bjb2RlTGlzdCA9IHtcbiAgYWRjOiB7XG4gICAgQWJzb2x1dGU6IDB4NmQsXG4gICAgQWJzb2x1dGVYOiAweDdkLFxuICAgIEFic29sdXRlWTogMHg3OSxcbiAgICBJbW1lZGlhdGU6IDB4NjksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHg3MSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4NjEsXG4gICAgWmVyb1BhZ2U6IDB4NjUsXG4gICAgWmVyb1BhZ2VYOiAweDc1LFxuICB9LFxuICBhbmQ6IHtcbiAgICBBYnNvbHV0ZTogMHgyZCxcbiAgICBBYnNvbHV0ZVg6IDB4M2QsXG4gICAgQWJzb2x1dGVZOiAweDM5LFxuICAgIEltbWVkaWF0ZTogMHgyOSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweDMxLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHgyMSxcbiAgICBaZXJvUGFnZTogMHgyNSxcbiAgICBaZXJvUGFnZVg6IDB4MzUsXG4gIH0sXG4gIGFzbDoge1xuICAgIEFic29sdXRlOiAweDBlLFxuICAgIEFic29sdXRlWDogMHgxZSxcbiAgICBJbXBsaWVkOiAweDBhLFxuICAgIFplcm9QYWdlOiAweDA2LFxuICAgIFplcm9QYWdlWDogMHgxNixcbiAgfSxcbiAgYmNjOiB7UmVsYXRpdmU6IDB4OTB9LFxuICBiY3M6IHtSZWxhdGl2ZTogMHhiMH0sXG4gIGJlcToge1JlbGF0aXZlOiAweGYwfSxcbiAgYml0OiB7XG4gICAgQWJzb2x1dGU6IDB4MmMsXG4gICAgWmVyb1BhZ2U6IDB4MjQsXG4gIH0sXG4gIGJtaToge1JlbGF0aXZlOiAweDMwfSxcbiAgYm5lOiB7UmVsYXRpdmU6IDB4ZDB9LFxuICBicGw6IHtSZWxhdGl2ZTogMHgxMH0sXG4gIGJyazoge0ltcGxpZWQ6IDB4MDB9LFxuICBidmM6IHtSZWxhdGl2ZTogMHg1MH0sXG4gIGJ2czoge1JlbGF0aXZlOiAweDcwfSxcbiAgY2xjOiB7SW1wbGllZDogMHgxOH0sXG4gIGNsZDoge0ltcGxpZWQ6IDB4ZDh9LFxuICBjbGk6IHtJbXBsaWVkOiAweDU4fSxcbiAgY2x2OiB7SW1wbGllZDogMHhiOH0sXG4gIGNtcDoge1xuICAgIEFic29sdXRlOiAweGNkLFxuICAgIEFic29sdXRlWDogMHhkZCxcbiAgICBBYnNvbHV0ZVk6IDB4ZDksXG4gICAgSW1tZWRpYXRlOiAweGM5LFxuICAgIFBvc3RpbmRleGVkSW5kaXJlY3Q6IDB4ZDEsXG4gICAgUHJlaW5kZXhlZEluZGlyZWN0OiAweGMxLFxuICAgIFplcm9QYWdlOiAweGM1LFxuICAgIFplcm9QYWdlWDogMHhkNSxcbiAgfSxcbiAgY3B4OiB7XG4gICAgQWJzb2x1dGU6IDB4ZWMsXG4gICAgSW1tZWRpYXRlOiAweGUwLFxuICAgIFplcm9QYWdlOiAweGU0LFxuICB9LFxuICBjcHk6IHtcbiAgICBBYnNvbHV0ZTogMHhjYyxcbiAgICBJbW1lZGlhdGU6IDB4YzAsXG4gICAgWmVyb1BhZ2U6IDB4YzQsXG4gIH0sXG4gIGRlYzoge1xuICAgIEFic29sdXRlOiAweGNlLFxuICAgIEFic29sdXRlWDogMHhkZSxcbiAgICBaZXJvUGFnZTogMHhjNixcbiAgICBaZXJvUGFnZVg6IDB4ZDYsXG4gIH0sXG4gIGRleDoge0ltcGxpZWQ6IDB4Y2F9LFxuICBkZXk6IHtJbXBsaWVkOiAweDg4fSxcbiAgZW9yOiB7XG4gICAgQWJzb2x1dGU6IDB4NGQsXG4gICAgQWJzb2x1dGVYOiAweDVkLFxuICAgIEFic29sdXRlWTogMHg1OSxcbiAgICBJbW1lZGlhdGU6IDB4NDksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHg1MSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4NDEsXG4gICAgWmVyb1BhZ2U6IDB4NDUsXG4gICAgWmVyb1BhZ2VYOiAweDU1LFxuICB9LFxuICBpbmM6IHtcbiAgICBBYnNvbHV0ZTogMHhlZSxcbiAgICBBYnNvbHV0ZVg6IDB4ZmUsXG4gICAgWmVyb1BhZ2U6IDB4ZTYsXG4gICAgWmVyb1BhZ2VYOiAweGY2LFxuICB9LFxuICBpbng6IHtJbXBsaWVkOiAweGU4fSxcbiAgaW55OiB7SW1wbGllZDogMHhjOH0sXG4gIGptcDoge1xuICAgIEFic29sdXRlOiAweDRjLFxuICAgIEluZGlyZWN0QWJzb2x1dGU6IDB4NmMsXG4gIH0sXG4gIGpzcjoge0Fic29sdXRlOiAweDIwfSxcbiAgbGRhOiB7XG4gICAgQWJzb2x1dGU6IDB4YWQsXG4gICAgQWJzb2x1dGVYOiAweGJkLFxuICAgIEFic29sdXRlWTogMHhiOSxcbiAgICBJbW1lZGlhdGU6IDB4YTksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHhiMSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4YTEsXG4gICAgWmVyb1BhZ2U6IDB4YTUsXG4gICAgWmVyb1BhZ2VYOiAweGI1LFxuICB9LFxuICBsZHg6IHtcbiAgICBBYnNvbHV0ZTogMHhhZSxcbiAgICBBYnNvbHV0ZVk6IDB4YmUsXG4gICAgSW1tZWRpYXRlOiAweGEyLFxuICAgIFplcm9QYWdlOiAweGE2LFxuICAgIFplcm9QYWdlWTogMHhiNixcbiAgfSxcbiAgbGR5OiB7XG4gICAgQWJzb2x1dGU6IDB4YWMsXG4gICAgQWJzb2x1dGVYOiAweGJjLFxuICAgIEltbWVkaWF0ZTogMHhhMCxcbiAgICBaZXJvUGFnZTogMHhhNCxcbiAgICBaZXJvUGFnZVg6IDB4YjQsXG4gIH0sXG4gIGxzcjoge1xuICAgIEFic29sdXRlOiAweDRlLFxuICAgIEFic29sdXRlWDogMHg1ZSxcbiAgICBJbXBsaWVkOiAweDRhLFxuICAgIFplcm9QYWdlOiAweDQ2LFxuICAgIFplcm9QYWdlWDogMHg1NixcbiAgfSxcbiAgbm9wOiB7SW1wbGllZDogMHhlYX0sXG4gIG9yYToge1xuICAgIEFic29sdXRlOiAweDBkLFxuICAgIEFic29sdXRlWDogMHgxZCxcbiAgICBBYnNvbHV0ZVk6IDB4MTksXG4gICAgSW1tZWRpYXRlOiAweDA5LFxuICAgIFBvc3RpbmRleGVkSW5kaXJlY3Q6IDB4MTEsXG4gICAgUHJlaW5kZXhlZEluZGlyZWN0OiAweDAxLFxuICAgIFplcm9QYWdlOiAweDA1LFxuICAgIFplcm9QYWdlWDogMHgxNSxcbiAgfSxcbiAgcGhhOiB7SW1wbGllZDogMHg0OH0sXG4gIHBocDoge0ltcGxpZWQ6IDB4MDh9LFxuICBwbGE6IHtJbXBsaWVkOiAweDY4fSxcbiAgcGxwOiB7SW1wbGllZDogMHgyOH0sXG4gIHJvbDoge1xuICAgIEFic29sdXRlOiAweDJlLFxuICAgIEFic29sdXRlWDogMHgzZSxcbiAgICBJbXBsaWVkOiAweDJhLFxuICAgIFplcm9QYWdlOiAweDI2LFxuICAgIFplcm9QYWdlWDogMHgzNixcbiAgfSxcbiAgcm9yOiB7XG4gICAgQWJzb2x1dGU6IDB4NmUsXG4gICAgQWJzb2x1dGVYOiAweDdlLFxuICAgIEltcGxpZWQ6IDB4NmEsXG4gICAgWmVyb1BhZ2U6IDB4NjYsXG4gICAgWmVyb1BhZ2VYOiAweDc2LFxuICB9LFxuICBydGk6IHtJbXBsaWVkOiAweDQwfSxcbiAgcnRzOiB7SW1wbGllZDogMHg2MH0sXG4gIHNiYzoge1xuICAgIEFic29sdXRlOiAweGVkLFxuICAgIEFic29sdXRlWDogMHhmZCxcbiAgICBBYnNvbHV0ZVk6IDB4ZjksXG4gICAgSW1tZWRpYXRlOiAweGU5LFxuICAgIFBvc3RpbmRleGVkSW5kaXJlY3Q6IDB4ZjEsXG4gICAgUHJlaW5kZXhlZEluZGlyZWN0OiAweGUxLFxuICAgIFplcm9QYWdlOiAweGU1LFxuICAgIFplcm9QYWdlWDogMHhmNSxcbiAgfSxcbiAgc2VjOiB7SW1wbGllZDogMHgzOH0sXG4gIHNlZDoge0ltcGxpZWQ6IDB4Zjh9LFxuICBzZWk6IHtJbXBsaWVkOiAweDc4fSxcbiAgc3RhOiB7XG4gICAgQWJzb2x1dGU6IDB4OGQsXG4gICAgQWJzb2x1dGVYOiAweDlkLFxuICAgIEFic29sdXRlWTogMHg5OSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweDkxLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHg4MSxcbiAgICBaZXJvUGFnZTogMHg4NSxcbiAgICBaZXJvUGFnZVg6IDB4OTUsXG4gIH0sXG4gIHN0eDoge1xuICAgIEFic29sdXRlOiAweDhlLFxuICAgIFplcm9QYWdlOiAweDg2LFxuICAgIFplcm9QYWdlWTogMHg5NixcbiAgfSxcbiAgc3R5OiB7XG4gICAgQWJzb2x1dGU6IDB4OGMsXG4gICAgWmVyb1BhZ2U6IDB4ODQsXG4gICAgWmVyb1BhZ2VYOiAweDk0LFxuICB9LFxuICB0YXg6IHtJbXBsaWVkOiAweGFhfSxcbiAgdGF5OiB7SW1wbGllZDogMHhhOH0sXG4gIHRzeDoge0ltcGxpZWQ6IDB4YmF9LFxuICB0eGE6IHtJbXBsaWVkOiAweDhhfSxcbiAgdHhzOiB7SW1wbGllZDogMHg5YX0sXG4gIHR5YToge0ltcGxpZWQ6IDB4OTh9LFxufTtcbiJdfQ==