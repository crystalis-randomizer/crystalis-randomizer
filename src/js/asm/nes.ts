// Utilities for reading/writing NES header

export class NesFile {
  readonly mapper: number;
  readonly prg: Uint8Array;
  readonly chr: Uint8Array;
  readonly trainer?: Uint8Array;

  constructor(readonly data: Uint8Array) {
    if (data[0] !== 0x4e || data[1] !== 0x45 ||
        data[2] !== 0x53 || data[3] !== 0x1a) {
      throw new Error ('not a NES file');
    }
    const prgSize = data[4];
    const chrSize = data[5];
    this.mapper = (data[6] >>> 4) | (data[7] & 0xf0);
    //const ramSize = data[8];
    const hasTrainer = data[6] & 4;
    let start = 0x10;
    if (hasTrainer) {
      this.trainer = data.subarray(start, start + 512);
      start += 512;
    }
    this.prg = data.subarray(start, start + 16384 * prgSize);
    start += 16384 * prgSize;
    this.chr = data.subarray(start, start + 8192 * chrSize);
    start += 8192 * chrSize;
  }
}
