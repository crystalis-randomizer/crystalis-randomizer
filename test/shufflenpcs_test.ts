import {describe, expect, it} from 'bun:test';
import {existsSync, readFileSync} from 'fs';
import {FlagSet} from '../src/js/flagset';
import {Graph} from '../src/js/logic/graph';
import {World} from '../src/js/logic/world';
import {compressMapData, moveScreensIntoExpandedRom} from '../src/js/pass/compressmapdata';
import {deterministic, deterministicPreParse} from '../src/js/pass/deterministic';
import {shyronMassacreBanks, spawnTiles} from '../src/js/pass/npcgraphics';
import {fixEntranceTriggers} from '../src/js/pass/fixentrancetriggers';
import {Placement, rekeyTables, shuffleNpcs} from '../src/js/pass/shufflenpcs';
import {standardMapEdits} from '../src/js/pass/standardmapedits';
import {toggleMaps} from '../src/js/pass/togglemaps';
import {writeLocationsFromMeta} from '../src/js/pass/writelocationsfrommeta';
import {expandRom, updateWallSpawnFormat} from '../src/js/patch';
import {Random} from '../src/js/random';
import {Rom} from '../src/js/rom';
import {Location, Spawn} from '../src/js/rom/location';
import {Patterns} from '../src/js/rom/pattern';
import {hex} from '../src/js/rom/util';
import {fixTilesets} from '../src/js/rom/screenfix';

describe('rekeyTables', function() {
  const rekey = (tables: Record<number, Map<number, unknown>[]>,
                 placements: Placement[]) =>
      rekeyTables(placements, id => tables[id] ?? []);

  it('should move an entry to the new location', function() {
    const t = new Map<number, unknown>([[0x10, 'a'], [0x20, 'b']]);
    rekey({1: [t]}, [{id: 1, src: 0x10, dst: 0x30},
                     {id: 1, src: 0x20, dst: 0x20}]);
    expect([...t]).toEqual([[0x30, 'a'], [0x20, 'b']]);
  });

  it('should copy an entry for an NPC that also stays home', function() {
    const t = new Map<number, unknown>([[0x10, 'a']]);
    rekey({1: [t]}, [{id: 1, src: 0x10, dst: 0x10},
                     {id: 1, src: 0x10, dst: 0x30}]);
    expect([...t]).toEqual([[0x10, 'a'], [0x30, 'a']]);
  });

  it('should drop a stale entry where an NPC without one lands', function() {
    // Entry 0x30 is not used by any spawn; an NPC with no entry at its home
    // lands there and must not pick up the stale block.
    const t = new Map<number, unknown>([[0x10, 'a'], [0x30, 'stale']]);
    rekey({1: [t]}, [{id: 1, src: 0x10, dst: 0x10},
                     {id: 1, src: 0x20, dst: 0x30}]);
    expect([...t]).toEqual([[0x10, 'a']]);
  });

  it('should keep unused entries that nothing lands on', function() {
    const t = new Map<number, unknown>([[0x10, 'a'], [0x40, 'unused']]);
    rekey({1: [t]}, [{id: 1, src: 0x10, dst: 0x20}]);
    expect([...t]).toEqual([[0x20, 'a'], [0x40, 'unused']]);
  });

  it('should treat linked NPCs as one table owner', function() {
    const shared = new Map<number, unknown>([[0x10, 'a'], [0x20, 'b']]);
    rekey({1: [shared], 2: [shared]},
          [{id: 1, src: 0x10, dst: 0x20}, {id: 2, src: 0x20, dst: 0x10}]);
    expect(new Map(shared)).toEqual(new Map([[0x20, 'a'], [0x10, 'b']]));
  });

  it('should throw if two different entries land together', function() {
    const t = new Map<number, unknown>([[0x10, 'a'], [0x20, 'b']]);
    expect(() => rekey({1: [t]}, [{id: 1, src: 0x10, dst: 0x30},
                                  {id: 1, src: 0x20, dst: 0x30}]))
        .toThrow();
  });
});

// Integration test against the real ROM, when available.
const ROM_PATH = 'Crystalis.nes';
describe.skipIf(!existsSync(ROM_PATH))('shuffleNpcs', function() {
  function prepare(seed: number) {
    const bytes = expandRom(new Uint8Array(readFileSync(ROM_PATH)));
    deterministicPreParse(bytes.subarray(0x10));
    const flags = new FlagSet('Wn');
    const rom = new Rom(bytes);
    rom.flags.defrag();
    compressMapData(rom);
    moveScreensIntoExpandedRom(rom);
    deterministic(rom, flags);
    fixTilesets(rom);
    standardMapEdits(rom, standardMapEdits.generateOptions(flags, new Random(1), undefined));
    toggleMaps(rom, flags, new Random(1));
    updateWallSpawnFormat(rom);
    fixEntranceTriggers(rom);
    writeLocationsFromMeta(rom);
    const before = snapshot(rom);
    const pixelsBefore = pixels(rom);
    shuffleNpcs(rom, flags, new Random(seed));
    return {rom, flags, before, after: snapshot(rom),
            pixelsBefore, pixelsAfter: pixels(rom)};
  }

  /** What each spawn draws: the index and pixels of each tile. */
  function drawn(rom: Rom, loc: Location, spawn: Spawn,
                 pats: readonly number[] = loc.spritePatterns): string {
    // Unloaded ($ff) banks are never drawn.
    return spawnTiles(rom, spawn).filter(p => pats[p >> 6 & 1] !== 0xff).map(p => {
      const bank = pats[p >> 6 & 1];
      const pixels = String(rom.patterns.get(bank << 6, p & 0x3f).pixels);
      return `${p & 0x3f}:${pixels}`;
    }).filter((x, i, a) => a.indexOf(x) === i).sort().join('|');
  }

  function pixels(rom: Rom) {
    const others = new Map<number, string>(); // loc<<8|index -> drawn
    const npcs = new Map<number, Set<string>>(); // npc id -> looks
    for (const loc of rom.locations) {
      if (!loc.used) continue;
      loc.spawns.forEach((s, i) => {
        if (!s.used || s.isTrigger() || s.isChest()) return;
        const banks: Array<readonly number[]> = [loc.spritePatterns];
        // Shyron draws from other banks after the massacre.
        if (loc.id === 0x8c) banks.push(shyronMassacreBanks(rom));
        banks.forEach((pats, post) => {
          const key = post << 16 | loc.id << 8 | i;
          if (!s.isNpc()) {
            others.set(key, drawn(rom, loc, s, pats));
            return;
          }
          // Shyron NPCs visible only before (after) the massacre only use
          // the pre- (post-) massacre banks.
          const visible = rom.npcs[s.id].spawnConditions.get(loc.id) ?? [];
          const flag = rom.flags.ShyronMassacre.id;
          if (loc.id === 0x8c && visible.includes(post ? ~flag : flag)) return;
          let set = npcs.get(s.id);
          if (!set) npcs.set(s.id, set = new Set());
          set.add(drawn(rom, loc, s, pats));
        });
      });
    }
    return {others, npcs};
  }

  function snapshot(rom: Rom): Map<number, number> {
    const out = new Map<number, number>(); // loc<<8|index -> npc id
    for (const loc of rom.locations) {
      if (!loc.used) continue;
      loc.spawns.forEach((s, i) => {
        if (s.used && s.isNpc()) out.set(loc.id << 8 | i, s.id);
      });
    }
    return out;
  }

  const quiet = <T>(f: () => T): T => {
    const log = console.log;
    console.log = () => {};
    try { return f(); } finally { console.log = log; }
  };

  for (const seed of [1, 2, 3, 4, 5]) {
    it(`should keep every check reachable (seed ${seed})`, function() {
      const {rom, flags, before, after, pixelsBefore: pb, pixelsAfter: pa} =
          quiet(() => prepare(seed));
      // Pinned slots keep their NPC, and every NPC is still placed.
      for (const slot of [0x1e00, 0x1e01, 0xd700, 0xe100, 0xe101, 0xba00,
                          0xbf02, 0xc603, 0xef03]) {
        expect(after.get(slot)).toBe(before.get(slot)!);
      }
      // The abducted elder is split off from the elder ($0d) as $73.
      const original = (id: number) => id === 0x73 ? 0x0d : id;
      expect([...new Set([...after.values()].map(original))].sort())
          .toEqual([...new Set(before.values())].sort());
      // Nothing else changes appearance, and every NPC looks like it did
      // somewhere before the shuffle.
      expect(pa.others).toEqual(pb.others);
      for (const [id, looks] of pa.npcs) {
        for (const look of looks) {
          expect([id, pb.npcs.get(original(id))!.has(look)]).toEqual([id, true]);
        }
      }
      // Every item slot has some path in the logic graph.
      const graph = quiet(() => new Graph([new World(rom, flags).getLocationList()]));
      expect(graph.unreachableSlots()).toEqual([]);
    });

    it(`should kill Shyron villagers where they stand (seed ${seed})`, function() {
      const {rom} = quiet(() => prepare(seed));
      // Dead body -> the villager it replaces after the massacre.
      const living = new Map([[0x72, [0x60]], [0x70, [0x16]], [0x71, [0x52]],
                              [0x5d, [0x50, 0x4f]], [0x76, [0x4e]]]);
      let bodies = 0;
      for (const loc of rom.locations) {
        if (!loc.used) continue;
        for (const s of loc.spawns) {
          if (!s.used || !s.isNpc() || !living.has(s.id)) continue;
          bodies++;
          // The pinned guards' bodies lie next to them.
          const partner = loc.spawns.find(t => t.used && t.isNpc() &&
                                               living.get(s.id)!.includes(t.id) &&
                                               (s.id === 0x76 || t.x === s.x && t.y === s.y));
          expect([loc.name, s.id, Boolean(partner)]).toEqual([loc.name, s.id, true]);
        }
      }
      expect(bodies).toBe(7);
    });

    it(`should detach the abduction from the prison (seed ${seed})`, function() {
      const {rom, after} = quiet(() => prepare(seed));
      const {LeafAbduction, LeafVillagersCurrentlyAbducted, LeafVillagersRescued} =
          rom.flags;
      const conditions = (id: number) => [...after]
          .filter(([, npc]) => npc === id)
          .map(([slot]) => rom.npcs[id].spawnConditions.get(slot >> 8) ?? [])
          .sort((a, b) => a.length - b.length);
      const home = [~LeafVillagersCurrentlyAbducted.id];
      const captive = [~LeafVillagersRescued.id, LeafAbduction.id];
      // The elder at home never leaves; the abducted one stays once he's come.
      expect(conditions(0x0d)).toEqual([[]]);
      expect(conditions(0x73)).toEqual([[LeafAbduction.id]]);
      // Villagers leave home while abducted, and appear as captives wherever
      // their cell spawn landed, as do the other prisoners.
      for (const id of [0x0e, 0x0f, 0x10, 0x11, 0x12]) {
        expect([hex(id), conditions(id)]).toEqual([hex(id), [home, captive]]);
      }
      for (const id of [0x2e, 0x2f, 0x30]) {
        expect([hex(id), conditions(id)]).toEqual([hex(id), [captive]]);
      }
    });

    it(`should give every NPC a dialog where it stands (seed ${seed})`, function() {
      const {rom, after} = quiet(() => prepare(seed));
      for (const [slot, id] of after) {
        const dialogs = rom.npcs[id].localDialogs;
        if (!dialogs.size || dialogs.has(-1)) continue;
        expect([hex(slot), hex(id), dialogs.has(slot >> 8)])
            .toEqual([hex(slot), hex(id), true]);
      }
    });

    it(`should only mark placeholders that can be drawn (seed ${seed})`, function() {
      const {rom} = quiet(() => prepare(seed));
      const tile = String(Patterns.NPC_PLACEHOLDER_CORNER);
      let marked = 0;
      for (const loc of rom.locations) {
        if (!loc.used) continue;
        for (const s of loc.spawns) {
          if (!s.used || !s.placeholder) continue;
          marked++;
          expect(s.isNpc()).toBe(true);
          // Negated flags come first, and some flag is required.
          const flags = rom.npcs[s.id].spawnConditions.get(loc.id) ?? [];
          const firstRequired = flags.findIndex(f => f >= 0);
          expect(firstRequired).toBeGreaterThanOrEqual(0);
          expect(flags.slice(firstRequired).every(f => f >= 0)).toBe(true);
          // The tile is at pattern $bf of every bank pair drawn here.
          const banks = [loc.spritePatterns[0],
                         ...(loc.id === 0x8c ? [shyronMassacreBanks(rom)[0]] : [])];
          for (const bank of banks) {
            expect(String(rom.patterns.get(bank << 6, 0x3f).pixels)).toBe(tile);
          }
          // Nothing that's always there stands on it.  (Timed spawns, like
          // Zombie Town's zombies, walk away from their spawn points.)
          const always = loc.spawns.filter(t => t !== s && t.used && t.isNpc() &&
              !t.timed && t.x === s.x && t.y === s.y &&
              !(rom.npcs[t.id].spawnConditions.get(loc.id) ?? []).some(f => f >= 0));
          expect([loc.name, s.id, always.map(t => t.id)]).toEqual([loc.name, s.id, []]);
        }
      }
      expect(marked).toBeGreaterThan(0);
    });

    it(`should only mark gone placeholders that can be drawn (seed ${seed})`, function() {
      const {rom} = quiet(() => prepare(seed));
      let marked = 0;
      for (const loc of rom.locations) {
        if (!loc.used) continue;
        for (const s of loc.spawns) {
          // Other spawn types use this bit for other things.
          if (!s.used || !s.isNpc() || !s.gonePlaceholder) continue;
          marked++;
          // Some flag is negated, and negated flags come first.
          const flags = rom.npcs[s.id].spawnConditions.get(loc.id) ?? [];
          const firstRequired = flags.findIndex(f => f >= 0);
          expect(flags[0]).toBeLessThan(0);
          if (firstRequired >= 0) {
            expect(flags.slice(firstRequired).every(f => f >= 0)).toBe(true);
          }
          // Nothing that stays once it has left stands on it.
          const after = loc.spawns.filter(t => t !== s && t.used && t.isNpc() &&
              !t.timed && t.x === s.x && t.y === s.y &&
              !(rom.npcs[t.id].spawnConditions.get(loc.id) ?? []).some(f => f < 0));
          expect([loc.name, s.id, after.map(t => t.id)]).toEqual([loc.name, s.id, []]);
        }
      }
      expect(marked).toBeGreaterThan(0);
    });
  }
});
