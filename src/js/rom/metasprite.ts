import {Entity} from './entity';
import {hex, readLittleEndian, seq, tuple} from './util';
import {Rom} from '../rom';

const METASPRITE_TABLE = 0x3845c;

// [dx, dy, attributes, pattern id]
type Sprite = [number, number, number, number];

export class Metasprite extends Entity {

  pointer: number;
  base: number;
  used: boolean;
  mirrored: number | null = null;
  size: number;
  frameMask: number;
  frames: number;
  // `size` sprites for each frame
  sprites: Sprite[][];

  constructor(rom: Rom, id: number) {
    super(rom, id);

    this.pointer = METASPRITE_TABLE + (this.id << 1);
    this.base = readLittleEndian(rom.prg, this.pointer) + 0x30000;
    this.used = this.base >= 0x38000;

    if (rom.prg[this.base] === 0xff) {
      // find the ID of the sprite that's mirrored.
      const target = readLittleEndian(rom.prg, this.base + 1);
      for (let i = 0; i < 256; i++) {
        if (readLittleEndian(rom.prg, METASPRITE_TABLE + (i << 1)) === target) {
          this.mirrored = i;
          break;
        }
      }
      if (this.mirrored == null) {
        throw new Error(`could not find mirrored sprite for ${hex(id)}: ${hex(target)}`);
      }
      this.size = 0;
      this.frameMask = 0;
      this.frames = 0;
      this.sprites = [];
    } else {
      this.mirrored = null;
      this.size = rom.prg[this.base];
      this.frameMask = rom.prg[this.base + 1];
      this.frames = this.frameMask + 1;

      this.sprites = seq(this.frames, f => {
        const a = this.base + 2 + f * 4 * this.size;
        const sprites: [number, number, number, number][] = [];
        for (let i = 0; i < this.size; i++) {
          if (rom.prg[a + 4 * i] === 0x80) break;
          sprites.push(tuple(rom.prg, a + 4 * i, 4));
        }
        return sprites;
      });
      // NOTE: when re-encoding this, fill in $80 for all
      // missing rows from non-final frames.  For the final
      // frame, just write a single row of $80 (or maybe
      // even just a single one, if only the first is used).
    }
  }

  patternBanks(offset = 0): number[] {
    if (!this.used) return [];
    let ms: Metasprite = this;
    if (ms.mirrored) {
      ms = this.rom.metasprites[ms.mirrored];
    }
    const pats = new Set<number>();
    for (const version of ms.sprites) {
      for (const [dx, , , pat] of version) {
        if (dx === 0x80) break;
        pats.add(((pat + offset) >>> 6) & 0xff);
      }
    }
    return [...pats];
  }

  // returns an array of [0..3]
  palettes(): number[] {
    if (!this.used) return [];
    let ms: Metasprite = this;
    if (ms.mirrored) {
      ms = this.rom.metasprites[ms.mirrored];
    }
    const pals = new Set<number>();
    for (const version of ms.sprites) {
      for (const [dx, , attr] of version) {
        if (dx === 0x80) break;
        pals.add(attr & 3);
      }
    }
    return [...pals];
  }
}
