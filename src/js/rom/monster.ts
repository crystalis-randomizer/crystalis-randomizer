import { ObjectData } from './objectdata';
import { Placement } from './objectaction';
import { hex } from './util';
import type { Objects } from './objects';

export interface MonsterData {
  id: number,
  scaling: number,
  difficulty?: number;
  class?: string;
  type?: 'boss' | 'projectile'; // or default: monster
  displayName?: string;
}

type DifficultyFactor = number & {__difficulty__: never};

export class Monster extends ObjectData {

  // /** Vanilla defense. If changing def before scaling, change vdef instead. */
  // vdef: number;
  // /** Vanilla health. If changing hp before scaling, change vhp instead. */
  // vhp: number;

  /** Target number of hits to kill monster. */
  hits: number;
  /** Target defense as a fraction of expected player attack. */
  sdef: number;
  /** Target attack as a fraction of expected player HP. */
  satk: number;

  /** Relative fraction of reward given as money. */
  wealth: number;

  /** Extra difficulty factor. */
  extraDifficulty: number;

  shiftPatterns?: Set<number>;
  usedPalettes?: readonly number[];
  usedPatterns?: readonly number[];

  type: 'monster' | 'boss' | 'projectile';
  monsterClass?: string;

  constructor(parent: Objects, data: MonsterData) {
    super(parent, data.id, data.displayName);

    // Make the scaling calculations here
    // First derive values corresponding to vanilla.

    // Expected vanilla player level comes from averaging (1) the expected
    // level from the manually-specified (equivalent) scaling level with
    // (2) the minimum level to damage (from the object data).  This may be
    // fractional.
    const scaling = data.scaling;
    const expectedLevel = (level(scaling) + this.level) / 2;
    const expectedAttack = expectedLevel + playerSword(scaling, this.elements);
    this.hits = (this.hp + 1) / (expectedAttack - this.def);
    this.sdef = this.def / expectedAttack;

    const expectedPlayerHP = Math.min(255, Math.max(16, 32 + expectedLevel * 16));
    this.satk =
        (this.atk - expectedPlayerDefense(scaling, this.attackType)) /
        expectedPlayerHP;
    this.extraDifficulty = data.difficulty || 0;
    this.monsterClass = data.class;

    // Compute vanilla scaled exp and gold.
    const vsExp = processExpReward(this.expReward) / baselineExp(scaling);
    const vsGld = VANILLA_GOLD_DROPS[this.goldDrop] / baselineGold(scaling);

    this.type = data.type || 'monster';
    this.wealth = vsGld && vsGld / (vsExp + vsGld);
  }

  isBoss(): boolean {
    return this.type === 'boss';
  }

  isProjectile(): boolean {
    return this.type === 'projectile';
  }

  isBird(): boolean {
    const a = this.rom.objectActions[this.action];
    return a?.data.bird || false;
  }

  isFlyer(): boolean {
    const a = this.rom.objectActions[this.action];
    return a?.data.bird || a?.data.moth || false;
  }

  placement(): Placement {
    return this.rom.objectActions[this.action]?.data.placement ?? 'normal';
  }

  clearance(): number {
    return this.rom.objectActions[this.action]?.data.large ? 6 : 3;
  }

  totalDifficulty(): number {
    return this.toughness() + this.attack() + this.statusDifficulty() +
        this.immunities() + this.movement();
  }

  collectDifficulty(f: (m: Monster) => number,
                    r: (a: number, b: number) => number): DifficultyFactor {
    let result = f(this);
    const child = this.spawnedChild();
    if (child instanceof Monster) {
      result = r(result, child.collectDifficulty(f, r));
    }
    const death = this.spawnedReplacement();
    if (death instanceof Monster) {
      result = r(result, death.collectDifficulty(f, r));
    }
    return result as DifficultyFactor;
  }

  /** Basic measure of how hard the enemy is to kill. */
  toughness(): DifficultyFactor {
    return this.collectDifficulty(
        m => lookup(m.hits, 0, [2, 1], [3, 2], [5, 3], [7, 4], [10, 5], [13, 6]),
        Math.max);
  }

  /** How hard the monster hits. */
  attack(): DifficultyFactor {
    // ignore ATK for projectiles with status
    return this.collectDifficulty(
        m => {
          if (m.attackType && m.statusEffect) return 0;
          return lookup(m.satk,
                        0, [.04, 1], [.08, 2], [.13, 3], [.18, 4], [.25, 5], [.33, 6]);
        }, Math.max);
  }

  addStatusEffects(set: Set<number>): void {
    // TODO - if we allow projectile poison or body paralysis, account for that.
    if (this.attackType && this.statusEffect) {
      set.add(this.statusEffect);
    } else if (!this.attackType && this.poison) {
      set.add(0);
    }
    const replacement = this.spawnedReplacement();
    if (replacement instanceof Monster) replacement.addStatusEffects(set);
    const child = this.spawnedChild();
    if (child instanceof Monster) child.addStatusEffects(set);
  }

  statusDifficulty(): DifficultyFactor {
    const set = new Set<number>();
    this.addStatusEffects(set);
    let result = 0;
    for (const status of set) {
      result += STATUS_DIFFICULTY[status];
    }
    return result as DifficultyFactor;
  }

  immunities(): DifficultyFactor {
    let count = 0;
    let elems = this.elements;
    while (elems) {
      if (elems & 1) count++;
      elems >>>= 1;
    }
    return (count && 1 << (count - 1)) as DifficultyFactor;
  }

  movement(): DifficultyFactor {
    return this.collectDifficulty(
        m => {
          const actionData = this.rom.objectActions[m.action];
          const child = m.spawnedChild();
          let result = m.extraDifficulty;
          if (actionData) {
            result += (actionData.data.movement || 0);
            if (actionData.data.large) result++;
            // NOTE: MothResidueSource has statusDifficulty but not statusEffect.
            if (child && !child.statusEffect) {
              result += (actionData.data.projectile || 0);
            }
          }

          // Shadows get +2, action $26 triggers this on metasprite $a7
          if (this.metasprite === 0xa7) result += 2;

          return result;
        }, (a, b) => a + b);
  }

  // Returns a number 0..6 or so
  totalReward(): number {
    return this.totalDifficulty() / 4;
  }

  /**
   * Returns a number from 0 to 15, representing DGLD/2, or 0 for no gold.
   */
  normalizedGold(): number {
    if (!this.wealth) return 0;
    // Average difficulty is 10, average wealth is 0.5 => 3 is average dgld.
    // Max difficulty of 25, with wealth of 1 => 15 dgld.
    const dgld = this.totalDifficulty() * this.wealth * 0.6;
    return Math.max(1, Math.min(15, Math.round(dgld)));
  }

  /** Returns a number from 0 to 255, representing SEXP/32. */
  normalizedExp(): number {
    if (this.wealth === 1) return 0;
    // Avg difficulty 10, wealth 0.5 => sexp 1.768
    // Slime difficulty 4, wealth 0.5 => sexp 1
    // Max difficulty 25, wealth 0 => sexp 6.888 => 220 / 32
    const sexp = 0.488 + this.totalDifficulty() * (1 - this.wealth) * 0.256;
    return Math.max(1, Math.min(255, Math.round(sexp * 32)));
  }

  // /** Configures a spawn based on the chosen banks for a location. */
  // configure(location: Location, spawn: Spawn) {
  //   if (!this.shiftPatterns) return;
  //   if (this.shiftPatterns.has(location.spritePalettes[0])) spawn.patternBank = 0;
  //   if (this.shiftPatterns.has(location.spritePalettes[1])) spawn.patternBank = 1;
  // }

  toString() {
    return `Monster $${hex(this.id)} ${this.name}`;
  }
}

function processExpReward(raw: number): number {
  return raw < 128 ? raw : (raw & 0x7f) << 4;
}

function baselineExp(scaling: number): number {
  return 2 ** (scaling / 5 - 1);
}

const STATUS_DIFFICULTY: number[] = [
  2, // 0 poison (handled special)
  1, // 1 paralysis
  3, // 2 stone
  2, // 3 mp drain
  4, // 4 curse
];

const VANILLA_GOLD_DROPS = [
    0,   1,   2,   4,   8,  16,  30,  50,
  100, 200, 400,  50, 100, 200, 400, 500,
];

function baselineGold(scaling: number): number {
  // To convert a scaling factor to DGLD, note that patched gold drops scale by
  // the golden ratio (1.618)...?
  return 2 ** (scaling / 7 - 1);
}

// Gold and Experience scaling:
//  - goal: base exp should be roughly 1 at 0 and 1000 around 40-48
//          variance within a difficulty level: factor of 8?
//          so if we want to start saturating around 44, then we
//          should shoot for a base of 256 at 45,
//          Maybe slow down the growth to 1/5, so that we're at 0.5 at 0?
//          base = 2^(s/5-1)
//          scale factor = 0..8 for various normal enemies, 16ish for bosses.
//  - goal: base gold should be 0.5 at 0 and 50 at 47 (in vanilla units).
//          base = 2^(s/7-1)
// This makes the average "wealth" (defined as sgld / (sexp + sgld)) to
// average roughly 0.5 at all difficulty levels.

// DEATH REPLACEMENTS...?



// Scaling formulas
function level(scaling: number): number {
  // TODO - not super useful...?
  // Seems like I actually want the level, not the scaling.
  // 7-off compressiom
  return scaling < 24 ? 1 + scaling / 3 : (scaling + 12) / 4;
}

/** Best sword owned by player at given (vanilla equivalent) scaling. */
function playerSword(scaling: number, elements: number = 0): number {
  const bestOwned = scaling < 10 ? 1 : scaling < 18 ? 2 : scaling < 38 ? 4 : 8;
  for (let i = bestOwned; i; i >>>= 1) {
    if (!(i & elements)) return i << 1;
  }
  return bestOwned << 1;
}

/** Expected total defense. */
function expectedPlayerDefense(scaling: number, attackType: number): number {
  return level(scaling) + playerArmor(scaling, attackType);
}

/** Expected armor/shield defense at given scaling. */
function playerArmor(scaling: number, attackType: number): number {
  if (!attackType) { // body damage
    return lookup(scaling, 2, [6, 6], [18, 10], [25, 14], [30, 18], [40, 24], [46, 32]);
  } else { // projectile damage
    return lookup(scaling, 2, [6, 6], [18, 8], [25, 12], [30, 18], [37, 24], [42, 32]);
  }
}

function lookup<K extends Comparable, V>(x: K,
                                         first: V,
                                         ...table: ReadonlyArray<readonly [K, V]>): V {
  for (let i = table.length - 1; i >= 0; i--) {
    const [k, v] = table[i];
    if (x >= k) return v;
  }
  return first;
}

type Comparable = number | string;
