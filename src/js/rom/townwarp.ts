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
    w.rom.subarray(ADDRESS, ADDRESS + COUNT).set(this.locations);
    [w.rom[0x3d5ca], w.rom[0x3d5ce]] = this.thunderSwordWarp;
  }
}

const ADDRESS = 0x3dc58;
const COUNT = 12;
