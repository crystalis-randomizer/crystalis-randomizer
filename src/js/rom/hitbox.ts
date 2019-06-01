import {Entity} from './entity.js';
import {signed, tuple, unsigned} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

// A pattern page sequence for animating background tiles.  ID in 0..3
export class Hitbox extends Entity {

  readonly base: number;
  coordinates: [number, number, number, number];

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.base = 0x35691 + (id << 2);
    this.coordinates = tuple(rom.prg, this.base, 4);
  }

  get w(): number { return this.coordinates[1]; }
  set w(value: number) { this.coordinates[1] = value; }

  get x0(): number { return signed(this.coordinates[0]); }
  set x0(value: number) { this.coordinates[0] = unsigned(value); }

  get x1(): number { return this.x0 + this.w; }

  get h(): number { return this.coordinates[3]; }
  set h(value: number) { this.coordinates[3] = value; }

  get y0(): number { return signed(this.coordinates[2]); }
  set y0(value: number) { this.coordinates[2] = unsigned(value); }

  get y1(): number { return this.y0 + this.h; }

  write(writer: Writer) {
    writer.rom.subarray(this.base, this.base + 4).set(this.coordinates);
  }
}
