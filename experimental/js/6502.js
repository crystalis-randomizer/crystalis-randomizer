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
                this.bytesInternal[i] = context.map(this.bytesInternal[i]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiNjUwMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy82NTAyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQztBQVFqQixNQUFNLE9BQU8sU0FBUztJQUF0QjtRQUVXLFdBQU0sR0FBVyxFQUFFLENBQUM7UUFDckIsY0FBUyxHQUFZLEVBQUUsQ0FBQztJQWtDbEMsQ0FBQztJQTdCQyxRQUFRLENBQUMsR0FBVyxFQUFFLFdBQW1CLE9BQU87UUFDOUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNoQjtRQUNELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxNQUFNO1FBQ0osT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxLQUFLO1FBQ0gsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsUUFBUSxDQUFDLEdBQWU7UUFDdEIsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBR0QsTUFBTSxDQUFDLEtBQWE7UUFDbEIsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLEVBQUUsR0FBRyxJQUFJLENB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QUMsQ0FBQyxDQUFDO0lBQzFELENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0UsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwRSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN4RCxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztDQUN6RCxDQUFDO0FBSUYsU0FBUyxXQUFXLENBQUMsR0FBVyxFQUNYLGNBQXVCLEtBQUs7SUFDL0MsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztRQUFFLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3RFLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7UUFBRSxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNyRSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1FBQUUsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4RCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFBRSxPQUFPLE1BQU0sQ0FBQztJQUN6QyxJQUFJLFdBQVc7UUFBRSxPQUFPLEdBQUcsQ0FBQztJQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBWUQsTUFBTSxPQUFPLEdBQWU7SUFDMUIsR0FBRyxFQUFFO1FBQ0gsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtRQUNmLFNBQVMsRUFBRSxJQUFJO1FBQ2YsU0FBUyxFQUFFLElBQUk7UUFDZixtQkFBbUIsRUFBRSxJQUFJO1FBQ3pCLGtCQUFrQixFQUFFLElBQUk7UUFDeEIsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtLQUNoQjtJQUNELEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7UUFDZixTQUFTLEVBQUUsSUFBSTtRQUNmLFNBQVMsRUFBRSxJQUFJO1FBQ2YsbUJBQW1CLEVBQUUsSUFBSTtRQUN6QixrQkFBa0IsRUFBRSxJQUFJO1FBQ3hCLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO1FBQ2YsT0FBTyxFQUFFLElBQUk7UUFDYixRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO0tBQ2hCO0lBQ0QsR0FBRyxFQUFFLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBQztJQUNyQixHQUFHLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFDO0lBQ3JCLEdBQUcsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUM7SUFDckIsR0FBRyxFQUFFO1FBQ0gsUUFBUSxFQUFFLElBQUk7UUFDZCxRQUFRLEVBQUUsSUFBSTtLQUNmO0lBQ0QsR0FBRyxFQUFFLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBQztJQUNyQixHQUFHLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFDO0lBQ3JCLEdBQUcsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUM7SUFDckIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFDO0lBQ3JCLEdBQUcsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUM7SUFDckIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO1FBQ2YsU0FBUyxFQUFFLElBQUk7UUFDZixTQUFTLEVBQUUsSUFBSTtRQUNmLG1CQUFtQixFQUFFLElBQUk7UUFDekIsa0JBQWtCLEVBQUUsSUFBSTtRQUN4QixRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO0tBQ2hCO0lBQ0QsR0FBRyxFQUFFO1FBQ0gsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtRQUNmLFFBQVEsRUFBRSxJQUFJO0tBQ2Y7SUFDRCxHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO1FBQ2YsUUFBUSxFQUFFLElBQUk7S0FDZjtJQUNELEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7UUFDZixRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO0tBQ2hCO0lBQ0QsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7UUFDZixTQUFTLEVBQUUsSUFBSTtRQUNmLFNBQVMsRUFBRSxJQUFJO1FBQ2YsbUJBQW1CLEVBQUUsSUFBSTtRQUN6QixrQkFBa0IsRUFBRSxJQUFJO1FBQ3hCLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO1FBQ2YsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtLQUNoQjtJQUNELEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLGdCQUFnQixFQUFFLElBQUk7S0FDdkI7SUFDRCxHQUFHLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFDO0lBQ3JCLEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7UUFDZixTQUFTLEVBQUUsSUFBSTtRQUNmLFNBQVMsRUFBRSxJQUFJO1FBQ2YsbUJBQW1CLEVBQUUsSUFBSTtRQUN6QixrQkFBa0IsRUFBRSxJQUFJO1FBQ3hCLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO1FBQ2YsU0FBUyxFQUFFLElBQUk7UUFDZixRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO0tBQ2hCO0lBQ0QsR0FBRyxFQUFFO1FBQ0gsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtRQUNmLFNBQVMsRUFBRSxJQUFJO1FBQ2YsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtLQUNoQjtJQUNELEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7UUFDZixPQUFPLEVBQUUsSUFBSTtRQUNiLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7UUFDZixTQUFTLEVBQUUsSUFBSTtRQUNmLFNBQVMsRUFBRSxJQUFJO1FBQ2YsbUJBQW1CLEVBQUUsSUFBSTtRQUN6QixrQkFBa0IsRUFBRSxJQUFJO1FBQ3hCLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7UUFDZixPQUFPLEVBQUUsSUFBSTtRQUNiLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO1FBQ2YsT0FBTyxFQUFFLElBQUk7UUFDYixRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO0tBQ2hCO0lBQ0QsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7UUFDZixTQUFTLEVBQUUsSUFBSTtRQUNmLFNBQVMsRUFBRSxJQUFJO1FBQ2YsbUJBQW1CLEVBQUUsSUFBSTtRQUN6QixrQkFBa0IsRUFBRSxJQUFJO1FBQ3hCLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLElBQUk7S0FDaEI7SUFDRCxHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUU7UUFDSCxRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxJQUFJO1FBQ2YsU0FBUyxFQUFFLElBQUk7UUFDZixtQkFBbUIsRUFBRSxJQUFJO1FBQ3pCLGtCQUFrQixFQUFFLElBQUk7UUFDeEIsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtLQUNoQjtJQUNELEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtLQUNoQjtJQUNELEdBQUcsRUFBRTtRQUNILFFBQVEsRUFBRSxJQUFJO1FBQ2QsUUFBUSxFQUFFLElBQUk7UUFDZCxTQUFTLEVBQUUsSUFBSTtLQUNoQjtJQUNELEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0lBQ3BCLEdBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUM7SUFDcEIsR0FBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQztJQUNwQixHQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDO0NBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBMT0cgPSB0cnVlO1xuXG4vLyBNdWx0aW1hcCBmcm9tIGxhYmVsIHRvIGFkZHJlc3MuXG4vLyBOZWdhdGl2ZSBhZGRyZXNzZXMgYXJlIFBSRyBST00gYW5kIG5lZWQgdG8gYmUgbWFwcGVkLlxuaW50ZXJmYWNlIExhYmVscyB7XG4gIFtsYWJlbDogc3RyaW5nXTogbnVtYmVyW107XG59XG5cbmV4cG9ydCBjbGFzcyBBc3NlbWJsZXIge1xuXG4gIHJlYWRvbmx5IGxhYmVsczogTGFiZWxzID0ge307XG4gIHByaXZhdGUgYWxsQ2h1bmtzOiBDaHVua1tdID0gW107XG5cbiAgLy8gSW5wdXQ6IGFuIGFzc2VtYmx5IHN0cmluZ1xuICAvLyBPdXRwdXQ6IGFkZHMgY2h1bmtzIHRvIHRoZSBzdGF0ZS5cbiAgLy8gVE9ETyAtIGNvbnNpZGVyIGFsc28gb3V0cHV0dGluZyB0aGUgZGljdGlvbmFyeSBvZiBsYWJlbHM/Pz9cbiAgYXNzZW1ibGUoc3RyOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcgPSAnaW5wdXQnKTogdm9pZCB7XG4gICAgY29uc3QgZiA9IG5ldyBGaWxlKHRoaXMubGFiZWxzLCBmaWxlbmFtZSk7XG4gICAgZm9yIChjb25zdCBsaW5lIG9mIHN0ci5zcGxpdCgnXFxuJykpIHtcbiAgICAgIGYuaW5nZXN0KGxpbmUpO1xuICAgIH1cbiAgICBjb25zdCBjaHVua3MgPSBmLmFzc2VtYmxlKCk7XG4gICAgdGhpcy5hbGxDaHVua3MucHVzaCguLi5jaHVua3MpO1xuICB9XG5cbiAgY2h1bmtzKCk6IENodW5rW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5hbGxDaHVua3NdO1xuICB9XG5cbiAgcGF0Y2goKTogUGF0Y2gge1xuICAgIHJldHVybiBQYXRjaC5mcm9tKHRoaXMuYWxsQ2h1bmtzKTtcbiAgfVxuXG4gIHBhdGNoUm9tKHJvbTogVWludDhBcnJheSk6IHZvaWQge1xuICAgIGJ1aWxkUm9tUGF0Y2godGhpcy5wYXRjaCgpKS5hcHBseShyb20pO1xuICAgIHRoaXMuYWxsQ2h1bmtzID0gW107XG4gIH1cblxuICAvLyBFbnN1cmVzIHRoYXQgbGFiZWwgaXMgdW5pcXVlXG4gIGV4cGFuZChsYWJlbDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICBjb25zdCBbYWRkciA9IG51bGwsIC4uLnJlc3RdID0gdGhpcy5sYWJlbHNbbGFiZWxdIHx8IFtdO1xuICAgIGlmIChhZGRyID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBsYWJlbDogJHtsYWJlbH1gKTtcbiAgICBpZiAocmVzdC5sZW5ndGgpIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSBsYWJlbDogJHtsYWJlbH1gKTtcbiAgICByZXR1cm4gYWRkciA8IDAgPyB+YWRkciA6IGFkZHI7XG4gIH1cbn1cblxuLy8gQSBzaW5nbGUgY2h1bmsgb2YgYXNzZW1ibHlcbmNsYXNzIEZpbGUge1xuXG4gIHJlYWRvbmx5IGxpbmVzOiBBYnN0cmFjdExpbmVbXSA9IFtdO1xuICBwYzogbnVtYmVyID0gMDtcbiAgbGluZU51bWJlcjogbnVtYmVyID0gLTE7XG4gIGxpbmVDb250ZW50czogc3RyaW5nID0gJyc7XG5cbiAgLy8gRm9yIGNvbmRpdGlvbmFsIGFzc2VtYmx5XG4gIGNvbmRpdGlvbnM6IGJvb2xlYW5bXSA9IFtdO1xuICBhc3NlbWJsaW5nOiBib29sZWFuID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBsYWJlbHM6IExhYmVscywgcmVhZG9ubHkgZmlsZW5hbWU6IHN0cmluZykge31cblxuICBhZGRMaW5lKGxpbmU6IEFic3RyYWN0TGluZSk6IHZvaWQge1xuICAgIHRoaXMubGluZXMucHVzaChsaW5lLm9yaWcodGhpcy5maWxlbmFtZSwgdGhpcy5saW5lTnVtYmVyLCB0aGlzLmxpbmVDb250ZW50cykpO1xuICB9XG5cbiAgYWRkTGFiZWwobGFiZWw6IHN0cmluZywgYWRkcmVzczogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiBhZGRyZXNzICE9PSAnbnVtYmVyJykgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBhIG51bWJlcicpO1xuICAgIGNvbnN0IGFyciA9IHRoaXMubGFiZWxzW2xhYmVsXSB8fCAodGhpcy5sYWJlbHNbbGFiZWxdID0gW10pO1xuICAgIGNvbnN0IGluZGV4ID0gZmluZChhcnIsIGFkZHJlc3MpO1xuICAgIGlmIChpbmRleCA8IDApIGFyci5zcGxpY2UofmluZGV4LCAwLCBhZGRyZXNzKTtcbiAgfVxuXG4gIHBhcnNlTnVtYmVyKG51bTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAvLyBNYWtlIGEgdGVtcG9yYXJ5IGNvbnRleHQ6IGNhbiBvbmx5IGV4cGFuZCBjb25zdGFudHMuLi5cbiAgICAvLyBUT0RPIC0gbWFrZSBhIGJldHRlciBkaXN0aW5jdGlvbiBiZXR3ZWVuIGNvbnN0YW50cy9tYWNyb3MgdnMuIGxhYmVsc1xuICAgIC8vICAgICAgLSB0aGVuIGFsbG93IGV4cGFuZGluZyBtYWNyb3MgYnV0IG5vdCBsYWJlbHMuXG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VOdW1iZXIobnVtLCB0cnVlKTtcbiAgICByZXR1cm4gdHlwZW9mIHBhcnNlZCA9PT0gJ251bWJlcicgP1xuICAgICAgICBwYXJzZWQgOiBuZXcgQ29udGV4dCh0aGlzLmxhYmVscykubWFwTGFiZWwocGFyc2VkKTtcbiAgfVxuXG4gIGluZ2VzdChsaW5lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIrKztcbiAgICB0aGlzLmxpbmVDb250ZW50cyA9IGxpbmU7XG4gICAgLy8gcmVtb3ZlIGNvbW1lbnRzXG4gICAgbGluZSA9IGxpbmUucmVwbGFjZSgvOy4qLywgJycpO1xuICAgIC8vIHRyaW0gdGhlIHN0cmluZywgbGVhdmUgYXQgbW9zdCBvbmUgc3BhY2UgYXQgc3RhcnRcbiAgICBsaW5lID0gbGluZS5yZXBsYWNlKC9cXHMrL2csICcgJyk7XG4gICAgbGluZSA9IGxpbmUucmVwbGFjZSgvXFxzJC9nLCAnJyk7XG5cbiAgICAvLyBMb29rIGZvciBkaWZmZXJlbnQga2luZHMgb2YgbGluZXM6IGRpcmVjdGl2ZXMsIGxhYmVscywgZGF0YSwgb3IgY29kZVxuICAgIC8vIFRyaWNrIC0gaG93IHRvIGtub3cgZm9yIGZvcndhcmQgcmVmcyB3aGV0aGVyIGl0J3MgbmVhciBvciBmYXI/XG4gICAgLy8gU29sdXRpb24gLSB6ZXJvcGFnZSByZWZzIG11c3QgYmUgZGVmaW5lZC5cbiAgICBsZXQgbWF0Y2g7XG5cbiAgICBpZiAoKG1hdGNoID0gL15cXHMqXFwuaWYobj8pZGVmXFxzKyhcXFMrKS9pLmV4ZWMobGluZSkpKSB7XG4gICAgICBjb25zdCBkZWYgPSBtYXRjaFsyXSBpbiB0aGlzLmxhYmVscztcbiAgICAgIHRoaXMuY29uZGl0aW9ucy5wdXNoKG1hdGNoWzFdID8gIWRlZiA6IGRlZik7XG4gICAgICB0aGlzLmFzc2VtYmxpbmcgPSB0aGlzLmNvbmRpdGlvbnMuZXZlcnkoeCA9PiB4KTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLmVsc2UvaS5leGVjKGxpbmUpKSkge1xuICAgICAgdGhpcy5jb25kaXRpb25zLnB1c2goIXRoaXMuY29uZGl0aW9ucy5wb3AoKSk7XG4gICAgICB0aGlzLmFzc2VtYmxpbmcgPSB0aGlzLmNvbmRpdGlvbnMuZXZlcnkoeCA9PiB4KTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLmVuZGlmL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIHRoaXMuY29uZGl0aW9ucy5wb3AoKTtcbiAgICAgIHRoaXMuYXNzZW1ibGluZyA9IHRoaXMuY29uZGl0aW9ucy5ldmVyeSh4ID0+IHgpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuYXNzZW1ibGluZykge1xuICAgICAgLy8gbm90aGluZyBlbHNlIHRvIGRvIGF0IHRoaXMgcG9pbnQuXG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXlxccypcXC5vcmdcXHMrKFxcUyspL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIHRoaXMuYWRkTGluZShuZXcgT3JnTGluZSgodGhpcy5wYyA9IHBhcnNlTnVtYmVyKG1hdGNoWzFdKSkpKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLnNraXBcXHMrKC4rKS9pLmV4ZWMobGluZSkpKSB7XG4gICAgICAvLyB0aGlzIGlzIGEgc2hvcnRjdXQgZm9yIC5vcmcgKFBDICsgbnVtKVxuICAgICAgdGhpcy5hZGRMaW5lKG5ldyBPcmdMaW5lKCh0aGlzLnBjICs9IHRoaXMucGFyc2VOdW1iZXIobWF0Y2hbMV0pKSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL15cXHMqXFwuYXNzZXJ0XFxzKyg8XFxzKik/KFxcUyspL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIHRoaXMuYWRkTGluZShuZXcgQXNzZXJ0TGluZSgodGhpcy5wYyA9IHBhcnNlTnVtYmVyKG1hdGNoWzJdKSksICFtYXRjaFsxXSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL15cXHMqXFwuYmFua1xccysoXFxTKylcXHMrKFxcUyspXFxzKjpcXHMqKFxcUyspL2kuZXhlYyhsaW5lKSkpIHtcbiAgICAgIGNvbnN0IFssIHByZywgY3B1LCBsZW5ndGhdID0gbWF0Y2g7XG4gICAgICB0aGlzLmFkZExpbmUobmV3IEJhbmtMaW5lKHBhcnNlTnVtYmVyKHByZyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlTnVtYmVyKGNwdSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlTnVtYmVyKGxlbmd0aCkpKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLihieXRlfHdvcmQpXFxzKyguKikvaS5leGVjKGxpbmUpKSkge1xuICAgICAgY29uc3QgbCA9IChtYXRjaFsxXSA9PT0gJ3dvcmQnID8gV29yZExpbmUgOiBCeXRlTGluZSkucGFyc2UobWF0Y2hbMl0pO1xuICAgICAgdGhpcy5hZGRMaW5lKGwpO1xuICAgICAgdGhpcy5wYyArPSBsLnNpemUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IC9eXFxzKlxcLnJlc1xccysoW14sXSspKD86LFxccyooLispKT8vaS5leGVjKGxpbmUpKSkge1xuICAgICAgY29uc3QgbCA9IEJ5dGVMaW5lLnBhcnNlUmVzKHRoaXMucGFyc2VOdW1iZXIobWF0Y2hbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyc2VOdW1iZXIobWF0Y2hbMl0gfHwgJzAnKSk7XG4gICAgICB0aGlzLmFkZExpbmUobCk7XG4gICAgICB0aGlzLnBjICs9IGwuc2l6ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoKG1hdGNoID0gL15kZWZpbmVcXHMrKFxcUyspXFxzKyguKikvLmV4ZWMobGluZSkpKSB7XG4gICAgICBjb25zdCBsYWJlbCA9IG1hdGNoWzFdO1xuICAgICAgdGhpcy5hZGRMYWJlbChsYWJlbCwgdGhpcy5wYXJzZU51bWJlcihtYXRjaFsyXSkpOyAvLyBub3QgdHdvcyBjb21wbGVtZW50LCBidXQgc3RpbGwgYWJzXG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXihcXFMrPyk6KC4qKSQvLmV4ZWMobGluZSkpKSB7XG4gICAgICAvLyBsYWJlbCAtIGV4dHJhY3QgYW5kIHJlY29yZC5cbiAgICAgIGNvbnN0IGxhYmVsID0gbWF0Y2hbMV07XG4gICAgICBsaW5lID0gJyAnICsgbWF0Y2hbMl07XG4gICAgICB0aGlzLmFkZExhYmVsKGxhYmVsLCB+dGhpcy5wYyk7XG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSAvXigoPzpbLStdK1xccyspKykoLiopJC8uZXhlYyhsaW5lKSkpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGxhYmVscyAobXVsdGlwbGUgYWxsb3dlZCkgLSBleHRyYWN0IGFuZCByZWNvcmQuXG4gICAgICBjb25zdCBsYWJlbHMgPSBtYXRjaFsxXTtcbiAgICAgIGZvciAoY29uc3QgbGFiZWwgb2YgbGFiZWxzLnRyaW0oKS5zcGxpdCgnICcpKSB7XG4gICAgICAgIHRoaXMuYWRkTGFiZWwobGFiZWwsIH50aGlzLnBjKTtcbiAgICAgIH1cbiAgICAgIGxpbmUgPSAnICcgKyBtYXRjaFsyXTtcbiAgICB9XG4gICAgaWYgKChtYXRjaCA9IC9eXFxzKyhbYS16XXszfSkoXFxzKy4qKT8kLy5leGVjKGxpbmUpKSkge1xuICAgICAgY29uc3QgbCA9IG5ldyBPcGNvZGUobWF0Y2hbMV0gYXMgTW5lbW9uaWMsIChtYXRjaFsyXSB8fCAnJykudHJpbSgpLCB0aGlzLnBjKTtcbiAgICAgIHRoaXMuYWRkTGluZShsKTtcbiAgICAgIHRoaXMucGMgKz0gbC5zaXplKCk7XG4gICAgfSBlbHNlIGlmICgvXFxTLy50ZXN0KGxpbmUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBwYXJzZSBsaW5lICR7bGluZX0gYXQgJHt0aGlzLmZpbGVuYW1lfToke1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVOdW1iZXJ9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8gT3V0cHV0IGlzIGFuIGFycmF5IG9mIENodW5rc1xuICBhc3NlbWJsZSgpOiBDaHVua1tdIHtcbiAgICBjb25zdCBjb250ZXh0ID0gbmV3IENvbnRleHQodGhpcy5sYWJlbHMpO1xuICAgIGNvbnN0IG91dHB1dDogbnVtYmVyW10gPSBbXTtcbiAgICBjb25zdCBvdXRwdXRMaW5lczogQWJzdHJhY3RMaW5lW10gPSBbXTtcbiAgICBjb25zdCBjb2xsaXNpb24gPSAobGluZTogQWJzdHJhY3RMaW5lLCBwYzogbnVtYmVyKTogbmV2ZXIgPT4ge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb2xsaXNpb24gYXQgJCR7cGMudG9TdHJpbmcoMTYpXG4gICAgICAgICAgICAgICAgICAgICAgIH06XFxuICB3cml0dGVuIGF0ICR7b3V0cHV0TGluZXNbcGNdLnNvdXJjZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XFxuICB3cml0dGVuIGF0ICR7bGluZS5zb3VyY2UoKX1gKTtcbiAgICB9O1xuICAgIGZvciAoY29uc3QgbGluZSBvZiB0aGlzLmxpbmVzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBsaW5lLmV4cGFuZChjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc3Qgc3RhY2sgPSBlLnN0YWNrLnJlcGxhY2UoYEVycm9yOiAke2UubWVzc2FnZX1gLCAnJyk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlLm1lc3NhZ2U7XG4gICAgICAgIGNvbnN0IHBvcyA9IGAgZnJvbSBsaW5lICR7bGluZS5vcmlnTGluZU51bWJlciArIDF9OiBcXGAke2xpbmUub3JpZ0NvbnRlbnR9XFxgYDtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke21lc3NhZ2V9JHtwb3N9JHtzdGFja31cXG49PT09PT09PT09PT09PT09YCk7XG4gICAgICB9XG4gICAgICBpZiAobGluZSBpbnN0YW5jZW9mIE9yZ0xpbmUgJiYgb3V0cHV0W2xpbmUucGNdICE9IG51bGwpIGNvbGxpc2lvbihsaW5lLCBsaW5lLnBjKTtcbiAgICAgIGZvciAoY29uc3QgYiBvZiBsaW5lLmJ5dGVzKCkpIHtcbiAgICAgICAgaWYgKG91dHB1dFtjb250ZXh0LnBjXSAhPSBudWxsKSBjb2xsaXNpb24obGluZSwgY29udGV4dC5wYyk7XG4gICAgICAgIG91dHB1dExpbmVzW2NvbnRleHQucGNdID0gbGluZTtcbiAgICAgICAgb3V0cHV0W2NvbnRleHQucGMrK10gPSBiO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBvdXRwdXQgaXMgYSBzcGFyc2UgYXJyYXkgLSBmaW5kIHRoZSBmaXJzdCBpbmRpY2VzLlxuICAgIGNvbnN0IHN0YXJ0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgaSBpbiBvdXRwdXQpIHtcbiAgICAgIGlmICghKE51bWJlcihpKSAtIDEgaW4gb3V0cHV0KSkgc3RhcnRzLnB1c2goTnVtYmVyKGkpKTtcbiAgICB9XG4gICAgLy8gbm93IG91dHB1dCBjaHVua3MuXG4gICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgZm9yIChjb25zdCBzdGFydCBvZiBzdGFydHMpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSBpbiBvdXRwdXQ7IGkrKykge1xuICAgICAgICBkYXRhLnB1c2gob3V0cHV0W2ldKTtcbiAgICAgIH1cbiAgICAgIGNodW5rcy5wdXNoKG5ldyBDaHVuayhzdGFydCwgZGF0YSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jb25kaXRpb25zLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnRlcm1pbmF0ZWQgLmlmJyk7XG4gICAgfVxuICAgIHJldHVybiBjaHVua3M7XG4gIH1cbn1cblxuLy8gQmFzZSBjbGFzcyBzbyB0aGF0IHdlIGNhbiB0cmFjayB3aGVyZSBlcnJvcnMgY29tZSBmcm9tXG5hYnN0cmFjdCBjbGFzcyBBYnN0cmFjdExpbmUge1xuXG4gIG9yaWdGaWxlOiBzdHJpbmcgPSAnJztcbiAgb3JpZ0xpbmVOdW1iZXI6IG51bWJlciA9IC0xO1xuICBvcmlnQ29udGVudDogc3RyaW5nID0gJyc7XG5cbiAgb3JpZyhmaWxlOiBzdHJpbmcsIG51bTogbnVtYmVyLCBjb250ZW50OiBzdHJpbmcpOiB0aGlzIHtcbiAgICB0aGlzLm9yaWdGaWxlID0gZmlsZTtcbiAgICB0aGlzLm9yaWdMaW5lTnVtYmVyID0gbnVtO1xuICAgIHRoaXMub3JpZ0NvbnRlbnQgPSBjb250ZW50O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYWJzdHJhY3QgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkO1xuICBhYnN0cmFjdCBieXRlcygpOiBudW1iZXJbXTtcbiAgYWJzdHJhY3Qgc2l6ZSgpOiBudW1iZXI7XG5cbiAgc291cmNlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3RoaXMub3JpZ0ZpbGV9OiR7dGhpcy5vcmlnTGluZU51bWJlciArIDF9ICAke3RoaXMub3JpZ0NvbnRlbnR9YDtcbiAgfVxufVxuXG5jbGFzcyBCeXRlTGluZSBleHRlbmRzIEFic3RyYWN0TGluZSB7XG4gIHN0YXRpYyBwYXJzZShsaW5lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBieXRlczogQXJyYXk8bnVtYmVyfHN0cmluZz4gPSBbXTtcbiAgICBmb3IgKGxldCBwYXJ0IG9mIGxpbmUuc3BsaXQoJywnKSkge1xuICAgICAgcGFydCA9IHBhcnQudHJpbSgpO1xuICAgICAgY29uc3QgbWF0Y2ggPSAvXlwiKC4qKVwiJC8uZXhlYyhwYXJ0KTtcbiAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICBieXRlcy5wdXNoKC4uLlsuLi5tYXRjaFsxXV0ubWFwKHMgPT4gcy5jaGFyQ29kZUF0KDApKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBieXRlcy5wdXNoKHBhcnNlTnVtYmVyKHBhcnQsIHRydWUpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBCeXRlTGluZShieXRlcyk7XG4gIH1cblxuICBzdGF0aWMgcGFyc2VSZXMoY291bnQ6IG51bWJlciwgZGVmYXVsdFZhbHVlOiBudW1iZXIpIHtcbiAgICByZXR1cm4gbmV3IEJ5dGVMaW5lKG5ldyBBcnJheTxudW1iZXI+KGNvdW50KS5maWxsKGRlZmF1bHRWYWx1ZSkpO1xuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBieXRlc0ludGVybmFsOiBBcnJheTxudW1iZXJ8c3RyaW5nPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBieXRlcygpOiBudW1iZXJbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmJ5dGVzSW50ZXJuYWxdIGFzIG51bWJlcltdO1xuICB9XG5cbiAgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmJ5dGVzSW50ZXJuYWwubGVuZ3RoO1xuICB9XG5cbiAgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnl0ZXNJbnRlcm5hbC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLmJ5dGVzSW50ZXJuYWxbaV0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuYnl0ZXNJbnRlcm5hbFtpXSA9IGNvbnRleHQubWFwKHRoaXMuYnl0ZXNJbnRlcm5hbFtpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIFdvcmRMaW5lIGV4dGVuZHMgQWJzdHJhY3RMaW5lIHtcbiAgc3RhdGljIHBhcnNlKGxpbmU6IHN0cmluZykge1xuICAgIGNvbnN0IHdvcmRzID0gW107XG4gICAgZm9yIChsZXQgcGFydCBvZiBsaW5lLnNwbGl0KCcsJykpIHtcbiAgICAgIHBhcnQgPSBwYXJ0LnRyaW0oKTtcbiAgICAgIHBhcnQgPSBwYXJ0LnJlcGxhY2UoL1soKV0vZywgJycpOyAvLyBoYW5kbGUgdGhlc2UgZGlmZmVyZW50bHk/IGNvbXBsZW1lbnQ/XG4gICAgICB3b3Jkcy5wdXNoKHBhcnNlTnVtYmVyKHBhcnQsIHRydWUpKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBXb3JkTGluZSh3b3Jkcyk7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHdvcmRzOiAobnVtYmVyIHwgc3RyaW5nKVtdKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGJ5dGVzKCk6IG51bWJlcltdIHtcbiAgICBjb25zdCBieXRlcyA9IFtdO1xuICAgIGZvciAoY29uc3QgdyBvZiB0aGlzLndvcmRzIGFzIG51bWJlcltdKSB7IC8vIGFscmVhZHkgbWFwcGVkXG4gICAgICBieXRlcy5wdXNoKHcgJiAweGZmKTtcbiAgICAgIGJ5dGVzLnB1c2godyA+Pj4gOCk7XG4gICAgfVxuICAgIHJldHVybiBieXRlcztcbiAgfVxuXG4gIHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy53b3Jkcy5sZW5ndGggKiAyO1xuICB9XG5cbiAgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMud29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy53b3Jkc1tpXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy53b3Jkc1tpXSA9IGNvbnRleHQubWFwKHRoaXMud29yZHNbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBPcmdMaW5lIGV4dGVuZHMgQWJzdHJhY3RMaW5lIHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcGM6IG51bWJlcikgeyBzdXBlcigpOyB9XG5cbiAgYnl0ZXMoKTogbnVtYmVyW10geyByZXR1cm4gW107IH1cblxuICBzaXplKCk6IG51bWJlciB7IHJldHVybiAwOyB9XG5cbiAgZXhwYW5kKGNvbnRleHQ6IENvbnRleHQpOiB2b2lkIHtcbiAgICAvLyBUT0RPIC0gY2FuIHdlIGFsbG93IHRoaXMucGMgdG8gYmUgYSBsYWJlbD9cbiAgICBjb250ZXh0LnBjID0gdGhpcy5wYztcbiAgfVxufVxuXG5jbGFzcyBBc3NlcnRMaW5lIGV4dGVuZHMgQWJzdHJhY3RMaW5lIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwYzogbnVtYmVyLFxuICAgICAgICAgICAgICBwcml2YXRlIHJlYWRvbmx5IGV4YWN0OiBib29sZWFuKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGJ5dGVzKCk6IG51bWJlcltdIHsgcmV0dXJuIFtdOyB9XG5cbiAgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gMDsgfVxuXG4gIGV4cGFuZChjb250ZXh0OiBDb250ZXh0KTogdm9pZCB7XG4gICAgLy8gVE9ETyAtIGNhbiB3ZSBhbGxvdyB0aGlzLnBjIHRvIGJlIGEgbGFiZWw/XG4gICAgaWYgKHRoaXMuZXhhY3QgPyBjb250ZXh0LnBjICE9PSB0aGlzLnBjIDogY29udGV4dC5wYyA+IHRoaXMucGMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzYWxpZ25tZW50OiBleHBlY3RlZCAke3RoaXMuZXhhY3QgPyAnJyA6ICc8ICd9JCR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBjLnRvU3RyaW5nKDE2KX0gYnV0IHdhcyAkJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQucGMudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZXhhY3QgJiYgTE9HKSB7XG4gICAgICBjb25zb2xlLmxvZyhgRnJlZTogJHt0aGlzLnBjIC0gY29udGV4dC5wY30gYnl0ZXMgYmV0d2VlbiAkJHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wYy50b1N0cmluZygxNil9IGFuZCAkJHt0aGlzLnBjLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgQmFua0xpbmUgZXh0ZW5kcyBBYnN0cmFjdExpbmUge1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBwcmc6IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgY3B1OiBudW1iZXIsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGJ5dGVzKCk6IG51bWJlcltdIHsgcmV0dXJuIFtdOyB9XG5cbiAgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gMDsgfVxuXG4gIGV4cGFuZChjb250ZXh0OiBDb250ZXh0KTogdm9pZCB7XG4gICAgY29udGV4dC51cGRhdGVCYW5rKHRoaXMucHJnLCB0aGlzLmNwdSwgdGhpcy5sZW5ndGgpO1xuICB9XG59XG5cbmNsYXNzIENvbnRleHQge1xuXG4gIHBjOiBudW1iZXIgPSAwO1xuICBjcHVUb1ByZzogKG51bWJlciB8IG51bGwpW10gPSBbXTtcbiAgcHJnVG9DcHU6IChudW1iZXIgfCBudWxsKVtdID0gW107XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbGFiZWxzOiBMYWJlbHMpIHt9XG5cbiAgLy8gTm90ZTogdGhlcmUncyBhbGwgc29ydHMgb2Ygd2F5cyB0aGlzIGNvdWxkIGJlIG1hZGUgbW9yZSBlZmZpY2llbnQsXG4gIC8vIGJ1dCBJIGRvbid0IHJlYWxseSBjYXJlIHNpbmNlIGl0J3Mgbm90IGluIGFuIGlubmVyIGxvb3AuXG4gIHVwZGF0ZUJhbmsocHJnOiBudW1iZXIsIGNwdTogbnVtYmVyLCBsZW5ndGg6IG51bWJlcik6IHZvaWQge1xuICAgIC8vIGludmFsaWRhdGUgcHJldmlvdXMgcmFuZ2UgZm9yIHRoaXMgQ1BVIGFkZHJlc3Nlc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGNwdUFkZHIgPSBjcHUgKyBpO1xuICAgICAgY29uc3QgcHJnQWRkciA9IHRoaXMuY3B1VG9QcmdbY3B1QWRkcl07XG4gICAgICBpZiAocHJnQWRkciAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMucHJnVG9DcHVbcHJnQWRkcl0gPSBudWxsO1xuICAgICAgICB0aGlzLmNwdVRvUHJnW2NwdUFkZHJdID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gcmVjb3JkIGN1cnJlbnQgcmFuZ2VcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjcHVBZGRyID0gY3B1ICsgaTtcbiAgICAgIGNvbnN0IHByZ0FkZHIgPSBwcmcgKyBpO1xuICAgICAgdGhpcy5wcmdUb0NwdVtwcmdBZGRyXSA9IGNwdUFkZHI7XG4gICAgICB0aGlzLmNwdVRvUHJnW2NwdUFkZHJdID0gcHJnQWRkcjtcbiAgICB9XG4gIH1cblxuICBtYXBMYWJlbChsYWJlbDogc3RyaW5nLCBwYz86IG51bWJlcik6IG51bWJlciB7XG4gICAgLy8gUmVjdXJzaXZlbHkgZXhwYW5kIGFueSBwYXJlbnRoZXNpemVkIGV4cHJlc3Npb25zLlxuICAgIGxldCBleHBhbmRQYXJlbnMgPSBsYWJlbC5yZXBsYWNlKC9cXCgoW14pXSopXFwpL2csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKF8sbCkgPT4gU3RyaW5nKHRoaXMubWFwTGFiZWwobCwgcGMpKSk7XG4gICAgaWYgKGV4cGFuZFBhcmVucyAhPT0gbGFiZWwpIHJldHVybiB0aGlzLm1hcExhYmVsKGV4cGFuZFBhcmVucywgcGMpO1xuICAgIC8vIFN1cHBvcnQgdmVyeSBzaW1wbGUgYXJpdGhtZXRpYyAoKywgLSwgPCwgYW5kID4pLlxuICAgIGxldCBtYXRjaCA9IC8oW14tK10rKShbLStdKSguKikvLmV4ZWMobGFiZWwpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgbGVmdCA9IHRoaXMubWFwKHBhcnNlTnVtYmVyKG1hdGNoWzFdLnRyaW0oKSwgdHJ1ZSksIHBjKTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gdGhpcy5tYXAocGFyc2VOdW1iZXIobWF0Y2hbM10udHJpbSgpLCB0cnVlKSwgcGMpO1xuICAgICAgcmV0dXJuIG1hdGNoWzJdID09PSAnLScgPyBsZWZ0IC0gcmlnaHQgOiBsZWZ0ICsgcmlnaHQ7XG4gICAgfVxuICAgIG1hdGNoID0gLyhbXipdKylbKl0oLiopLy5leGVjKGxhYmVsKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGNvbnN0IGxlZnQgPSB0aGlzLm1hcChwYXJzZU51bWJlcihtYXRjaFsxXS50cmltKCksIHRydWUpLCBwYyk7XG4gICAgICBjb25zdCByaWdodCA9IHRoaXMubWFwKHBhcnNlTnVtYmVyKG1hdGNoWzJdLnRyaW0oKSwgdHJ1ZSksIHBjKTtcbiAgICAgIHJldHVybiBsZWZ0ICogcmlnaHQ7XG4gICAgfVxuICAgIG1hdGNoID0gLyhbPD5dKSguKikvLmV4ZWMobGFiZWwpOyAvLyBUT0RPIC0gXiBmb3IgYmFuayBieXRlP1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgYXJnID0gdGhpcy5tYXAocGFyc2VOdW1iZXIobWF0Y2hbMl0udHJpbSgpLCB0cnVlKSwgcGMpO1xuICAgICAgcmV0dXJuIG1hdGNoWzFdID09PSAnPCcgPyBhcmcgJiAweGZmIDogKGFyZyA+Pj4gOCkgJiAweGZmO1xuICAgIH1cblxuICAgIC8vIEFyZSB3ZSBsZWZ0IHdpdGggYSBudW1iZXI/XG4gICAgY29uc3QgbnVtID0gTnVtYmVyKGxhYmVsKTtcbiAgICBpZiAoIWlzTmFOKG51bSkpIHJldHVybiBudW07XG5cbiAgICAvLyBMb29rIHVwIHdoYXRldmVyJ3MgbGVmdG92ZXIuXG4gICAgbGV0IGFkZHJzID0gdGhpcy5sYWJlbHNbbGFiZWxdO1xuICAgIGlmICghYWRkcnMpIHRocm93IG5ldyBFcnJvcihgTGFiZWwgbm90IGZvdW5kOiAke2xhYmVsfWApO1xuICAgIGlmIChwYyA9PSBudWxsKSB7XG4gICAgICBpZiAoYWRkcnMubGVuZ3RoID4gMSkgdGhyb3cgbmV3IEVycm9yKGBBbWJpZ3VvdXMgbGFiZWw6ICR7bGFiZWx9YCk7XG4gICAgICByZXR1cm4gYWRkcnNbMF07XG4gICAgfVxuICAgIC8vIGZpbmQgdGhlIHJlbGV2YW50IGxhYmVsLlxuICAgIHBjID0gfihwYyArIDIpO1xuICAgIGNvbnN0IGluZGV4ID0gZmluZChhZGRycywgcGMpO1xuICAgIGlmIChpbmRleCA+PSAwKSByZXR1cm4gYWRkcnNbaW5kZXhdOyAvLyBzaG91bGQgbmV2ZXIgaGFwcGVuLlxuICAgIGlmIChpbmRleCA9PT0gLTEpIHJldHVybiBhZGRyc1swXTtcbiAgICBpZiAoaW5kZXggPT09IH5hZGRycy5sZW5ndGgpIHJldHVybiBhZGRyc1thZGRycy5sZW5ndGggLSAxXTtcbiAgICBhZGRycyA9IGFkZHJzLnNsaWNlKH5pbmRleCAtIDEsIH5pbmRleCArIDEpO1xuICAgIGlmIChsYWJlbC5zdGFydHNXaXRoKCctJykpIHJldHVybiBhZGRyc1sxXTtcbiAgICBpZiAobGFiZWwuc3RhcnRzV2l0aCgnKycpKSByZXR1cm4gYWRkcnNbMF07XG4gICAgY29uc3QgbWlkID0gKGFkZHJzWzBdICsgYWRkcnNbMV0pIC8gMjtcbiAgICByZXR1cm4gcGMgPCBtaWQgPyBhZGRyc1swXSA6IGFkZHJzWzFdO1xuICB9XG5cbiAgbWFwUHJnVG9DcHUocHJnQWRkcjogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBjb25zdCBjcHVBZGRyID0gdGhpcy5wcmdUb0NwdVtwcmdBZGRyXTtcbiAgICAvLyBJZiB0aGlzIGVycm9ycywgd2UgcHJvYmFibHkgbmVlZCB0byBhZGQgYSAuYmFuayBkaXJlY3RpdmUuXG4gICAgaWYgKGNwdUFkZHIgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBQUkcgYWRkcmVzcyB1bm1hcHBlZDogJCR7cHJnQWRkci50b1N0cmluZygxNil9YCk7XG4gICAgcmV0dXJuIGNwdUFkZHI7XG4gIH1cblxuICAvLyByZXR1cm4gQ1BVIGFkZHJlc3Mgb3IgdGhyb3cgLSBtYWluIGV4dGVybmFsIGVudHJ5IHBvaW50LlxuICBtYXAocHJnQWRkcjogc3RyaW5nIHwgbnVtYmVyLCBwYz86IG51bWJlcikge1xuICAgIGxldCBhZGRyID0gcHJnQWRkcjtcbiAgICBpZiAoYWRkciA9PSBudWxsKSByZXR1cm4gYWRkcjtcbiAgICBpZiAodHlwZW9mIGFkZHIgPT09ICdzdHJpbmcnKSB7XG4gICAgICBhZGRyID0gdGhpcy5tYXBMYWJlbChhZGRyLCBwYyk7XG4gICAgfVxuICAgIGlmIChhZGRyIDwgMCkgeyAvLyB0aGUgbGFiZWwgbWFwIHJldHVybnMgfmFkZHJlc3MgaWYgaXQgc2hvdWxkIGJlIG1hcHBlZFxuICAgICAgYWRkciA9IHRoaXMubWFwUHJnVG9DcHUofmFkZHIpO1xuICAgIH1cbiAgICByZXR1cm4gYWRkcjtcbiAgfVxufVxuXG4vLyBBIHNpbmdsZSBjaGFuZ2UuXG5jbGFzcyBDaHVuayBleHRlbmRzIFVpbnQ4QXJyYXkge1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBzdGFydDogbnVtYmVyLCBkYXRhOiBVaW50OEFycmF5IHwgbnVtYmVyW10pIHtcbiAgICBzdXBlcihkYXRhLmxlbmd0aCk7XG4gICAgdGhpcy5zZXQoZGF0YSk7XG4gIH1cblxuICBhcHBseShkYXRhOiBVaW50OEFycmF5KTogdm9pZCB7XG4gICAgZGF0YS5zdWJhcnJheSh0aGlzLnN0YXJ0LCB0aGlzLnN0YXJ0ICsgdGhpcy5sZW5ndGgpLnNldCh0aGlzKTtcbiAgfVxuXG4gIHNoaWZ0KG9mZnNldDogbnVtYmVyKTogQ2h1bmsge1xuICAgIGNvbnN0IGMgPSBuZXcgQ2h1bmsodGhpcy5zdGFydCArIG9mZnNldCwgdGhpcyk7XG4gICAgcmV0dXJuIGM7XG4gIH1cbn1cblxuLy8gQW4gSVBTIHBhdGNoIC0gdGhpcyBpdGVyYXRlcyBhcyBhIGJ1bmNoIG9mIGNodW5rcy4gIFRvIGNvbmNhdGVuYXRlXG4vLyB0d28gcGF0Y2hlcyAocDEgYW5kIHAyKSBzaW1wbHkgY2FsbCBQYXRjaC5mcm9tKFsuLi5wMSwgLi4ucDJdKVxuY2xhc3MgUGF0Y2gge1xuICBzdGF0aWMgZnJvbShjaHVua3M6IENodW5rW10pIHtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgbW92aW5nIHRoaXMgdG8gdGhlIGVnZXN0aW9uIHNpZGUuXG4gICAgY29uc3QgYXJyYXlzID0gW107XG4gICAgbGV0IGxlbmd0aCA9IDg7XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBjaHVua3MpIHtcbiAgICAgIGNvbnN0IGFyciA9IG5ldyBVaW50OEFycmF5KGNodW5rLmxlbmd0aCArIDUpO1xuICAgICAgYXJyWzBdID0gY2h1bmsuc3RhcnQgPj4+IDE2O1xuICAgICAgYXJyWzFdID0gKGNodW5rLnN0YXJ0ID4+PiA4KSAmIDB4ZmY7XG4gICAgICBhcnJbMl0gPSBjaHVuay5zdGFydCAmIDB4ZmY7XG4gICAgICBhcnJbM10gPSBjaHVuay5sZW5ndGggPj4+IDg7XG4gICAgICBhcnJbNF0gPSBjaHVuay5sZW5ndGggJiAweGZmO1xuICAgICAgYXJyLnNldChjaHVuaywgNSk7XG4gICAgICBhcnJheXMucHVzaChhcnIpO1xuICAgICAgbGVuZ3RoICs9IGFyci5sZW5ndGg7XG4gICAgICAvLyBjb25zb2xlLmxvZyhgUGF0Y2ggZnJvbSAkJHtjaHVuay5zdGFydC50b1N0cmluZygxNil9Li4kJHtcbiAgICAgIC8vICAgICAgICAgICAgICAoY2h1bmsuc3RhcnQrY2h1bmsubGVuZ3RoKS50b1N0cmluZygxNil9YCk7XG4gICAgfVxuICAgIGNvbnN0IGRhdGEgPSBuZXcgVWludDhBcnJheShsZW5ndGgpO1xuICAgIGxldCBpID0gNTtcbiAgICBkYXRhWzBdID0gMHg1MDtcbiAgICBkYXRhWzFdID0gMHg0MTtcbiAgICBkYXRhWzJdID0gMHg1NDtcbiAgICBkYXRhWzNdID0gMHg0MztcbiAgICBkYXRhWzRdID0gMHg0ODtcbiAgICBmb3IgKGNvbnN0IGFyciBvZiBhcnJheXMpIHtcbiAgICAgIGRhdGEuc3ViYXJyYXkoaSwgaSArIGFyci5sZW5ndGgpLnNldChhcnIpO1xuICAgICAgaSArPSBhcnIubGVuZ3RoO1xuICAgIH1cbiAgICBkYXRhW2ldID0gMHg0NTtcbiAgICBkYXRhW2kgKyAxXSA9IDB4NGY7XG4gICAgZGF0YVtpICsgMl0gPSAweDQ2O1xuICAgIHJldHVybiBuZXcgUGF0Y2goZGF0YSk7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBkYXRhOiBVaW50OEFycmF5KSB7fVxuXG4gIGFwcGx5KGRhdGE6IFVpbnQ4QXJyYXkpIHtcbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIHRoaXMpIHtcbiAgICAgIGNodW5rLmFwcGx5KGRhdGEpO1xuICAgIH1cbiAgfVxuXG4gICogW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8Q2h1bms+IHtcbiAgICBsZXQgcG9zID0gNTtcbiAgICB3aGlsZSAocG9zIDwgdGhpcy5kYXRhLmxlbmd0aCAtIDMpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5kYXRhW3Bvc10gPDwgMTYgfCB0aGlzLmRhdGFbcG9zICsgMV0gPDwgOCB8IHRoaXMuZGF0YVtwb3MgKyAyXTtcbiAgICAgIGNvbnN0IGxlbiA9IHRoaXMuZGF0YVtwb3MgKyAzXSA8PCA4IHwgdGhpcy5kYXRhW3BvcyArIDRdO1xuICAgICAgeWllbGQgbmV3IENodW5rKHN0YXJ0LCB0aGlzLmRhdGEuc3ViYXJyYXkocG9zICsgNSwgcG9zICsgNSArIGxlbikpO1xuICAgICAgcG9zICs9IGxlbiArIDU7XG4gICAgfVxuICB9XG5cbiAgdG9IZXhTdHJpbmcoKSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmRhdGFdLm1hcCh4ID0+IHgudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJykpLmpvaW4oJycpO1xuICB9XG59XG5cbi8vIElucHV0OiBhbiBhc3NlbWJseSBzdHJpbmdcbi8vIE91dHB1dDogYSBwYXRjaFxuLy8gVE9ETyAtIGNvbnNpZGVyIGFsc28gb3V0cHV0dGluZyB0aGUgZGljdGlvbmFyeSBvZiBsYWJlbHM/Pz9cbmV4cG9ydCBjb25zdCBhc3NlbWJsZSA9IChzdHI6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZyA9ICdpbnB1dCcpID0+IHtcbiAgY29uc3QgYXNtID0gbmV3IEZpbGUoe30sIGZpbGVuYW1lKTtcbiAgZm9yIChjb25zdCBsaW5lIG9mIHN0ci5zcGxpdCgnXFxuJykpIHtcbiAgICBhc20uaW5nZXN0KGxpbmUpO1xuICB9XG4gIGNvbnN0IGNodW5rcyA9IGFzbS5hc3NlbWJsZSgpO1xuICByZXR1cm4gUGF0Y2guZnJvbShjaHVua3MpO1xufTtcblxuZXhwb3J0IGNvbnN0IGJ1aWxkUm9tUGF0Y2ggPSAocHJnOiBQYXRjaCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocj86IFBhdGNoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJnU2l6ZTogbnVtYmVyID0gMHg0MDAwMCkgPT4ge1xuICBjb25zdCBwcmdDaHVua3MgPSBbLi4ucHJnXS5tYXAoYyA9PiBjLnNoaWZ0KDB4MTApKTtcbiAgY29uc3QgY2hyQ2h1bmtzID0gWy4uLihjaHIgfHwgW10pXS5tYXAoYyA9PiBjLnNoaWZ0KDB4MTAgKyBwcmdTaXplKSk7XG4gIHJldHVybiBQYXRjaC5mcm9tKFsuLi5wcmdDaHVua3MsIC4uLmNockNodW5rc10pO1xufTtcblxuLy8gT3Bjb2RlIGRhdGEgZm9yIDY1MDJcbi8vIERvZXMgbm90IG5lZWQgdG8gYmUgYXMgdGhvcm91Z2ggYXMgSlNORVMncyBkYXRhXG5cbmNsYXNzIE9wY29kZSBleHRlbmRzIEFic3RyYWN0TGluZSB7XG5cbiAgYXJnOiBPcGNvZGVBcmc7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1uZW1vbmljOiBNbmVtb25pYyxcbiAgICAgICAgICAgICAgYXJnOiBzdHJpbmcsXG4gICAgICAgICAgICAgIHByaXZhdGUgcGNJbnRlcm5hbDogbnVtYmVyKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmFyZyA9IGZpbmRNb2RlKG1uZW1vbmljIGFzIE1uZW1vbmljLCBhcmcpO1xuICB9XG5cbiAgLy8gcmVhZG9ubHkgZnJvbSB0aGUgb3V0c2lkZVxuICBnZXQgcGMoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMucGNJbnRlcm5hbDsgfVxuXG4gIHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gMSArIHRoaXMuYXJnWzFdO1xuICB9XG5cbiAgYnl0ZXMoKTogbnVtYmVyW10ge1xuICAgIGxldCB2YWx1ZSA9IHRoaXMuYXJnWzJdIGFzIG51bWJlcjsgLy8gYWxyZWFkeSBleHBhbmRlZFxuICAgIGlmICh0aGlzLmFyZ1swXSA9PT0gJ1JlbGF0aXZlJykge1xuICAgICAgdmFsdWUgLT0gdGhpcy5wYyArIDI7XG4gICAgICBpZiAoISh2YWx1ZSA8IDB4ODAgJiYgdmFsdWUgPj0gLTB4ODApKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVG9vIGZhciB0byBicmFuY2g6ICR7dmFsdWV9IGF0ICR7dGhpcy5zb3VyY2UoKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgb3Bjb2RlID0gb3Bjb2Rlc1t0aGlzLm1uZW1vbmljXVt0aGlzLmFyZ1swXV0hO1xuICAgIGlmIChvcGNvZGUgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBObyBvcGNvZGU6ICR7dGhpcy5tbmVtb25pY30gJHt0aGlzLmFyZ1swXX1gKTtcbiAgICBjb25zdCBieXRlcyA9IFtvcGNvZGVdO1xuICAgIGxldCBjb3VudCA9IHRoaXMuYXJnWzFdO1xuICAgIHdoaWxlIChjb3VudC0tKSB7XG4gICAgICBieXRlcy5wdXNoKHZhbHVlICYgMHhmZik7XG4gICAgICB2YWx1ZSA+Pj49IDg7XG4gICAgfVxuICAgIHJldHVybiBieXRlcztcbiAgfVxuXG4gIGV4cGFuZChjb250ZXh0OiBDb250ZXh0KTogdm9pZCB7XG4gICAgdGhpcy5hcmdbMl0gPSBjb250ZXh0Lm1hcCh0aGlzLmFyZ1syXSwgdGhpcy5wYyk7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMucGNJbnRlcm5hbCA9IGNvbnRleHQubWFwKH50aGlzLnBjKTtcbiAgICB9IGNhdGNoIChlcnIpIHsgLyogb2sgKi8gfVxuICB9XG59XG5cbi8vIGJpbmFyeSBzZWFyY2guIHJldHVybnMgaW5kZXggb3IgY29tcGxlbWVudCBmb3Igc3BsaWNlIHBvaW50XG5jb25zdCBmaW5kID0gKGFycjogbnVtYmVyW10sIHZhbDogbnVtYmVyKTogbnVtYmVyID0+IHtcbiAgbGV0IGEgPSAwO1xuICBsZXQgYiA9IGFyci5sZW5ndGggLSAxO1xuICBpZiAoYiA8IDApIHJldHVybiB+MDtcbiAgaWYgKHZhbCA8IGFyclswXSkgcmV0dXJuIH4wO1xuICBjb25zdCBmYiA9IGFycltiXTtcbiAgaWYgKHZhbCA9PT0gZmIpIHJldHVybiBiO1xuICBpZiAodmFsID4gZmIpIHJldHVybiB+YXJyLmxlbmd0aDtcbiAgd2hpbGUgKGIgLSBhID4gMSkge1xuICAgIGNvbnN0IG1pZCA9IChhICsgYikgPj4gMTtcbiAgICBjb25zdCBmbWlkID0gYXJyW21pZF07XG4gICAgaWYgKHZhbCA8IGZtaWQpIHtcbiAgICAgIGIgPSBtaWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGEgPSBtaWQ7XG4gICAgfVxuICB9XG4gIHJldHVybiB2YWwgPT09IGFyclthXSA/IGEgOiB+Yjtcbn07XG5cbnR5cGUgQWRkcmVzc2luZ01vZGUgPVxuICAnSW1wbGllZCcgfCAnSW1tZWRpYXRlJyB8XG4gICdaZXJvUGFnZScgfCAnWmVyb1BhZ2VYJyB8ICdaZXJvUGFnZVknIHxcbiAgJ1ByZWluZGV4ZWRJbmRpcmVjdCcgfCAnUG9zdGluZGV4ZWRJbmRpcmVjdCcgfCAnSW5kaXJlY3RBYnNvbHV0ZScgfFxuICAnQWJzb2x1dGVYJyB8ICdBYnNvbHV0ZVknIHxcbiAgJ0Fic29sdXRlJyB8ICdSZWxhdGl2ZSc7XG50eXBlIE9wY29kZUFyZyA9IFtBZGRyZXNzaW5nTW9kZSwgLyogYnl0ZXM6ICovIG51bWJlciwgLyogYXJnOiAqLyBudW1iZXIgfCBzdHJpbmddO1xuXG5jb25zdCBmaW5kTW9kZSA9IChtbmVtb25pYzogTW5lbW9uaWMsIGFyZzogc3RyaW5nKTogT3Bjb2RlQXJnID0+IHtcbiAgZm9yIChjb25zdCBbcmUsIGZdIG9mIG1vZGVzKSB7XG4gICAgY29uc3QgbWF0Y2ggPSByZS5leGVjKGFyZyk7XG4gICAgaWYgKCFtYXRjaCkgY29udGludWU7XG4gICAgY29uc3QgbSA9IGYobWF0Y2hbMV0pO1xuICAgIGlmICghKG1uZW1vbmljIGluIG9wY29kZXMpKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBtbmVtb25pYzogJHttbmVtb25pY31gKTtcbiAgICBpZiAobVswXSBpbiBvcGNvZGVzW21uZW1vbmljXSkgcmV0dXJuIG07XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBtb2RlIGZvciAke21uZW1vbmljfSAke2FyZ31cbkV4cGVjdGVkIG9uZSBvZiBbJHtPYmplY3Qua2V5cyhvcGNvZGVzW21uZW1vbmljXSkuam9pbignLCAnKX1dYCk7XG59O1xuXG5jb25zdCBtb2RlczogW1JlZ0V4cCwgKGFyZzogc3RyaW5nKSA9PiBPcGNvZGVBcmddW10gPSBbXG4gIC8vIE5PVEU6IHJlbGF0aXZlIGlzIHRyaWNreSBiZWNhdXNlIGl0IG9ubHkgYXBwbGllcyB0byBqdW1wc1xuICBbL14kLywgKCkgPT4gWydJbXBsaWVkJywgMCwgMCAvKiB1bnVzZWQgKi9dXSxcbiAgWy9eIyguKykkLywgKHgpID0+IFsnSW1tZWRpYXRlJywgMSwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eKFxcJC4uKSQvLCAoeCkgPT4gWydaZXJvUGFnZScsIDEsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXihcXCQuLikseCQvLCAoeCkgPT4gWydaZXJvUGFnZVgnLCAxLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL14oXFwkLi4pLHkkLywgKHgpID0+IFsnWmVyb1BhZ2VZJywgMSwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eXFwoKFxcJC4uKSx4XFwpJC8sICh4KSA9PiBbJ1ByZWluZGV4ZWRJbmRpcmVjdCcsIDEsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXlxcKChcXCQuLilcXCkseSQvLCAoeCkgPT4gWydQb3N0aW5kZXhlZEluZGlyZWN0JywgMSwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eXFwoKC4rKVxcKSQvLCAoeCkgPT4gWydJbmRpcmVjdEFic29sdXRlJywgMiwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eKC4rKSx4JC8sICh4KSA9PiBbJ0Fic29sdXRlWCcsIDIsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG4gIFsvXiguKykseSQvLCAoeCkgPT4gWydBYnNvbHV0ZVknLCAyLCBwYXJzZU51bWJlcih4LCB0cnVlKV1dLFxuICBbL14oLispJC8sICh4KSA9PiBbJ0Fic29sdXRlJywgMiwgcGFyc2VOdW1iZXIoeCwgdHJ1ZSldXSxcbiAgWy9eKC4rKSQvLCAoeCkgPT4gWydSZWxhdGl2ZScsIDEsIHBhcnNlTnVtYmVyKHgsIHRydWUpXV0sXG5dO1xuXG5mdW5jdGlvbiBwYXJzZU51bWJlcihzdHI6IHN0cmluZyk6IG51bWJlcjtcbmZ1bmN0aW9uIHBhcnNlTnVtYmVyKHN0cjogc3RyaW5nLCBhbGxvd0xhYmVsczogdHJ1ZSk6IG51bWJlciB8IHN0cmluZztcbmZ1bmN0aW9uIHBhcnNlTnVtYmVyKHN0cjogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgYWxsb3dMYWJlbHM6IGJvb2xlYW4gPSBmYWxzZSk6IG51bWJlciB8IHN0cmluZyB7XG4gIGlmIChzdHIuc3RhcnRzV2l0aCgnJCcpKSByZXR1cm4gTnVtYmVyLnBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMSksIDE2KTtcbiAgaWYgKHN0ci5zdGFydHNXaXRoKCclJykpIHJldHVybiBOdW1iZXIucGFyc2VJbnQoc3RyLnN1YnN0cmluZygxKSwgMik7XG4gIGlmIChzdHIuc3RhcnRzV2l0aCgnMCcpKSByZXR1cm4gTnVtYmVyLnBhcnNlSW50KHN0ciwgOCk7XG4gIGNvbnN0IHJlc3VsdCA9IE51bWJlci5wYXJzZUludChzdHIsIDEwKTtcbiAgaWYgKCFOdW1iZXIuaXNOYU4ocmVzdWx0KSkgcmV0dXJuIHJlc3VsdDtcbiAgaWYgKGFsbG93TGFiZWxzKSByZXR1cm4gc3RyO1xuICB0aHJvdyBuZXcgRXJyb3IoYEJhZCBudW1iZXI6ICR7c3RyfWApO1xufVxuXG50eXBlIE1uZW1vbmljID1cbiAgJ2FkYycgfCAnYW5kJyB8ICdhc2wnIHwgJ2JjYycgfCAnYmNzJyB8ICdiZXEnIHwgJ2JpdCcgfCAnYm1pJyB8XG4gICdibmUnIHwgJ2JwbCcgfCAnYnJrJyB8ICdidmMnIHwgJ2J2cycgfCAnY2xjJyB8ICdjbGQnIHwgJ2NsaScgfFxuICAnY2x2JyB8ICdjbXAnIHwgJ2NweCcgfCAnY3B5JyB8ICdkZWMnIHwgJ2RleCcgfCAnZGV5JyB8ICdlb3InIHxcbiAgJ2luYycgfCAnaW54JyB8ICdpbnknIHwgJ2ptcCcgfCAnanNyJyB8ICdsZGEnIHwgJ2xkeCcgfCAnbGR5JyB8XG4gICdsc3InIHwgJ25vcCcgfCAnb3JhJyB8ICdwaGEnIHwgJ3BocCcgfCAncGxhJyB8ICdwbHAnIHwgJ3JvbCcgfFxuICAncm9yJyB8ICdydGknIHwgJ3J0cycgfCAnc2JjJyB8ICdzZWMnIHwgJ3NlZCcgfCAnc2VpJyB8ICdzdGEnIHxcbiAgJ3N0eCcgfCAnc3R5JyB8ICd0YXgnIHwgJ3RheScgfCAndHN4JyB8ICd0eGEnIHwgJ3R4cycgfCAndHlhJztcblxudHlwZSBPcGNvZGVMaXN0ID0ge1ttbmVtb25pYyBpbiBNbmVtb25pY106IHtbbW9kZSBpbiBBZGRyZXNzaW5nTW9kZV0/OiBudW1iZXJ9fTtcbmNvbnN0IG9wY29kZXM6IE9wY29kZUxpc3QgPSB7XG4gIGFkYzoge1xuICAgIEFic29sdXRlOiAweDZkLFxuICAgIEFic29sdXRlWDogMHg3ZCxcbiAgICBBYnNvbHV0ZVk6IDB4NzksXG4gICAgSW1tZWRpYXRlOiAweDY5LFxuICAgIFBvc3RpbmRleGVkSW5kaXJlY3Q6IDB4NzEsXG4gICAgUHJlaW5kZXhlZEluZGlyZWN0OiAweDYxLFxuICAgIFplcm9QYWdlOiAweDY1LFxuICAgIFplcm9QYWdlWDogMHg3NSxcbiAgfSxcbiAgYW5kOiB7XG4gICAgQWJzb2x1dGU6IDB4MmQsXG4gICAgQWJzb2x1dGVYOiAweDNkLFxuICAgIEFic29sdXRlWTogMHgzOSxcbiAgICBJbW1lZGlhdGU6IDB4MjksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHgzMSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4MjEsXG4gICAgWmVyb1BhZ2U6IDB4MjUsXG4gICAgWmVyb1BhZ2VYOiAweDM1LFxuICB9LFxuICBhc2w6IHtcbiAgICBBYnNvbHV0ZTogMHgwZSxcbiAgICBBYnNvbHV0ZVg6IDB4MWUsXG4gICAgSW1wbGllZDogMHgwYSxcbiAgICBaZXJvUGFnZTogMHgwNixcbiAgICBaZXJvUGFnZVg6IDB4MTYsXG4gIH0sXG4gIGJjYzoge1JlbGF0aXZlOiAweDkwfSxcbiAgYmNzOiB7UmVsYXRpdmU6IDB4YjB9LFxuICBiZXE6IHtSZWxhdGl2ZTogMHhmMH0sXG4gIGJpdDoge1xuICAgIEFic29sdXRlOiAweDJjLFxuICAgIFplcm9QYWdlOiAweDI0LFxuICB9LFxuICBibWk6IHtSZWxhdGl2ZTogMHgzMH0sXG4gIGJuZToge1JlbGF0aXZlOiAweGQwfSxcbiAgYnBsOiB7UmVsYXRpdmU6IDB4MTB9LFxuICBicms6IHtJbXBsaWVkOiAweDAwfSxcbiAgYnZjOiB7UmVsYXRpdmU6IDB4NTB9LFxuICBidnM6IHtSZWxhdGl2ZTogMHg3MH0sXG4gIGNsYzoge0ltcGxpZWQ6IDB4MTh9LFxuICBjbGQ6IHtJbXBsaWVkOiAweGQ4fSxcbiAgY2xpOiB7SW1wbGllZDogMHg1OH0sXG4gIGNsdjoge0ltcGxpZWQ6IDB4Yjh9LFxuICBjbXA6IHtcbiAgICBBYnNvbHV0ZTogMHhjZCxcbiAgICBBYnNvbHV0ZVg6IDB4ZGQsXG4gICAgQWJzb2x1dGVZOiAweGQ5LFxuICAgIEltbWVkaWF0ZTogMHhjOSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweGQxLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHhjMSxcbiAgICBaZXJvUGFnZTogMHhjNSxcbiAgICBaZXJvUGFnZVg6IDB4ZDUsXG4gIH0sXG4gIGNweDoge1xuICAgIEFic29sdXRlOiAweGVjLFxuICAgIEltbWVkaWF0ZTogMHhlMCxcbiAgICBaZXJvUGFnZTogMHhlNCxcbiAgfSxcbiAgY3B5OiB7XG4gICAgQWJzb2x1dGU6IDB4Y2MsXG4gICAgSW1tZWRpYXRlOiAweGMwLFxuICAgIFplcm9QYWdlOiAweGM0LFxuICB9LFxuICBkZWM6IHtcbiAgICBBYnNvbHV0ZTogMHhjZSxcbiAgICBBYnNvbHV0ZVg6IDB4ZGUsXG4gICAgWmVyb1BhZ2U6IDB4YzYsXG4gICAgWmVyb1BhZ2VYOiAweGQ2LFxuICB9LFxuICBkZXg6IHtJbXBsaWVkOiAweGNhfSxcbiAgZGV5OiB7SW1wbGllZDogMHg4OH0sXG4gIGVvcjoge1xuICAgIEFic29sdXRlOiAweDRkLFxuICAgIEFic29sdXRlWDogMHg1ZCxcbiAgICBBYnNvbHV0ZVk6IDB4NTksXG4gICAgSW1tZWRpYXRlOiAweDQ5LFxuICAgIFBvc3RpbmRleGVkSW5kaXJlY3Q6IDB4NTEsXG4gICAgUHJlaW5kZXhlZEluZGlyZWN0OiAweDQxLFxuICAgIFplcm9QYWdlOiAweDQ1LFxuICAgIFplcm9QYWdlWDogMHg1NSxcbiAgfSxcbiAgaW5jOiB7XG4gICAgQWJzb2x1dGU6IDB4ZWUsXG4gICAgQWJzb2x1dGVYOiAweGZlLFxuICAgIFplcm9QYWdlOiAweGU2LFxuICAgIFplcm9QYWdlWDogMHhmNixcbiAgfSxcbiAgaW54OiB7SW1wbGllZDogMHhlOH0sXG4gIGlueToge0ltcGxpZWQ6IDB4Yzh9LFxuICBqbXA6IHtcbiAgICBBYnNvbHV0ZTogMHg0YyxcbiAgICBJbmRpcmVjdEFic29sdXRlOiAweDZjLFxuICB9LFxuICBqc3I6IHtBYnNvbHV0ZTogMHgyMH0sXG4gIGxkYToge1xuICAgIEFic29sdXRlOiAweGFkLFxuICAgIEFic29sdXRlWDogMHhiZCxcbiAgICBBYnNvbHV0ZVk6IDB4YjksXG4gICAgSW1tZWRpYXRlOiAweGE5LFxuICAgIFBvc3RpbmRleGVkSW5kaXJlY3Q6IDB4YjEsXG4gICAgUHJlaW5kZXhlZEluZGlyZWN0OiAweGExLFxuICAgIFplcm9QYWdlOiAweGE1LFxuICAgIFplcm9QYWdlWDogMHhiNSxcbiAgfSxcbiAgbGR4OiB7XG4gICAgQWJzb2x1dGU6IDB4YWUsXG4gICAgQWJzb2x1dGVZOiAweGJlLFxuICAgIEltbWVkaWF0ZTogMHhhMixcbiAgICBaZXJvUGFnZTogMHhhNixcbiAgICBaZXJvUGFnZVk6IDB4YjYsXG4gIH0sXG4gIGxkeToge1xuICAgIEFic29sdXRlOiAweGFjLFxuICAgIEFic29sdXRlWDogMHhiYyxcbiAgICBJbW1lZGlhdGU6IDB4YTAsXG4gICAgWmVyb1BhZ2U6IDB4YTQsXG4gICAgWmVyb1BhZ2VYOiAweGI0LFxuICB9LFxuICBsc3I6IHtcbiAgICBBYnNvbHV0ZTogMHg0ZSxcbiAgICBBYnNvbHV0ZVg6IDB4NWUsXG4gICAgSW1wbGllZDogMHg0YSxcbiAgICBaZXJvUGFnZTogMHg0NixcbiAgICBaZXJvUGFnZVg6IDB4NTYsXG4gIH0sXG4gIG5vcDoge0ltcGxpZWQ6IDB4ZWF9LFxuICBvcmE6IHtcbiAgICBBYnNvbHV0ZTogMHgwZCxcbiAgICBBYnNvbHV0ZVg6IDB4MWQsXG4gICAgQWJzb2x1dGVZOiAweDE5LFxuICAgIEltbWVkaWF0ZTogMHgwOSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweDExLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHgwMSxcbiAgICBaZXJvUGFnZTogMHgwNSxcbiAgICBaZXJvUGFnZVg6IDB4MTUsXG4gIH0sXG4gIHBoYToge0ltcGxpZWQ6IDB4NDh9LFxuICBwaHA6IHtJbXBsaWVkOiAweDA4fSxcbiAgcGxhOiB7SW1wbGllZDogMHg2OH0sXG4gIHBscDoge0ltcGxpZWQ6IDB4Mjh9LFxuICByb2w6IHtcbiAgICBBYnNvbHV0ZTogMHgyZSxcbiAgICBBYnNvbHV0ZVg6IDB4M2UsXG4gICAgSW1wbGllZDogMHgyYSxcbiAgICBaZXJvUGFnZTogMHgyNixcbiAgICBaZXJvUGFnZVg6IDB4MzYsXG4gIH0sXG4gIHJvcjoge1xuICAgIEFic29sdXRlOiAweDZlLFxuICAgIEFic29sdXRlWDogMHg3ZSxcbiAgICBJbXBsaWVkOiAweDZhLFxuICAgIFplcm9QYWdlOiAweDY2LFxuICAgIFplcm9QYWdlWDogMHg3NixcbiAgfSxcbiAgcnRpOiB7SW1wbGllZDogMHg0MH0sXG4gIHJ0czoge0ltcGxpZWQ6IDB4NjB9LFxuICBzYmM6IHtcbiAgICBBYnNvbHV0ZTogMHhlZCxcbiAgICBBYnNvbHV0ZVg6IDB4ZmQsXG4gICAgQWJzb2x1dGVZOiAweGY5LFxuICAgIEltbWVkaWF0ZTogMHhlOSxcbiAgICBQb3N0aW5kZXhlZEluZGlyZWN0OiAweGYxLFxuICAgIFByZWluZGV4ZWRJbmRpcmVjdDogMHhlMSxcbiAgICBaZXJvUGFnZTogMHhlNSxcbiAgICBaZXJvUGFnZVg6IDB4ZjUsXG4gIH0sXG4gIHNlYzoge0ltcGxpZWQ6IDB4Mzh9LFxuICBzZWQ6IHtJbXBsaWVkOiAweGY4fSxcbiAgc2VpOiB7SW1wbGllZDogMHg3OH0sXG4gIHN0YToge1xuICAgIEFic29sdXRlOiAweDhkLFxuICAgIEFic29sdXRlWDogMHg5ZCxcbiAgICBBYnNvbHV0ZVk6IDB4OTksXG4gICAgUG9zdGluZGV4ZWRJbmRpcmVjdDogMHg5MSxcbiAgICBQcmVpbmRleGVkSW5kaXJlY3Q6IDB4ODEsXG4gICAgWmVyb1BhZ2U6IDB4ODUsXG4gICAgWmVyb1BhZ2VYOiAweDk1LFxuICB9LFxuICBzdHg6IHtcbiAgICBBYnNvbHV0ZTogMHg4ZSxcbiAgICBaZXJvUGFnZTogMHg4NixcbiAgICBaZXJvUGFnZVk6IDB4OTYsXG4gIH0sXG4gIHN0eToge1xuICAgIEFic29sdXRlOiAweDhjLFxuICAgIFplcm9QYWdlOiAweDg0LFxuICAgIFplcm9QYWdlWDogMHg5NCxcbiAgfSxcbiAgdGF4OiB7SW1wbGllZDogMHhhYX0sXG4gIHRheToge0ltcGxpZWQ6IDB4YTh9LFxuICB0c3g6IHtJbXBsaWVkOiAweGJhfSxcbiAgdHhhOiB7SW1wbGllZDogMHg4YX0sXG4gIHR4czoge0ltcGxpZWQ6IDB4OWF9LFxuICB0eWE6IHtJbXBsaWVkOiAweDk4fSxcbn07XG4iXX0=