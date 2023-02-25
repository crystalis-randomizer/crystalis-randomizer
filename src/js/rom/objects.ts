// import {FlagSet} from '../flagset.js';
// import {Random} from '../random.js';
import { Rom } from '../rom';
import { ObjectData } from './objectdata';
import { Monster } from './monster';
import { lowerCamelToSpaces, relocExportLabel } from './util';
import { EntityArray } from './entity';
import { Module } from '../asm/module';

// Manual data about monsters.  Every monster needs at least an ID-to-name mapping,
// We also can't expect to get the difficulty mapping automatically, so that's
// included here, too.

// TODO - action script types
//      -> compatibility with other monsters
//         constraints on extra attributes
//         difficulty ratings

export class Objects extends EntityArray<ObjectData> {

  mesiaSabera = new ObjectData(this, 0x2a, "Mesia");
  sorcerorShot = new Monster(this, {
    id: 0x3f,
    scaling: 37,
    type: 'projectile',
  });
  wraith1 = new Monster(this, {
    id: 0x4b,
    scaling: 24,
    class: 'wraith',
    displayName: 'Wraith',
  });
  paralysisPowderSource = new Monster(this, {
    id: 0x4d,
    scaling: 23,
    type: 'projectile',
  });
  wraith2 = new Monster(this, {
    id: 0x4f,
    scaling: 28,
    class: 'wraith',
    displayName: 'Wraith',
  });
  blueSlime = new Monster(this, {
    id: 0x50,
    scaling: 1,
    class: 'slime',
    displayName: 'Slime',
  });
  weretiger = new Monster(this, {
    id: 0x51,
    scaling: 1,
    displayName: 'Weretiger',
  });
  greenJelly = new Monster(this, {
    id: 0x52,
    scaling: 4,
    class: 'jelly',
    displayName: 'Slug',
  });
  redSlime = new Monster(this, {
    id: 0x53,
    scaling: 4,
    class: 'slime',
    displayName: 'Poison Slime',
  });
  rockGolem = new Monster(this, {
    id: 0x54,
    scaling: 4,
    class: 'golem',
    displayName: 'Mud Golem',
  });
  blueBat = new Monster(this, {
    id: 0x55,
    scaling: 4,
    displayName: 'Bat',
  });
  greenWyvern = new Monster(this, {
    id: 0x56,
    scaling: 4,
    class: 'wyvern',
    displayName: 'Wyvern',
  });
  vampire1 = new Monster(this, {
    id: 0x57,
    scaling: 5,
    type: 'boss',
    displayName: 'Vampire',
  });
  orc = new Monster(this, {
    id: 0x58,
    scaling: 6,
    displayName: 'Axe Wereboar',
  });
  redMosquito = new Monster(this, {
    id: 0x59,
    scaling: 10,
    class: 'mosquito',
    displayName: 'Mosquito',
  });
  blueMushroom = new Monster(this, {
    id: 0x5a,
    scaling: 10,
    class: 'mushroom',
    displayName: 'Mushroom',
  });
  swampTomato = new Monster(this, {
    id: 0x5b,
    scaling: 10.,
    displayName: 'Pillbug',
  });
  blueMosquito = new Monster(this, {
    id: 0x5c,
    scaling: 23,
    class: 'mosquito',
    displayName: 'Mosquito',
  });
  swampPlant = new Monster(this, {
    id: 0x5d,
    scaling: 10,
    displayName: 'Swamp Dandelion',
  });
  giantInsect = new Monster(this, {
    id: 0x5e,
    scaling: 11,
    type: 'boss',
    displayName: 'Giant Insect',
  });
  largeBlueSlime = new Monster(this, {
    id: 0x5f,
    scaling: 11,
    class: 'slime',
    displayName: 'Large Slime',
  });
  iceZombie = new Monster(this, {
    id: 0x60,
    scaling: 12,
    class: 'zombie',
    displayName: 'Ice Zombie',
  });
  greenBrain = new Monster(this, {
    id: 0x61,
    scaling: 12,
    class: 'brain',
    displayName: 'Brain',
  });
  greenSpider = new Monster(this, {
    id: 0x62,
    scaling: 12,
    class: 'spider',
    displayName: 'Spider',
  });
  redWyvern = new Monster(this, { // also purple?
    id: 0x63,
    scaling: 12,
    class: 'wyvern',
    displayName: 'Wyvern',
  });
  soldier = new Monster(this, {
    id: 0x64,
    scaling: 14,
    class: 'soldier',
    displayName: 'Draygonia Soldier',
  });
  iceEntity = new Monster(this, {
    id: 0x65,
    scaling: 14,
    class: 'entity',
    displayName: 'Ice Plant',
  });
  redBrain = new Monster(this, {
    id: 0x66,
    scaling: 14,
    class: 'brain',
    displayName: 'Poison Brain',
  });
  iceGolem = new Monster(this, {
    id: 0x67,
    scaling: 14,
    class: 'golem',
    displayName: 'Ice Golem',
  });
  kelbesque1 = new Monster(this, {
    id: 0x68,
    scaling: 15,
    type: 'boss',
    displayName: 'General Kelbesque',
  });
  largeRedSlime = new Monster(this, {
    id: 0x69,
    scaling: 18,
    class: 'slime',
    displayName: 'Large Poison Slime',
  });
  troll = new Monster(this, {
    id: 0x6a,
    scaling: 18,
    displayName: 'Troll',
  });
  redJelly = new Monster(this, {
    id: 0x6b,
    scaling: 18,
    class: 'jelly',
    displayName: 'Poison Jelly',
  });
  medusa = new Monster(this, {
    id: 0x6c,
    scaling: 19,
    displayName: 'Medusa',
  });
  crab = new Monster(this, {
    id: 0x6d,
    scaling: 19,
    displayName: 'Crab',
  });
  medusaHead = new Monster(this, {
    id: 0x6e,
    scaling: 20,
    displayName: 'Flying Plant',
  });
  bird = new Monster(this, {
    id: 0x6f,
    scaling: 20,
    class: 'bird',
    displayName: 'Bird',
  });
  redMushroom = new Monster(this, { // also purple
    id: 0x71,
    scaling: 21,
    class: 'mushroom',
    displayName: 'Poison Mushroom',
  });
  earthEntity = new Monster(this, {
    id: 0x72,
    scaling: 22,
    class: 'entity',
    displayName: 'Poison Plant',
  });
  mimic = new Monster(this, {
    id: 0x73,
    scaling: 22,
    displayName: 'Mimic',
  });
  redSpider = new Monster(this, {
    id: 0x74,
    scaling: 22,
    class: 'spider',
    displayName: 'Paralyzing Spider',
  });
  fishman = new Monster(this, {
    id: 0x75,
    scaling: 25,
    displayName: 'Mutant Fish',
  });
  jellyfish = new Monster(this, {
    id: 0x76,
    scaling: 25,
    displayName: 'Jellyfish',
  });
  kraken = new Monster(this, {
    id: 0x77,
    scaling: 25,
    displayName: 'Kraken',
  });
  darkGreenWyvern = new Monster(this, {
    id: 0x78,
    scaling: 27,
    class: 'wyvern',
    displayName: 'Wyvern Mage',
  });
  sandZombie = new Monster(this, {
    id: 0x79,
    scaling: 38,
    class: 'zombie',
    displayName: 'Sand Zombie',
  });
  wraithShadow1 = new Monster(this, {
    id: 0x7b,
    scaling: 28,
    class: 'wraith',
    displayName: 'Shadow',
  });
  moth = new Monster(this, {
    id: 0x7c,
    scaling: 28,
    difficulty: 3,
    displayName: 'Butterfly',
  });
  sabera1 = new Monster(this, {
    id: 0x7d,
    scaling: 29,
    type: 'boss',
    displayName: 'General Sabera',
  });
  verticalPlatform = new ObjectData(this, 0x7e); // scaling: 28 ?
  horizotalPlatform = new ObjectData(this, 0x7f); // scaling: 28 ?
  archer = new Monster(this, {
    id: 0x80,
    scaling: 33,
    class: 'soldier',
    displayName: 'Draygonia Archer',
  });
  bomberBird = new Monster(this, {
    id: 0x81,
    scaling: 33,
    class: 'bird',
    displayName: 'Bomber Bird',
  });
  lavaBlob = new Monster(this, {
    id: 0x82,
    scaling: 37,
    class: 'puddle',
    displayName: 'Lava Blob',
  });
  flailGuy = new Monster(this, { // lizard man
    id: 0x84,
    scaling: 37,
    displayName: 'Flail Guy',
  });
  blueEye = new Monster(this, {
    id: 0x85,
    scaling: 37,
    class: 'eye',
    displayName: 'Beholder',
  });
  salamander = new Monster(this, {
    id: 0x86,
    scaling: 37,
    displayName: 'Salamander',
  });
  sorceror = new Monster(this, { // burt
    id: 0x87,
    scaling: 37,
    displayName: 'Burt',
  });
  mado1 = new Monster(this, {
    id: 0x88,
    scaling: 37,
    displayName: 'General Mado',
  });
  knight = new Monster(this, {
    id: 0x89,
    scaling: 41,
    difficulty: 1,
    displayName: 'Ninja',
  });
  devil = new Monster(this, {
    id: 0x8a,
    scaling: 41,
    displayName: 'Devil Bat',
  });
  kelbesque2 = new Monster(this, {
    id: 0x8b,
    scaling: 41,
    type: 'boss',
    displayName: 'General Kelbesque',
  });
  wraithShadow2 = new Monster(this, {
    id: 0x8c,
    scaling: 41,
    class: 'wraith',
    displayName: 'Shadow',
  });
  glitch1 = new ObjectData(this, 0x8d); // scaling: 41 ?
  glitch2 = new ObjectData(this, 0x8e); // scaling: 41 ?
  guardianStatue = new ObjectData(this, 0x8f); // scaling: 41 ?
  sabera2 = new Monster(this, {
    id: 0x90,
    scaling: 41,
    type: 'boss',
    displayName: 'General Sabera',
  });
  tarantula = new Monster(this, {
    id: 0x91,
    scaling: 41,
    displayName: 'Tarantula',
  });
  skeleton = new Monster(this, {
    id: 0x92,
    scaling: 41,
    displayName: 'Skeleton',
  });
  mado2 = new Monster(this, {
    id: 0x93,
    scaling: 41,
    type: 'boss',
    displayName: 'General Mado',
  });
  purpleEye = new Monster(this, {
    id: 0x94,
    scaling: 41,
    class: 'eye',
    displayName: 'Beholder',
  });
  flailKnight = new Monster(this, {
    id: 0x95,
    scaling: 41,
    displayName: 'Flail Knight',
  });
  scorpion = new Monster(this, {
    id: 0x96,
    scaling: 41,
    displayName: 'Scorpion',
  });
  karmine = new Monster(this, {
    id: 0x97,
    scaling: 41,
    type: 'boss',
    displayName: 'General Karmine',
  });
  sandBlob = new Monster(this, {
    id: 0x98,
    scaling: 44,
    class: 'puddle',
    displayName: 'Sand Blob',
  });
  mummy = new Monster(this, {
    id: 0x99,
    scaling: 44,
    displayName: 'Mummy',
  });
  warlock = new Monster(this, {
    id: 0x9a,
    scaling: 46,
    displayName: 'Warlock',
  });
  draygon1 = new Monster(this, {
    id: 0x9b,
    scaling: 45,
    type: 'boss',
    displayName: 'Emperor Draygon',
  });
  statueOfSun = new ObjectData(this, 0x9c); // scaling: 47 ?
  statueOfMoon = new ObjectData(this, 0x9d); // scaling: 47 ?
  draygon2 = new Monster(this, {
    id: 0x9e,
    scaling: 47,
    type: 'boss',
    displayName: 'Emperor Draygon',
  });
  crumblingVerticalPlatform = new ObjectData(this, 0x9f); // scaling: 47 ?
  brownRobot = new Monster(this, {
    id: 0xa0,
    scaling: 47,
    difficulty: 1,
    displayName: 'Robot Sentry',
  });
  whiteRobot = new Monster(this, {
    id: 0xa1,
    scaling: 47,
    displayName: 'Robot Enforcer',
  });
  towerSentinel = new Monster(this, {
    id: 0xa2,
    scaling: 47,
    displayName: 'Tower Sentinel',
  });
  helicopter = new Monster(this, {
    id: 0xa3,
    scaling: 47,
    displayName: 'Robocopter',
  });
  dyna = new Monster(this, {
    id: 0xa4,
    scaling: 47,
    type: 'boss',
    displayName: 'DYNA',
  });
  vampire2 = new Monster(this, {
    id: 0xa5,
    scaling: 28,
    type: 'boss',
    displayName: 'Vampire',
  });
  glitch3 = new ObjectData(this, 0xa6); // scaling: 41 ?
  dynaPod = new Monster(this, {
    id: 0xb4,
    scaling: 47,
    type: 'boss',
    displayName: 'DYNA Defense Pod',
  });
  dynaCounter = new Monster(this, {
    id: 0xb8,
    scaling: 47,
    type: 'projectile',
  });
  dynaLaser = new Monster(this, {
    id: 0xb9,
    scaling: 47,
    type: 'projectile',
  });
  dynaBubble = new Monster(this, {
    id: 0xba,
    scaling: 47,
    type: 'projectile',
  });
  vampire2Bat = new Monster(this, {
    id: 0xbc,
    scaling: 28,
    // type: 'projectile', // of sorts...?
  });
  brownRobotLaserSource = new Monster(this, {
    id: 0xbe,
    scaling: 47,
    type: 'projectile',
  });
  draygon2Fireball = new Monster(this, {
    id: 0xbf,
    scaling: 47,
    type: 'projectile',
  });
  vampire1Bat = new Monster(this, {
    id: 0xc1,
    scaling: 5,
    //type: 'projectile', // of sorts
  });
  giantInsectFireball = new Monster(this, {
    id: 0xc3,
    scaling: 11,
    type: 'projectile',
  });
  greenMosquito = new Monster(this, {
    id: 0xc4,
    scaling: 11,
    //type: 'projectile', // of sorts
    displayName: 'Mosquito',
  });
  kelbesque1Rock = new Monster(this, {
    id: 0xc5,
    scaling: 15,
    type: 'projectile',
  });
  sabera1Balls = new Monster(this, {
    id: 0xc6,
    scaling: 29,
    type: 'projectile',
  });
  kelbesque2Fire = new Monster(this, {
    id: 0xc7,
    scaling: 41,
    type: 'projectile',
  });
  sabera2Fire = new Monster(this, {
    id: 0xc8,
    scaling: 41,
    type: 'projectile',
  });
  sabera2Balls = new Monster(this, {
    id: 0xc9,
    scaling: 41,
    type: 'projectile',
  });
  karmineBalls = new Monster(this, {
    id: 0xca,
    scaling: 41,
    type: 'projectile',
  });
  statueBalls = new Monster(this, {
    id: 0xcb,
    scaling: 47,
    type: 'projectile',
  });
  draygon1Lightning = new Monster(this, {
    id: 0xcc,
    scaling: 45,
    type: 'projectile',
  });
  draygon2Laser = new Monster(this, {
    id: 0xcd,
    scaling: 47,
    type: 'projectile',
  });
  draygon2Breath = new Monster(this, {
    id: 0xce,
    scaling: 47,
    type: 'projectile',
  });
  birdBomb = new Monster(this, {
    id: 0xe0,
    scaling: 33,
    type: 'projectile',
  });
  greenMosquitoShot = new Monster(this, {
    id: 0xe2,
    scaling: 11,
    type: 'projectile',
  });
  paralysisBeam = new Monster(this, {
    id: 0xe3,
    scaling: 25,
    type: 'projectile',
  });
  stoneGaze = new Monster(this, {
    id: 0xe4,
    scaling: 19,
    type: 'projectile',
  });
  rockGolemRock = new Monster(this, {
    id: 0xe5,
    scaling: 4,
    type: 'projectile',
  });
  curseBeam = new Monster(this, {
    id: 0xe6,
    scaling: 41,
    type: 'projectile',
  });
  mpDrainWeb = new Monster(this, {
    id: 0xe7,
    scaling: 41,
    type: 'projectile',
  });
  fishmanTrident = new Monster(this, {
    id: 0xe8,
    scaling: 25,
    type: 'projectile',
  });
  orcAxe = new Monster(this, {
    id: 0xe9,
    scaling: 6,
    type: 'projectile',
  });
  swampPollen = new Monster(this, {
    id: 0xea,
    scaling: 10,
    type: 'projectile',
  });
  paralysisPowder = new Monster(this, {
    id: 0xeb,
    scaling: 23,
    type: 'projectile',
  });
  soldierSword = new Monster(this, {
    id: 0xec,
    scaling: 14,
    type: 'projectile',
  });
  iceGolemRock = new Monster(this, {
    id: 0xed,
    scaling: 14,
    type: 'projectile',
  });
  trollAxe = new Monster(this, {
    id: 0xee,
    scaling: 18,
    type: 'projectile',
  });
  krakenInk = new Monster(this, {
    id: 0xef,
    scaling: 25,
    type: 'projectile',
  });
  archerArrow = new Monster(this, {
    id: 0xf0,
    scaling: 33,
    type: 'projectile',
  });
  knightSword = new Monster(this, {
    id: 0xf2,
    scaling: 41,
    type: 'projectile',
  });
  mothResidue = new Monster(this, {
    id: 0xf3,
    scaling: 28,
    type: 'projectile',
  });
  brownRobotLaser = new Monster(this, {
    id: 0xf4,
    scaling: 47,
    type: 'projectile',
  });
  whiteRobotLaser = new Monster(this, {
    id: 0xf5,
    scaling: 47,
    type: 'projectile',
  });
  towerSentinelLaser = new Monster(this, {
    id: 0xf6,
    scaling: 47,
    type: 'projectile',
  });
  skeletonShot = new Monster(this, {
    id: 0xf7,
    scaling: 41,
    type: 'projectile',
  });
  blobShot = new Monster(this, {
    id: 0xf8,
    scaling: 37,
    type: 'projectile',
  });
  flailKnightFlail = new Monster(this, {
    id: 0xf9,
    scaling: 41,
    type: 'projectile',
  });
  flailGuyFlail = new Monster(this, {
    id: 0xfa,
    scaling: 37,
    type: 'projectile',
  });
  madoShuriken = new Monster(this, {
    id: 0xfc,
    scaling: 37,
    type: 'projectile',
  });
  guardianStatueMissile = new Monster(this, {
    id: 0xfd,
    scaling: 36,
    type: 'projectile',
  });
  demonWallFire = new Monster(this, {
    id: 0xfe,
    scaling: 37,
    type: 'projectile',
  });

  constructor(readonly rom: Rom) {
    super(0x100);

    for (const key in this) {
      const obj = this[key as keyof this];
      if (!(obj instanceof ObjectData)) continue;
      obj.name = lowerCamelToSpaces(key);
    }
    for (let i = 0; i < this.length; i++) {
      if (!this[i]) {
        this[i] = new ObjectData(this, i);
      }
    }
  }

  write(): Module[] {
    const modules: Module[] = [];
    for (const obj of this) {
      modules.push(...obj.write());
    }
    // If we're storing the monster names then we need to initialize the buffer
    // length.
    if (this.rom.writeMonsterNames) {
      const a = this.rom.assembler();
      const longestName = Math.max(...(this.map(o => o.displayName.length)));
      const MAX_LENGTH = 27;

      if (longestName > MAX_LENGTH) {
        throw new Error(`Longest displayName length is greater than ${MAX_LENGTH
            }. (${longestName} > ${MAX_LENGTH
            })\nCrystalis HUD can't comfortably fit that many characters.`);
      }
      a.assign('ENEMY_NAME_LENGTH', longestName);
      a.export('ENEMY_NAME_LENGTH');
      a.segment('1a', 'fe', 'ff')
      relocExportLabel(a, 'EnemyNameBlocklist', ['1a', 'fe', 'ff']);
      const hardcodedBlockedObjs = [this.dynaCounter, this.dynaLaser, this.dynaBubble];
      const blocklist = this.filter(obj => obj.hp > 0 && obj.displayName == '').concat(hardcodedBlockedObjs);
      a.byte(...blocklist.map(obj => obj.id))
      a.assign('ENEMY_NAME_BLOCKLIST_LEN', blocklist.length);
      a.export('ENEMY_NAME_BLOCKLIST_LEN');
      modules.push(a.module());
    }
    return modules;
  }
}

// export type MonsterType = 'monster' | 'boss' | 'projectile';
// export type Terrain = 'walk' | 'swim' | 'soar' | 'flutter' | 'stand';

export type Constraint = Map<string, readonly [readonly number[], boolean | null]>;
// key is tuple[0].join(',')
// value[0] is [[quad for required pat0, pat1, pal2, pal3]
// value[1] is true if need pat1, false if need pat0, null if neither
//   ---> but we need to keep track of a hanful of spawns, not just tone.


  // monster(0x50, 'Blue Slime', 0x20, 6, {
  //   hits: 1, satk: 16, dgld: 2, sexp: 32,
  //   must: and(pat(0x64), pal(2, 0x21)),
  // });
  // monster(0x51, 'Weretiger', 0x24, 7, {
  //   hits: 1.5, satk: 21, dgld: 4, sexp: 40,
  //   must: and(pat(0x60), pal(3, 0x20)),
  // });
  // monster(0x52, 'Green Jelly', 0x20, 10, {
  //   sdef: 4, hits: 3, satk: 16, dgld: 4, sexp: 36,
  //   must: and(pat(0x65), pal(2, 0x22)),
  // });
  // monster(0x53, 'Red Slime', 0x20, 16, {
  //   sdef: 6, hits: 4, satk: 16, dgld: 4, sexp: 48,
  //   must: and(pat(0x64), pal(2, 0x23)),
  // });


// export interface Monster {
//   id: number;
//   name: string;
//   action: number;
//   count: number;
//   type?: MonsterType; // default is monster
//   move?: Terrain; // default is walk
//   sdef?: number;
//   swrd?: number;
//   hits?: number;
//   satk?: number;
//   dgld?: number;
//   sexp?: number;
//   elem?: number;
//   spd?: number;
//   status: number;
//   persist?: boolean;
//   must?: Constraint;
// }

// interface Adjustments {
//   vanillaLevel?: number;
//   vanillaSword?: number;
//   sdef?: number;
//   swrd?: number;
//   hits?: number;
//   satk?: number;
//   dgld?: number;
//   sexp?: number;
//   elem?: number;
//   spd?: number;
// }

// interface PlayerStats {
//   armor: number;
//   level: number;
//   shield: number;
//   sword: number;
// }

// const VANILLA_SWORDS = [2, 2, 2, 2, 4, 4, 4, 8, 8, 8, 8, 16, 16, 16, 16, 16];

// const {} = {VANILLA_SWORDS} as any;

// export function generate(rom: Rom, flags: FlagSet, random: Random): Monster[] {
//   const {} = {rom, flags, random} as any;

//   const out: Monster[] = [];

//   const player: PlayerStats = {
//     armor: 2,
//     level: 1,
//     shield: 2,
//     sword: 2,
//   };

//   function base(id: number, name: string, adj: Adjustments = {}) {
//     const o = rom.objects[id];
//     let {action, immobile, level, atk, def, hp,
//          elements, goldDrop, expReward, statusEffect} = o;

//     // // What level should the player be at when encountering this in vanilla?
//     // if (adj.vanillaLevel) level = adj.vanillaLevel;
//     level = player.level;

//     // What sword would they be using?  Pick the highest non-immune sword that
//     // would be available at this point in the game.
//     let sword = player.sword;
//     while (sword > 1 && (elements & (sword >>> 1))) {
//       sword >>>= 1;
//     }
//     if (adj.vanillaSword) sword = adj.vanillaSword;
//     const patk = sword + level; // expected player attack

//     // How many hits would it take to kill in vanilla? (consider no floor?)
//     const vanillaHits = Math.floor((hp + 1) / (patk - def));
//     const hits = adj.hits || vanillaHits;

//     // Scaled defense (will be stored in eighths)
//     const sdef = adj.sdef != null ? adj.sdef : def / patk; // normally *8

//     // Expected player HP and defense at vanilla level
//     const php = Math.min(255, 32 + 16 * level);
//     const pdef = o.attackType ? player.shield : player.armor;
//     const vanillaDamage = Math.max(0, atk - level - pdef) / php;
//     const satk = adj.satk != null ? adj.satk : vanillaDamage; // normally *128

//     // TODO - then compute gold/exp

//     const {} = {sdef, satk, hits, immobile, goldDrop, expReward, statusEffect} as any;

//     const m: Monster = {id, name} as any;

//     m.id = id;
//     m.name = name;
//     m.type = 'monster';
//     m.action = action;
//     m.count = 0; // count;
//     out.push(m);
//   }

//   // TODO - additional constraints about e.g. placement, etc?
//   //      - no X on Y level...?

//   return out;
// }

// function and(x: Constraint, y: Constraint): Constraint {
//   return [];
// }
// function pat(id: number): Constraint {
//   return [];
// }
// function pal(which: number, id: number): Constraint {
//   return [];
// }

// const {} = {and, pat, pal} as any;
