import {Random} from '../random';
import {ModuleId, Rom} from '../rom';
import {Location, Spawn} from '../rom/location';
import {Metasprite} from '../rom/metasprite';
import {ObjectData} from '../rom/objectdata';
import {Patterns} from '../rom/pattern';
import {hex} from '../rom/util';

export const SHYRON = 0x8c;
const MASSACRE_BANK = 0x51;

/** Actions that create a Poof effect for change after */
const POOF_ACTIONS = new Set([0x10, 0x13, 0x16]);
const POOF_OBJECT = 0xdf;
const POOF_METASPRITE = 0xa0;

/** Sprite tiles we have to leave in place cause other things use them */
const RUNTIME_SPRITES: ReadonlyArray<{
  location: number,
  objects?: readonly number[],
  /** Metasprites drawn in place of the NPC in the given spawn index. */
  npcMetasprites?: {index: number, ids: readonly number[]},
}> = [
  // Stom's sword in the duel.
  {location: 0x1e, objects: [0xfb]},
  // Mesia's recording (ItemOrTriggerActionJump_07).
  {location: 0x52, objects: [0xde], npcMetasprites: {index: 0, ids: [0xd2, 0x2e]}},
  // Mado 1 (ItemOrTriggerActionJump_1d).
  {location: 0xf2, objects: [0x88]},
];
/** using ivory statues plays the poof in the Goa Kensu room. */
const IVORY_STATUE_LOCATION = 0xba;

export enum Placeholder { PENDING, GONE }
const PLACEHOLDERS: ReadonlyArray<{metasprite: number, pattern: number,
                                   label: string}> = [
  // Extended metasprites 0..3 are the Crystalis sword.
  {metasprite: 4, pattern: 0xbf, label: 'NpcPlaceholderMetasprite'},
  {metasprite: 5, pattern: 0x40, label: 'NpcGonePlaceholderMetasprite'},
];
const PENDING_SLOT = 0;
const PENDING_INDEX = 0x3f;
const PLACEHOLDER_PALETTE = 1;

function placeholderSprites(pattern: number): Array<[number, number, number, number]> {
  return [
    [0xf8, 0xf0, 0x00 | PLACEHOLDER_PALETTE, pattern],
    [0x00, 0xf0, 0x40 | PLACEHOLDER_PALETTE, pattern], // flipped horizontally
    [0xf8, 0xf8, 0x80 | PLACEHOLDER_PALETTE, pattern], // vertically
    [0x00, 0xf8, 0xc0 | PLACEHOLDER_PALETTE, pattern], // both
  ];
}

type ShyronMassacrePhase = 'pre' | 'post' | 'both';

/** Tiles that are drawn for an NPC [slot of the pair, index in the bank, tile id]. */
type Cell = readonly [number, number, number];

/** NPC or somethign else that an NPC draws */
interface Draw {
  readonly phase: ShyronMassacrePhase;
  readonly options: ReadonlyArray<{bit: number, cells: readonly Cell[]}>;
}

/** The NPC at a location + whatever other NPC it brings along (such as a second version of the NPC
 * like pre shyron/ post shyron
 */
export interface NpcUnit {
  readonly home: Location;
  readonly spawns: readonly Spawn[];
}

// Any location that can spawn NPCs including pre/post shyron
interface Scene {
  readonly location: Location;
  readonly post: boolean;
  /** Original bank pair. */
  readonly pair: readonly [number, number];
  readonly needs: readonly [Map<number, number>, Map<number, number>];
}

type SceneCells = readonly [ReadonlyMap<number, number>, ReadonlyMap<number, number>];

export interface LocationPenalty {
  of(location: Location, slots: readonly number[], at: readonly number[]): number;
}

export interface Packing {
  /** Unit index -> index of the unit whose home slot it now occupies. */
  readonly slotOf: readonly number[];
  readonly bits: ReadonlyArray<readonly number[]>;
  /** Location id -> scenes cells (listed with pre-massacre first for Shyron). */
  readonly cells: ReadonlyMap<number, readonly SceneCells[]>;
}

interface Check {
  readonly cells: SceneCells[];
  /** [unit, draw index, bank bit] for each NPC placed there. */
  readonly bits: Array<readonly [number, number, number]>;
}

export class NpcGraphics {
  /** Distinct tile pixels, by tile id. */
  readonly pixels: number[][] = [];
  private readonly tileIds = new Map<string, number>();
  /** Per NpcUnit what it draws. */
  readonly draws: Draw[][];
  /** Location id -> scenes (pre-massacre first for Shyron). */
  readonly scenes = new Map<number, Scene[]>();

  constructor(private readonly rom: Rom,
              readonly units: readonly NpcUnit[]) {
    const movable = new Set(units.flatMap(u => u.spawns));

    // Every home location of a unit is a scene, since any unit may land there.
    for (const {home} of units) {
      if (this.scenes.has(home.id)) continue;
      const scenes = [this.scene(home, false)];
      if (home.id === SHYRON) scenes.push(this.scene(home, true));
      this.scenes.set(home.id, scenes);
    }

    this.draws = units.map(u => this.unitDraws(u));

    // Everything else a scene draws from its banks keeps its tiles.
    for (const [id] of this.scenes) {
      const location = rom.locations[id];
      location.spawns.forEach((spawn, index) => {
        if (!spawn.used || spawn.isTrigger() || spawn.isChest()) return;
        const drawn = new Set<number>();
        if (!movable.has(spawn)) {
          for (const p of spawnTiles(rom, spawn)) drawn.add(p);
          if (spawn.isNpc() && hasPoof(rom, location, spawn)) {
            for (const p of poofTiles(rom)) drawn.add(p);
          }
        }
        const runtime = RUNTIME_SPRITES.find(r => r.location === location.id);
        if (runtime?.npcMetasprites?.index === index) {
          const offset = personOffset(rom.npcs[spawn.id].data);
          for (const id of runtime.npcMetasprites.ids) {
            for (const p of drawnTiles(metaspriteTiles(rom, id, offset),
                                       spawn.patternBank)) {
              drawn.add(p);
            }
          }
        }
        const phase = spawn.isNpc() ? phaseOf(rom, location, spawn.id) : 'both';
        this.use(location, drawn, phase);
      });
      const runtime = RUNTIME_SPRITES.find(r => r.location === location.id);
      const drawn = new Set<number>();
      for (const id of runtime?.objects ?? []) {
        for (const obj of allObjects(rom, rom.objects[id])) {
          for (const p of objectTiles(rom, obj)) drawn.add(p);
        }
      }
      if (location.id === IVORY_STATUE_LOCATION) {
        for (const p of poofTiles(rom)) drawn.add(p);
      }
      this.use(location, drawn, 'both');
    }

    const pending = this.tileOf(Patterns.NPC_PLACEHOLDER_CORNER);
    for (const scenes of this.scenes.values()) {
      for (const {location, needs} of scenes) {
        const tile = needs[PENDING_SLOT].get(PENDING_INDEX);
        if (tile != null && tile !== pending) {
          throw new Error(`${location.name} draws pattern $${
                          hex(0x80 | PENDING_SLOT << 6 | PENDING_INDEX)}`);
        }
        needs[PENDING_SLOT].set(PENDING_INDEX, pending);
      }
    }
  }

  /** Whether an NPC draws any tile outside the two location banks. */
  static drawsOutsideNpcBanks(rom: Rom, id: number, spawn: Spawn): boolean {
    const data = rom.npcs[id].data;
    const offset = personOffset(data);
    const shift = spawn.patternBank ? 0x40 : 0;
    return personPatterns(rom, id).some(p => ((p + offset + shift) & 0xff) < 0x80);
  }

  private scene(location: Location, post: boolean): Scene {
    const pair: [number, number] =
        post ? [MASSACRE_BANK, MASSACRE_BANK] : [...location.spritePatterns];
    return {location, post, pair, needs: [new Map(), new Map()]};
  }

  /** Records tiles drawn by something that doesn't move. */
  private use(location: Location, pats: Iterable<number>, phase: ShyronMassacrePhase) {
    const scenes = this.scenes.get(location.id)!;
    const targets = scenes.filter(s => phase === 'both' || scenes.length === 1 ||
                                       (phase === 'post') === s.post);
    for (const p of pats) {
      const slot = p >> 6 & 1;
      const index = p & 0x3f;
      for (const scene of targets) {
        if (scene.pair[slot] === 0xff) continue; // not loaded: never drawn
        scene.needs[slot].set(index, this.tile(scene.pair[slot], index));
      }
    }
  }

  private unitDraws({home, spawns}: NpcUnit): Draw[] {
    const draws = spawns.map(s => this.npcDraw(home, s));
    if (spawns.some(s => hasPoof(this.rom, home, s))) {
      // The poof keeps its home indices, whatever the NPC's bank bit.
      const cells: Cell[] = poofTiles(this.rom).map(p => {
        const slot = p >> 6 & 1;
        return [slot, p & 0x3f, this.tile(home.spritePatterns[slot], p & 0x3f)];
      });
      draws.push({phase: draws[0].phase, options: [{bit: -1, cells}]});
    }
    return draws;
  }

  private npcDraw(home: Location, spawn: Spawn): Draw {
    const {rom} = this;
    const data = rom.npcs[spawn.id].data;
    const phase = phaseOf(rom, home, spawn.id);
    const pair = phase === 'post' ? [MASSACRE_BANK, MASSACRE_BANK]
                                  : home.spritePatterns;
    const offset = personOffset(data);
    const raws = personPatterns(rom, spawn.id);
    const tileOf = (bit: number) => raws.map(raw => (raw + offset + 0x40 * bit) & 0xff);
    const atHome = tileOf(spawn.patternBank);
    if (atHome.some(p => p < 0x80)) {
      throw new Error(`NPC ${hex(spawn.id)} draws outside NPC banks`);
    }
    const tiles = atHome.map(p => this.tile(pair[p >> 6 & 1], p & 0x3f));
    const options: Array<{bit: number, cells: Cell[]}> = [];
    for (const bit of [0, 1]) {
      const pats = tileOf(bit);
      if (pats.some(p => p < 0x80)) continue;
      options.push({bit, cells: pats.map((p, i) => [p >> 6 & 1, p & 0x3f, tiles[i]])});
    }
    return {phase, options};
  }

  private tile(bank: number, index: number): number {
    return this.tileOf(this.rom.patterns.get(bank << 6, index).pixels);
  }

  private tileOf(pixels: readonly number[]): number {
    const key = pixels.join(',');
    let id = this.tileIds.get(key);
    if (id == null) {
      this.tileIds.set(key, id = this.pixels.length);
      this.pixels.push([...pixels]);
    }
    return id;
  }

  // Do a random walk starting with the vanilla placements
  // and swap locations as long as thats valid
  pack(random: Random, penalty: LocationPenalty, steps = 50000): Packing {
    const {units} = this;
    const U = units.length;
    const at = Array.from({length: U}, (_, i) => i); // slot -> unit
    const slotsOf = new Map<Location, number[]>();
    units.forEach(({home}, i) => {
      let list = slotsOf.get(home);
      if (!list) slotsOf.set(home, list = []);
      list.push(i);
    });
    const check = (location: Location): Check|undefined => {
      const slots = slotsOf.get(location)!;
      if (penalty.of(location, slots, slots.map(s => at[s])) > 0) {
        return undefined;
      }
      return this.check(location, slots.map(s => at[s]));
    };
    for (const location of slotsOf.keys()) {
      if (!check(location)) {
        throw new Error(`Vanilla NPCs don't fit in ${location.name}`);
      }
    }
    for (let n = 0; n < steps; n++) {
      const a = random.nextInt(U);
      const b = random.nextInt(U);
      if (a === b) continue;
      [at[a], at[b]] = [at[b], at[a]];
      const la = units[a].home;
      const lb = units[b].home;
      if (check(la) && (la === lb || check(lb))) continue;
      [at[a], at[b]] = [at[b], at[a]];
    }

    const slotOf = new Array<number>(U);
    at.forEach((unit, slot) => slotOf[unit] = slot);
    const bits = this.draws.map(ds => ds.map(() => -1));
    const cells = new Map<number, SceneCells[]>();
    for (const location of slotsOf.keys()) {
      const result = check(location)!;
      cells.set(location.id, result.cells);
      for (const [unit, draw, bit] of result.bits) {
        bits[unit][draw] = bit;
      }
    }
    return {slotOf, bits, cells};
  }

  private check(location: Location, units: readonly number[]): Check|undefined {
    const scenes = this.scenes.get(location.id)!;
    const cells = scenes.map(s => [new Map(s.needs[0]), new Map(s.needs[1])] as const);
    interface Var {
      unit: number;
      draw: number;
      scenes: number[];
      options: Draw['options'];
    }
    const vars: Var[] = [];
    for (const unit of units) {
      this.draws[unit].forEach(({phase, options}, draw) => {
        const s = scenes.length === 1 || phase === 'both' ?
            scenes.map((_, i) => i) : [phase === 'post' ? 1 : 0];
        vars.push({unit, draw, scenes: s, options});
      });
    }
    vars.sort((a, b) => a.options.length - b.options.length);
    const chosen: number[] = [];
    // Attempt to find a spot in the banks that we can place this NPCUnit
    // and if there's a collision return undefined
    const place = (i: number): boolean => {
      if (i === vars.length) return true;
      const v = vars[i];
      for (const {bit, cells: need} of v.options) {
        const added: Array<[Map<number, number>, number]> = [];
        let ok = true;
        for (const s of v.scenes) {
          for (const [slot, index, tile] of need) {
            const m = cells[s][slot];
            const cur = m.get(index);
            if (cur == null) {
              m.set(index, tile);
              added.push([m, index]);
            } else if (cur !== tile) {
              ok = false;
              break;
            }
          }
          if (!ok) break;
        }
        if (ok) {
          chosen[i] = bit;
          if (place(i + 1)) return true;
        }
        for (const [m, index] of added) m.delete(index);
      }
      return false;
    };
    if (!place(0)) return undefined;
    return {
      cells,
      bits: vars.map((v, i) => [v.unit, v.draw, chosen[i]] as const),
    };
  }

  apply(packing: Packing, placed: ReadonlyArray<readonly Spawn[]>) {
    const {rom} = this;
    // New banks, and what each must hold.
    const banks: Array<{bank: number, cells: Map<number, number>}> = [];
    const bankFor = (content: ReadonlyMap<number, number>, original: number): number => {
      if (!content.size) return original;
      if (original !== 0xff &&
          [...content].every(([index, tile]) => this.tile(original, index) === tile)) {
        return original;
      }
      const fits = (cells: ReadonlyMap<number, number>) =>
          [...content].every(([index, tile]) => (cells.get(index) ?? tile) === tile);
      let bank = banks.find(b => fits(b.cells));
      if (!bank) banks.push(bank = {bank: rom.allocChrBank(), cells: new Map()});
      for (const [index, tile] of content) bank.cells.set(index, tile);
      return bank.bank;
    };
    let massacre: readonly number[] = [MASSACRE_BANK, MASSACRE_BANK];
    for (const [id, scenes] of this.scenes) {
      const cells = packing.cells.get(id)!;
      scenes.forEach((scene, s) => {
        const pair = [0, 1].map(k => bankFor(cells[s][k], scene.pair[k]));
        if (scene.post) {
          massacre = pair;
        } else {
          scene.location.spritePatterns = pair as [number, number];
        }
      });
    }
    for (const {bank, cells} of banks) {
      for (const [index, tile] of cells) {
        rom.patterns.set(bank << 6, index, [...this.pixels[tile]]);
      }
    }
    // Bank bits.
    placed.forEach((spawns, i) => {
      spawns.forEach((spawn, j) => {
        const bit = packing.bits[i][j];
        if (bit < 0) throw new Error(`No bank bit for NPC ${hex(spawn.id)}`);
        spawn.patternBank = bit;
      });
    });
    // Export Shyron's post-massacre banks
    const a = rom.assembler();
    a.assign('ShyronMassacrePattern0', massacre[0]);
    a.assign('ShyronMassacrePattern1', massacre[1]);
    for (const {label, metasprite} of PLACEHOLDERS) {
      a.assign(label, metasprite);
      a.export(label);
    }
    a.export('ShyronMassacrePattern0', 'ShyronMassacrePattern1');
    rom.modules.set(NPC_GRAPHICS_MODULE, a.module());
    MASSACRE_BANKS.set(rom, massacre);

    for (const {metasprite, pattern} of PLACEHOLDERS) {
      const placeholder = new Metasprite(rom, metasprite);
      placeholder.used = true;
      placeholder.mirrored = null;
      placeholder.frameMask = 0;
      placeholder.frames = 1;
      placeholder.sprites = [placeholderSprites(pattern)];
      placeholder.size = placeholder.sprites[0].length;
      rom.extendedMetasprites[metasprite] = placeholder;
    }
  }

  describe(): string {
    return `${this.units.length} units, ${this.scenes.size} locations, ${
            this.pixels.length} distinct tiles`;
  }
}

const NPC_GRAPHICS_MODULE = ModuleId('npc-graphics');
const MASSACRE_BANKS = new WeakMap<Rom, readonly number[]>();

export function shyronMassacreBanks(rom: Rom): readonly number[] {
  return MASSACRE_BANKS.get(rom) ?? [MASSACRE_BANK, MASSACRE_BANK];
}

function phaseOf(rom: Rom, location: Location, id: number): ShyronMassacrePhase {
  if (location.id !== SHYRON) return 'both';
  const flag = rom.flags.ShyronMassacre.id;
  const conditions = rom.npcs[id]?.spawnConditions.get(location.id) ?? [];
  if (conditions.includes(~flag)) return 'pre';
  if (conditions.includes(flag)) return 'post';
  return 'both';
}

/** Whether the NPC spawn's dialog here plays the reveal poof. */
function hasPoof(rom: Rom, location: Location, spawn: Spawn): boolean {
  const npc = rom.npcs[spawn.id];
  const dialogs = npc.localDialogs.get(location.id) ?? npc.localDialogs.get(-1) ?? [];
  return dialogs.some(d => POOF_ACTIONS.has(d.message.action));
}

/** Pattern bytes the reveal poof draws. */
function poofTiles(rom: Rom): number[] {
  const offset = rom.objects[POOF_OBJECT].data[1];
  return drawnTiles(metaspriteTiles(rom, POOF_METASPRITE, offset), 0);
}

function personOffset(data: readonly number[]): number {
  return data[2] < 0x80 ? data[2] & 0x70 : 0;
}

function personMetasprites(data: readonly number[]): number[] {
  const statue = data[2] < 0x80 && (data[2] & 0x04) && !(data[2] & 0x02);
  return [0, 1, 2, 3].map(d => statue ? data[3] : data[3] & ~3 | d);
}

/** Pattern bytes (before offset and bank bit) of a person's metasprites. */
function personPatterns(rom: Rom, id: number): number[] {
  const data = rom.npcs[id].data;
  const ids = new Set(personMetasprites(data));
  // Hardcoded exception for jumping man (action script $50).
  if (data[2] === 0xd0) ids.add(0xc0);
  const out = new Set<number>();
  for (const ms of ids) {
    for (const p of metaspriteTiles(rom, ms, 0)) out.add(p);
  }
  return [...out];
}

/** Pattern bytes ($80-$ff) drawn by a spawn from its location's banks. */
export function spawnTiles(rom: Rom, spawn: Spawn): number[] {
  if (spawn.isNpc() || spawn.isBoss()) {
    const offset = personOffset(rom.npcs[spawn.id].data);
    return drawnTiles(personPatterns(rom, spawn.id).map(p => p + offset),
                      spawn.patternBank);
  }
  const objects: ObjectData[] = [];
  if (spawn.isMonster()) {
    objects.push(...allObjects(rom, rom.objects[spawn.monsterId]));
  } else if (spawn.isGeneric()) {
    objects.push(rom.objects[spawn.id]);
    // Some shopkeepers are replaced by $4e (see SpawnShopkeeper).
    if ((spawn.id & 0xf0) === 0x40) objects.push(rom.objects[0x4e]);
  }
  const raw: number[] = [];
  for (const obj of objects) {
    if (obj) raw.push(...objectTiles(rom, obj, false));
  }
  return drawnTiles(raw, spawn.patternBank);
}

/** Pattern bytes (offset applied) an object's metasprites draw. */
function objectTiles(rom: Rom, obj: ObjectData, filter = true): number[] {
  const raw: number[] = [];
  const fn = rom.objectActions[obj.action]?.data.metasprites;
  for (const id of fn ? fn(obj) : [obj.metasprite]) {
    raw.push(...metaspriteTiles(rom, id, obj.data[1]));
  }
  // Bonus sprite (e.g. mosquito wings).
  if (obj.data[4] & 0x02) {
    raw.push(...metaspriteTiles(rom, obj.data[0x14], obj.data[1]));
  }
  return filter ? drawnTiles(raw, 0) : raw;
}

/** Applies the +$40 bit and drops tiles outside the location banks. */
function drawnTiles(raw: readonly number[], bankBit: number): number[] {
  const shift = bankBit ? 0x40 : 0;
  const out = new Set<number>();
  for (const p of raw) {
    const q = (p + shift) & 0xff;
    if (q >= 0x80) out.add(q);
  }
  return [...out];
}

function metaspriteTiles(rom: Rom, id: number, offset: number): number[] {
  let ms = rom.metasprites[id];
  if (!ms?.used) return [];
  if (ms.mirrored) ms = rom.metasprites[ms.mirrored];
  const out = new Set<number>();
  for (const frame of ms.sprites) {
    for (const [dx, , , pat] of frame) {
      if (dx === 0x80) break;
      out.add((pat + offset) & 0xff);
    }
  }
  return [...out];
}

// Same enumeration as graphics.ts.
function* allObjects(rom: Rom, parent: ObjectData): Iterable<ObjectData> {
  yield parent;
  const repl = parent.spawnedReplacement();
  if (repl) yield* allObjects(rom, repl);
  const child = parent.spawnedChild();
  if (child) yield* allObjects(rom, child);
  if (parent.id === 0x50) yield rom.objects.largeBlueSlime;
  if (parent.id === 0x53) yield rom.objects.largeRedSlime;
}
