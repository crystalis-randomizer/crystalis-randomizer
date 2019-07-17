import {Constraint} from './constraint.js';
import {ObjectData} from './objectdata.js';
import {Rom} from '../rom.js';

export type MonsterData = [string, number, number, Adjustments?];

interface Adjustments {
  difficulty?: number;
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

  constraint: Constraint = Constraint.ALL;
  shiftPatterns?: Set<number>;
  usedPalettes?: readonly number[];
  usedPatterns?: readonly number[];

  constructor(rom: Rom, [name, id, scaling, adjustments = {}]: MonsterData) {
    super(rom, id);
    this.name = name;

    // Make the scaling calculations here
    // First derive values corresponding to vanilla.

    // Expected vanilla player level comes from averaging (1) the expected
    // level from the manually-specified (equivalent) scaling level with
    // (2) the minimum level to damage (from the object data).  This may be
    // fractional.
    const expectedLevel = (level(scaling) + this.level) / 2;
    const expectedAttack = expectedLevel + playerSword(scaling, this.elements);
    this.hits = (this.hp + 1) / (expectedAttack - this.def);
    this.sdef = this.def / expectedAttack;

    const expectedPlayerHP = Math.min(255, Math.max(16, 32 + expectedLevel * 16));
    this.satk = (this.atk - expectedPlayerDefense(scaling, this.attackType)) / expectedPlayerHP;
    this.extraDifficulty = adjustments.difficulty || 0;

    // Compute vanilla scaled exp and gold.
    const vsExp = processExpReward(this.expReward) / baselineExp(scaling);
    const vsGld = VANILLA_GOLD_DROPS[this.goldDrop] / baselineGold(scaling);

    this.wealth = vsGld && vsGld / (vsExp + vsGld);
  }

  totalDifficulty(): number {
    return this.toughness() + this.attack() + this.statusDifficulty() +
        this.immunities() + this.movement();
  }

  collectDifficulty(f: (m: Monster) => number,
                    r: (a: number, b: number) => number): DifficultyFactor {
    let result = f(this);
    const child = this.spawnedChild();
    if (child) result = r(result, child.collectDifficulty(f, r));
    const death = this.spawnedReplacement();
    if (death) result = r(result, death.collectDifficulty(f, r));
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
    if (replacement) replacement.addStatusEffects(set);
    const child = this.spawnedChild();
    if (child) child.addStatusEffects(set);
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
          const actionData = ACTION_SCRIPTS.get(m.action);
          const child = m.spawnedChild();
          let result = m.extraDifficulty;
          if (actionData) {
            result += (actionData.movement || 0);
            if (actionData.large) result++;
            // NOTE: MothResidueSource has statusDifficulty but not statusEffect.
            if (child && !child.statusEffect) result += (actionData.projectile || 0);
          }

          // Shadows get +2, action $26 triggers this on metasprite $a7
          if (this.metasprite === 0xa7) result += 2;

          return result;
        }, (a, b) => a + b);
  }

  spawnedChild(): Monster | undefined {
    const data = ACTION_SCRIPTS.get(this.action);
    if (!data || !data.child) return undefined;
    const spawn = this.rom.adHocSpawns[this.child];
    const spawnId = spawn && spawn.objectId;
    if (spawnId == null) return undefined;
    const obj = this.rom.objects[spawnId];
    return obj instanceof Monster ? obj : undefined;
  }

  spawnedReplacement(): Monster | undefined {
    if (!this.replacement) return undefined;
    const obj = this.rom.objects[this.replacement];
    return obj instanceof Monster ? obj : undefined;
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


interface ActionScriptData {
  child?: boolean;
  large?: boolean;
  bird?: boolean;
  moth?: boolean;
  stationary?: boolean;
  boss?: boolean;
  projectile?: number;
  movement?: number;
  metasprites?: (o: ObjectData) => readonly number[];
  // This is on top of any effect from satk, status, etc.
  // difficulty?: (o: Monster, c?: Monster) => DifficultyFactor;
  // flyer? stationary? large? required space?
}

// Set of action script IDs.
// We could possibly do better with a quick coverage analysis of the actual code.
// See what addresses are hit (and routines called) before the rts.
export const ACTION_SCRIPTS = new Map<number, ActionScriptData>([
  [0x10, { // straight shot (optional bounce)
  }],
  [0x11, { // straight shot
  }],
  [0x16, { // mado shuriken
  }],
  [0x17, { // demon wall fire
  }],
  [0x1b, { // draygon2 / karmine balls
  }],
  [0x1d, { // brown robot harpoon source (object $be)
    child: true,
  }],
  [0x1e, { // draygon2 lasers
  }],
  [0x1f, { // paralysis powder
  }],
  [0x20, { // blue slime, etc (random)
    movement: 1, // slow random
  }],
  [0x21, { // medusa, etc (random large stoners)
    child: true,
    large: true,
    movement: 2, // fast random
  }],
  [0x22, { // wraith, zombie (optional)
    child: true,
    movement: 3, // slow homing
  }],
  [0x24, { // weretiger, non-shooting wyverns (small homing)
    movement: 3, // slow homing
  }],
  [0x25, { // mushroom, anemones
    movement: 3, // slow homing
  }],
  [0x26, { // orc/wyvern/shadow  -> e9/10 =2  |  e3/11 =0 (status)
    child: true,
    projectile: 1, // only for non-status orc
    movement: 3, // slow homing
  }],
  [0x27, { // troll/spider/fishman/salamander/tarantula/mummy  ->
    child: true,
    projectile: 1,
    movement: 3, // slow homing
  }],
  [0x28, { // golem   -> e5/10 =3
    child: true,
    projectile: 2, // diagonal
    movement: 3, // slow homing
    metasprites: () => [0x65, 0x91],
  }],
  [0x29, { // lavaman
    child: true,
    // projectile does no damage
    movement: 5, // puddle
    metasprites: () => [0x6b, 0x68],
  }],
  [0x2a, { // soldier/archer/knight/brown robot
    child: true,
    projectile: 1,
    movement: 4, // fast homing
    metasprites: (o) => [0, 1, 2, 3].map(x => x + o.data[31]), // directional walker
  }],
  [0x2b, { // mimic
    movement: 4, // fast homing
  }],
  [0x2c, { // moth residue source (from 4d object replacement)
    child: true,
  }],
  [0x2e, { // flail guys
    child: true,
    large: true,
    projectile: 2,
    movement: 3, // slow homing
  }],
  [0x2f, { // dyna laser
  }],
  [0x34, { // guardian statue
    child: true,
  }],
  [0x38, { // moving platform
  }],
  [0x3c, { // crumbling moving platform
    // TODO - will need to copy the horizotal version's graphics?
  }],
  [0x40, { // bat, moth
    child: true,
    moth: true,
    // projectile: 2,
    movement: 4, // slow flyer
  }],
  [0x41, { // skeleton (mp drain web)
    child: true,
    movement: 3, // slow homing
  }],
  [0x44, { // swamp tomato
    movement: 3, // slow homing
  }],
  [0x45, { // insects (paralysis or shooting), bomber bird (optional shot)
    child: true,
    bird: true,
    projectile: 2,
    movement: 5, // fast flyer
  }],
  [0x4c, { // swamp plant -> ea/10 =5
    child: true,
    stationary: true,
    projectile: 3,
  }],
  [0x4d, { // kraken
    child: true,
    stationary: true,
    projectile: 3,
  }],
  [0x4e, { // burt
    child: true,
    stationary: true,
  }],
  [0x57, { // dyna shots
  }],
  [0x58, { // sabera2 fire
  }],
  [0x5c, { // tower sentinel
    child: true,
    projectile: 3,
    movement: 1,
  }],
  [0x5d, { // helicopter
    bird: true,
    movement: 6,
  }],
  [0x5e, { // white robot
    child: true,
    projectile: 1,
    movement: 4, // fast homing
    metasprites: (o) => [0, 1, 2, 3].map(x => x + o.data[31]), // directional walker
  }],
  [0x60, { // vampire
    boss: true,
  }],
  [0x61, { // vampire bat
  }],
  [0x63, { // kelbesque
    boss: true,
  }],
  [0x64, { // kelbesque1 rock
    boss: true,
  }],
  [0x66, { // sabera
    boss: true,
  }],
  [0x67, { // mado
    boss: true,
  }],
  [0x68, { // karmine
    boss: true,
  }],
  [0x6a, { // draygon1
    boss: true,
  }],
  [0x6b, { // draygon2
    boss: true,
  }],
  [0x70, { // dyna, flail
    boss: true,
  }],
  [0x7f, { // insect
    boss: true,
  }],
  // TODO - just hardcode boss difficulties?  fix them at max?
]);

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
