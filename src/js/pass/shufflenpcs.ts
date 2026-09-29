import {FlagSet} from '../flagset';
import {Graph} from '../logic/graph';
import {World} from '../logic/world';
import {Random} from '../random';
import {ModuleId, Rom} from '../rom';
import {Location, Spawn} from '../rom/location';
import {hex} from '../rom/util';
import {NpcGraphics, Placeholder} from './npcgraphics';

/** Spawn slots that must not move (location << 8 | spawn index). */
const FIXED_NPC_SLOTS = new Set<number>([
  // Slots acted on by triggers or location hooks.
  0x1e00, 0x1e01, // Stom House: Stom and Tornel (Stom fight trigger)
  0x7e00, 0x7e01, // Mt Hydra outside Shyron: moving guards
  0xf200,         // Shyron Temple: Azteca (Mado 1 replaces slot $0d)
  // Shyron Temple: Zebu, Tornel, Asina. Anyone here would stand in the
  // Mado 1 fight.
  0xf201, 0xf202, 0xf203,
  0x1c01,         // Oak: slot $0e becomes the child walking home
  // Hardcoded slots and fixed transformation pairs.
  0xba00, 0xba01, // Goa Fortress Kensu room (post-splice layout)
  0xf100, 0xf101, // Swan Dance Hall: disguised Kensu -> Kensu (love pendant)
  0xe100, 0xe101, // Asina Room: Queen -> Asina
  // Tavern keepers stay behind their counters, where only they can be
  // talked to across it.
  0xbf02,         // Goa tavern
  0xc603,         // Brynmaer tavern
  0xef03,         // Swan tavern
]);


/** NPC ids that never move, wherever they appear. */
const FIXED_NPC_IDS = new Set<number>([
  0x23, 0x26, 0x27, // Aryllis and attendants (dialog $15 walks slots $0d/$0e)
  0x25,             // Amazones guard (moving guard trigger, blocks the path)
  0x2d,             // Soldier guards at Swan Gate
  0x33,             // Portoa throne room back door guard (logic special case)
  0x34,             // Portoa palace front guard (moving guard trigger)
  0x38,             // Portoa queen (fixDialog reads her throne room dialog)
  0x39,             // Fortune teller (logic special case)
  0x61,             // Mesia recording
  0x63,             // Hurt dolphin (medical herb forces slot $0d)
  0x84, 0x8e,       // Sabera disguised as Mesia, Mesia
]);

/**
 * Transformation pairs that move as a unit, as [location, before index,
 * after index].  The "after" NPC is revealed in place by a flag and reload.
 */
const PAIRS: ReadonlyArray<readonly [number, number, number]> = [
  [0x0e, 0, 1], // Windmill Cave: sleeping guard -> windmill guard
  [0x55, 0, 2], // Waterfall Cave 2: stoned adventurers -> cured
  [0x55, 1, 3],
  [0x57, 0, 1], // Waterfall Cave 4: stoned Akahana -> Akahana
  [0x62, 0, 1], // Joel Lighthouse: sleeping Kensu -> Kensu
  [0xef, 0, 1], // Swan Tavern: disguised Kensu -> Kensu
  [0xba, 0, 1], // Goa Fortress Kensu room: slimed Kensu -> Kensu
  [0xe1, 0, 1], // Asina Room: Queen -> Asina
  [0xf1, 0, 1], // Swan Dance Hall: disguised Kensu -> Kensu
  // Shyron massacre: each villager dies where it stands.
  [0x7e, 0, 2], // Mt Hydra outside Shyron: guards
  [0x7e, 1, 3],
  [0x8c, 0, 5], // Shyron: Stom
  [0x8c, 1, 6], // Akahana
  [0x8c, 2, 7], // Stom's girlfriend
  [0x8c, 3, 8],
  [0x8c, 4, 9],
];

// flags that get cleared by something later
const CLEARABLE_FLAGS = [
  'LeafVillagersCurrentlyAbducted', // home villagers leave until rescued
  'QueenNotInThroneRoom', // the fortune teller clears it again
] as const;
const MAX_SPAWNS = 17;
const MAX_PLACEMENT_ATTEMPTS = 10;

interface Slot {
  location: Location;
  index: number;
}

/** A movable unit: a single NPC, or a transformation pair. */
interface Unit {
  home: Slot;
  id: number;
  after?: {index: number, id: number};
}

/** Where an NPC id ends up, for re-keying its tables. */
export interface Placement {
  id: number;
  src: number; // location id
  dst: number; // location id
}

export function shuffleNpcs(rom: Rom, flags: FlagSet, random: Random) {
  if (!flags.shuffleNpcs()) return;
  detachLeafAbduction(rom);
  addMissingLocalDialogs(rom);
  const units: Unit[] = [];
  const fixed: Placement[] = [];
  const pairAfter = new Map<number, number>(); // loc<<8|before -> after index
  const pairAfterSlots = new Set<number>();
  for (const [loc, before, after] of PAIRS) {
    pairAfter.set(loc << 8 | before, after);
    pairAfterSlots.add(loc << 8 | after);
  }

  // 1. Collect slots.
  for (const location of rom.locations) {
    if (!location.used) continue;
    location.spawns.forEach((spawn, index) => {
      if (!spawn.used || !spawn.isNpc()) return;
      const key = location.id << 8 | index;
      if (pairAfterSlots.has(key)) return; // handled with its "before" slot
      const afterIndex = pairAfter.get(key);
      const afterSpawn =
          afterIndex != null ? location.spawns[afterIndex] : undefined;
      if (afterIndex != null && (!afterSpawn?.used || !afterSpawn.isNpc())) {
        throw new Error(`Bad NPC pair at ${hex(location.id)}:${afterIndex}`);
      }
      // A pair is pinned as a whole if either half can't move.
      if (isFixedNpc(rom, location, index, spawn) ||
          afterSpawn && isFixedNpc(rom, location, afterIndex!, afterSpawn)) {
        for (const s of afterSpawn ? [spawn, afterSpawn] : [spawn]) {
          fixed.push({id: s.id, src: location.id, dst: location.id});
        }
        return;
      }
      const unit: Unit = {home: {location, index}, id: spawn.id};
      if (afterSpawn) unit.after = {index: afterIndex!, id: afterSpawn.id};
      units.push(unit);
    });
  }
  for (const [loc, , after] of PAIRS) {
    // Every pair must have been collected, or pinned as a whole.
    const location = rom.locations[loc];
    const id = location.spawns[after].id;
    if (!units.some(u => u.home.location === location && u.after?.index === after) &&
        !fixed.some(p => p.src === loc && p.id === id)) {
      throw new Error(`NPC pair at ${hex(loc)}:${after} was not collected`);
    }
  }
  const graphics = new NpcGraphics(rom, units.map(({home, after}) => ({
    home: home.location,
    spawns: [home.location.spawns[home.index],
             ...(after ? [home.location.spawns[after.index]] : [])],
  })));
  const penalty = new Penalty(rom, units, fixed);

  const saved = saveState(rom, units, fixed);
  // If checks are unreachable before moving anything, then bail out.
  const initial = new Graph([new World(rom, flags).getLocationList()]);
  if (initial.unreachableSlots().length) {
    throw new Error(`Unreachable slots before NPC shuffle: ${
                    initial.unreachableSlots().map(hex).join(', ')}`);
  }
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const packing = graphics.pack(random, penalty);
    const assignment = packing.slotOf.map(k => units[k].home);
    const placed = place(rom, units, fixed, assignment);
    const graph = new Graph([new World(rom, flags).getLocationList()]);
    if (graph.unreachableSlots().length) {
      restoreState(saved);
      continue;
    }
    graphics.apply(packing, placed);
    const candidates = placeholderCandidates(rom, graphics, placed);
    for (const spawn of candidates[Placeholder.PENDING]) spawn.placeholder = true;
    for (const spawn of candidates[Placeholder.GONE]) spawn.gonePlaceholder = true;
    sortNegatedFirst(rom);
    exportTavernKensuOffset(rom, units, assignment, placed);
    if (rom.spoiler) {
      for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        const slot = assignment[i];
        if (sameSlot(slot, unit.home)) continue;
        rom.spoiler.addNpc(unit.id, npcName(rom, unit.id),
                           unit.home.location.name, slot.location.name);
      }
    }
    return;
  }
  throw new Error(`Could not place NPCs with all checks reachable`);
}

function place(rom: Rom, units: Unit[], fixed: Placement[],
               assignment: Slot[]): Spawn[][] {
  const placed: Spawn[][] = [];
  const placements: Placement[] = [...fixed];
  // Disable home "after" slots of pairs that moved away first, so that the
  // spawn count check below sees the final state.
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const slot = assignment[i];
    if (unit.after && !sameSlot(slot, unit.home)) {
      unit.home.location.spawns[unit.after.index].used = false;
    }
  }
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const slot = assignment[i];
    const spawn = slot.location.spawns[slot.index];
    spawn.id = unit.id;
    placed.push([spawn]);
    placements.push({id: unit.id, src: unit.home.location.id,
                     dst: slot.location.id});
    if (!unit.after) continue;
    placements.push({id: unit.after.id, src: unit.home.location.id,
                     dst: slot.location.id});
    let afterSpawn: Spawn;
    if (sameSlot(slot, unit.home)) {
      afterSpawn = slot.location.spawns[unit.after.index];
      afterSpawn.id = unit.after.id;
    } else {
      // Reveal the "after" NPC at the same coordinates as the "before" one.
      afterSpawn = Spawn.from([...spawn.data]);
      afterSpawn.id = unit.after.id;
      slot.location.spawns.push(afterSpawn);
      if (slot.location.spawns.length > MAX_SPAWNS) {
        throw new Error(`Too many spawns in ${slot.location.name}`);
      }
    }
    placed[i].push(afterSpawn);
  }

  // Re-key spawn conditions and local dialogs.
  rekeyTables(placements, id => tablesFor(rom, id));
  return placed;
}

interface SavedState {
  spawns: Array<[Location, number[][]]>;
  tables: Array<[Map<number, unknown>, Array<[number, unknown]>]>;
}

// Save/restore all the NPC stuff in case it fails
function saveState(rom: Rom, units: Unit[], fixed: Placement[]): SavedState {
  const locations = new Set(units.map(u => u.home.location));
  const tables = new Set<Map<number, unknown>>();
  const ids = [...units.flatMap(u => u.after ? [u.id, u.after.id] : [u.id]),
               ...fixed.map(p => p.id)];
  for (const id of ids) {
    for (const table of tablesFor(rom, id)) tables.add(table);
  }
  return {
    spawns: [...locations].map(l => [l, l.spawns.map(s => [...s.data])]),
    tables: [...tables].map(t => [t, [...t]]),
  };
}

function restoreState({spawns, tables}: SavedState) {
  for (const [location, data] of spawns) {
    location.spawns = data.map(d => Spawn.from([...d]));
  }
  for (const [table, entries] of tables) {
    table.clear();
    for (const [key, value] of entries) table.set(key, value);
  }
}

function isFixedNpc(rom: Rom, location: Location, index: number,
                  spawn: Spawn): boolean {
  if (spawn.timed) return true; // e.g. zombie town zombies
  if (FIXED_NPC_SLOTS.has(location.id << 8 | index)) return true;
  if (FIXED_NPC_IDS.has(spawn.id)) return true;
  // Action-script NPCs (e.g. the jumping man) keep their custom behavior home.
  if (rom.npcs[spawn.id].data[2] & 0x80) return true;
  // Some tiles come from the always-loaded banks below $80 (dead Stom),
  // which change if the NPC's bank bit does.
  if (NpcGraphics.drawsOutsideNpcBanks(rom, spawn.id, spawn)) return true;
  return false;
}

/**
 * Split up the leaf elder into two npcs since both version give an item.
 */
function detachLeafAbduction(rom: Rom) {
  const {flags, locations, npcs: {LeafElder, AbductedLeafElder}} = rom;
  const summit = locations.MtSabreNorth_SummitCave;
  AbductedLeafElder.used = true;
  AbductedLeafElder.data = [...LeafElder.data] as typeof LeafElder.data;
  AbductedLeafElder.globalDialogs = LeafElder.globalDialogs;
  AbductedLeafElder.spawnConditions =
      new Map([[summit.id, [flags.LeafAbduction.id]]]);
  AbductedLeafElder.localDialogs =
      new Map([[summit.id, LeafElder.localDialogs.get(summit.id)!]]);
  LeafElder.localDialogs.delete(summit.id);
  // An NPC with no condition for a location always spawns there.
  LeafElder.spawnConditions.clear();
  for (const spawn of summit.spawns) {
    if (spawn.used && spawn.isNpc() && spawn.id === LeafElder.id) {
      spawn.id = AbductedLeafElder.id;
    }
  }

  for (const cell of [locations.MtSabreNorth_LeftCell,
                      locations.MtSabreNorth_RightCell]) {
    for (const spawn of cell.spawns) {
      if (!spawn.used || !spawn.isNpc()) continue;
      rom.npcs[spawn.id].spawnConditions.set(
          cell.id, [~flags.LeafVillagersRescued.id, flags.LeafAbduction.id]);
    }
  }
}

function addMissingLocalDialogs(rom: Rom) {
  for (const location of rom.locations) {
    if (!location.used) continue;
    for (const spawn of location.spawns) {
      if (!spawn.used || !spawn.isNpc()) continue;
      const dialogs = rom.npcs[spawn.id].localDialogs;
      if (!dialogs.size || dialogs.has(-1) || dialogs.has(location.id)) continue;
      const [first] = dialogs.values();
      dialogs.set(location.id, first.map(d => d.clone()));
    }
  }
}

/** Find all NPCs that may draw a placeholder since they have a spawn rule */
function placeholderCandidates(
    rom: Rom, graphics: NpcGraphics, placed: ReadonlyArray<readonly Spawn[]>,
): Spawn[][] {
  const after = new Set(placed.flatMap(spawns => spawns.slice(1)));
  const before = new Set(placed.filter(spawns => spawns.length > 1).map(s => s[0]));
  for (const [loc, b, a] of PAIRS) {
    const spawns = rom.locations[loc].spawns;
    // A pair that moved away left its "after" slot unused.
    if (!spawns[a].used) continue;
    before.add(spawns[b]);
    after.add(spawns[a]);
  }
  const transient = new Set<number>(CLEARABLE_FLAGS.map(f => rom.flags[f].id));
  const pending: Spawn[] = [];
  const gone: Spawn[] = [];
  for (const id of graphics.scenes.keys()) {
    const location = rom.locations[id];
    location.spawns.forEach((spawn, index) => {
      if (!spawn.used || !spawn.isNpc() || spawn.timed) return;
      // The Oak child (slot $0e) is never shuffled, and CheckForDwarfChild
      // walks it home, so it can't be swapped for a placeholder either.
      if (location.id === 0x1c && index === 1) return;
      const flags = rom.npcs[spawn.id].spawnConditions.get(location.id) ?? [];
      const required = flags.filter(f => f >= 0);
      const negated = flags.filter(f => f < 0).map(f => ~f);
      if (!after.has(spawn) && required.length &&
          !required.some(f => transient.has(f))) {
        pending.push(spawn);
      }
      if (!before.has(spawn) && negated.length &&
          !negated.some(f => transient.has(f))) {
        gone.push(spawn);
      }
    });
  }
  return [pending, gone];
}

// We have to set the kensu tavern flag manually since its normally set with a trigger.
function exportTavernKensuOffset(rom: Rom, units: Unit[], assignment: Slot[],
                                 placed: ReadonlyArray<readonly Spawn[]>) {
  let offset = 1;
  const i = units.findIndex(u => u.home.location.id === 0xef &&
                                 u.home.index === 0);
  if (i >= 0) {
    const {location, index} = assignment[i];
    offset = location.spawns.indexOf(placed[i][1]) - index;
  }
  const a = rom.assembler();
  a.assign('TavernKensuSlotOffset', offset);
  a.export('TavernKensuSlotOffset');
  a.assign('KensuGoneFromTavernFlag', rom.flags.KensuGoneFromTavern.id);
  a.export('KensuGoneFromTavernFlag');
  rom.modules.set(TAVERN_KENSU_MODULE, a.module());
}
const TAVERN_KENSU_MODULE = ModuleId('tavern-kensu');

function sortNegatedFirst(rom: Rom) {
  for (const npc of rom.npcs) {
    for (const flags of npc.spawnConditions.values()) {
      flags.sort((a, b) => Number(a >= 0) - Number(b >= 0));
    }
  }
}

function sameSlot(a: Slot, b: Slot): boolean {
  return a.location === b.location && a.index === b.index;
}

function npcName(rom: Rom, id: number): string {
  return rom.npcs[id].name || `NPC $${hex(id)}`;
}

function tablesFor(rom: Rom, id: number): Map<number, unknown>[] {
  const npc = rom.npcs[id];
  const tables: Map<number, unknown>[] = [];
  if (npc.spawnConditions.size) tables.push(npc.spawnConditions);
  // Dialogs keyed only by -1 have no location table and apply everywhere.
  if (npc.localDialogs.size && !npc.localDialogs.has(-1)) {
    tables.push(npc.localDialogs);
  }
  return tables;
}

function entryKey(table: Map<number, unknown>, src: number): number {
  return table.has(src) ? src : -1;
}

class Penalty {
  private readonly unitTables: Map<number, unknown>[][];
  /** Table entries claimed by fixed NPCs, per location. */
  private readonly fixedClaims = new Map<Location, Map<Map<number, unknown>, number>>();
  private readonly room = new Map<Location, number>();

  constructor(rom: Rom, private readonly units: Unit[], fixed: Placement[]) {
    for (const {home: {location}} of units) {
      this.room.set(location, MAX_SPAWNS - location.spawns.length);
    }
    this.unitTables = units.map(u => {
      const ids = u.after ? [u.id, u.after.id] : [u.id];
      return ids.flatMap(id => tablesFor(rom, id));
    });
    for (const p of fixed) {
      const location = rom.locations[p.dst];
      let claims = this.fixedClaims.get(location);
      if (!claims) this.fixedClaims.set(location, claims = new Map());
      for (const table of tablesFor(rom, p.id)) {
        // Pinned slots always keep their own entry; conflicts here would be
        // a vanilla inconsistency, so just record the first.
        if (!claims.has(table)) claims.set(table, entryKey(table, p.src));
      }
    }
  }

  of(location: Location, slots: readonly number[], at: readonly number[]): number {
    let violations = 0;
    let appended = 0;
    const claims = new Map(this.fixedClaims.get(location));
    for (let k = 0; k < slots.length; k++) {
      const i = at[k];
      const unit = this.units[i];
      if (unit.after && i !== slots[k]) appended++;
      const src = unit.home.location.id;
      for (const table of this.unitTables[i]) {
        const key = entryKey(table, src);
        const prev = claims.get(table);
        if (prev != null && prev !== key) {
          violations++;
        } else {
          claims.set(table, key);
        }
      }
    }
    return violations + Math.max(0, appended - this.room.get(location)!);
  }
}

export function rekeyTables(
    placements: readonly Placement[],
    tablesFor: (id: number) => ReadonlyArray<Map<number, unknown>>) {
  const byTable = new Map<Map<number, unknown>, Placement[]>();
  for (const p of placements) {
    for (const table of tablesFor(p.id)) {
      let list = byTable.get(table);
      if (!list) byTable.set(table, list = []);
      list.push(p);
    }
  }
  for (const [table, ps] of byTable) {
    const dsts = new Set(ps.map(p => p.dst));
    const bySrc = new Map<number, number[]>();
    for (const p of ps) {
      let list = bySrc.get(p.src);
      if (!list) bySrc.set(p.src, list = []);
      list.push(p.dst);
    }
    const entries: Array<[number, unknown]> = [];
    const written = new Map<number, number>(); // dst -> src key
    for (const [key, value] of table) {
      const moved = bySrc.get(key);
      if (moved) {
        for (const dst of moved) {
          if (written.has(dst)) continue;
          written.set(dst, key);
          entries.push([dst, value]);
        }
      } else if (!dsts.has(key)) {
        written.set(key, key);
        entries.push([key, value]);
      }
    }
    // Sanity check: assign() guarantees no two entries claim one location.
    for (const p of ps) {
      const expected = table.has(p.src) ? p.src : undefined;
      if (written.get(p.dst) !== expected) {
        throw new Error(`Inconsistent re-key for NPC $${hex(p.id)} at ${
                        hex(p.dst)}`);
      }
    }
    table.clear();
    for (const [key, value] of entries) table.set(key, value);
  }
}
