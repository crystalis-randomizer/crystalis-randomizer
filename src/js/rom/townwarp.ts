import {Assembler} from '../asm/assembler.js';
import {Rom} from '../rom.js';
import {tuple} from './util.js';
import {Writer} from './writer.js';

// List of town warp locations.
export class TownWarp {

  locations: number[];

  // (location, entrance) pair for warp point.
  thunderSwordWarp: readonly [number, number];

  constructor(readonly rom: Rom) {
    this.locations = tuple(rom.prg, ADDRESS, COUNT);
    this.thunderSwordWarp = [rom.prg[0x3d5ca], rom.prg[0x3d5ce]];
  }

  write(w: Writer): void {
    const a = new Assembler();
    a.segment(...SEGMENTS);
    a.org(ORG);
    a.label('TownWarpTable');
    a.byte(...this.locations);
    a.org(0xdc8c);
    a.instruction('lda', 'TownWarpTable,y');
    a.org(0xd5c9);
    a.instruction('lda', '#' + this.thunderSwordWarp[0]);
    a.org(0xd5cd);
    a.instruction('lda', '#' + this.thunderSwordWarp[1]);
    w.modules.push(a.module());
  }
}

const SEGMENTS = ['fe', 'ff'];
const ORG = 0xdc58;

const ADDRESS = 0x3dc58;
const COUNT = 12;
