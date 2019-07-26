import {Rom} from '../rom.js';
import {DefaultMap} from '../util.js';
import {Location, Spawn} from './location.js';
import {ACTION_SCRIPTS, Monster} from './monster.js';
import {Constraint} from './constraint.js';
import {Random} from '../random.js';

////////////////////////////////////////////////////////////////

// This actually appears to be more of a GraphicsConstraints class?
//   - maybe don't store the constraints on Monster?

export class Graphics {

  monsterConstraints = new Map<number, Constraint>();
  npcConstraints = new Map<number, Constraint>();

  allSpritePalettes = new Set<number>();

  constructor(readonly rom: Rom) {
    // Iterate over locations/spawns to build multimap of where monsters appear.
    // Postive keys are monsters, negative keys are NPCs.
    const allSpawns =
        new DefaultMap<number, Array<readonly [Location, number, Spawn]>>(() => []);

    for (const l of rom.locations) {
      if (!l.used) continue;
      for (let i = 0; i < l.spawns.length; i++) {
        const s = l.spawns[i];
        if (!s.used) continue;
        if (s.isMonster()) {
          allSpawns.get(s.monsterId).push([l, i, s]);
        } else if (s.isNpc()) {
          allSpawns.get(~s.id).push([l, i, s]);
        }
      }
    }
    // For each monster, determine which patterns and palettes are used.
    for (const [m, spawns] of allSpawns) {
      // TODO - fold into patch.shuffleMonsters
      //if (m === 0) continue; // used to suppress buggy stray spawns
      if (m < 0) { // NPC
        const metasprite = rom.metasprites[rom.npcs[~m].data[3]];
        if (!metasprite) throw new Error(`bad NPC: ${~m}`);
        let constraint = this.computeConstraint([rom.npcs[~m].data[3]], spawns, true);
        // TODO - better way sreamline this...?
        if (~m === 0x5f) constraint = constraint.ignorePalette();
        this.npcConstraints.set(~m, constraint);
      } else { // monster
        let constraint = Constraint.ALL;
        const parent = this.rom.objects[m];
        if (!(parent instanceof Monster)) {
          throw new Error(`expected monster: ${parent} from ${spawns}`);
        }
        for (const obj of allObjects(rom, parent)) {
          const action = ACTION_SCRIPTS.get(obj.action);
          const metaspriteFn: (m: Monster) => readonly number[] =
              action && action.metasprites || (() => [obj.metasprite]);
          const child = this.computeConstraint(metaspriteFn(obj), spawns, obj.id === m);
          const meet = constraint.meet(child);
          if (!meet) throw new Error(`Bad meet for ${m} with ${obj.id}`);
          if (meet) constraint = meet;
          // TODO - else error? warn?
        }
        this.monsterConstraints.set(parent.id, constraint);
        parent.constraint = constraint;  // for debugging
      }
    }    
  }

  getMonsterConstraint(locationId: number, monsterId: number): Constraint {
    const c = this.monsterConstraints.get(monsterId) || Constraint.NONE;
    if ((locationId & 0x58) === 0x58) return c;
    const m = this.rom.objects[monsterId].goldDrop;
    if (!m) return c;
    return c.meet(Constraint.COIN) || Constraint.NONE;
  }

  shufflePalettes(random: Random): void {
    const pal = [...this.allSpritePalettes];
    for (const [k, c] of this.monsterConstraints) {
      this.monsterConstraints.set(k, c.shufflePalette(random, pal));
    }
    for (const [k, c] of this.npcConstraints) {
      this.npcConstraints.set(k, c.shufflePalette(random, pal));
    }
  }

  configure(location: Location, spawn: Spawn) {
    if (!spawn.used) return;
    const c = spawn.isMonster() ? this.monsterConstraints.get(spawn.monsterId) :
        spawn.isNpc() ? this.npcConstraints.get(spawn.id) :
        spawn.isChest() ? (spawn.id < 0x70 ? Constraint.TREASURE_CHEST :
                           Constraint.MIMIC) :
        undefined;
    if (!c) return;
    if (c.shift === 3 || c.float.length >= 2) {
      throw new Error(`don't know what to do with two floats`);
    } else if (!c.float.length) {
      spawn.patternBank = Number(c.shift === 2);
    } else if (c.float[0].has(location.spritePatterns[0])) {
      spawn.patternBank = 0;
    } else if (c.float[0].has(location.spritePatterns[1])) {
      spawn.patternBank = 1;
    } else if (spawn.isMonster()) {
      throw new Error(`no matching pattern bank`);
    }
  }

  computeConstraint(metaspriteIds: readonly number[],
                    spawns: Spawns,
                    shiftable: boolean): Constraint {

    const patterns = new Set<number>();
    const palettes = new Set<number>();
    for (const metasprite of metaspriteIds.map(s => this.rom.metasprites[s])) {
      // Which palette and pattern banks are referenced?
      for (const p of metasprite.palettes()) {
        palettes.add(p);
      }
      for (const p of metasprite.patternBanks()) {
        patterns.add(p);
      }
    }

    // obj.usedPalettes = [...palettes];
    // obj.usedPatterns = [...patterns];

    // If only third-bank patterns are used, then the metasprite can be
    // shifted to fourth bank when necessary.  This is only true for NPC
    // spawns.  Ad hoc spawns cannot be shifted (yet?).
    shiftable = shiftable && patterns.size == 1 && [...patterns][0] === 2;

    // If the spawn sets patternBank then we need to increment each pattern.
    // We have the freedom to set this to either, depending.
    const locs = new Map<number, Spawn>();
    for (const [l, , spawn] of spawns) {
      locs.set(spawn.patternBank && shiftable ? ~l.id : l.id, spawn);
    }

    // TODO - ConstraintBuilder
    //   -- keeps track only of relevant factors, in a join.
    //      --> no meeting involved!
    let child = undefined;

    for (let [l, spawn] of locs) {
      const loc = this.rom.locations[l < 0 ? ~l : l];
      for (const pal of palettes) {
        if (pal > 1) this.allSpritePalettes.add(loc.spritePalettes[pal - 2]);
      }
      const c = Constraint.fromSpawn(palettes, patterns, loc, spawn, shiftable);
      child = child ? child.join(c) : c;
      if (!shiftable && spawn.patternBank) child = child.shifted();

      // --- handle shifts better...? suppose e.g. multiple pal2's
      //    -> we want to join them - will have multiple shiftables...
      //constraint = constraint.
    }

    // If we're shiftable, save the set of possible shift banks
    if (!child) throw new Error(`Expected child to appear`);
    // if (child.float.length === 1) {
    //   parent.shiftPatterns = new Set(child.float[0]);
    // }
    return child;
  }
}

function* allObjects(rom: Rom, parent: Monster): Iterable<Monster> {
  yield parent;
  const repl = parent.spawnedReplacement();
  if (repl) yield* allObjects(rom, repl);
  const child = parent.spawnedChild();
  if (child) yield* allObjects(rom, child);
  // TODO - these don't make sense to put in spawnedReplacement because
  // we don't want to over-inflate red slimes due to giant red slimes'
  // difficulty, since most folks will never have to deal with that.
  // But we do need to make sure that they get "un-floated" since the
  // replacement spawn will not share the same 380:20 (for now).
  if (parent.id === 0x50) yield rom.objects[0x5f] as Monster; // blue slime
  if (parent.id === 0x53) yield rom.objects[0x69] as Monster; // red slime
}

type Spawns = ReadonlyArray<readonly [Location, number, Spawn]>;
