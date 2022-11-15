import {Entity} from './entity';
import {tuple} from './util';
import {Rom} from '../rom';

export class Palette extends Entity {

  base: number;
  colors: [number, number, number, number];

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.base = (id & 3) << 2 | (id & 0xfc) << 6 | 0x40f0;
    this.colors = tuple(rom.prg, this.base, 4);
  }
  // grayscale palette: [3f, 30, 2d, 0] ??

  // Takes a color 'c' from 0..3 and returns a number from 0..63.
  color(c: number): number {
    return this.colors[c] & 0x3f;
  }
}
