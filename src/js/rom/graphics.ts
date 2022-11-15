import { Rom } from '../rom';
import { DefaultMap } from '../util';
import { Location, Spawn } from './location';
import { Constraint } from './constraint';
import { Random } from '../random';
import { ObjectData } from './objectdata';

////////////////////////////////////////////////////////////////

// This actually appears to be more of a GraphicsConstraints class?
//   - maybe don't store the constraints on Monster?

export class Graphics {

  private monsterConstraints = new Map<number, Constraint>();
  private npcConstraints = new Map<number, Constraint>();

  allSpritePalettes = new Set<number>();

  constructor(readonly rom: Rom) {
    // Iterate over locations/spawns to build multimap of where monsters appear.
    // Postive keys are monsters, negative keys are NPCs.
    const allSpawns =
        new DefaultMap<number, Array<readonly [Location, number, Spawn]>>(
            () => []);

    for (const l of rom.locations) {
      if (!l.used) continue;
      for (let i = 0; i < l.spawns.length; i++) {
        const s = l.spawns[i];
        if (!s.used) continue;
        if (s.isMonster()) {
          allSpawns.get(s.monsterId).push([l, i, s]);
        } else if (s.isNpc() || s.isBoss()) {
          allSpawns.get(~s.id).push([l, i, s]);
        }
      }
    }
    // For each monster, determine which patterns and palettes are used.
    for (const [m, spawns] of allSpawns) {
      // TODO - fold into patch.shuffleMonsters
      //if (m === 0) continue; // used to suppress buggy stray spawns
      if (m < 0) { // NPC
        const npc = rom.npcs[~m];
        const metaspriteIds = [npc.data[3]];
        const metasprite = rom.metasprites[metaspriteIds[0]];
        if (!metasprite) throw new Error(`bad NPC: ${~m}`);
        // Hardcode exception for jumping man (action script $50)
        if (npc.data[2] === 0xd0) metaspriteIds.push(0xc0);
        // Compute constraint
        const offset = npc.data[2] < 0x80 ? npc.data[2] & 0x70 : 0;
        let constraint =
            this.computeConstraint(metaspriteIds, spawns, true, offset);
        // TODO - better way streamline this...? (tornel on sabre)
        if (~m === 0x5f) constraint = constraint.ignorePalette();
        this.npcConstraints.set(~m, constraint);
      } else { // monster
        let constraint = Constraint.ALL;
        const parent = this.rom.objects[m];
        for (const obj of allObjects(rom, parent)) {
          const action = rom.objectActions[obj.action];
          const metaspriteFn: (m: ObjectData) => readonly number[] =
              action?.data.metasprites || (() => [obj.metasprite]);
          const child = this.computeConstraint(metaspriteFn(obj), spawns,
                                               obj.id === m, obj.data[1]);
          const meet = constraint.meet(child);
          if (!meet) throw new Error(`Bad meet for ${m} with ${obj.id}`);
          if (meet) constraint = meet;
          // NOTE: if $380,x & #$02 then we draw a bonus sprite (e.g.
          // mosquito wings) from $580,x with no shift.
          if (obj.data[4] & 0x02) {
            const child2 = this.computeConstraint([obj.data[0x14]], spawns,
                                                  false, obj.data[1]);
            const meet2 = constraint.meet(child2);
            if (!meet2) throw new Error(`Bad meet for ${m} bonus ${obj.id}`);
            constraint = meet2;
          }
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

  getNpcConstraint(locationId: number, npcId: number): Constraint {
    const c = this.npcConstraints.get(npcId) || Constraint.NONE;
    if (locationId === 0x1e && npcId === 0x60) {
      // TODO: change this to actually look at the location's triggers?
      return c.meet(Constraint.STOM_FIGHT);
    } else if (locationId === 0xa0 && npcId === 0xc9) {
      return c.meet(Constraint.GUARDIAN_STATUE);
    }
    return c;
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
    const itemId = this.rom.slots[spawn.id];
    const c = spawn.isMonster() ? this.monsterConstraints.get(spawn.monsterId) :
        spawn.isNpc() ? this.npcConstraints.get(spawn.id) :
        spawn.isChest() ? (itemId < 0x70 ? Constraint.TREASURE_CHEST :
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
                    shiftable: boolean,
                    offset = 0): Constraint {
    const patterns = new Set<number>();
    const palettes = new Set<number>();
    for (const metasprite of metaspriteIds.map(s => this.rom.metasprites[s])) {
      // Which palette and pattern banks are referenced?
      for (const p of metasprite.palettes()) {
        palettes.add(p);
      }
      for (const p of metasprite.patternBanks(offset)) {
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

function* allObjects(rom: Rom, parent: ObjectData): Iterable<ObjectData> {
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
  if (parent.id === 0x50) yield rom.objects.largeBlueSlime;
  if (parent.id === 0x53) yield rom.objects.largeRedSlime;
}

type Spawns = ReadonlyArray<readonly [Location, number, Spawn]>;
