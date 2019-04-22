import {Data} from './util.js';

function page(addr: number): number {
  return addr >>> 13;
}

class Chunk {
  page: number;
  pos: number;

  constructor(readonly start: number, readonly end: number) {
    this.page = page(start);
    if (page(end) !== this.page) throw new Error('Chunk spans pages');
    this.pos = start;
  }

  free() {
    return this.end - this.pos;
  }

  /** Returns the address (>= 0) if found, or -1 if not found. */
  find(data: Data<number>, rom: Uint8Array): number {
    for (let i = this.start; i <= this.pos - data.length; i++) {
      let found = true;
      for (let j = 0; j < data.length; j++) {
        if (rom[i + j] !== data[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
//console.log(`could not find ${data.map(x=>x.toString(16))}`);
    return -1;
  }
}

type Write = {
  readonly data: Data<number>,
  readonly resolve: (addr: number) => void,
  readonly startPage: number,
  readonly endPage: number, // inclusive
};

// type Data = Uint8Array | number[];

export class Writer {

  private readonly chunks: Chunk[] = [];
  private writes: Write[] = [];
  private promises: Promise<number>[] = [];

  constructor(readonly rom: Uint8Array) {}

  // TODO: move()?

  /** Note: start and end pages must be the same! */
  alloc(start: number, end: number) {
    while (page(end) > page(start)) {
      const boundary = (page(start) + 1) << 13;
      this.chunks.push(new Chunk(start, boundary - 1));
      start = boundary;
    }
    this.chunks.push(new Chunk(start, end));
  }

  // TODO: consider renaming this to queue() or plan() or something?
  write(data: Data<number>, start: number, end: number): Promise<number> {
    const startPage = page(start);
    const endPage = page(end);
    const p = new Promise<number>((resolve, reject) => {
      this.writes.push({data, resolve, startPage, endPage});
    });
    this.promises.push(p);
    return p;
  }

  async commit(): Promise<void> {
    while (this.writes.length) {
      const writes = this.writes.sort(
          (a, b) => ((a.endPage - a.startPage) - (b.endPage - b.startPage)) ||
          (b.data.length - a.data.length));
      const promises = this.promises;
      this.writes = [];
      this.promises = [];
      for (const write of writes) {
        const addr = this.find(write);
        if (addr >= 0) {
          write.resolve(addr);
        } else {
          this.writeOne(write);
        }
      }
      await Promise.all(promises);
    }
    // console.log(`Finished writing $${this.start.toString(16)}..$${this.pos.toString(16)
    //              }.  ${this.end - this.pos} bytes free`);
    // TODO - summarize all free chunks???
    //   -- feed free chunk given page into define for assembler?
  }


  private find({data, startPage, endPage}: Write): number {
    for (const chunk of this.chunks) {
      if (chunk.page < startPage || chunk.page > endPage) continue;
      const found = chunk.find(data, this.rom);
      if (found >= 0) return found;
    }
    return -1;
  }

  private writeOne(write: Write) {
    // find a chunk with enough space to fit the data.
    for (const chunk of this.chunks) {
      if (chunk.page < write.startPage || chunk.page > write.endPage) continue;
      if (chunk.free() < write.data.length) continue;
      // looks like it fits!
      this.rom.subarray(chunk.pos, chunk.pos + write.data.length).set(write.data);
      write.resolve(chunk.pos);
      chunk.pos += write.data.length;
      return;
    }
    throw new Error('Could not find sufficient chunk to write');
  }
}
