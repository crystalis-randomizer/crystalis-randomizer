import {Entity} from './entity';
import {tuple} from './util';
import {Rom} from '../rom';

// A pattern page sequence for animating background tiles.  ID in 0..3
export class TileAnimation extends Entity {

  readonly base: number;
  readonly pages: ReadonlyArray<number>;

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.base = 0x3e779 + (id << 3);
    this.pages = tuple(rom.prg, this.base, 8);
  }
}
