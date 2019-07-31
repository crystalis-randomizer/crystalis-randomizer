import {AdHocSpawn} from './rom/adhocspawn.js';
import {BossKill} from './rom/bosskill.js';
import {Bosses} from './rom/bosses.js';
import {Hitbox} from './rom/hitbox.js';
import {Item} from './rom/item.js';
import {ItemGet} from './rom/itemget.js';
import {Locations} from './rom/locations.js';
import {Messages} from './rom/messages.js';
import {Metasprite} from './rom/metasprite.js';
import {Monster} from './rom/monster.js';
import {Npc} from './rom/npc.js';
import {ObjectData} from './rom/objectdata.js';
import {Objects} from './rom/objects.js';
import {RomOption} from './rom/option.js';
import {Palette} from './rom/palette.js';
import {Pattern} from './rom/pattern.js';
import {Screen} from './rom/screen.js';
import {Shop} from './rom/shop.js';
import {Spoiler} from './rom/spoiler.js';
import {Telepathy} from './rom/telepathy.js';
import {TileAnimation} from './rom/tileanimation.js';
import {TileEffects} from './rom/tileeffects.js';
import {Tileset} from './rom/tileset.js';
import {Trigger} from './rom/trigger.js';
import {hex, seq} from './rom/util.js';
import {WildWarp} from './rom/wildwarp.js';
import {Writer} from './rom/writer.js';
import {UnionFind} from './unionfind.js';

// A known location for data about structural changes we've made to the rom.
// The trick is to find a suitable region of ROM that's both unused *and*
// is not particularly *usable* for our purposes.  The bottom 3 rows of the
// various single-screen maps are all effectively unused, so that gives 48
// bytes per map.  Shops (14000..142ff) also have a giant area up top that
// could possibly be usable, though we'd need to teach the tile-reading code
// to ignore whatever's written there, since it *is* visible before the menu
// pops up.  These are bbig enough regions that we could even consider using
// them via page-swapping to get extra data in arbitrary contexts.

// Shops are particularly nice because they're all 00 in vanilla.
// Other possible regions:
//   - 48 bytes at $ffc0 (mezame shrine) => $ffe0 is all $ff in vanilla.

export class Rom {

  // These values can be queried to determine how to parse any given rom.
  // They're all always zero for vanilla
  static readonly OMIT_ITEM_GET_DATA_SUFFIX    = RomOption.bit(0x142c0, 0);
  static readonly OMIT_LOCAL_DIALOG_SUFFIX     = RomOption.bit(0x142c0, 1);
  static readonly SHOP_COUNT                   = RomOption.byte(0x142c1);
  static readonly SCALING_LEVELS               = RomOption.byte(0x142c2);
  static readonly UNIQUE_ITEM_TABLE            = RomOption.address(0x142d0);
  static readonly SHOP_DATA_TABLES             = RomOption.address(0x142d3);
  static readonly TELEPATHY_TABLES             = RomOption.address(0x142d6);

  readonly prg: Uint8Array;
  readonly chr: Uint8Array;

  readonly screens: Screen[];
  readonly tilesets: Tileset[];
  readonly tileEffects: TileEffects[];
  readonly triggers: Trigger[];
  readonly patterns: Pattern[];
  readonly palettes: Palette[];
  readonly locations: Locations;
  readonly tileAnimations: TileAnimation[];
  readonly hitboxes: Hitbox[];
  readonly objects: Objects;
  readonly adHocSpawns: AdHocSpawn[];
  readonly metasprites: Metasprite[];
  readonly itemGets: ItemGet[];
  readonly items: Item[];
  readonly shops: Shop[];
  readonly npcs: Npc[];
  readonly bossKills: BossKill[];
  readonly bosses: Bosses;
  readonly wildWarp: WildWarp;

  readonly telepathy: Telepathy;
  readonly messages: Messages;

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

  constructor(rom: Uint8Array) {

    this.prg = rom.subarray(0x10, 0x40010);
    this.chr = rom.subarray(0x40010);

    this.shopCount = Rom.SHOP_COUNT.get(rom);
    this.scalingLevels = Rom.SCALING_LEVELS.get(rom);
    this.uniqueItemTableAddress = Rom.UNIQUE_ITEM_TABLE.get(rom);
    this.shopDataTablesAddress = Rom.SHOP_DATA_TABLES.get(rom);
    this.telepathyTablesAddress = Rom.TELEPATHY_TABLES.get(rom);
    this.omitItemGetDataSuffix = Rom.OMIT_ITEM_GET_DATA_SUFFIX.get(rom);
    this.omitLocalDialogSuffix = Rom.OMIT_LOCAL_DIALOG_SUFFIX.get(rom);

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
    this.screens = seq(0x103, i => new Screen(this, i));
    this.tilesets = seq(12, i => new Tileset(this, i << 2 | 0x80));
    this.tileEffects = seq(11, i => new TileEffects(this, i + 0xb3));
    this.triggers = seq(0x43, i => new Trigger(this, 0x80 | i));
    this.patterns = seq(this.chr.length >> 4, i => new Pattern(this, i));
    this.palettes = seq(0x100, i => new Palette(this, i));
    this.locations = new Locations(this);
    this.tileAnimations = seq(4, i => new TileAnimation(this, i));
    this.hitboxes = seq(24, i => new Hitbox(this, i));
    this.objects = new Objects(this);
    this.adHocSpawns = seq(0x60, i => new AdHocSpawn(this, i));
    this.metasprites = seq(0x100, i => new Metasprite(this, i));
    this.messages = new Messages(this);
    this.telepathy = new Telepathy(this);
    this.itemGets = seq(0x71, i => new ItemGet(this, i));
    this.items = seq(0x49, i => new Item(this, i));
    this.shops = seq(44, i => new Shop(this, i)); // NOTE: depends on locations and objects
    this.npcs = seq(0xcd, i => new Npc(this, i));
    this.bossKills = seq(0xe, i => new BossKill(this, i));
    this.bosses = new Bosses(this);
    this.wildWarp = new WildWarp(this);
  }

  trigger(id: number): Trigger {
    if (id < 0x80 || id > 0xff) throw new Error(`Bad trigger id $${hex(id)}`);
    return this.triggers[id & 0x7f];
  }

  tileset(id: number): Tileset {
    if (id < 0x80 || id > 0xac || id & 3) throw new Error(`Bad tileset id $${hex(id)}`);
    return this.tilesets[(id & 0x7f) >>> 2];
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

  async writeData() {
    // Write the options first
    Rom.SHOP_COUNT.set(this.prg, this.shopCount);
    Rom.SCALING_LEVELS.set(this.prg, this.scalingLevels);
    Rom.UNIQUE_ITEM_TABLE.set(this.prg, this.uniqueItemTableAddress);
    Rom.SHOP_DATA_TABLES.set(this.prg, this.shopDataTablesAddress);
    Rom.OMIT_ITEM_GET_DATA_SUFFIX.set(this.prg, this.omitItemGetDataSuffix);
    Rom.OMIT_LOCAL_DIALOG_SUFFIX.set(this.prg, this.omitLocalDialogSuffix);

    const writer = new Writer(this.prg, this.chr);
    // MapData
    writer.alloc(0x144f8, 0x17e00);
    // NpcData
    // NOTE: 193f9 is assuming $fb is the last location ID.  If we add more locations at
    // the end then we'll need to push this back a few more bytes.  We could possibly
    // detect the bad write and throw an error, and/or compute the max location ID.
    writer.alloc(0x193f9, 0x1ac00);
    // ObjectData (index at 1ac00..1ae00)
    writer.alloc(0x1ae00, 0x1bd00); // save 512 bytes at end for some extra code
    // NpcSpawnConditions
    writer.alloc(0x1c77a, 0x1c95d);
    // NpcDialog
    writer.alloc(0x1cae5, 0x1d8f4);
    // ItemGetData
    writer.alloc(0x1dde6, 0x1e065);
    // TriggerData
    // NOTE: There's some free space at 1e3c0..1e3f0, but we use this for the
    // CheckBelowBoss triggers.
    writer.alloc(0x1e200, 0x1e3c0);
    // ItemMenuName
    writer.alloc(0x2111a, 0x21468);
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
    writer.alloc(0x2a000, 0x2fc00);

    if (this.telepathyTablesAddress) {
      writer.alloc(0x1d8f4, 0x1db00); // location table all the way thru main
    } else {
      writer.alloc(0x1da4c, 0x1db00); // existing main table is here.
    }

    const promises = [];
    const writeAll = (writables: {write(writer: Writer): unknown}[]) => {
      for (const w of writables) {
        promises.push(w.write(writer));
      }
    };
    writeAll(this.locations);
    writeAll(this.objects);
    writeAll(this.hitboxes);
    writeAll(this.triggers);
    writeAll(this.npcs);
    writeAll(this.tilesets);
    writeAll(this.tileEffects);
    writeAll(this.screens);
    writeAll(this.adHocSpawns);
    writeAll(this.itemGets);
    writeAll(this.items);
    writeAll(this.shops);
    writeAll(this.bossKills);
    writeAll(this.patterns);
    this.wildWarp.write(writer);
    promises.push(this.telepathy.write(writer));
    promises.push(this.messages.write(writer));
    promises.push(writer.commit());
    await Promise.all(promises).then(() => undefined);
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
      const ext = loc.extended ? 0x100 : 0;
      for (const row of loc.screens) {
        for (const s of row) {
          (tilesetByScreen[s + ext] || (tilesetByScreen[s + ext] = new Set())).add(tileset);
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
      const tileset = this.tilesets[(tsid & 0x7f) >>> 2];
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

  // Use the browser API to load the ROM.  Use #reset to forget and reload.
  static async load(patch?: (data: Uint8Array) => Promise<void>,
                    receiver?: (picker: Element) => void) {
    const file = await pickFile(receiver);
    if (patch) await patch(file);
    return new Rom(file);
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
  // Fix softlock in crypt due to flyable wall (effects $b6 tile $46)
  [0x13646, 0x02, 0x06],
  // Fix broken (fall-through) exit outside start
  [0x1456a, 0x00, 0xff],
  // Redundant exit next to stom's door in $19
  [0x14aeb, 0x09, 0xff],
  // Fix garbage map square in bottom-right of Mt Sabre West cave
  [0x14db9, 0x08, 0x80],
  // Fix garbage map square in bottom-left of Lime Tree Valley
  [0x1545d, 0xff, 0x00],
  // Fix garbage at bottom of oasis cave map (it's 8x11, not 8x12 => fix height)
  [0x164ff, 0x0b, 0x0a],
  // Fix bad music in zombietown houses: $10 should be $01
  [0x1782a, 0x10, 0x01],
  [0x17857, 0x10, 0x01],
  // Fix bad spawn in Mt Hydra (make it an extra puddle).
  [0x19f02, 0x40, 0x80],
  [0x19f03, 0x33, 0x32],
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
