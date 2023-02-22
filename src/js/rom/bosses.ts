import { Module } from '../asm/module';
import { die } from '../assert';
import { Rom } from '../rom';
import { Flag } from './flags';
import { Npc } from './npc';
import { Mutable, readLittleEndian, upperCamelToSpaces, readValue, exportValue } from './util.js';

interface BossData {
  readonly flag?: Flag;
  readonly npc?: Npc;
  readonly kill?: number;
  readonly shuffled?: boolean;
  readonly address?: number;
  readonly sword?: number;
  readonly object?: number;
}

// TODO - we need a consistent way to refer to bosses...
//  - maybe bosses.fromNpcId(), bosses.fromObjectId(), bosses.fromBossKill()

// Represents a boss slot.  Note that the specific object is tied most tightly
// to the boss kill (drop), rather than the specific identity of the boss.
export class Bosses implements Iterable<Boss> {

  readonly Vampire1 = new Boss(this, {
    flag: this.rom.flags.Vampire1,
    kill: 0x0,
    npc: this.rom.npcs.Vampire1,
    shuffled: true,
    sword: 1,
  });
  readonly Insect = new Boss(this, {
    flag: this.rom.flags.GiantInsect,
    kill: 0x1,
    npc: this.rom.npcs.Insect,
    sword: 1,
  });
  readonly Kelbesque1 = new Boss(this, {
    flag: this.rom.flags.Kelbesque1,
    kill: 0x2,
    npc: this.rom.npcs.Kelbesque1,
    shuffled: true,
  });
  readonly Rage = new Boss(this, {
    flag: this.rom.flags.Rage,
    kill: 0x3,
    npc: this.rom.npcs.Rage,
  });
  readonly Sabera1 = new Boss(this, {
    address: 0x3656e,
    flag: this.rom.flags.Sabera1,
    kill: 0x4,
    npc: this.rom.npcs.SaberaDisguisedAsMesia,
    shuffled: true,
  });
  readonly Vampire2 = new Boss(this, {
    flag: this.rom.flags.Vampire2,
    kill: 0xc,
    npc: this.rom.npcs.Vampire2,
    shuffled: true,
    sword: 1,
  });
  readonly Mado1 = new Boss(this, {
    address: 0x7d820,
    flag: this.rom.flags.Mado1,
    kill: 0x5,
    shuffled: true,
  });
  readonly Kelbesque2 = new Boss(this, {
    flag: this.rom.flags.Kelbesque2,
    kill: 0x6,
    npc: this.rom.npcs.Kelbesque2,
    shuffled: true,
  });
  readonly Sabera2 = new Boss(this, {
    flag: this.rom.flags.Sabera2,
    kill: 0x7,
    npc: this.rom.npcs.Sabera2,
    shuffled: true,
  });
  readonly Mado2 = new Boss(this, {
    flag: this.rom.flags.Mado2,
    kill: 0x8,
    npc: this.rom.npcs.Mado2,
    shuffled: true,
  });
  readonly Karmine = new Boss(this, {
    flag: this.rom.flags.Karmine,
    kill: 0x9,
    npc: this.rom.npcs.Karmine,
    shuffled: true,
    sword: 2,
  });
  readonly Draygon1 = new Boss(this, {
    flag: this.rom.flags.Draygon1,
    kill: 0xa,
    npc: this.rom.npcs.Draygon,
    shuffled: true,
    sword: 2,
  });
  readonly StatueOfMoon = new Boss(this, {
    flag: this.rom.flags.UsedBowOfMoon,
    npc: this.rom.npcs.StatueOfMoon,
  });
  readonly StatueOfSun = new Boss(this, {
    flag: this.rom.flags.UsedBowOfSun,
    npc: this.rom.npcs.StatueOfSun,
  });
  readonly Draygon2 = new Boss(this, {
    flag: this.rom.flags.Draygon2,
    kill: 0xb,
    npc: this.rom.npcs.Draygon,
  });
  readonly Dyna = new Boss(this, {
    kill: 0xd,
    object: 0xa4,
  });

  readonly musics = [
    new BossMusic('bossMusic_vampire', [this.Vampire1, this.Vampire2]),
    new BossMusic('bossMusic_insect', [this.Insect]),
    new BossMusic('bossMusic_kelbesque', [this.Kelbesque1, this.Kelbesque2]),
    new BossMusic('bossMusic_sabera', [this.Sabera1, this.Sabera2]),
    new BossMusic('bossMusic_mado', [this.Mado1, this.Mado2]),
    new BossMusic('bossMusic_karmine', [this.Karmine]),
    new BossMusic('bossMusic_draygon1', [this.Draygon1]),
    new BossMusic('bossMusic_draygon2', [this.Draygon2]),
    new BossMusic('bossMusic_dyna', [this.Dyna]),
  ];

  private readonly all: Boss[] = [];
  private flags?: Set<number>;

  constructor(readonly rom: Rom) {
    for (const key in this) {
      if (!this.hasOwnProperty(key)) continue;
      const boss = this[key];
      if (boss instanceof Boss) {
        (boss as Mutable<Boss>).name = upperCamelToSpaces(key);
        this.all.push(boss);
      }
    }
  }

  isBossFlag(flag: number): boolean {
    const flags = this.flags || (this.flags = (() => {
      const f = new Set<number>();
      for (const boss of this.all) {
        if (boss.flag != null) f.add(boss.flag.id);
      }
      return f;
    })());
    return flags.has(flag);
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

  write(): Module[] {
    const a = this.rom.assembler();
    for (const music of this.musics) {
      exportValue(a, music.symbol, music.bgm);
    }
    return [a.module()];
  }
}

export class BossMusic {
  bgm: number;

  constructor(readonly symbol: string, readonly bosses: readonly Boss[]) {
    const rom = bosses[0].bosses.rom; // pull it out of somewhere
    this.bgm = readValue(symbol, rom.prg);
  }
}

// NOTE: currently this data is read-only.
export class Boss {

  // TODO - make object settable?
  readonly name!: string;
  readonly object: number;
  readonly flag?: Flag;
  readonly npc?: Npc;
  readonly swordLevel: number;
  readonly shuffled: boolean;
  readonly drop?: number;
  readonly kill?: number;
  readonly location?: number;

  // Only used for logic.
  constructor(readonly bosses: Bosses,
              {flag, npc, kill, shuffled,
               address, sword = 3, object}: BossData) {
    const {prg} = bosses.rom;
    this.flag = flag;
    this.npc = npc;
    this.object =
        address ? prg[address] : npc ? npc.data[1] :
        object ?? die(`address, npc, or object is required`);
    this.swordLevel = sword;
    this.shuffled = Boolean(shuffled);
    this.kill = kill;
    if (kill != null) {
      const killAddr = 0x14000 + readLittleEndian(prg, 0x1f96b + 2 * kill);
      const drop = prg[killAddr + 4];
      if (drop !== 0xff) this.drop = drop;
      this.location = prg[0x1f95d + kill];
    }
  }
}
