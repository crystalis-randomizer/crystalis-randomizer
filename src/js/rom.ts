// import {Assembler} from './asm/assembler.js';
import {Assembler} from './asm/assembler';
import {Linker} from './asm/linker';
import {Module} from './asm/module';
import {AdHocSpawn} from './rom/adhocspawn';
//import {Areas} from './rom/area.js';
import {BossKills} from './rom/bosskill';
import {Bosses} from './rom/bosses';
import {CoinDrops} from './rom/coindrops';
import {Flags} from './rom/flags';
import {Hitbox} from './rom/hitbox';
import {Items} from './rom/item';
import {ItemGets} from './rom/itemget';
import {Locations} from './rom/location';
import {Messages} from './rom/messages';
import {Metascreens} from './rom/metascreens';
import {Metasprites} from './rom/metasprite';
import {Metatileset, Metatilesets} from './rom/metatileset';
import {Monster} from './rom/monster';
import {Npcs} from './rom/npc';
import {ObjectActions} from './rom/objectaction';
import {ObjectData} from './rom/objectdata';
import {Objects} from './rom/objects';
import {RomOption} from './rom/option';
import {Palette} from './rom/palette';
import {Patterns} from './rom/pattern';
import {RandomNumbers} from './rom/randomnumbers';
import {Scaling} from './rom/scaling';
import {Screen, Screens} from './rom/screen';
import {Shops} from './rom/shop';
import {Slots} from './rom/slots';
import {Spoiler} from './rom/spoiler';
import {Telepathy} from './rom/telepathy';
import {TileAnimation} from './rom/tileanimation';
import {TileEffects} from './rom/tileeffects';
import {Tilesets} from './rom/tileset';
import {TownWarp} from './rom/townwarp';
import {Trigger, Triggers} from './rom/trigger';
import {hex, seq} from './rom/util';
import {WildWarp} from './rom/wildwarp';
import {UnionFind} from './unionfind';
import { Cpu } from './asm/cpu';

export type ModuleId = symbol & {__moduleId__: never};
export const ModuleId = (name: string) => Symbol(name) as ModuleId;

// A known location for data about structural changes we've made to the rom.
// The trick is to find a suitable region of ROM that's both unused *and*
// is not particularly *usable* for our purposes.  The bottom 3 rows of the
// various single-screen maps are all effectively unused, so that gives 48
// bytes per map.  Shops (14000..142ff) also have a giant area up top that
// could possibly be usable, though we'd need to teach the tile-reading code
// to ignore whatever's written there, since it *is* visible before the menu
// pops up.  These are big enough regions that we could even consider using
// them via page-swapping to get extra data in arbitrary contexts.

// Shops are particularly nice because they're all 00 in vanilla.
// Other possible regions:
//   - 48 bytes at $ffc0 (mezame shrine) => $ffe0 is all $ff in vanilla.

export class Rom {

  // These values can be queried to determine how to parse any given rom.
  // They're all always zero for vanilla
  static readonly OMIT_ITEM_GET_DATA_SUFFIX    = RomOption.bit(0x142c0, 0);
  static readonly OMIT_LOCAL_DIALOG_SUFFIX     = RomOption.bit(0x142c0, 1);
  static readonly COMPRESSED_MAPDATA           = RomOption.bit(0x142c0, 2);
  static readonly WRITE_MONSTER_NAMES          = RomOption.bit(0x142c0, 3);
  static readonly SHOP_COUNT                   = RomOption.byte(0x142c1);
  static readonly SCALING_LEVELS               = RomOption.byte(0x142c2);
  static readonly UNIQUE_ITEM_TABLE            = RomOption.address(0x142d0);
  static readonly SHOP_DATA_TABLES             = RomOption.address(0x142d3);
  static readonly TELEPATHY_TABLES             = RomOption.address(0x142d6);

  readonly prg: Uint8Array;
  readonly chr: Uint8Array;

  // TODO - would be nice to eliminate the duplication by moving
  // the ctors here, but there's lots of prereqs and dependency
  // ordering, and we need to make the ADJUSTMENTS, etc.
  //readonly areas: Areas;
  readonly screens: Screens;
  readonly tilesets: Tilesets;
  readonly tileEffects: TileEffects[];
  readonly triggers: Triggers;
  readonly patterns: Patterns;
  readonly palettes: Palette[];
  readonly locations: Locations;
  readonly tileAnimations: TileAnimation[];
  readonly hitboxes: Hitbox[];
  readonly objectActions: ObjectActions;
  readonly objects: Objects;
  readonly adHocSpawns: AdHocSpawn[];
  readonly metascreens: Metascreens;
  readonly metasprites: Metasprites;
  readonly metatilesets: Metatilesets;
  readonly itemGets: ItemGets;
  readonly items: Items;
  readonly shops: Shops;
  readonly slots: Slots;
  readonly npcs: Npcs;
  readonly bossKills: BossKills;
  readonly bosses: Bosses;
  readonly wildWarp: WildWarp;
  readonly townWarp: TownWarp;
  readonly flags: Flags;
  readonly coinDrops: CoinDrops;
  readonly scaling: Scaling;
  readonly randomNumbers: RandomNumbers;

  readonly telepathy: Telepathy;
  readonly messages: Messages;

  readonly modules = new Map<ModuleId, Module>();

  spoiler?: Spoiler;

  // NOTE: The following properties may be changed between reading and writing
  // the rom.  If this happens, the written rom will have different options.
  // This is an effective way to convert between two styles.

  // Max number of shops.  Various blocks of memory require knowing this number
  // to allocate.
  shopCount: number;
  // Number of scaling levels.  Determines the size of the scaling tables.
  scalingLevels: number;

  // Address to read/write the bitfield indicating unique items.
  uniqueItemTableAddress: number;
  // Address of normalized prices table, if present.  If this is absent then we
  // assume prices are not normalized and are at the normal pawn shop address.
  shopDataTablesAddress: number;
  // Address of rearranged telepathy tables.
  telepathyTablesAddress: number;
  // Whether the trailing $ff should be omitted from the ItemGetData table.
  omitItemGetDataSuffix: boolean;
  // Whether the trailing byte of each LocalDialog is omitted.  This affects
  // both reading and writing the table.  May be inferred while reading.
  omitLocalDialogSuffix: boolean;
  // Whether mapdata has been compressed.
  compressedMapData: boolean;
  // Whether monster names are stored in the expanded PRG.
  writeMonsterNames: boolean;

  // Allocated triggers
  allocatedTriggers = new Map<Trigger.Custom, number>();

  constructor(rom: Uint8Array) {
    const prgSize = rom[4] * 0x4000;
    // NOTE: chrSize = rom[5] * 0x2000;
    const prgStart = 0x10 + (rom[6] & 4 ? 512 : 0);
    const prgEnd = prgStart + prgSize;
    this.prg = rom.subarray(prgStart, prgEnd);
    this.chr = rom.subarray(prgEnd);

    this.shopCount = Rom.SHOP_COUNT.get(rom);
    this.scalingLevels = Rom.SCALING_LEVELS.get(rom);
    this.uniqueItemTableAddress = Rom.UNIQUE_ITEM_TABLE.get(rom);
    this.shopDataTablesAddress = Rom.SHOP_DATA_TABLES.get(rom);
    this.telepathyTablesAddress = Rom.TELEPATHY_TABLES.get(rom);
    this.omitItemGetDataSuffix = Rom.OMIT_ITEM_GET_DATA_SUFFIX.get(rom);
    this.omitLocalDialogSuffix = Rom.OMIT_LOCAL_DIALOG_SUFFIX.get(rom);
    this.compressedMapData = Rom.COMPRESSED_MAPDATA.get(rom);
    this.writeMonsterNames = Rom.WRITE_MONSTER_NAMES.get(rom);

    // if (crc32(rom) === EXPECTED_CRC32) {
    for (const [address, old, value] of ADJUSTMENTS) {
      if (this.prg[address] === old) this.prg[address] = value;
    }

    // Load up a bunch of data tables.  This will include a large number of the
    // data tables in the ROM.  The idea is that we can edit the arrays locally
    // and then have a "commit" function that rebuilds the ROM with the new
    // arrays.  We may need to write a "paged allocator" that can allocate
    // chunks of ROM in a given page.  Probably want to use a greedy algorithm
    // where we start with the biggest chunk and put it in the smallest spot
    // that fits it.  Presumably we know the sizes up front even before we have
    // all the addresses, so we could do all the allocation at once - probably
    // returning a token for each allocation and then all tokens get filled in
    // at once (actual promises would be more unweildy).
    // Tricky - what about shared elements of data tables - we pull them
    // separately, but we'll need to re-coalesce them.  But this requires
    // knowing their contents BEFORE allocating their space.  So we need two
    // allocate methods - one where the content is known and one where only the
    // length is known.
    this.tilesets = new Tilesets(this);
    this.tileEffects = seq(11, i => new TileEffects(this, i + 0xb3));
    this.screens = new Screens(this);
    this.metatilesets = new Metatilesets(this);
    this.metascreens = new Metascreens(this);
    this.triggers = new Triggers(this);
    this.patterns = new Patterns(this);
    this.palettes = seq(0x100, i => new Palette(this, i));
    this.locations = new Locations(this);
    this.tileAnimations = seq(4, i => new TileAnimation(this, i));
    this.hitboxes = seq(24, i => new Hitbox(this, i));
    this.objectActions = new ObjectActions(this);
    this.objects = new Objects(this);
    this.adHocSpawns = seq(0x60, i => new AdHocSpawn(this, i));
    this.metasprites = new Metasprites(this);
    this.messages = new Messages(this);
    this.telepathy = new Telepathy(this);
    this.itemGets = new ItemGets(this);
    this.items = new Items(this);
    this.shops = new Shops(this); // NOTE: depends on locations and objects
    this.slots = new Slots(this);
    this.npcs = new Npcs(this);
    this.bossKills = new BossKills(this);
    this.wildWarp = new WildWarp(this);
    this.townWarp = new TownWarp(this);
    this.coinDrops = new CoinDrops(this);
    this.flags = new Flags(this);
    this.bosses = new Bosses(this); // NOTE: must be after Npcs and Flags
    this.scaling = new Scaling(this);
    this.randomNumbers = new RandomNumbers(this);

    // // TODO - consider populating this later?
    // // Having this available makes it easier to set exits, etc.
    for (const loc of this.locations) {
      if (loc.used) loc.lazyInitialization(); // trigger the getter
    }
  }

  trigger(id: number): Trigger {
    if (id < 0x80 || id > 0xff) throw new Error(`Bad trigger id $${hex(id)}`);
    return this.triggers[id & 0x7f];
  }

  // TODO - cross-reference monsters/metasprites/metatiles/screens with patterns/palettes
  // get monsters(): ObjectData[] {
  //   const monsters = new Set<ObjectData>();
  //   for (const l of this.locations) {
  //     if (!l.used || !l.hasSpawns) continue;
  //     for (const o of l.spawns) {
  //       if (o.isMonster()) monsters.add(this.objects[o.monsterId]);
  //     }
  //   }
  //   return [...monsters].sort((x, y) => (x.id - y.id));
  // }

  get projectiles(): ObjectData[] {
    const projectiles = new Set<ObjectData>();
    for (const m of this.objects.filter(o => o instanceof Monster)) {
      if (m.child) {
        projectiles.add(this.objects[this.adHocSpawns[m.child].objectId]);
      }
    }
    return [...projectiles].sort((x, y) => (x.id - y.id));
  }

  get monsterGraphics() {
    const gfx: {[id: string]:
                {[info: string]:
                 {slot: number, pat: number, pal: number}}} = {};
    for (const l of this.locations) {
      if (!l.used || !l.hasSpawns) continue;
      for (const o of l.spawns) {
        if (!(o.data[2] & 7)) {
          const slot = o.data[2] & 0x80 ? 1 : 0;
          const id = hex(o.data[3] + 0x50);
          const data = gfx[id] = gfx[id] || {};
          data[`${slot}:${l.spritePatterns[slot].toString(16)}:${
               l.spritePalettes[slot].toString(16)}`]
            = {pal: l.spritePalettes[slot],
               pat: l.spritePatterns[slot],
               slot,
              };
        }
      }
    }
    return gfx;
  }

  get locationMonsters() {
    const m: {[id: string]: {[info: string]: number}} = {};
    for (const l of this.locations) {
      if (!l.used || !l.hasSpawns) continue;
      // which monsters are in which slots?
      const s: {[info: string]: number} = m['$' + hex(l.id)] = {};
      for (const o of l.spawns) {
        if (!(o.data[2] & 7)) {
          const slot = o.data[2] & 0x80 ? 1 : 0;
          const id = o.data[3] + 0x50;
          s[`${slot}:${id.toString(16)}`] =
              (s[`${slot}:${id.toString(16)}`] || 0) + 1;
        }
      }
    }
    return m;
  }

  // TODO - for each sprite pattern table, find all the palettes that it uses.
  // Find all the monsters on it.  We can probably allow any palette so long
  // as one of the palettes is used with that pattern.
  // TODO - max number of instances of a monster on any map - i.e. avoid having
  // five flyers on the same map!

  // 460 - 0 means either flyer or stationary
  //           - stationary has 4a0 ~ 204,205,206
  //             (kraken, swamp plant, sorceror)
  //       6 - mimic
  //       1f - swimmer
  //       54 - tomato and bird
  //       55 - swimmer
  //       57 - normal
  //       5f - also normal, but medusa head is flyer?
  //       77 - soldiers, ice zombie

//   // Don't worry about other datas yet
//   writeObjectData() {
//     // build up a map from actual data to indexes that point to it
//     let addr = 0x1ae00;
//     const datas = {};
//     for (const object of this.objects) {
//       const ser = object.serialize();
//       const data = ser.join(' ');
//       if (data in datas) {
// //console.log(`$${object.id.toString(16).padStart(2,0)}: Reusing existing data $${datas[data].toString(16)}`);
//         object.objectDataBase = datas[data];
//       } else {
//         object.objectDataBase = addr;
//         datas[data] = addr;
// //console.log(`$${object.id.toString(16).padStart(2,0)}: Data is at $${
// //             addr.toString(16)}: ${Array.from(ser, x=>'$'+x.toString(16).padStart(2,0)).join(',')}`);
//         addr += ser.length;
// // seed 3517811036
//       }
//       object.write();
//     }
// //console.log(`Wrote object data from $1ac00 to $${addr.toString(16).padStart(5, 0)
// //             }, saving ${0x1be91 - addr} bytes.`);
//     return addr;
//   }

  assembler(): Assembler {
    // TODO - consider setting a segment prefix
    return new Assembler(Cpu.P02, {overwriteMode: 'require'});
  }

  writeData(data = this.prg) {
    // Write the options first
    // const writer = new Writer(this.chr);
    // writer.modules.push(...this.modules);
    // MapData
    //writer.alloc(0x144f8, 0x17e00);
    // NpcData
    // NOTE: 193f9 is assuming $fb is the last location ID.  If we add more locations at
    // the end then we'll need to push this back a few more bytes.  We could possibly
    // detect the bad write and throw an error, and/or compute the max location ID.
    //writer.alloc(0x193f9, 0x1ac00);
    // ObjectData (index at 1ac00..1ae00)
    //writer.alloc(0x1ae00, 0x1bd00); // save 512 bytes at end for some extra code

    // keep item $49 "        " which is actually used somewhere?
    // writer.alloc(0x21471, 0x214f1); // TODO - do we need any of this?
    // ItemMessageName
    // writer.alloc(0x28e81, 0x2922b); // NOTE: uncovered thru 29400
    // writer.alloc(0x2922b, 0x29400); // TODO - needed?
    // NOTE: once we release the other message tables, this will just be one giant block.

    // Message table parts
    // writer.alloc(0x28000, 0x283fe);
    // Message tables
    // TODO - we don't use the writer to allocate the abbreviation tables, but we could
    //writer.free('0x2a000, 0x2fc00);

    // if (this.telepathyTablesAddress) {
    //   writer.alloc(0x1d8f4, 0x1db00); // location table all the way thru main
    // } else {
    //   writer.alloc(0x1da4c, 0x1db00); // existing main table is here.
    // }

    const modules = [...this.modules.values()];
    const writeAll = (writables: Iterable<{write(): Module[]}>) => {
      for (const w of writables) {
        modules.push(...w.write());
      }
    };
    modules.push(...this.locations.write());
    modules.push(...this.objects.write());
    writeAll(this.hitboxes);
    modules.push(...this.triggers.write());
    modules.push(...this.npcs.write());
    modules.push(...this.tilesets.write());
    writeAll(this.tileEffects);
    writeAll(this.adHocSpawns);
    modules.push(...this.itemGets.write());
    modules.push(...this.slots.write());
    modules.push(...this.items.write());
    modules.push(...this.shops.write());
    modules.push(...this.bossKills.write());
    writeAll(this.patterns);
    modules.push(...this.metasprites.write());
    modules.push(...this.wildWarp.write());
    modules.push(...this.townWarp.write());
    modules.push(...this.coinDrops.write());
    modules.push(...this.scaling.write());
    modules.push(...this.bosses.write());
    modules.push(...this.randomNumbers.write());
    modules.push(...this.telepathy.write());
    modules.push(...this.messages.write());
    modules.push(...this.screens.write());

    // Reserve the global space 142c0...142f0 ???
    // const this.assembler().

    const linker = new Linker();
    linker.base(this.prg, 0);
    for (const m of modules) {
      linker.read(m);
    }
    const out = linker.link();
    out.apply(data);
    if (data !== this.prg) return; // TODO - clean this up
    //linker.report();
    const exports = linker.exports();

    
    this.uniqueItemTableAddress = exports.get('KeyItemData')!.offset!;
    this.shopCount = 11;
    this.shopDataTablesAddress = exports.get('ShopData')?.offset || 0;
    // Don't include these in the linker???
    Rom.SHOP_COUNT.set(this.prg, this.shopCount);
    Rom.SCALING_LEVELS.set(this.prg, this.scalingLevels);
    Rom.UNIQUE_ITEM_TABLE.set(this.prg, this.uniqueItemTableAddress);
    Rom.SHOP_DATA_TABLES.set(this.prg, this.shopDataTablesAddress || 0);
    Rom.OMIT_ITEM_GET_DATA_SUFFIX.set(this.prg, this.omitItemGetDataSuffix);
    Rom.OMIT_LOCAL_DIALOG_SUFFIX.set(this.prg, this.omitLocalDialogSuffix);
    Rom.COMPRESSED_MAPDATA.set(this.prg, this.compressedMapData);
    Rom.WRITE_MONSTER_NAMES.set(this.prg, this.writeMonsterNames);
  }

  analyzeTiles() {
    // For any given tile index, what screens does it appear on.
    // For those screens, which tilesets does *it* appear on.
    // That tile ID is linked across all those tilesets.
    // Forms a partitioning for each tile ID => union-find.
    // Given this partitioning, if I want to move a tile on a given
    // tileset, all I need to do is find another tile ID with the
    // same partition and swap them?

    // More generally, we can just partition the tilesets.

    // For each screen, find all tilesets T for that screen
    // Then for each tile on the screen, union T for that tile.

    // Given a tileset and a metatile ID, find all the screens that (1) are rendered
    // with that tileset, and (b) that contain that metatile; then find all *other*
    // tilesets that those screens are ever rendered with.

    // Given a screen, find all available metatile IDs that could be added to it
    // without causing problems with other screens that share any tilesets.
    //  -> unused (or used but shared exclusively) across all tilesets the screen may use

    // What I want for swapping is the following:
    //  1. find all screens I want to work on => tilesets
    //  2. find unused flaggabble tiles in the hardest one,
    //     which are also ISOLATED in the others.
    //  3. want these tiles to be unused in ALL relevant tilesets
    //  4. to make this so, find *other* unused flaggable tiles in other tilesets
    //  5. swap the unused with the isolated tiles in the other tilesets

    // Caves:
    //  0a:      90 / 9c
    //  15: 80 / 90 / 9c
    //  19:      90      (will add to 80?)
    //  3e:      90
    //
    // Ideally we could reuse 80's 1/2/3/4 for this
    //  01: 90 | 94 9c
    //  02: 90 | 94 9c
    //  03:      94 9c
    //  04: 90 | 94 9c
    //
    // Need 4 other flaggable tile indices we can swap to?
    //   90: => (1,2 need flaggable; 3 unused; 4 any) => 07, 0e, 10, 12, 13, ..., 20, 21, 22, ...
    //   94 9c: => don't need any flaggable => 05, 3c, 68, 83, 88, 89, 8a, 90, ...
  }

  disjointTilesets() {
    const tilesetByScreen: Array<Set<number>> = [];
    for (const loc of this.locations) {
      if (!loc.used) continue;
      const tileset = loc.tileset;
      //const ext = loc.screenPage;
      for (const row of loc.screens) {
        for (const s of row) {
          (tilesetByScreen[s] || (tilesetByScreen[s] = new Set())).add(tileset);
        }
      }
    }
    const tiles = seq(256, () => new UnionFind<number>());
    for (let s = 0; s < tilesetByScreen.length; s++) {
      if (!tilesetByScreen[s]) continue;
      for (const t of this.screens[s].allTilesSet()) {
        tiles[t].union([...tilesetByScreen[s]]);
      }
    }
    // output
    for (let t = 0; t < tiles.length; t++) {
      const p = tiles[t].sets()
          .map((s: Set<number>) => [...s].map(hex).join(' '))
          .join(' | ');
      console.log(`Tile ${hex(t)}: ${p}`);
    }
    //   if (!tilesetByScreen[i]) {
    //     console.log(`No tileset for screen ${i.toString(16)}`);
    //     continue;
    //   }
    //   union.union([...tilesetByScreen[i]]);
    // }
    // return union.sets();
  }

  // Cycles are not actually cyclic - an explicit loop at the end is required to swap.
  // Variance: [1, 2, null] will cause instances of 1 to become 2 and will
  //           cause properties of 1 to be copied into slot 2
  // Common usage is to swap things out of the way and then copy into the
  // newly-freed slot.  Say we wanted to free up slots [1, 2, 3, 4] and
  // had available/free slots [5, 6, 7, 8] and want to copy from [9, a, b, c].
  // Then cycles will be [1, 5, 9] ??? no
  //  - probably want to do screens separately from tilesets...?
  // NOTE - we don't actually want to change tiles for the last copy...!
  //   in this case, ts[5] <- ts[1], ts[1] <- ts[9], screen.map(1 -> 5)
  //   replace([0x90], [5, 1, ~9])
  //     => 1s replaced with 5s in screens but 9s NOT replaced with 1s.
  // Just build the partition once lazily? then can reuse...
  //   - ensure both sides of replacement have correct partitioning?E
  //     or just do it offline - it's simpler
  // TODO - Sanity check?  Want to make sure nobody is using clobbered tiles?
  swapMetatiles(tilesets: number[], ...cycles: (number | number[])[][]) {
    // Process the cycles
    const rev = new Map<number, number>();
    const revArr: number[] = seq(0x100);
    const alt = new Map<number, number>();
    const cpl = (x: number | number[]): number => Array.isArray(x) ? x[0] : x < 0 ? ~x : x;
    for (const cycle of cycles) {
      for (let i = 0; i < cycle.length - 1; i++) {
        if (Array.isArray(cycle[i])) {
          const arr = cycle[i] as number[];
          alt.set(arr[0], arr[1]);
          cycle[i] = arr[0];
        }
      }
      for (let i = 0; i < cycle.length - 1; i++) {
        const j = cycle[i] as number;
        const k = cycle[i + 1] as number;
        if (j < 0 || k < 0) continue;
        rev.set(k, j);
        revArr[k] = j;
      }
    }
    // const replacementSet = new Set(replacements.keys());
    // Find instances in (1) screens, (2) tilesets and alternates, (3) tileEffects
    const screens = new Set<Screen>();
    const tileEffects = new Set<number>();
    const tilesetsSet = new Set(tilesets);
    for (const l of this.locations) {
      if (!l.used) continue;
      if (!tilesetsSet.has(l.tileset)) continue;
      tileEffects.add(l.tileEffects);
      for (const screen of l.allScreens()) {
        screens.add(screen);
      }
    }
    // Do replacements.
    // 1. screens: [5, 1, ~9] => change 1s into 5s
    for (const screen of screens) {
      for (let i = 0, len = screen.tiles.length; i < len; i++) {
        screen.tiles[i] = revArr[screen.tiles[i]];
      }
    }
    // 2. tilesets: [5, 1 ~9] => copy 5 <= 1 and 1 <= 9
    for (const tsid of tilesetsSet) {
      const tileset = this.tilesets[tsid];
      for (const cycle of cycles) {
        for (let i = 0; i < cycle.length - 1; i++) {
          const a = cpl(cycle[i]);
          const b = cpl(cycle[i + 1]);
          for (let j = 0; j < 4; j++) {
            tileset.tiles[j][a] = tileset.tiles[j][b];
          }
          tileset.attrs[a] = tileset.attrs[b];
          if (b < 0x20 && tileset.alternates[b] !== b) {
            if (a >= 0x20) throw new Error(`Cannot unflag: ${tsid} ${a} ${b} ${tileset.alternates[b]}`);
            tileset.alternates[a] = tileset.alternates[b];
            
          }
        }
      }
      for (const [a, b] of alt) {
        tileset.alternates[a] = b;
      }
    }
    // 3. tileEffects
    for (const teid of tileEffects) {
      const tileEffect = this.tileEffects[teid - 0xb3];
      for (const cycle of cycles) {
        for (let i = 0; i < cycle.length - 1; i++) {
          const a = cpl(cycle[i]);
          const b = cpl(cycle[i + 1]);
          tileEffect.effects[a] = tileEffect.effects[b];
        }
      }
      for (const a of alt.keys()) {
        // This bit is required to indicate that the alternative tile's
        // effect should be consulted.  Simply having the flag and the
        // tile index < $20 is not sufficient.
        tileEffect.effects[a] |= 0x08;
      }
    }
    // Done?!?
  }

  moveFlag(oldFlag: number, newFlag: number) {
    // need to update triggers, spawns, dialogs
    function replace(arr: number[]) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === oldFlag) arr[i] = newFlag;
        if (arr[i] === ~oldFlag) arr[i] = ~newFlag;
      }
    }
    for (const trigger of this.triggers) {
      replace(trigger.conditions);
      replace(trigger.flags);
    }
    for (const npc of this.npcs) {
      for (const conds of npc.spawnConditions.values()) replace(conds);
      for (const dialogs of [npc.globalDialogs, ...npc.localDialogs.values()]) {
        for (const dialog of dialogs) {
          if (dialog.condition === oldFlag) dialog.condition = newFlag;
          if (dialog.condition === ~oldFlag) dialog.condition = ~newFlag;
        }
      }
    }
    // also need to update map flags if >= $200
    if ((oldFlag & ~0xff) === 0x200 && (newFlag & ~0xff) === 0x200) {
      for (const loc of this.locations) {
        for (const flag of loc.flags) {
          if (flag.flag === oldFlag) flag.flag = newFlag;
        }
      }
    }
  }

  nextFreeTrigger(name?: Trigger.Custom): Trigger {
    for (const t of this.triggers) {
      if (t.used) continue;
      if (name) this.allocatedTriggers.set(name, t.id);
      return t;
    }
    throw new Error('Could not find an unused trigger.');
  }

  // compressMapData(): void {
  //   if (this.compressedMapData) return;
  //   this.compressedMapData = true;
  //   // for (const location of this.locations) {
  //   //   if (location.extended) location.extended = 0xa;
  //   // }
  //   for (let i = 0; i < 3; i++) {
  //     //this.screens[0xa00 | i] = this.screens[0x100 | i];
  //     this.metascreens.renumber(0x100 | i, 0xa00 | i);
  //     delete this.screens[0x100 | i];
  //   }
  // }

  // TODO - does not work...
  // TODO - clean this up somehow... would be nice to use the assembler/linker
  //        w/ an .align option for this, but then we have to hold onto weird
  //        data in many places, which isn't great.
  //         - at least, we could "reserve" blocks in various pages?

  /**
   * Moves all the screens from the given tileset(s) into the given plane.
   * Note that the tilesets must be _closed over sharing_, which means that
   * if screen S is in tilesets A and B, then A and B must be either both
   * or neither in the array.  A plane is 64kb and holds 256 screens.
   * Planes 0..3 are the original unexpanded PRG.  The extra expanded space
   * opens up planes 4..7, though (1) we should avoid using plane 7 since
   * the "fe" and "ff" segments live there, and we'll also reserve the lower
   * segments in plane 7 for relocated code and data.  We can probably also
   * avoid plane 6 because 512 extra screens should be more than anybody
   * could ever need.
   */
  moveScreens(tilesetArray: Metatileset[], plane: number): void {
    if (!this.compressedMapData) throw new Error(`Must compress maps first.`);
    const map = new Map<number, number>();
    let i = plane << 8;
    while (this.screens[i]) {
      i++;
    }
    const tilesets = new Set(tilesetArray);
    for (const tileset of tilesets) {
      for (const screen of tileset) {
        if (screen.sid >= 0x100) {
          map.set(screen.sid, screen.sid); // ignore shops
          continue;
        }
        //if ((i & 0xff) === 0x20) throw new Error(`No room left on page.`);
        const prev = screen.sid;
        if (!map.has(prev)) {
          // usually not important, but ensure all variants are renumbered
          //screen.sid = map.get(prev)!;
        //} else {
          const next = i++;
          map.set(prev, next);
          map.set(next, next);
          this.metascreens.renumber(prev, next, tilesets);
        }
      }
    }
    if ((i >>> 8) !== plane) throw new Error(`Out of space on page ${plane}`);

    // Move the screen and make sure that all locations are on a single plane
    const missed = new Set<string>();
    for (const loc of this.locations) {
      if (!tilesets.has(loc.meta.tileset)) continue;
      let anyMoved = false;
      for (const row of loc.screens) {
        for (let j = 0; j < row.length; j++) {
          const mapped = map.get(row[j]);
          if (mapped != null) {
            row[j] = mapped;
            anyMoved = true;
          } else {
            missed.add(loc.name);
          }
        }
      }
      if (anyMoved && missed.size) throw new Error(`Inconsistent move [${[...tilesets].map(t => t.name).join(', ')}] to plane ${plane}: missed ${[...missed].join(', ')}`);
    }
  }

  // Use the browser API to load the ROM.  Use #reset to forget and reload.
  static async load(patch?: (data: Uint8Array) => void|Promise<void>,
                    receiver?: (picker: Element) => void): Promise<Rom> {
    const file = await pickFile(receiver);
    if (patch) await patch(file);
    return new Rom(file);
  }  

  static async loadBytes(): Promise<Uint8Array> {
    return await pickFile();
  }
}

// const intersects = (left, right) => {
//   if (left.size > right.size) return intersects(right, left);
//   for (let i of left) {
//     if (right.has(i)) return true;
//   }
//   return false;
// }

// const TILE_EFFECTS_BY_TILESET = {
//   0x80: 0xb3,
//   0x84: 0xb4,
//   0x88: 0xb5,
//   0x8c: 0xb6,
//   0x90: 0xb7,
//   0x94: 0xb8,
//   0x98: 0xb9,
//   0x9c: 0xba,
//   0xa0: 0xbb,
//   0xa4: 0xbc,
//   0xa8: 0xb5,
//   0xac: 0xbd,
// };

// Only makes sense in the browser.
function pickFile(receiver?: (picker: Element) => void): Promise<Uint8Array> {
  if (!receiver) receiver = picker => document.body.appendChild(picker);
  return new Promise((resolve) => {
    if (window.location.hash !== '#reset') {
      const data = localStorage.getItem('rom');
      if (data) {
        return resolve(
            Uint8Array.from(
                new Array(data.length / 2).fill(0).map(
                    (_, i) => Number.parseInt(
                        data[2 * i] + data[2 * i + 1], 16))));
      }
    }
    const upload = document.createElement('input');
    document.body.appendChild(upload);
    upload.type = 'file';
    upload.addEventListener('change', () => {
      const file = upload.files![0];
      const reader = new FileReader();
      reader.addEventListener('loadend', () => {
        const arr = new Uint8Array(reader.result as ArrayBuffer);
        const str = Array.from(arr, hex).join('');
        localStorage.setItem('rom', str);
        upload.remove();
        resolve(arr);
      });
      reader.readAsArrayBuffer(file);
    });
  });
}

export const EXPECTED_CRC32 = 0x1bd39032;

// Format: [address, broken, fixed]
const ADJUSTMENTS = [
  // Normalize cave entrance in 01 outside start
  [0x14548, 0x56, 0x50],
  // Fix broken (fall-through) exit outside start
  [0x1456a, 0x00, 0xff],
  // Move Leaf north entrance to be right next to exit (consistent with Goa)
  [0x1458f, 0x38, 0x30],
  // Normalize sealed cave entrance/exit and zebu cave entrance
  [0x14618, 0x60, 0x70],
  [0x14626, 0xa8, 0xa0],
  [0x14633, 0x15, 0x16],
  [0x14637, 0x15, 0x16],
  // Normalize cordel plain entrance from sealed cave
  [0x14951, 0xa8, 0xa0],
  [0x14953, 0x98, 0x90],
  // Normalize cordel swap entrance
  [0x14a19, 0x78, 0x70],
  // Redundant exit next to stom's door in $19
  [0x14aeb, 0x09, 0xff],
  // Normalize swamp entrance position
  [0x14b49, 0x80, 0x88],
  // Normalize amazones entrance/exit position
  [0x14b87, 0x20, 0x30],
  [0x14b9a, 0x01, 0x02],
  [0x14b9e, 0x01, 0x02],
  // Fix garbage map square in bottom-right of Mt Sabre West cave
  [0x14db9, 0x08, 0x80],
  // Normalize sabre n entrance below summit
  [0x14ef6, 0x68, 0x60],
  // Fix garbage map square in bottom-left of Lime Tree Valley
  [0x1545d, 0xff, 0x00],
  // Normalize lime tree valley SE entrance
  [0x15469, 0x78, 0x70],
  // Normalize portoa se/sw entrances
  [0x15806, 0x98, 0xa0],
  [0x1580a, 0x98, 0xa0],
  // Normalize portoa palace entrance
  [0x1580e, 0x58, 0x50],
  // Mark bad entrance/exit in portoa
  [0x1581d, 0x00, 0xff],
  [0x1584e, 0xdb, 0xff],
  // Normalize fisherman island entrance
  [0x15875, 0x78, 0x70],
  // Normalize zombie town entrance from palace
  [0x15b4f, 0x78, 0x80],
  // Remove unused map screens from Evil Spirit lower
  [0x15baf, 0xf0, 0x80],
  [0x15bb6, 0xdf, 0x80],
  [0x15bb7, 0x96, 0x80],
  // Normalize sabera palace 1 entrance up one tile
  [0x15ce3, 0xdf, 0xcf],
  [0x15cee, 0x6e, 0x6d],
  [0x15cf2, 0x6e, 0x6d],
  // Normalize sabera palace 3 entrance up one tile
  [0x15d8e, 0xdf, 0xcf],
  [0x15d91, 0x2e, 0x2d],
  [0x15d95, 0x2e, 0x2d],
  // Normalize joel entrance
  [0x15e3a, 0xd8, 0xdf],
  // Normalize goa valley righthand entrance
  [0x15f39, 0x78, 0x70],
  // Mark bad entrance/exit in goa valley
  [0x15f40, 0x02, 0xff],
  [0x15f61, 0x8d, 0xff],
  [0x15f65, 0x8d, 0xff],
  // Normalize shyron lower entrance
  [0x163fd, 0x48, 0x40],
  // Normalize shyron fortress entrance
  [0x16403, 0x55, 0x50],
  // Normalize goa south entrance
  [0x1645b, 0xd8, 0xdf],
  // Fix pattern table for desert 1 (animation glosses over it)
  [0x164cc, 0x04, 0x20],
  // Fix garbage at bottom of oasis cave map (it's 8x11, not 8x12 => fix height)
  [0x164ff, 0x0b, 0x0a],
  // Normalize sahara entrance/exit position
  [0x1660d, 0x20, 0x30],
  [0x16624, 0x01, 0x02],
  [0x16628, 0x01, 0x02],
  // Remove unused screens from mado2 area
  [0x16db0, 0x9a, 0x80],
  [0x16db4, 0x9e, 0x80],
  [0x16db8, 0x91, 0x80],
  [0x16dbc, 0x9e, 0x80],
  [0x16dc0, 0x91, 0x80],
  // Mark bad entrance in unused mado2 area
  [0x16de8, 0x00, 0xff],
  // Normalize mado2-side heckway entrance
  [0x16ded, 0xdf, 0xd0],
  // Fix bogus exits in unused mado2 area
  // (exits 2 and 3 are bad, so move 4 and 5 on top of them)
  [0x16df8, 0x0c, 0x5c],
  [0x16df9, 0xb0, 0xb9],
  [0x16dfa, 0x00, 0x02],
  [0x16dfc, 0x0c, 0x5c],
  [0x16dfd, 0xb0, 0xb9],
  [0x16dfe, 0x00, 0x02],
  [0x16dff, 0x07, 0xff],
  // Also remove the bad entrances/exits on the asina version
  // Mark bad entrance/exit in portoa
  [0x16e5d, 0x02, 0xff],
  [0x16e6a, 0xad, 0xff],
  [0x16e6e, 0xad, 0xff],
  // Mark unused entrance/exit in non-kensu side of karmine 5.
  [0x17001, 0x02, 0xff],
  [0x1702e, 0xb7, 0xff],
  [0x17032, 0xb7, 0xff],
  // Mark unused entrances/exits in kensu side of karmine 5.
  [0x170ab, 0x03, 0xff],
  [0x170af, 0x02, 0xff],
  [0x170b3, 0x05, 0xff],
  [0x170b7, 0x06, 0xff],
  [0x170bb, 0x00, 0xff],
  [0x170c4, 0xb2, 0xff],
  [0x170c8, 0xb2, 0xff],
  [0x170cc, 0xb1, 0xff],
  [0x170d0, 0xb1, 0xff],
  [0x170d4, 0xb3, 0xff],
  [0x170d8, 0xb3, 0xff],
  [0x170dc, 0xb5, 0xff],
  [0x170e0, 0xb5, 0xff],
  [0x170e4, 0xb5, 0xff],
  [0x170e8, 0xb5, 0xff],
  // Mark unused entrances in 
  // Normalize aryllis entrance
  [0x174ee, 0x80, 0x88],
  // Normalize joel shed bottom and secret passage entrances
  [0x177c1, 0x88, 0x80],
  [0x177c5, 0x98, 0xa0],
  [0x177c7, 0x58, 0x50],
  // Fix bad music in zombietown houses: $10 should be $01.
  [0x1782a, 0x10, 0x01],
  [0x17857, 0x10, 0x01],
  // Normalize swan dance hall entrance to be consistent with stom's house
  [0x17954, 0x80, 0x78],
  // Normalize shyron dojo entrance to be consistent with stom's house
  [0x179a2, 0x80, 0x78],
  // Fix bad screens in tower
  [0x17b8a, 0x00, 0x40], // tower 1
  [0x17b90, 0x00, 0x40],
  [0x17bce, 0x00, 0x40], // tower 2
  [0x17bd4, 0x00, 0x40],
  [0x17c0e, 0x00, 0x40], // tower 3
  [0x17c14, 0x00, 0x40],
  [0x17c4e, 0x00, 0x40], // tower 4
  [0x17c54, 0x00, 0x40],
  // Fix bad spawn in Mt Hydra (make it an extra puddle).
  [0x19f02, 0x40, 0x80],
  [0x19f03, 0x33, 0x32],
  // Fix bad spawn in Sabera 2's level (probably meant to be a flail guy).
  [0x1a1e0, 0x40, 0xc0], // make sure to fix pattern slot, too!
  [0x1a1e1, 0x3d, 0x34],
  // Point Amazones outer guard to post-overflow message that's actually shown.
  [0x1cf05, 0x47, 0x48],
  // Remove stray flight granter in Zombietown.
  [0x1d311, 0x20, 0xa0],
  [0x1d312, 0x30, 0x00],
  // Fix queen's dialog to terminate on last item, rather than overflow,
  // so that we don't parse garbage.
  [0x1cff9, 0x60, 0xe0],
  // Fix Amazones outer guard message to not overflow.
  [0x2ca90, 0x02, 0x00],
  // Fix seemingly-unused kensu message 1d:17 overflowing into 1d:18
  [0x2f573, 0x02, 0x00],
  // Fix unused karmine treasure chest message 20:18.
  [0x2fae4, 0x5f, 0x00],
] as const;
