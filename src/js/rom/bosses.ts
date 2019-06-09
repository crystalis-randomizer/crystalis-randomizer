import {Rom} from '../rom.js';
import {readLittleEndian} from './util.js';

// TODO - we need a consistent way to refer to bosses...
//  - maybe bosses.fromNpcId(), bosses.fromObjectId(), bosses.fromBossKill()

// Represents a boss slot.  Note that the specific object is tied most tightly
// to the boss kill (drop), rather than the specific identity of the boss.
export class Bosses implements Iterable<Boss> {

  readonly vampire1: Boss;
  readonly insect: Boss;
  readonly kelbesque1: Boss;
  readonly rage: Boss;
  readonly sabera1: Boss;
  readonly vampire2: Boss;
  readonly mado1: Boss;
  readonly kelbesque2: Boss;
  readonly sabera2: Boss;
  readonly mado2: Boss;
  readonly karmine: Boss;
  readonly draygon1: Boss;
  readonly statueOfMoon: Boss;
  readonly statueOfSun: Boss;
  readonly draygon2: Boss;
  readonly dyna: Boss;

  private readonly all: Boss[];

  constructor(readonly rom: Rom) {
    this.all = [
      this.vampire1 = new Boss(this, 0xc0, 0x0, true),
      this.insect = new Boss(this, 0xc1, 0x1),
      this.kelbesque1 = new Boss(this, 0xc2, 0x2, true).sword(3),
      this.rage = new Boss(this, 0xc3, 0x3),
      this.sabera1 = new Boss(this, 0x84, 0x4, true, 0x3656e).sword(3),
      this.vampire2 = new Boss(this, 0xcc, 0xc, true),
      this.mado1 = new Boss(this, -1, 0x5, true, 0x3d820).sword(3),
      this.kelbesque2 = new Boss(this, 0xc5, 0x6, true).sword(3),
      this.sabera2 = new Boss(this, 0xc6, 0x7, true).sword(3),
      this.mado2 = new Boss(this, 0xc7, 0x8, true).sword(3),
      this.karmine = new Boss(this, 0xc8, 0x9, true).sword(2),
      this.draygon1 = new Boss(this, 0xcb, 0xa).sword(2),
      this.statueOfMoon = new Boss(this, 0xc9),
      this.statueOfSun = new Boss(this, 0xca),
      // TODO - give Draygon 2 a different NPC id (say, c4?)
      this.draygon2 = new Boss(this, 0xcb, 0xb).sword(3),
      this.dyna = new Boss(this, -1, 0xd),
    ];
  }

  fromLocation(id: number): Boss|undefined {
    return this.all.find(b => b.location === id);
  }

  fromBossKill(num: number): Boss|undefined {
    return this.all.find(b => b.kill === num);
  }

  fromObject(id: number): Boss|undefined {
    return this.all.find(b => b.object === id);
  }

  [Symbol.iterator](): IterableIterator<Boss> {
    return this.all[Symbol.iterator]();
  }
}

// NOTE: currently this data is read-only.
export class Boss {

  readonly objectAddress: number;
  // TODO - make object settable?
  readonly object: number;
  readonly drop?: number;
  readonly location?: number;

  // Only used for logic.
  swordLevel = 1;

  constructor(readonly bosses: Bosses,
              readonly npc: number,
              readonly kill?: number,
              readonly shuffled?: boolean,
              address?: number) {
    this.objectAddress = address || (0x80f0 | (npc & 0xfc) << 6 | (npc & 3) << 2 | 1);
    this.object = bosses.rom.prg[this.objectAddress];
    const {prg} = bosses.rom;
    if (kill != null) {
      const killAddr = 0x14000 + readLittleEndian(prg, 0x1f96b + 2 * kill);
      const drop = prg[killAddr + 4];
      if (drop !== 0xff) this.drop = drop;
      this.location = prg[0x1f95d + kill];
    }
  }

  sword(level: number): this {
    this.swordLevel = level;
    return this;
  }
}
