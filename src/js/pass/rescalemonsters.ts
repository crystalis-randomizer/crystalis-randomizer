import { Config } from '../config';
import {seq} from '../rom/util';
import { Shuffle } from '../shuffle';

export function rescaleMonsters(s: Shuffle) {
  const {config, random, rom} = s;

  // TODO - find anything sharing the same memory and update them as well
  const unscaledMonsters =
      new Set<number>(seq(0x100, x => x).filter(s => s in rom.objects));
  for (const [id] of SCALED_MONSTERS) {
    unscaledMonsters.delete(id);
  }
  for (const [id, monster] of SCALED_MONSTERS) {
    for (const other of unscaledMonsters) {
      if (rom.objects[id].base === rom.objects[other].base) {
        SCALED_MONSTERS.set(other, monster);
        unscaledMonsters.delete(id);
      }
    }
  }

  // Flails (f9, fa) and Sabera 2's fireballs (c8) should be projectiles.
  // Moreover, for some weird reason they're set up to cause paralysis, so
  // let's fix that, too.
  for (const obj of [0xc8, 0xf9, 0xfa]) {
    // NOTE: flails need attacktype $fe, not $ff
    rom.objects[obj].attackType = obj > 0xf0 ? 0xfe : 0xff;
    rom.objects[obj].statusEffect = 0;
  }
  // Fix Sabera 1's elemental defense to no longer allow thunder
  rom.objects[0x7d].elements |= 0x08;

  const TETRARCHS = new Set([
    rom.objects.kelbesque1.id,
    rom.objects.sabera1.id,
    rom.objects.mado1.id,
    rom.objects.kelbesque2.id,
    rom.objects.sabera2.id,
    rom.objects.mado2.id,
    rom.objects.karmine.id,
  ]);
  const DRAYGON = new Set([
    rom.objects.draygon1.id,
    rom.objects.draygon2.id,
  ]);
  const ROBOTS = new Set([
    rom.objects.brownRobot.id,
    rom.objects.whiteRobot.id,
  ]);
  const SLIMES = new Set([
    rom.objects.blueSlime.id,
    rom.objects.redSlime.id,
    rom.objects.largeBlueSlime.id,
    rom.objects.largeRedSlime.id,
  ]);

  // if shuffling weaknesses (rather than randomizing) then keep track
  // of the count of each weakness so that we can keep the proportion
  // roughly the same.
  const weaknessCounts: number[] = [];
  const normalWeaknesses: number[]|undefined =
    config.enemies.enemyWeaknesses === Config.Randomization.RANDOM ? undefined : [];
  const tetrarchWeaknesses: number[]|undefined =
    config.enemies.tetrarchWeaknesses === Config.Randomization.RANDOM ? undefined : [];
  for (const id of SCALED_MONSTERS.keys()) {
    if (DRAYGON.has(id) || ROBOTS.has(id)) continue;
    const tetrarch = TETRARCHS.has(id);
    const elts = rom.objects[id].elements;
    const weaknesses = tetrarch ? tetrarchWeaknesses : normalWeaknesses;
    if (!weaknesses) continue;
    let count = 0;
    for (let i = 8; i; i >>>= 1) {
      if (!(elts & i)) continue;
      weaknesses.push(i);
      count++;
    }
    if (!tetrarch) weaknessCounts?.push(count);
  }
  // NOTE: should be empty if not shuffling
  random.shuffle(weaknessCounts);
  if (normalWeaknesses) random.shuffle(normalWeaknesses);
  if (tetrarchWeaknesses) random.shuffle(tetrarchWeaknesses);
  function pickWeaknesses(count: number|undefined): number {
    if (!normalWeaknesses) {
      // respect count if defined, otherwise just rand(14)
      if (!count) return random.nextInt(14) + 1;
      const bits = [1, 2, 4, 8];
      let mask = 0;
      for (let i = 0; i < count; i++) {
        const j = random.nextInt(bits.length);
        mask |= bits.splice(j, 1)[0];
      }
      return mask;
    } else {
      count ??= random.nextInt(4);
      let mask = 0;
      const rejected = [];
      while (count) {
        const next = normalWeaknesses.pop() ?? 1 << random.nextInt(4);
        if (next & mask) {
          rejected.push(next);
        } else {
          mask |= next;
        }
        count--;
      }
      normalWeaknesses.splice(0, 0, ...rejected);
      return mask;
    }
  }
  function countBits(n: number): number {
    return [...n.toString(2)].filter(x => x === '1').length;
  }

  for (const [id, {sdef, swrd, hits, satk, dgld, sexp}] of SCALED_MONSTERS) {
    // indicate that this object needs scaling
    const o = rom.objects[id].data;
    const tetrarch = TETRARCHS.has(id);
    const draygon = DRAYGON.has(id);
    const robot = ROBOTS.has(id);
    const changeNumber =
      draygon ? config.enemies.allowDraygonImmunity :
      robot ? config.enemies.allowRobotImmunity :
      config.enemies.enemyWeaknesses === Config.Randomization.RANDOM;
    const changeWeaknesses =
      tetrarch ? config.enemies.tetrarchWeaknesses !== Config.Randomization.VANILLA :
      SLIMES.has(id) && config.enemies.enemyWeaknesses !== Config.Randomization.VANILLA;
      
    o[2] |= 0x80; // recoil
    o[6] = hits; // HP
    o[7] = satk;  // ATK
    // Sword: 0..3 (wind - thunder) preserved, 4 (crystalis) => 7
    o[8] = sdef | swrd << 4; // DEF
    // NOTE: long ago we stored whether this was a boss in the lowest
    // bit of the now-unused LEVEL. so that we could increase scaling
    // on killing them, but now that scaling is tied to items, that's
    // no longer needed - we could co-opt this to instead store upper
    // bits of HP (or possibly lower bits so that HP-based effects
    // still work correctly).
    // o[9] = o[9] & 0xe0;
    o[16] = o[16] & 0x0f | dgld << 4; // GLD
    o[17] = sexp; // EXP

    if (changeWeaknesses) {
      let weakness: number;
      if (tetrarch) {
        // not changing number
        weakness = tetrarchWeaknesses?.pop() ?? 1 << random.nextInt(4);
      } else {
        const count = changeNumber ? weaknessCounts.pop() :
          countBits(rom.objects[id].elements);
        weakness = pickWeaknesses(count);
      }
      rom.objects[id].elements = weakness;
    }
  }

  // handle slimes all at once
  if (config.enemies.enemyWeaknesses !== Config.Randomization.VANILLA) {
    // pick an element for slime defense
    const e = random.nextInt(4);
    for (const id of SLIMES) {
      rom.objects[id].elements = 1 << e;
    }
  }

  // rom.writeObjectData();
}

interface MonsterData {
  id: number;
  type: string;
  name: string;
  sdef: number;
  swrd: number;
  hits: number;
  satk: number;
  dgld: number;
  sexp: number;
}

// TODO - fold this into objects.ts

/* tslint:disable:trailing-comma whitespace */
export const SCALED_MONSTERS: Map<number, MonsterData> = new Map([
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0x3f, 'p', 'Sorceror shot',              ,   ,   ,    19,  ,    ,],
  [0x4b, 'm', 'wraith??',                   2,  ,   2,   22,  4,   61],
  [0x4f, 'm', 'wraith',                     1,  ,   2,   20,  4,   61],
  [0x50, 'm', 'Blue Slime',                 ,   ,   1,   16,  2,   32],
  [0x51, 'm', 'Weretiger',                  ,   ,   1,   21,  4,   40],
  [0x52, 'm', 'Green Jelly',                4,  ,   3,   16,  4,   36],
  [0x53, 'm', 'Red Slime',                  6,  ,   4,   16,  4,   48],
  [0x54, 'm', 'Rock Golem',                 6,  ,   11,  24,  6,   85],
  [0x55, 'm', 'Blue Bat',                   ,   ,   ,    4,   ,    32],
  [0x56, 'm', 'Green Wyvern',               4,  ,   4,   24,  6,   52],
  [0x57, 'b', 'Vampire',                    3,  ,   12,  18,  ,    110],
  [0x58, 'm', 'Orc',                        3,  ,   4,   21,  4,   57],
  [0x59, 'm', 'Red Flying Swamp Insect',    3,  ,   1,   21,  4,   57],
  [0x5a, 'm', 'Blue Mushroom',              2,  ,   1,   21,  4,   44],
  [0x5b, 'm', 'Swamp Tomato',               3,  ,   2,   35,  4,   52],
  [0x5c, 'm', 'Flying Meadow Insect',       3,  ,   3,   23,  4,   81],
  [0x5d, 'm', 'Swamp Plant',                ,   ,   ,    ,    ,    36],
  [0x5e, 'b', 'Insect',                     ,   1,  8,   6,   ,    100],
  [0x5f, 'm', 'Large Blue Slime',           5,  ,   3,   20,  4,   52],
  [0x60, 'm', 'Ice Zombie',                 5,  ,   7,   14,  4,   57],
  [0x61, 'm', 'Green Living Rock',          ,   ,   1,   9,   4,   28],
  [0x62, 'm', 'Green Spider',               4,  ,   4,   22,  4,   44],
  [0x63, 'm', 'Red/Purple Wyvern',          3,  ,   4,   30,  4,   65],
  [0x64, 'm', 'Draygonia Soldier',          6,  ,   11,  36,  4,   89],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0x65, 'm', 'Ice Entity',                 3,  ,   2,   24,  4,   52],
  [0x66, 'm', 'Red Living Rock',            ,   ,   1,   13,  4,   40],
  [0x67, 'm', 'Ice Golem',                  7,  2,  11,  28,  4,   81],
  [0x68, 'b', 'Kelbesque',                  4,  6,  12,  29,  ,    120],
  [0x69, 'm', 'Giant Red Slime',            7,  ,   40,  90,  4,   102],
  [0x6a, 'm', 'Troll',                      2,  ,   3,   24,  4,   65],
  [0x6b, 'm', 'Red Jelly',                  2,  ,   2,   14,  4,   44],
  [0x6c, 'm', 'Medusa',                     3,  ,   4,   36,  8,   77],
  [0x6d, 'm', 'Red Crab',                   2,  ,   1,   21,  4,   44],
  [0x6e, 'm', 'Medusa Head',                ,   ,   1,   29,  4,   36],
  [0x6f, 'm', 'Evil Bird',                  ,   ,   2,   30,  6,   65],
  [0x71, 'm', 'Red/Purple Mushroom',        3,  ,   5,   19,  6,   69],
  [0x72, 'm', 'Violet Earth Entity',        3,  ,   3,   18,  6,   61],
  [0x73, 'm', 'Mimic',                      ,   ,   3,   26,  15,  73],
  [0x74, 'm', 'Red Spider',                 3,  ,   4,   22,  6,   48],
  [0x75, 'm', 'Fishman',                    4,  ,   6,   19,  5,   61],
  [0x76, 'm', 'Jellyfish',                  ,   ,   3,   14,  3,   48],
  [0x77, 'm', 'Kraken',                     5,  ,   11,  25,  7,   73],
  [0x78, 'm', 'Dark Green Wyvern',          4,  ,   5,   21,  5,   61],
  [0x79, 'm', 'Sand Monster',               5,  ,   8,   6,   4,   57],
  [0x7b, 'm', 'Wraith Shadow 1',            ,   ,   ,    9,   7,   44],
  [0x7c, 'm', 'Killer Moth',                ,   ,   2,   35,  ,    77],
  [0x7d, 'b', 'Sabera',                     3,  7,  13,  24,  ,    110],
  [0x80, 'm', 'Draygonia Archer',           1,  ,   3,   20,  6,   61],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0x81, 'm', 'Evil Bomber Bird',           ,   ,   1,   19,  4,   65],
  [0x82, 'm', 'Lavaman/blob',               3,  ,   3,   24,  6,   85],
  [0x84, 'm', 'Lizardman (w/ flail(',       2,  ,   3,   30,  6,   81],
  [0x85, 'm', 'Giant Eye',                  3,  ,   5,   33,  4,   81],
  [0x86, 'm', 'Salamander',                 2,  ,   4,   29,  8,   77],
  [0x87, 'm', 'Sorceror',                   2,  ,   5,   31,  6,   65],
  [0x88, 'b', 'Mado',                       4,  8,  10,  30,  ,    110],
  [0x89, 'm', 'Draygonia Knight',           2,  ,   3,   24,  4,   77],
  [0x8a, 'm', 'Devil',                      ,   ,   1,   18,  4,   52],
  [0x8b, 'b', 'Kelbesque 2',                4,  6,  11,  27,  ,    110],
  [0x8c, 'm', 'Wraith Shadow 2',            ,   ,   ,    17,  4,   48],
  [0x90, 'b', 'Sabera 2',                   5,  7,  21,  27,  ,    120],
  [0x91, 'm', 'Tarantula',                  3,  ,   3,   21,  6,   73],
  [0x92, 'm', 'Skeleton',                   ,   ,   4,   30,  6,   69],
  [0x93, 'b', 'Mado 2',                     4,  8,  11,  25,  ,    120],
  [0x94, 'm', 'Purple Giant Eye',           4,  ,   10,  23,  6,   102],
  [0x95, 'm', 'Black Knight (w/ flail)',    3,  ,   7,   26,  6,   89],
  [0x96, 'm', 'Scorpion',                   3,  ,   5,   29,  2,   73],
  [0x97, 'b', 'Karmine',                    4,  ,   14,  26,  ,    110],
  [0x98, 'm', 'Sandman/blob',               3,  ,   5,   36,  6,   98],
  [0x99, 'm', 'Mummy',                      5,  ,   19,  36,  6,   110],
  [0x9a, 'm', 'Tomb Guardian',              7,  ,   60,  37,  6,   106],
  [0x9b, 'b', 'Draygon',                    5,  6,  16,  41,  ,    110],
  [0x9e, 'b', 'Draygon 2',                  7,  6,  28,  40,  ,    ,],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0xa0, 'm', 'Ground Sentry (1)',          4,  ,   6,   26,  ,    73],
  [0xa1, 'm', 'Tower Defense Mech (2)',     5,  ,   8,   36,  ,    85],
  [0xa2, 'm', 'Tower Sentinel',             ,   ,   1,   ,    ,    32],
  [0xa3, 'm', 'Air Sentry',                 3,  ,   2,   26,  ,    65],
  // [0xa4, 'b', 'Dyna',                       6,  5,  16,  ,    ,    ,],
  [0xa5, 'b', 'Vampire 2',                  3,  ,   12,  27,  ,    100],
  // [0xb4, 'b', 'dyna pod',                   15, ,   255, 26,  ,    ,],
  // [0xb8, 'p', 'dyna counter',               ,   ,   ,    26,  ,    ,],
  // [0xb9, 'p', 'dyna laser',                 ,   ,   ,    26,  ,    ,],
  // [0xba, 'p', 'dyna bubble',                ,   ,   ,    36,  ,    ,],
  [0xa4, 'b', 'Dyna',                       6,  5,  32,  ,    ,    ,],
  [0xb4, 'b', 'dyna pod',                   6,  5,  48,  26,  ,    ,],
  [0xb8, 'p', 'dyna counter',              15,  ,   ,    42,  ,    ,],
  [0xb9, 'p', 'dyna laser',                15,  ,   ,    42,  ,    ,],
  [0xba, 'p', 'dyna bubble',                ,   ,   ,    36,  ,    ,],
  //
  [0xbc, 'm', 'vamp2 bat',                  ,   ,   ,    16,  ,    15],
  [0xbf, 'p', 'draygon2 fireball',          ,   ,   ,    26,  ,    ,],
  [0xc1, 'm', 'vamp1 bat',                  ,   ,   ,    16,  ,    15],
  [0xc3, 'p', 'giant insect spit',          ,   ,   ,    35,  ,    ,],
  [0xc4, 'm', 'summoned insect',            4,  ,   2,   42,  ,    98],
  [0xc5, 'p', 'kelby1 rock',                ,   ,   ,    22,  ,    ,],
  [0xc6, 'p', 'sabera1 balls',              ,   ,   ,    19,  ,    ,],
  [0xc7, 'p', 'kelby2 fireballs',           ,   ,   ,    11,  ,    ,],
  [0xc8, 'p', 'sabera2 fire',               ,   ,   1,   6,   ,    ,],
  [0xc9, 'p', 'sabera2 balls',              ,   ,   ,    17,  ,    ,],
  [0xca, 'p', 'karmine balls',              ,   ,   ,    25,  ,    ,],
  [0xcb, 'p', 'sun/moon statue fireballs',  ,   ,   ,    39,  ,    ,],
  [0xcc, 'p', 'draygon1 lightning',         ,   ,   ,    37,  ,    ,],
  [0xcd, 'p', 'draygon2 laser',             ,   ,   ,    36,  ,    ,],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0xce, 'p', 'draygon2 breath',            ,   ,   ,    36,  ,    ,],
  [0xe0, 'p', 'evil bomber bird bomb',      ,   ,   ,    2,   ,    ,],
  [0xe2, 'p', 'summoned insect bomb',       ,   ,   ,    47,  ,    ,],
  [0xe3, 'p', 'paralysis beam',             ,   ,   ,    23,  ,    ,],
  [0xe4, 'p', 'stone gaze',                 ,   ,   ,    33,  ,    ,],
  [0xe5, 'p', 'rock golem rock',            ,   ,   ,    24,  ,    ,],
  [0xe6, 'p', 'curse beam',                 ,   ,   ,    10,  ,    ,],
  [0xe7, 'p', 'mp drain web',               ,   ,   ,    11,  ,    ,],
  [0xe8, 'p', 'fishman trident',            ,   ,   ,    15,  ,    ,],
  [0xe9, 'p', 'orc axe',                    ,   ,   ,    24,  ,    ,],
  [0xea, 'p', 'Swamp Pollen',               ,   ,   ,    37,  ,    ,],
  [0xeb, 'p', 'paralysis powder',           ,   ,   ,    17,  ,    ,],
  [0xec, 'p', 'draygonia solider sword',    ,   ,   ,    28,  ,    ,],
  [0xed, 'p', 'ice golem rock',             ,   ,   ,    20,  ,    ,],
  [0xee, 'p', 'troll axe',                  ,   ,   ,    27,  ,    ,],
  [0xef, 'p', 'kraken ink',                 ,   ,   ,    24,  ,    ,],
  [0xf0, 'p', 'draygonia archer arrow',     ,   ,   ,    12,  ,    ,],
  [0xf1, 'p', '??? unused',                 ,   ,   ,    16,  ,    ,],
  [0xf2, 'p', 'draygonia knight sword',     ,   ,   ,    9,   ,    ,],
  [0xf3, 'p', 'moth residue',               ,   ,   ,    19,  ,    ,],
  [0xf4, 'p', 'ground sentry laser',        ,   ,   ,    13,  ,    ,],
  [0xf5, 'p', 'tower defense mech laser',   ,   ,   ,    23,  ,    ,],
  [0xf6, 'p', 'tower sentinel laser',       ,   ,   ,    8,   ,    ,],
  [0xf7, 'p', 'skeleton shot',              ,   ,   ,    11,  ,    ,],
  // ID  TYPE  NAME                       SDEF SWRD HITS SATK DGLD SEXP
  [0xf8, 'p', 'lavaman shot',               ,   ,   ,    14,  ,    ,],
  [0xf9, 'p', 'black knight flail',         ,   ,   ,    18,  ,    ,],
  [0xfa, 'p', 'lizardman flail',            ,   ,   ,    21,  ,    ,],
  [0xfc, 'p', 'mado shuriken',              ,   ,   ,    36,  ,    ,],
  [0xfd, 'p', 'guardian statue missile',    ,   ,   ,    23,  ,    ,],
  [0xfe, 'p', 'demon wall fire',            ,   ,   ,    23,  ,    ,],
].map(([id, type, name, sdef=0, swrd=0, hits=0, satk=0, dgld=0, sexp=0]) =>
      [id, {id, type, name, sdef, swrd, hits, satk, dgld, sexp}])) as any;
/* tslint:enable:trailing-comma whitespace */
