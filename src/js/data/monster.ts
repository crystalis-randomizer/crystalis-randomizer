import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {ObjectData} from '../rom/objectdata.js';

// Data about monsters.

// TODO - action script types
//      -> compatibility with other monsters
//         constraints on extra attributes
//         difficulty ratings

export type MonsterType = 'monster' | 'boss' | 'projectile';
export type Terrain = 'walk' | 'swim' | 'soar' | 'flutter' | 'stand';

export type Constraint = number[][];

export interface Monster {
  id: number;
  name: string;
  action: number;
  count: number;
  type?: MonsterType; // default is monster
  move?: Terrain; // default is walk
  sdef?: number;
  swrd?: number;
  hits?: number;
  satk?: number;
  dgld?: number;
  sexp?: number;
  elem?: number;
  spd?: number;
  status: number;
  persist?: boolean;
  must?: Constraint;
}

interface Adjustments {
  vanillaLevel?: number;
  vanillaSword?: number;
  sdef?: number;
  swrd?: number;
  hits?: number;
  satk?: number;
  dgld?: number;
  sexp?: number;
  elem?: number;
  spd?: number;
}

interface PlayerStats {
  armor: number;
  level: number;
  shield: number;
  sword: number;
}

const VANILLA_SWORDS = [2, 2, 2, 2, 4, 4, 4, 8, 8, 8, 8, 16, 16, 16, 16, 16];

const ACTION_DIFFICULTY: {[action: number]: (o: ObjectData) => number} = {
  // Small random
  0x20: () => 1,
  // Giant random (gazers)
  0x21: () => 3,
  // Wraith/zombie
  //  - maybe 2 + (speed / 2) + (isWraith ? 1 : 0)...?
  0x22: (o) => 3, // o.isWraith() ? 5 : 3,
  0x24: () => 3,
  0x25: () => 3,
  // TODO - maybe depends on shot type? stone/curse more dangerous?
  0x26: (o) => o.isShadow() ? 4 : 2,
  // NOTE: previously had 3 for most (orc/troll) but 1 for red spider
  0x27: () => 2,
  0x28: () => 3,
  0x29: () => 5,
};

const {} = {VANILLA_SWORDS, ACTION_DIFFICULTY} as any;

export function generate(rom: Rom, flags: FlagSet, random: Random): Monster[] {
  const {} = {rom, flags, random} as any;

  const out: Monster[] = [];

  const player: PlayerStats = {
    armor: 2,
    level: 1,
    shield: 2,
    sword: 2,
  };

  function base(id: number, name: string, adj: Adjustments = {}) {
    const o = rom.objects[id];
    let {action, immobile, level, atk, def, hp,
         elements, goldDrop, expReward, statusEffect} = o;

    // // What level should the player be at when encountering this in vanilla?
    // if (adj.vanillaLevel) level = adj.vanillaLevel;
    level = player.level;

    // What sword would they be using?  Pick the highest non-immune sword that
    // would be available at this point in the game.
    let sword = player.sword;
    while (sword > 1 && (elements & (sword >>> 1))) {
      sword >>>= 1;
    }
    if (adj.vanillaSword) sword = adj.vanillaSword;
    const patk = sword + level; // expected player attack

    // How many hits would it take to kill in vanilla? (consider no floor?)
    const vanillaHits = Math.floor((hp + 1) / (patk - def));
    const hits = adj.hits || vanillaHits;

    // Scaled defense (will be stored in eighths)
    const sdef = adj.sdef != null ? adj.sdef : def / patk; // normally *8

    // Expected player HP and defense at vanilla level
    const php = Math.min(255, 32 + 16 * level);
    const pdef = o.attackType ? player.shield : player.armor;
    const vanillaDamage = Math.max(0, atk - level - pdef) / php;
    const satk = adj.satk != null ? adj.satk : vanillaDamage; // normally *128

    // TODO - then compute gold/exp


    const {} = {sdef, satk, hits, immobile, goldDrop, expReward, statusEffect} as any;

    const m: Monster = {id, name} as any;

    m.id = id;
    m.name = name;
    m.type = 'monster';
    m.action = action;
    m.count = 0; // count;
    out.push(m);
  }

  function monster(...x: any[]): void {
    base(0, '');
  }

  // TODO - additional constraints about e.g. placement, etc?
  //      - no X on Y level...?
  monster(0x50, 'Blue Slime', 0x20, 6, {
    hits: 1, satk: 16, dgld: 2, sexp: 32,
    must: and(pat(0x64), pal(2, 0x21)),
  });
  monster(0x51, 'Weretiger', 0x24, 7, {
    hits: 1.5, satk: 21, dgld: 4, sexp: 40,
    must: and(pat(0x60), pal(3, 0x20)),
  });
  monster(0x52, 'Green Jelly', 0x20, 10, {
    sdef: 4, hits: 3, satk: 16, dgld: 4, sexp: 36,
    must: and(pat(0x65), pal(2, 0x22)),
  });
  monster(0x53, 'Red Slime', 0x20, 16, {
    sdef: 6, hits: 4, satk: 16, dgld: 4, sexp: 48,
    must: and(pat(0x64), pal(2, 0x23)),
  });
          
  return out;
}

function and(x: Constraint, y: Constraint): Constraint {
  return [];
}
function pat(id: number): Constraint {
  return [];
}
function pal(which: number, id: number): Constraint {
  return [];
}

const {} = {and, pat, pal} as any;
