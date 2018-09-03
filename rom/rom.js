// TODO - basically want to build up a map from PRG offset to
// purpose - where it came from, what its purpose is, etc.
// We can then reconstruct a patched ROM from there, and possibly move
// some things around as needed.
//
// We'd need to sanitize away harmful overlapping elements

export const readWord = (arr, i) => arr[i] | arr[i + 1] << 8;

export class Rom {
  constructor(data) {
    if (!(data instanceof ArrayBuffer)) throw new Error('Expected ArrayBuffer');
    const view = new DataView(data);
    if (view.getUint32(0) != 0x4e45531a) throw new Error('Invalid ROM');
    const prgLen = view.getUint8(4) * (16 << 10);
    const chrLen = view.getUint8(5) * (8 << 10);
    const prgOffset = 16 + ((view.getUint8(6) & 0x8) << 6);
    this.prg = new Uint8Array(data, prgOffset, prgLen);
    this.chr = new Uint8Array(data, prgOffset + prgLen, chrLen);
  }
}

export class Vector {
  constructor(rom, start, elementSize, count, reader = (x) => x) {
    this.data = this.rom.prg.subarray(start, start + elementSize * count);
    this.elementSize = elementSize;
    this.count = count;
    this.reader = reader;
  }

  get(index) {
    const offset = elementSize * index;
    return this.reader(this.data.subarray(offset, offset + this.elementSize));
  }

  set(index, buffer) {
    if (index < 0 || index >= this.count) throw new Error('out of bounds');
    this.data.set(buffer, this.elementSize * index);
  }
}

export class DataTable {
  constructor(rom, start, length, pageOffset, reader) {
    this.rom = rom;
    this.table = new Vector(rom, start, 2, length,
                            x => pageOffset + readWord(x, 0));
    this.reader = reader;
  }

  get(index) {
    const addr = this.table.get(index);
    return this.reader(this.rom.prg.subarray(addr), addr, this.rom.prg);
  }
}
