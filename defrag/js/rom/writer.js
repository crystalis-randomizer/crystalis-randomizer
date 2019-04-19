var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function page(addr) {
    return addr >>> 13;
}
class Chunk {
    constructor(start, end) {
        this.start = start;
        this.end = end;
        this.page = page(start);
        if (page(end) !== this.page)
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
    constructor(rom) {
        this.rom = rom;
        this.chunks = [];
        this.writes = [];
        this.promises = [];
    }
    alloc(start, end) {
        while (page(end) > page(start)) {
            const boundary = (page(start) + 1) << 13;
            this.chunks.push(new Chunk(start, boundary - 1));
            start = boundary;
        }
        this.chunks.push(new Chunk(start, end));
    }
    write(data, start, end) {
        const startPage = page(start);
        const endPage = page(end);
        const p = new Promise((resolve, reject) => {
            this.writes.push({ data, resolve, startPage, endPage });
        });
        this.promises.push(p);
        return p;
    }
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            while (this.writes.length) {
                const writes = this.writes.sort((a, b) => ((a.endPage - a.startPage) - (b.endPage - b.startPage)) ||
                    (b.data.length - a.data.length));
                const promises = this.promises;
                this.writes = [];
                this.promises = [];
                for (const write of writes) {
                    const addr = this.find(write);
                    if (addr >= 0) {
                        write.resolve(addr);
                    }
                    else {
                        this.writeOne(write);
                    }
                }
                yield Promise.all(promises);
            }
        });
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
            chunk.pos += write.data.length;
            return;
        }
        throw new Error('Could not find sufficient chunk to write');
    }
}
//# sourceMappingURL=writer.js.map