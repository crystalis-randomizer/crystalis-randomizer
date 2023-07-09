import {FlagSet} from '../flagset';
import {Random} from '../random';
import {Rom} from '../rom';
import {Constraint} from '../rom/constraint';
import {Graphics} from '../rom/graphics';
import {Location} from '../rom/location';
import {Monster} from '../rom/monster';
import {SCALED_MONSTERS} from './rescalemonsters';

export function shuffleMonsters(rom: Rom, flags: FlagSet, random: Random) {
  // TODO: once we have location names, compile a spoiler of shuffled monsters
  const graphics = new Graphics(rom);
  // (window as any).graphics = graphics;
  if (flags.shuffleSpritePalettes()) graphics.shufflePalettes(random);
  const report = {};
  const pool = new MonsterPool(flags, report);
  for (const loc of rom.locations) {
    if (loc.used) pool.populate(loc);
  }
  pool.shuffle(random, graphics);
  // console.log(`report: ${JSON.stringify(report, null, 2)}`);
}

interface MonsterConstraint {
  id: number;
  pat: number;
  pal2: number | undefined;
  pal3: number | undefined;
  patBank: number | undefined;
}

// A pool of monster spawns, built up from the locations in the rom.
// Passes through the locations twice, first to build and then to
// reassign monsters.
class MonsterPool {

  // available monsters
  readonly monsters: MonsterConstraint[] = [];
  // used monsters - as a backup if no available monsters fit
  readonly used: MonsterConstraint[] = [];
  // all locations
  readonly locations: {location: Location, slots: number[]}[] = [];

  constructor(
      readonly flags: FlagSet,
      readonly report: {[loc: number]: string[], [key: string]: (string|number)[]}) {}

  // TODO - monsters w/ projectiles may have a specific bank they need to appear in,
  // since the projectile doesn't know where it came from...?
  //   - for now, just assume if it has a child then it must keep same pattern bank!

  populate(location: Location) {
    const {maxFlyers = 0,
           nonFlyers = {},
           skip = false,
           tower = false,
           fixedSlots = {},
           ...unexpected} = MONSTER_ADJUSTMENTS[location.id] || {};
    for (const u of Object.keys(unexpected)) {
      throw new Error(
          `Unexpected property '${u}' in MONSTER_ADJUSTMENTS[${location.id}]`);
    }
    const skipMonsters =
        (skip === true ||
            (!this.flags.shuffleTowerMonsters() && tower) ||
            !location.spritePatterns ||
            !location.spritePalettes);
    const monsters = [];
    let slots = [];
    // const constraints = {};
    // let treasureChest = false;
    let slot = 0x0c;
    for (const spawn of skipMonsters ? [] : location.spawns) {
      ++slot;
      if (!spawn.used || !spawn.isMonster()) continue;
      const id = spawn.monsterId;
      if (!SCALED_MONSTERS.has(id) ||
          SCALED_MONSTERS.get(id)!.type !== 'm') continue;
      const object = location.rom.objects[id];
      if (!(object instanceof Monster)) continue;
      const patBank = spawn.patternBank;
      const pat = location.spritePatterns[patBank];
      const pal = object.palettes(true);
      const pal2 = pal.includes(2) ? location.spritePalettes[0] : undefined;
      const pal3 = pal.includes(3) ? location.spritePalettes[1] : undefined;
      monsters.push({id, pat, pal2, pal3, patBank});
      (this.report[`start-${id.toString(16)}`] = this.report[`start-${id.toString(16)}`] || [])
          .push('$' + location.id.toString(16));
      slots.push(slot);
    }
    if (!monsters.length || skip) slots = [];
    this.locations.push({location, slots});
    this.monsters.push(...monsters);
  }

  shuffle(random: Random, graphics: Graphics) {
    const rom = graphics.rom;
    this.report['pre-shuffle locations'] = this.locations.map(l => l.location.id);
    this.report['pre-shuffle monsters'] = this.monsters.map(m => m.id);
    random.shuffle(this.locations);
    random.shuffle(this.monsters);
    this.report['post-shuffle locations'] = this.locations.map(l => l.location.id);
    this.report['post-shuffle monsters'] = this.monsters.map(m => m.id);
    while (this.locations.length) {
      const {location, slots} = this.locations.pop()!;
      const report: string[] = this.report['$' + location.id.toString(16).padStart(2, '0')] = [];
      const {maxFlyers = 0, nonFlyers = {}, tower = false} =
            MONSTER_ADJUSTMENTS[location.id] || {};
      if (tower) continue;
      let flyers = maxFlyers; // count down...

      // Determine location constraints
      let constraint = Constraint.forLocation(location.id);
      if (location.bossId() != null) {
        // Note that bosses always leave chests.
        // TODO - it's possible this is out of order w.r.t. writing the boss?
        //    constraint = constraint.meet(Constraint.BOSS, true);
        // NOTE: this does not work for (e.g.) mado 1, where azteca requires
        // 53 which is not a compatible chest page.
      }
      for (const spawn of location.spawns) {
        if (spawn.isChest() && !spawn.isInvisible()) {
          // if (rom.slots[spawn.id] < 0x70) {
          //   constraint = constraint.meet(Constraint.TREASURE_CHEST, true);
          // } else {
          //   constraint = constraint.meet(Constraint.MIMIC, true);
          // }
        } else if (spawn.isNpc() || spawn.isBoss()) {
          const c = graphics.getNpcConstraint(location.id, spawn.id);
          constraint = constraint.meet(c, true);
          if (spawn.isNpc() && (spawn.id === 0x6b || spawn.id === 0x68)) {
            // sleeping kensu (6b) leaves behind a treasure chest
            constraint = constraint.meet(Constraint.KENSU_CHEST, true);
          }
        } else if (spawn.isMonster() &&
                   !(rom.objects[spawn.monsterId] instanceof Monster)) {
          const c = graphics.getMonsterConstraint(location.id, spawn.monsterId);
          constraint = constraint.meet(c, true);
        } else if (spawn.isShootingWall(location)) {
          constraint = constraint.meet(Constraint.SHOOTING_WALL, true);
        }
      }

      report.push(`Initial pass: ${constraint.fixed.map(s=>s.size<Infinity?'['+[...s].join(', ')+']':'all')}`);

      const classes = new Map<string, number>();
      const tryAddMonster = (m: MonsterConstraint) => {
        const monster = rom.objects[m.id] as Monster;
        if (monster.monsterClass) {
          const representative = classes.get(monster.monsterClass);
          if (representative != null && representative !== m.id) return false;
        }
        const flyer = FLYERS.has(m.id);
        const moth = MOTHS_AND_BATS.has(m.id);
        if (flyer) {
          // TODO - add a small probability of adding it anyway, maybe
          // based on the map area?  25 seems a good threshold.
          if (!flyers) return false;
          --flyers;
        }
        const c = graphics.getMonsterConstraint(location.id, m.id);
        let meet = constraint.tryMeet(c);
        if (!meet && constraint.pal2.size < Infinity && constraint.pal3.size < Infinity) {
          if (this.flags.shuffleSpritePalettes()) {
            meet = constraint.tryMeet(c, true);
          }
        }
        if (!meet) return false;

        // Figure out early if the monster is placeable.
        let pos: number | undefined;
        if (monsterPlacer) {
          const monster = rom.objects[m.id];
          if (!(monster instanceof Monster)) {
            throw new Error(`non-monster: ${monster}`);
          }
          pos = monsterPlacer(monster);
          if (pos == null) return false;
        }

        report.push(`  Adding ${m.id.toString(16)}: ${JSON.stringify(meet)}`);
        constraint = meet;

        // Pick the slot only after we know for sure that it will fit.
        if (monster.monsterClass) classes.set(monster.monsterClass, m.id)
        let eligible = 0;
        if (flyer || moth) {
          // look for a flyer slot if possible.
          for (let i = 0; i < slots.length; i++) {
            if (slots[i] in nonFlyers) {
              eligible = i;
              break;
            }
          }
        } else {
          // Prefer non-flyer slots, but adjust if we get a flyer.
          for (let i = 0; i < slots.length; i++) {
            if (slots[i] in nonFlyers) continue;
            eligible = i;
            break;
          }
        }
        (this.report[`mon-${m.id.toString(16)}`] = this.report[`mon-${m.id.toString(16)}`] || [])
            .push('$' + location.id.toString(16));
        const slot = slots[eligible];
        const spawn = location.spawns[slot - 0x0d];
        if (flyer) {
          // Spawn in a random location
          spawn.data[0] = 0xfd; // spawn.y = 0xfd0;
          spawn.data[1] = 0xff; // spawn.x = 0x7f0;
          // spawn.timed = true;
        } else if (monsterPlacer) { // pos == null returned false earlier
          spawn.screen = pos! >>> 8;
          spawn.tile = pos! & 0xff;
        } else if (slot in nonFlyers) {
          spawn.y += nonFlyers[slot][0] * 16;
          spawn.x += nonFlyers[slot][1] * 16;
        }
        spawn.monsterId = m.id;
        report.push(`    slot ${slot.toString(16)}: ${spawn}`);

        // TODO - anything else need splicing?

        slots.splice(eligible, 1);
        return true;
      };

      // For each location.... try to fill up the slots
      const monsterPlacer =
          location.monstersMoved || (slots.length && this.flags.randomizeMaps()) ?
              location.monsterPlacer(random) : null;

      if (flyers && slots.length) {
        // look for an eligible flyer in the first 40.  If it's there, add it first.
        for (let i = 0; i < Math.min(40, this.monsters.length); i++) {
          if (FLYERS.has(this.monsters[i].id)) {
            if (tryAddMonster(this.monsters[i])) {
              this.monsters.splice(i, 1);
            }
          }
          // random.shuffle(this.monsters);
        }

        // maybe added a single flyer, to make sure we don't run out.  Now just work normally

        // decide if we're going to add any flyers.

        // also consider allowing a single random flyer to be added out of band if
        // the size of the map exceeds 25?

        // probably don't add flyers to used?

      }

      // iterate over monsters until we find one that's allowed...
      // NOTE: fill the non-flyer slots first (except if we pick a flyer??)
      //   - may need to weight flyers slightly higher or fill them differently?
      //     otherwise we'll likely not get them when we're allowed...?
      //   - or just do the non-flyer *locations* first?
      // - or just fill up flyers until we run out... 100% chance of first flyer,
      //   50% chance of getting a second flyer if allowed...
      for (let i = 0; i < this.monsters.length; i++) {
        if (!slots.length) break;
        if (tryAddMonster(this.monsters[i])) {
          const [used] = this.monsters.splice(i, 1);
          if (!FLYERS.has(used.id)) this.used.push(used);
          i--;
        }
      }

      // backup list
      for (let i = 0; i < this.used.length; i++) {
        if (!slots.length) break;
        if (tryAddMonster(this.used[i])) {
          this.used.push(...this.used.splice(i, 1));
          i--;
        }
      }
      constraint.fix(location, random);

      if (slots.length) {
        // NOTE: This can happen if a bomber bird is on the same screen as a
        // treasure chest, since this locks in too much to fit anything else.
        console.error/*report.push*/(`Failed to fill location ${location.id.toString(16)} ${location.name}: ${slots.length} remaining`);
        for (const slot of slots) {
          const spawn = location.spawns[slot - 0x0d];
          spawn.x = spawn.y = 0;
          spawn.id = 0xb0;
          spawn.data[0] = 0xfe; // indicate unused
        }
      }
      for (const spawn of location.spawns) {
        graphics.configure(location, spawn);
      }
    }
  }
}

const FLYERS: Set<number> = new Set([0x59, 0x5c, 0x6e, 0x6f, 0x81, 0x8a, 0xa3, 0xc4]);
const MOTHS_AND_BATS: Set<number> = new Set([0x55, /* swamp plant */ 0x5d, 0x7c, 0xbc, 0xc1]);
// const SWIMMERS: Set<number> = new Set([0x75, 0x76]);
// const STATIONARY: Set<number> = new Set([0x77, 0x87]);  // kraken, sorceror

interface MonsterAdjustment {
  maxFlyers?: number;
  skip?: boolean;
  tower?: boolean;
  fixedSlots?: {pat0?: number, pat1?: number, pal2?: number, pal3?: number};
  nonFlyers?: {[id: number]: [number, number]};
}
const MONSTER_ADJUSTMENTS: {[loc: number]: MonsterAdjustment} = {
  [0x03]: { // Valley of Wind
    fixedSlots: {
      pat1: 0x60, // required by windmill
    },
    maxFlyers: 2,
  },
  [0x07]: { // Sealed Cave 4
    nonFlyers: {
      [0x0f]: [0, -3],  // bat
      [0x10]: [-10, 0], // bat
      [0x11]: [0, 4],   // bat
    },
  },
  [0x14]: { // Cordel West
    maxFlyers: 2,
  },
  [0x15]: { // Cordel East
    maxFlyers: 2,
  },
  [0x1a]: { // Swamp
    // skip: 'add',
    fixedSlots: {
      pal3: 0x23,
      pat1: 0x4f,
    },
    maxFlyers: 2,
    nonFlyers: { // TODO - might be nice to keep puffs working?
      [0x10]: [4, 0],
      [0x11]: [5, 0],
      [0x12]: [4, 0],
      [0x13]: [5, 0],
      [0x14]: [4, 0],
      [0x15]: [4, 0],
    },
  },
  [0x1b]: { // Amazones
    // Random blue slime should be ignored
    skip: true,
  },
  [0x20]: { // Mt Sabre West Lower
    maxFlyers: 1,
  },
  [0x21]: { // Mt Sabre West Upper
    fixedSlots: {
      pat1: 0x50,
      // pal2: 0x06, // might be fine to change tornel's color...
    },
    maxFlyers: 1,
  },
  [0x27]: { // Mt Sabre West Cave 7
    nonFlyers: {
      [0x0d]: [0, 0x10], // random enemy stuck in wall
    },
  },
  [0x28]: { // Mt Sabre North Main
    maxFlyers: 1,
  },
  [0x29]: { // Mt Sabre North Middle
    maxFlyers: 1,
  },
  [0x2b]: { // Mt Sabre North Cave 2
    nonFlyers: {
      [0x14]: [0x20, -8], // bat
    },
  },
  [0x40]: { // Waterfall Valley North
    maxFlyers: 2,
    nonFlyers: {
      [0x13]: [12, -0x10], // medusa head
    },
  },
  [0x41]: { // Waterfall Valley South
    maxFlyers: 2,
    nonFlyers: {
      [0x15]: [0, -6], // medusa head
    },
  },
  [0x42]: { // Lime Tree Valley
    maxFlyers: 2,
    nonFlyers: {
      [0x0d]: [0, 8], // evil bird
      [0x0e]: [-8, 8], // evil bird
    },
  },
  [0x47]: { // Kirisa Meadow
    maxFlyers: 1,
    nonFlyers: {
      [0x0d]: [-8, -8],
    },
  },
  [0x4a]: { // Fog Lamp Cave 3
    maxFlyers: 1,
    nonFlyers: {
      [0x0e]: [4, 0],  // bat
      [0x0f]: [0, -3], // bat
      [0x10]: [0, 4],  // bat
    },
  },
  [0x4c]: { // Fog Lamp Cave 4
    // maxFlyers: 1,
  },
  [0x4d]: { // Fog Lamp Cave 5
    maxFlyers: 1,
  },
  [0x4e]: { // Fog Lamp Cave 6
    maxFlyers: 1,
  },
  [0x4f]: { // Fog Lamp Cave 7
    // maxFlyers: 1,
  },
  [0x57]: { // Waterfall Cave 4
    fixedSlots: {
      pat1: 0x4d,
    },
  },
  [0x59]: { // Tower Floor 1
    // skip: true,
    tower: true,
  },
  [0x5a]: { // Tower Floor 2
    // skip: true,
    tower: true,
  },
  [0x5b]: { // Tower Floor 3
    // skip: true,
    tower: true,
  },
  [0x60]: { // Angry Sea
    fixedSlots: {
      pal3: 0x08,
      pat1: 0x52, // (as opposed to pat0)
    },
    maxFlyers: 2,
    skip: true, // not sure how to randomize these well
  },
  [0x64]: { // Underground Channel
    fixedSlots: {
      pal3: 0x08,
      pat1: 0x52, // (as opposed to pat0)
    },
    skip: true,
  },
  [0x68]: { // Evil Spirit Island 1
    fixedSlots: {
      pal3: 0x08,
      pat1: 0x52, // (as opposed to pat0)
    },
    skip: true,
  },
  [0x69]: { // Evil Spirit Island 2
    maxFlyers: 1,
    nonFlyers: {
      [0x17]: [4, 6],  // medusa head
    },
  },
  [0x6a]: { // Evil Spirit Island 3
    maxFlyers: 1,
    nonFlyers: {
      [0x15]: [0, 0x18],  // medusa head
    },
  },
  [0x6c]: { // Sabera Palace 1
    maxFlyers: 1,
    nonFlyers: {
      [0x17]: [0, 0x18], // evil bird
    },
  },
  [0x6d]: { // Sabera Palace 2
    maxFlyers: 1,
    nonFlyers: {
      [0x11]: [0x10, 0], // moth
      [0x1b]: [0, 0],    // moth - ok already
      [0x1c]: [6, 0],    // moth
    },
  },
  [0x78]: { // Goa Valley
    maxFlyers: 1,
    nonFlyers: {
      [0x16]: [-8, -8], // evil bird
    },
  },
  [0x7c]: { // Mt Hydra
    maxFlyers: 1,
    nonFlyers: {
      [0x15]: [-0x27, 0x54], // evil bird
    },
  },
  [0x84]: { // Mt Hydra Cave 7
    nonFlyers: {
      [0x12]: [0, -4],
      [0x13]: [0, 4],
      [0x14]: [-6, 0],
      [0x15]: [14, 12],
    },
  },
  [0x88]: { // Styx 1
    maxFlyers: 1,
  },
  [0x89]: { // Styx 2
    maxFlyers: 1,
  },
  [0x8a]: { // Styx 1
    maxFlyers: 1,
    nonFlyers: {
      [0x0d]: [7, 0], // moth
      [0x0e]: [0, 0], // moth - ok
      [0x0f]: [7, 3], // moth
      [0x10]: [0, 6], // moth
      [0x11]: [11, -0x10], // moth
    },
  },
  [0x8f]: { // Goa Fortress - Oasis Cave Entrance
    skip: true,
  },
  [0x90]: { // Desert 1
    maxFlyers: 2,
    nonFlyers: {
      [0x14]: [-0xb, -3], // bomber bird
      [0x15]: [0, 0x10],  // bomber bird
    },
  },
  [0x91]: { // Oasis Cave
    maxFlyers: 2,
    nonFlyers: {
      [0x18]: [0, 14],    // insect
      [0x19]: [4, -0x10], // insect
    },
  },
  [0x98]: { // Desert 2
    maxFlyers: 2,
    nonFlyers: {
      [0x14]: [-6, 6],    // devil
      [0x15]: [0, -0x10], // devil
    },
  },
  [0x9e]: { // Pyramid Front - Main
    maxFlyers: 2,
  },
  [0xa2]: { // Pyramid Back - Branch
    maxFlyers: 1,
    nonFlyers: {
      [0x12]: [0, 11], // moth
      [0x13]: [6, 0],  // moth
    },
  },
  [0xa5]: { // Pyramid Back - Hall 2
    nonFlyers: {
      [0x17]: [6, 6],   // moth
      [0x18]: [-6, 0],  // moth
      [0x19]: [-1, -7], // moth
    },
  },
  [0xa6]: { // Draygon 2
    // Has a few blue slimes that aren't real and should be ignored.
    skip: true,
  },
  [0xa8]: { // Goa Fortress - Entrance
    skip: true,
  },
  [0xa9]: { // Goa Fortress - Kelbesque
    maxFlyers: 2,
    nonFlyers: {
      [0x16]: [0x1a, -0x10], // devil
      [0x17]: [0, 0x20],     // devil
    },
  },
  [0xab]: { // Goa Fortress - Sabera
    maxFlyers: 2,
    nonFlyers: {
      [0x0d]: [1, 0],  // insect
      [0x0e]: [2, -2], // insect
    },
  },

  [0xad]: { // Goa Fortress - Mado 1
    maxFlyers: 2,
    nonFlyers: {
      [0x18]: [0, 8],  // devil
      [0x19]: [0, -8], // devil
    },
  },
  [0xaf]: { // Goa Fortress - Mado 3
    nonFlyers: {
      [0x0d]: [0, 0],  // moth - ok
      [0x0e]: [0, 0],  // broken - but replace?
      [0x13]: [0x3b, -0x26], // shadow - embedded in wall
      // TODO - 0x0e glitched, don't randomize
    },
  },
  [0xb4]: { // Goa Fortress - Karmine 5
    maxFlyers: 2,
    nonFlyers: {
      [0x11]: [6, 0],  // moth
      [0x12]: [0, 6],  // moth
    },
  },
  [0xd7]: { // Portoa Palace - Entry
    // There's a random slime in this room that would cause glitches
    skip: true,
  },
};
