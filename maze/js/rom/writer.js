import { hex } from './util.js';
function page(addr) {
    return addr >>> 13;
}
class Chunk {
    constructor(start, end) {
        this.start = start;
        this.end = end;
        this.page = page(start);
        if (page(end - 1) !== this.page)
            throw new Error('Chunk spans pages');
        this.pos = start;
    }
    free() {
        return this.end - this.pos;
    }
    find(data, rom) {
        for (let i = this.start; i <= this.pos - data.length; i++) {
            let found = true;
            for (let j = 0; j < data.length; j++) {
                if (rom[i + j] !== data[j]) {
                    found = false;
                    break;
                }
            }
            if (found)
                return i;
        }
        return -1;
    }
}
export class Writer {
    constructor(rom, chr) {
        this.rom = rom;
        this.chr = chr;
        this.chunks = [];
        this.writes = [];
        this.promises = [];
        this.free = [];
    }
    alloc(start, end) {
        while (page(end - 1) > page(start)) {
            const boundary = (page(start) + 1) << 13;
            this.addChunk(new Chunk(start, boundary - 1));
            start = boundary;
        }
        this.addChunk(new Chunk(start, end));
    }
    addChunk(c) {
        this.chunks.push(c);
        this.free[c.page] = (this.free[c.page] || 0) + c.free();
    }
    async write(data, start, end, name) {
        const startPage = page(start);
        const endPage = page(end - 1);
        const p = new Promise((resolve, reject) => {
            this.writes.push({ data, resolve, reject, startPage, endPage, name });
        });
        this.promises.push(p.catch(() => { }));
        return p;
    }
    async commit() {
        while (this.writes.length) {
            const writes = this.writes;
            this.writes = [];
            const promises = this.promises;
            this.promises = [];
            writes.sort((a, b) => ((a.endPage - a.startPage) - (b.endPage - b.startPage)) ||
                (b.data.length - a.data.length));
            for (const write of writes) {
                const address = this.find(write);
                if (address >= 0) {
                    write.resolve(address);
                }
                else {
                    this.writeOne(write);
                }
            }
            await Promise.all(promises);
            await 0;
            await 0;
            await 0;
        }
    }
    find({ data, startPage, endPage }) {
        for (const chunk of this.chunks) {
            if (chunk.page < startPage || chunk.page > endPage)
                continue;
            const found = chunk.find(data, this.rom);
            if (found >= 0)
                return found;
        }
        return -1;
    }
    writeOne(write) {
        for (const chunk of this.chunks) {
            if (chunk.page < write.startPage || chunk.page > write.endPage)
                continue;
            if (chunk.free() < write.data.length)
                continue;
            this.rom.subarray(chunk.pos, chunk.pos + write.data.length).set(write.data);
            write.resolve(chunk.pos);
            this.free[chunk.page] -= write.data.length;
            chunk.pos += write.data.length;
            return;
        }
        console.log(`${write.name}: WRITE FAILED ${write.data.length} bytes: ${Array.from(write.data, hex).join(' ')}`);
        write.reject(new Error(`Could not find sufficient chunk in ${hex(write.startPage)}..${hex(write.endPage)} to write ${write.name}: ${write.data}`));
    }
}
//# sourceMappingURL=writer.js.map