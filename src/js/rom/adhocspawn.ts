import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Entity} from './entity';
import {tuple} from './util';

// An entry of the ad-hoc spawn table, which can be spawned arbitrarily
// by AdHocSpawnObject (provided there's an available spawn slot in range).
export class AdHocSpawn extends Entity {

  data: [number, number, number, number];

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.data = tuple(rom.prg, this.base, 4);
  }

  get base(): number {
    return (this.id << 2) + 0x29c00;
  }

  // Closed lower bound of allowed spawn slot range
  get slotRangeLower(): number { return this.data[0]; }
  set slotRangeLower(arg: number) { this.data[0] = arg; }

  // Open upper bound of allowed spawn slot range
  get slotRangeUpper(): number { return this.data[1]; }
  set slotRangeUpper(arg: number) { this.data[1] = arg; }

  // ID of the object to spawn
  get objectId(): number { return this.data[2]; }
  set objectId(arg: number) { this.data[2] = arg; }

  // Number of objects to spawn
  get count(): number { return this.data[3]; }
  set count(arg: number) { this.data[3] = arg; }

  write(): Module[] {
    const a = this.rom.assembler();
    a.segment('14');
    a.org(0x9c00 + (this.id << 2));
    a.byte(...this.data);
    return [a.module()];
  }
}
