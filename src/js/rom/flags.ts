import {Rom} from '../rom.js';

/** Tracks used and unused flags. */
export class Flags {
  private readonly available = new Set<number>([
    // TODO - there's a ton of lower flags as well.
    // TODO - we can repurpose all the old item flags.
    0x270, 0x271, 0x272, 0x273, 0x274, 0x275, 0x276, 0x277,
    0x278, 0x279, 0x27a, 0x27b, 0x27c, 0x27d, 0x27e, 0x27f,
    0x280, 0x281, 0x288, 0x289, 0x28a, 0x28b, 0x28c,
    0x2a7, 0x2ab, 0x2b4,
  ]);

  constructor(readonly rom: Rom) {}

  alloc(segment?: number): number {
    for (const flag of this.available) {
      if (segment == null || (flag & 0xf00) === segment) {
        this.available.delete(flag);
        return flag;
      }
    }
    throw new Error(`No free flags.`);
  }

  free(flag: number) {
    this.available.add(flag);
  }
}
