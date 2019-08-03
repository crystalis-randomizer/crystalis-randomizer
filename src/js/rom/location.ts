import {Entity} from './entity.js';
import {Screen} from './screen.js';
import {Data, DataTuple,
        concatIterables, group, hex, readLittleEndian,
        seq, tuple, varSlice, writeLittleEndian} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

// Location entities
export class Location extends Entity {

  used: boolean;
  name: string;

  private readonly mapDataPointer: number;
  private readonly mapDataBase: number;

  private readonly layoutBase: number;
  private readonly graphicsBase: number;
  private readonly entrancesBase: number;
  private readonly exitsBase: number;
  private readonly flagsBase: number;
  private readonly pitsBase: number;

  bgm: number;
  layoutWidth: number;
  layoutHeight: number;
  animation: number;
  extended: number;
  screens: number[][];

  tilePatterns: [number, number];
  tilePalettes: [number, number, number];
  tileset: number;
  tileEffects: number;

  entrances: Entrance[];
  exits: Exit[];
  flags: Flag[];
  pits: Pit[];

  hasSpawns: boolean;
  npcDataPointer: number;
  npcDataBase: number;
  spritePalettes: [number, number];
  spritePatterns: [number, number];
  spawns: Spawn[];

  constructor(rom: Rom, id: number) {
    // will include both MapData *and* NpcData, since they share a key.
    super(rom, id);

    this.mapDataPointer = 0x14300 + (id << 1);
    this.mapDataBase = readLittleEndian(rom.prg, this.mapDataPointer) + 0xc000;
    // TODO - pass this in and move LOCATIONS to locations.ts
    this.name = locationNames[this.id] || '';
    this.used = this.mapDataBase > 0xc000 && !!this.name;

    this.layoutBase = readLittleEndian(rom.prg, this.mapDataBase) + 0xc000;
    this.graphicsBase = readLittleEndian(rom.prg, this.mapDataBase + 2) + 0xc000;
    this.entrancesBase = readLittleEndian(rom.prg, this.mapDataBase + 4) + 0xc000;
    this.exitsBase = readLittleEndian(rom.prg, this.mapDataBase + 6) + 0xc000;
    this.flagsBase = readLittleEndian(rom.prg, this.mapDataBase + 8) + 0xc000;

    // Read the exits first so that we can determine if there's entrance/pits
    // metadata encoded at the end.
    let hasPits = this.layoutBase !== this.mapDataBase + 10;
    let entranceLen = this.exitsBase - this.entrancesBase;
    this.exits = (() => {
      const exits = [];
      let i = this.exitsBase;
      while (!(rom.prg[i] & 0x80)) {
        exits.push(new Exit(rom.prg.slice(i, i + 4)));
        i += 4;
      }
      if (rom.prg[i] !== 0xff) {
        hasPits = !!(rom.prg[i] & 0x40);
        entranceLen = (rom.prg[i] & 0x1f) << 2;
      }
      return exits;
    })();

    // TODO - these heuristics will not work to re-read the locations.
    //      - we can look at the order: if the data is BEFORE the pointers
    //        then we're in a rewritten state; in that case, we need to simply
    //        find all refs and max...?
    //      - can we read these parts lazily?
    this.pitsBase = !hasPits ? 0 :
        readLittleEndian(rom.prg, this.mapDataBase + 10) + 0xc000;

    this.bgm = rom.prg[this.layoutBase];
    this.layoutWidth = rom.prg[this.layoutBase + 1];
    this.layoutHeight = rom.prg[this.layoutBase + 2];
    this.animation = rom.prg[this.layoutBase + 3];
    this.extended = rom.prg[this.layoutBase + 4];
    this.screens = seq(
        this.height,
        y => tuple(rom.prg, this.layoutBase + 5 + y * this.width, this.width));
    this.tilePalettes = tuple<number>(rom.prg, this.graphicsBase, 3);
    this.tileset = rom.prg[this.graphicsBase + 3];
    this.tileEffects = rom.prg[this.graphicsBase + 4];
    this.tilePatterns = tuple(rom.prg, this.graphicsBase + 5, 2);

    this.entrances =
      group(4, rom.prg.slice(this.entrancesBase, this.entrancesBase + entranceLen),
            x => new Entrance(x));
    this.flags = varSlice(rom.prg, this.flagsBase, 2, 0xff, Infinity,
                          x => new Flag(x));
    this.pits = this.pitsBase ? varSlice(rom.prg, this.pitsBase, 4, 0xff, Infinity,
                                         x => new Pit(x)) : [];

    this.npcDataPointer = 0x19201 + (id << 1);
    this.npcDataBase = readLittleEndian(rom.prg, this.npcDataPointer) + 0x10000;
    this.hasSpawns = this.npcDataBase !== 0x10000;
    this.spritePalettes =
        this.hasSpawns ? tuple(rom.prg, this.npcDataBase + 1, 2) : [0, 0];
    this.spritePatterns =
        this.hasSpawns ? tuple(rom.prg, this.npcDataBase + 3, 2) : [0, 0];
    this.spawns =
        this.hasSpawns ? varSlice(rom.prg, this.npcDataBase + 5, 4, 0xff, Infinity,
                                  x => new Spawn(x)) : [];
  }

  spawn(id: number): Spawn {
    const spawn = this.spawns[id - 0xd];
    if (!spawn) throw new Error(`Expected spawn $${hex(id)}`);
    return spawn;
  }

  get width(): number { return this.layoutWidth + 1; }
  set width(width: number) { this.layoutWidth = width - 1; }

  get height(): number { return this.layoutHeight + 1; }
  set height(height: number) { this.layoutHeight = height - 1; }

  // monsters() {
  //   if (!this.spawns) return [];
  //   return this.spawns.flatMap(
  //     ([,, type, id], slot) =>
  //       type & 7 || !this.rom.spawns[id + 0x50] ? [] : [
  //         [this.id,
  //          slot + 0x0d,
  //          type & 0x80 ? 1 : 0,
  //          id + 0x50,
  //          this.spritePatterns[type & 0x80 ? 1 : 0],
  //          this.rom.spawns[id + 0x50].palettes()[0],
  //          this.spritePalettes[this.rom.spawns[id + 0x50].palettes()[0] - 2],
  //         ]]);
  // }

  async write(writer: Writer): Promise<void> {
    if (!this.used) return;
    const promises = [];
    if (this.hasSpawns) {
      // write NPC data first, if present...
      const data = [0, ...this.spritePalettes, ...this.spritePatterns,
                    ...concatIterables(this.spawns), 0xff];
      promises.push(
          writer.write(data, 0x18000, 0x1bfff, `NpcData ${hex(this.id)}`)
              .then(address => writeLittleEndian(
                  writer.rom, this.npcDataPointer, address - 0x10000)));
    }

    const write = (data: Data<number>, name: string) =>
        writer.write(data, 0x14000, 0x17fff, `${name} ${hex(this.id)}`);
    const layout = [
      this.bgm,
      this.layoutWidth, this.layoutHeight, this.animation, this.extended,
      ...concatIterables(this.screens)];
    const graphics =
        [...this.tilePalettes,
         this.tileset, this.tileEffects,
         ...this.tilePatterns];
    const entrances = concatIterables(this.entrances);
    const exits = [...concatIterables(this.exits),
                   0x80 | (this.pits.length ? 0x40 : 0) | this.entrances.length,
                  ];
    const flags = [...concatIterables(this.flags), 0xff];
    const pits = concatIterables(this.pits);
    const [layoutAddr, graphicsAddr, entrancesAddr, exitsAddr, flagsAddr, pitsAddr] =
        await Promise.all([
          write(layout, 'Layout'),
          write(graphics, 'Graphics'),
          write(entrances, 'Entrances'),
          write(exits, 'Exits'),
          write(flags, 'Flags'),
          ...(pits.length ? [write(pits, 'Pits')] : []),
        ]);
    const addresses = [
      layoutAddr & 0xff, (layoutAddr >>> 8) - 0xc0,
      graphicsAddr & 0xff, (graphicsAddr >>> 8) - 0xc0,
      entrancesAddr & 0xff, (entrancesAddr >>> 8) - 0xc0,
      exitsAddr & 0xff, (exitsAddr >>> 8) - 0xc0,
      flagsAddr & 0xff, (flagsAddr >>> 8) - 0xc0,
      ...(pitsAddr ? [pitsAddr & 0xff, (pitsAddr >> 8) - 0xc0] : []),
    ];
    const base = await write(addresses, 'MapData');
    writeLittleEndian(writer.rom, this.mapDataPointer, base - 0xc000);
    await Promise.all(promises);

    // If this is a boss room, write the restoration.
    const bossId = this.bossId();
    if (bossId != null && this.id !== 0x5f) { // don't restore dyna
      // This table should restore pat0 but not pat1
      let pats = [this.spritePatterns[0], undefined];
      if (this.id === 0xa6) pats = [0x53, 0x50]; // draygon 2
      const bossBase = readLittleEndian(writer.rom, 0x1f96b + 2 * bossId) + 0x14000;
      const bossRestore = [
        ,,, this.bgm,,
        ...this.tilePalettes,,,, this.spritePalettes[0],,
        ,,,, pats[0], pats[1],
        this.animation,
      ];

      // if (readLittleEndian(writer.rom, bossBase) === 0xba98) {
      //   // escape animation: don't clobber patterns yet?
      // }
      for (let j = 0; j < bossRestore.length; j++) {
        const restored = bossRestore[j];
        if (restored == null) continue;
        writer.rom[bossBase + j] = restored;
      }
      // later spot for pal3 and pat1 *after* explosion
      const bossBase2 = 0x1f7c1 + 5 * bossId;
      writer.rom[bossBase2] = this.spritePalettes[1];
      // NOTE: This ruins the treasure chest.
      // TODO - add some asm after a chest is cleared to reload patterns?
      // Another option would be to add a location-specific contraint to be
      // whatever the boss 
      //writer.rom[bossBase2 + 1] = this.spritePatterns[1];
    }
  }

  allScreens(): Set<Screen> {
    const screens = new Set<Screen>();
    const ext = this.extended ? 0x100 : 0;
    for (const row of this.screens) {
      for (const screen of row) {
        screens.add(this.rom.screens[screen + ext]);
      }
    }
    return screens;
  }

  bossId(): number | undefined {
    for (let i = 0; i < 0x0e; i++) {
      if (this.rom.prg[0x1f95d + i] === this.id) return i;
    }
    return undefined;
  }

  neighbors(joinNexuses: boolean = false): Set<Location> {
    const out = new Set<Location>();
    const addNeighbors = (l: Location) => {
      for (const exit of l.exits) {
        const id = exit.dest;
        const neighbor = this.rom.locations[id];
        if (neighbor && neighbor.used &&
            neighbor !== this && !out.has(neighbor)) {
          out.add(neighbor);
          if (joinNexuses && NEXUSES.has(id)) {
            addNeighbors(neighbor);
          }
        }
      }
    }
    addNeighbors(this);
    return out;
  }

  /** @return {!Set<number>} */
  // allTiles() {
  //   const tiles = new Set();
  //   for (const screen of this.screens) {
  //     for (const tile of screen.allTiles()) {
  //       tiles.add(tile);
  //     }
  //   }
  //   return tiles;
  // }
}

export const Entrance = DataTuple.make(4, {
  x: DataTuple.prop([0], [1, 0xff, -8]),
  y: DataTuple.prop([2], [3, 0xff, -8]),

  screen: DataTuple.prop([3, 0x0f, -4], [1, 0x0f]),
  tile:   DataTuple.prop([2, 0xf0], [0, 0xf0, 4]),

  toString(this: any): string {
    return `Entrance ${this.hex()}: (${hex(this.x)}, ${hex(this.y)})`;
  },
});
export type Entrance = InstanceType<typeof Entrance>;

export const Exit = DataTuple.make(4, {
  x:        DataTuple.prop([0, 0xff, -4]),
  xt:       DataTuple.prop([0]),

  y:        DataTuple.prop([1, 0xff, -4]),
  yt:       DataTuple.prop([1]),

  screen:   DataTuple.prop([1, 0xf0], [0, 0xf0, 4]),
  tile:     DataTuple.prop([1, 0x0f, -4], [0, 0x0f]),

  dest:     DataTuple.prop([2]),

  entrance: DataTuple.prop([3]),

  toString(this: any): string {
    return `Exit ${this.hex()}: (${hex(this.x)}, ${hex(this.y)}) => ${
            this.dest}:${this.entrance}`;
  },
});
export type Exit = InstanceType<typeof Exit>;

export const Flag = DataTuple.make(2, {
  flag:  {
    get(this: any): number { return this.data[0] | 0x200; },
    set(this: any, f: number) {
      if ((f & ~0xff) !== 0x200) throw new Error(`bad flag: ${hex(f)}`);
      this.data[0] = f & 0xff;
    },
  },

  x:     DataTuple.prop([1, 0x07, -8]),
  xs:    DataTuple.prop([1, 0x07]),

  y:     DataTuple.prop([1, 0xf0, -4]),
  ys:    DataTuple.prop([1, 0xf0, 4]),

  // TODO - remove the 'yx' version
  yx:    DataTuple.prop([1]), // y in hi nibble, x in lo.
  screen: DataTuple.prop([1]),

  toString(this: any): string {
    return `Flag ${this.hex()}: (${hex(this.xs)}, ${hex(this.ys)}) @ ${
            hex(this.flag)}`;
  },
});
export type Flag = InstanceType<typeof Flag>;

export const Pit = DataTuple.make(4, {
  fromXs:  DataTuple.prop([1, 0x70, 4]),
  toXs:    DataTuple.prop([1, 0x07]),

  fromYs:  DataTuple.prop([3, 0xf0, 4]),
  toYs:    DataTuple.prop([3, 0x0f]),

  dest:    DataTuple.prop([0]),

  toString(this: any): string {
    return `Pit ${this.hex()}: (${hex(this.fromXs)}, ${hex(this.fromYs)}) => ${
            hex(this.dest)}:(${hex(this.toXs)}, ${hex(this.toYs)})`;
  },
});
export type Pit = InstanceType<typeof Pit>;

export const Spawn = DataTuple.make(4, {
  y:     DataTuple.prop([0, 0xff, -4]),
  yt:    DataTuple.prop([0]),

  timed: DataTuple.booleanProp([1, 0x80, 7]),
  x:     DataTuple.prop([1, 0x7f, -4], [2, 0x40, 3]),
  xt:    DataTuple.prop([1, 0x7f]),

  screen: DataTuple.prop([0, 0xf0], [1, 0xf0, 4]),
  tile:   DataTuple.prop([0, 0x0f, -4], [1, 0x0f]),

  patternBank: DataTuple.prop([2, 0x80, 7]),
  type:  DataTuple.prop([2, 0x07]),

// patternBank: {get(this: any): number { return this.data[2] >>> 7; },
//               set(this: any, v: number) { if (this.data[3] === 120) debugger;
//                                           if (v) this.data[2] |= 0x80; else this.data[2] &= 0x7f; }},
  id:    DataTuple.prop([3]),

  used: {get(this: any): boolean { return this.data[0] !== 0xfe; }},
  monsterId: {get(this: any): number { return (this.id + 0x50) & 0xff; },
              set(this: any, id: number) { this.id = (id - 0x50) & 0xff; }},
  /** Note: this includes mimics. */
  isChest(this: any): boolean { return this.type === 2 && this.id < 0x80; },
  isInvisible(this: any): boolean {
    return this.isChest() && Boolean(this.data[2] & 0x20);
  },
  isTrigger(this: any): boolean { return this.type === 2 && this.id >= 0x80; },
  isNpc(this: any): boolean { return this.type === 1 && this.id < 0xc0; },
  isBoss(this: any): boolean { return this.type === 1 && this.id >= 0xc0; },
  isMonster(this: any): boolean { return this.type === 0; },
  isWall(this: any): boolean {
    return Boolean(this.type === 3 && (this.id < 4 || (this.data[2] & 0x20)));
  },
  toString(this: any): string {
    return `Spawn ${this.hex()}: (${hex(this.x)}, ${hex(this.y)}) ${
            this.timed ? 'timed' : 'fixed'} ${this.type}:${hex(this.id)}`;
  },
});
export type Spawn = InstanceType<typeof Spawn>;

export const LOCATIONS = {
  mezameShrine: [0x00, 'Mezame Shrine'],
  leafOutsideStart: [0x01, 'Leaf - Outside Start'],
  leaf: [0x02, 'Leaf'],
  valleyOfWind: [0x03, 'Valley of Wind'],
  sealedCave1: [0x04, 'Sealed Cave 1'],
  sealedCave2: [0x05, 'Sealed Cave 2'],
  sealedCave6: [0x06, 'Sealed Cave 6'],
  sealedCave4: [0x07, 'Sealed Cave 4'],
  sealedCave5: [0x08, 'Sealed Cave 5'],
  sealedCave3: [0x09, 'Sealed Cave 3'],
  sealedCave7: [0x0a, 'Sealed Cave 7'],
  // INVALID: 0x0b
  sealedCave8: [0x0c, 'Sealed Cave 8'],
  // INVALID: 0x0d
  windmillCave: [0x0e, 'Windmill Cave'],
  windmill: [0x0f, 'Windmill'],
  zebuCave: [0x10, 'Zebu Cave'],
  mtSabreWestCave1: [0x11, 'Mt Sabre West - Cave 1'],
  // INVALID: 0x12
  // INVALID: 0x13
  cordelPlainsWest: [0x14, 'Cordel Plains West'],
  cordelPlainsEast: [0x15, 'Cordel Plains East'],
  // INVALID: 0x16 -- unused copy of 18
  // INVALID: 0x17
  brynmaer: [0x18, 'Brynmaer'],
  outsideStomHouse: [0x19, 'Outside Stom House'],
  swamp: [0x1a, 'Swamp'],
  amazones: [0x1b, 'Amazones'],
  oak: [0x1c, 'Oak'],
  // INVALID: 0x1d
  stomHouse: [0x1e, 'Stom House'],
  // INVALID: 0x1f
  mtSabreWestLower: [0x20, 'Mt Sabre West - Lower'],
  mtSabreWestUpper: [0x21, 'Mt Sabre West - Upper'],
  mtSabreWestCave2: [0x22, 'Mt Sabre West - Cave 2'],
  mtSabreWestCave3: [0x23, 'Mt Sabre West - Cave 3'],
  mtSabreWestCave4: [0x24, 'Mt Sabre West - Cave 4'],
  mtSabreWestCave5: [0x25, 'Mt Sabre West - Cave 5'],
  mtSabreWestCave6: [0x26, 'Mt Sabre West - Cave 6'],
  mtSabreWestCave7: [0x27, 'Mt Sabre West - Cave 7'],
  mtSabreNorthMain: [0x28, 'Mt Sabre North - Main'],
  mtSabreNorthMiddle: [0x29, 'Mt Sabre North - Middle'],
  mtSabreNorthCave2: [0x2a, 'Mt Sabre North - Cave 2'],
  mtSabreNorthCave3: [0x2b, 'Mt Sabre North - Cave 3'],
  mtSabreNorthCave4: [0x2c, 'Mt Sabre North - Cave 4'],
  mtSabreNorthCave5: [0x2d, 'Mt Sabre North - Cave 5'],
  mtSabreNorthCave6: [0x2e, 'Mt Sabre North - Cave 6'],
  mtSabreNorthPrisonHall: [0x2f, 'Mt Sabre North - Prison Hall'],
  mtSabreNorthLeftCell: [0x30, 'Mt Sabre North - Left Cell'],
  mtSabreNorthLeftCell2: [0x31, 'Mt Sabre North - Left Cell 2'],
  mtSabreNorthRightCell: [0x32, 'Mt Sabre North - Right Cell'],
  mtSabreNorthCave8: [0x33, 'Mt Sabre North - Cave 8'],
  mtSabreNorthCave9: [0x34, 'Mt Sabre North - Cave 9'],
  mtSabreNorthSummitCave: [0x35, 'Mt Sabre North - Summit Cave'],
  // INVALID: 0x36
  // INVALID: 0x37
  mtSabreNorthCave1: [0x38, 'Mt Sabre North - Cave 1'],
  mtSabreNorthCave7: [0x39, 'Mt Sabre North - Cave 7'],
  // INVALID: 0x3a
  // INVALID: 0x3b
  nadareInn: [0x3c, 'Nadare - Inn'],
  nadareToolShop: [0x3d, 'Nadare - Tool Shop'],
  nadareBackRoom: [0x3e, 'Nadare - Back Room'],
  // INVALID: 0x3f
  waterfallValleyNorth: [0x40, 'Waterfall Valley North'],
  waterfallValleySouth: [0x41, 'Waterfall Valley South'],
  limeTreeValley: [0x42, 'Lime Tree Valley'],
  limeTreeLake: [0x43, 'Lime Tree Lake'],
  kirisaPlantCave1: [0x44, 'Kirisa Plant Cave 1'],
  kirisaPlantCave2: [0x45, 'Kirisa Plant Cave 2'],
  kirisaPlantCave3: [0x46, 'Kirisa Plant Cave 3'],
  kirisaMeadow: [0x47, 'Kirisa Meadow'],
  fogLampCave1: [0x48, 'Fog Lamp Cave 1'],
  fogLampCave2: [0x49, 'Fog Lamp Cave 2'],
  fogLampCave3: [0x4a, 'Fog Lamp Cave 3'],
  fogLampCaveDeadEnd: [0x4b, 'Fog Lamp Cave Dead End'],
  fogLampCave4: [0x4c, 'Fog Lamp Cave 4'],
  fogLampCave5: [0x4d, 'Fog Lamp Cave 5'],
  fogLampCave6: [0x4e, 'Fog Lamp Cave 6'],
  fogLampCave7: [0x4f, 'Fog Lamp Cave 7'],
  portoa: [0x50, 'Portoa'],
  portoaFishermanIsland: [0x51, 'Portoa - Fisherman Island'],
  mesiaShrine: [0x52, 'Mesia Shrine'],
  // INVALID: 0x53
  waterfallCave1: [0x54, 'Waterfall Cave 1'],
  waterfallCave2: [0x55, 'Waterfall Cave 2'],
  waterfallCave3: [0x56, 'Waterfall Cave 3'],
  waterfallCave4: [0x57, 'Waterfall Cave 4'],
  towerEntrance: [0x58, 'Tower - Entrance'],
  tower1: [0x59, 'Tower 1'],
  tower2: [0x5a, 'Tower 2'],
  tower3: [0x5b, 'Tower 3'],
  towerOutsideMesia: [0x5c, 'Tower - Outside Mesia'],
  towerOutsideDyna: [0x5d, 'Tower - Outside Dyna'],
  towerMesia: [0x5e, 'Tower - Mesia'],
  towerDyna: [0x5f, 'Tower - Dyna'],
  angrySea: [0x60, 'Angry Sea'],
  boatHouse: [0x61, 'Boat House'],
  joelLighthouse: [0x62, 'Joel - Lighthouse'],
  // INVALID: 0x63
  undergroundChannel: [0x64, 'Underground Channel'],
  zombieTown: [0x65, 'Zombie Town'],
  // INVALID: 0x66
  // INVALID: 0x67
  evilSpiritIsland1: [0x68, 'Evil Spirit Island 1'],
  evilSpiritIsland2: [0x69, 'Evil Spirit Island 2'],
  evilSpiritIsland3: [0x6a, 'Evil Spirit Island 3'],
  evilSpiritIsland4: [0x6b, 'Evil Spirit Island 4'],
  saberaPalace1: [0x6c, 'Sabera Palace 1'],
  saberaPalace2: [0x6d, 'Sabera Palace 2'],
  saberaPalace3: [0x6e, 'Sabera Palace 3'],
  // INVALID: 0x6f -- Sabera Palace 3 unused copy
  joelSecretPassage: [0x70, 'Joel - Secret Passage'],
  joel: [0x71, 'Joel'],
  swan: [0x72, 'Swan'],
  swanGate: [0x73, 'Swan - Gate'],
  // INVALID: 0x74
  // INVALID: 0x75
  // INVALID: 0x76
  // INVALID: 0x77
  goaValley: [0x78, 'Goa Valley'],
  // INVALID: 0x79
  // INVALID: 0x7a
  // INVALID: 0x7b
  mtHydra: [0x7c, 'Mt Hydra'],
  mtHydraCave1: [0x7d, 'Mt Hydra - Cave 1'],
  mtHydraOutsideShyron: [0x7e, 'Mt Hydra - Outside Shyron'],
  mtHydraCave2: [0x7f, 'Mt Hydra - Cave 2'],
  mtHydraCave3: [0x80, 'Mt Hydra - Cave 3'],
  mtHydraCave4: [0x81, 'Mt Hydra - Cave 4'],
  mtHydraCave5: [0x82, 'Mt Hydra - Cave 5'],
  mtHydraCave6: [0x83, 'Mt Hydra - Cave 6'],
  mtHydraCave7: [0x84, 'Mt Hydra - Cave 7'],
  mtHydraCave8: [0x85, 'Mt Hydra - Cave 8'],
  mtHydraCave9: [0x86, 'Mt Hydra - Cave 9'],
  mtHydraCave10: [0x87, 'Mt Hydra - Cave 10'],
  styx1: [0x88, 'Styx 1'],
  styx2: [0x89, 'Styx 2'],
  styx3: [0x8a, 'Styx 3'],
  // INVALID: 0x8b
  shyron: [0x8c, 'Shyron'],
  // INVALID: 0x8d
  goa: [0x8e, 'Goa'],
  goaFortressOasisEntrance: [0x8f, 'Goa Fortress - Oasis Entrance'],
  desert1: [0x90, 'Desert 1'],
  oasisCaveMain: [0x91, 'Oasis Cave - Main'],
  desertCave1: [0x92, 'Desert Cave 1'],
  sahara: [0x93, 'Sahara'],
  saharaOutsideCave: [0x94, 'Sahara - Outside Cave'],
  desertCave2: [0x95, 'Desert Cave 2'],
  saharaMeadow: [0x96, 'Sahara Meadow'],
  // INVALID: 0x97
  desert2: [0x98, 'Desert 2'],
  // INVALID: 0x99
  // INVALID: 0x9a
  // INVALID: 0x9b
  pyramidEntrance: [0x9c, 'Pyramid - Entrance'],
  pyramidBranch: [0x9d, 'Pyramid - Branch'],
  pyramidMain: [0x9e, 'Pyramid - Main'],
  pyramidDraygon: [0x9f, 'Pyramid - Draygon'],
  cryptEntrance: [0xa0, 'Crypt - Entrance'],
  cryptHall1: [0xa1, 'Crypt - Hall 1'],
  cryptBranch: [0xa2, 'Crypt - Branch'],
  cryptDeadEndLeft: [0xa3, 'Crypt - Dead End Left'],
  cryptDeadEndRight: [0xa4, 'Crypt - Dead End Right'],
  cryptHall2: [0xa5, 'Crypt - Hall 2'],
  cryptDraygon2: [0xa6, 'Crypt - Draygon 2'],
  cryptTeleporter: [0xa7, 'Crypt - Teleporter'],
  goaFortressEntrance: [0xa8, 'Goa Fortress - Entrance'],
  goaFortressKelbesque: [0xa9, 'Goa Fortress - Kelbesque'],
  goaFortressZebu: [0xaa, 'Goa Fortress - Zebu'],
  goaFortressSabera: [0xab, 'Goa Fortress - Sabera'],
  goaFortressTornel: [0xac, 'Goa Fortress - Tornel'],
  goaFortressMado1: [0xad, 'Goa Fortress - Mado 1'],
  goaFortressMado2: [0xae, 'Goa Fortress - Mado 2'],
  goaFortressMado3: [0xaf, 'Goa Fortress - Mado 3'],
  goaFortressKarmine1: [0xb0, 'Goa Fortress - Karmine 1'],
  goaFortressKarmine2: [0xb1, 'Goa Fortress - Karmine 2'],
  goaFortressKarmine3: [0xb2, 'Goa Fortress - Karmine 3'],
  goaFortressKarmine4: [0xb3, 'Goa Fortress - Karmine 4'],
  goaFortressKarmine5: [0xb4, 'Goa Fortress - Karmine 5'],
  goaFortressKarmine6: [0xb5, 'Goa Fortress - Karmine 6'],
  goaFortressKarmine7: [0xb6, 'Goa Fortress - Karmine 7'],
  goaFortressExit: [0xb7, 'Goa Fortress - Exit'],
  oasisCaveEntrance: [0xb8, 'Oasis Cave - Entrance'],
  goaFortressAsina: [0xb9, 'Goa Fortress - Asina'],
  goaFortressKensu: [0xba, 'Goa Fortress - Kensu'],
  goaHouse: [0xbb, 'Goa - House'],
  goaInn: [0xbc, 'Goa - Inn'],
  // INVALID: 0xbd
  goaToolShop: [0xbe, 'Goa - Tool Shop'],
  goaTavern: [0xbf, 'Goa - Tavern'],
  leafElderHouse: [0xc0, 'Leaf - Elder House'],
  leafRabbitHut: [0xc1, 'Leaf - Rabbit Hut'],
  leafInn: [0xc2, 'Leaf - Inn'],
  leafToolShop: [0xc3, 'Leaf - Tool Shop'],
  leafArmorShop: [0xc4, 'Leaf - Armor Shop'],
  leafStudentHouse: [0xc5, 'Leaf - Student House'],
  brynmaerTavern: [0xc6, 'Brynmaer - Tavern'],
  brynmaerPawnShop: [0xc7, 'Brynmaer - Pawn Shop'],
  brynmaerInn: [0xc8, 'Brynmaer - Inn'],
  brynmaerArmorShop: [0xc9, 'Brynmaer - Armor Shop'],
  // INVALID: 0xca
  brynmaerItemShop: [0xcb, 'Brynmaer - Item Shop'],
  // INVALID: 0xcc
  oakElderHouse: [0xcd, 'Oak - Elder House'],
  oakMotherHouse: [0xce, 'Oak - Mother House'],
  oakToolShop: [0xcf, 'Oak - Tool Shop'],
  oakInn: [0xd0, 'Oak - Inn'],
  amazonesInn: [0xd1, 'Amazones - Inn'],
  amazonesItemShop: [0xd2, 'Amazones - Item Shop'],
  amazonesArmorShop: [0xd3, 'Amazones - Armor Shop'],
  amazonesElder: [0xd4, 'Amazones - Elder'],
  nadare: [0xd5, 'Nadare'],
  portoaFishermanHouse: [0xd6, 'Portoa - Fisherman House'],
  portoaPalaceEntrance: [0xd7, 'Portoa - Palace Entrance'],
  portoaFortuneTeller: [0xd8, 'Portoa - Fortune Teller'],
  portoaPawnShop: [0xd9, 'Portoa - Pawn Shop'],
  portoaArmorShop: [0xda, 'Portoa - Armor Shop'],
  // INVALID: 0xdb
  portoaInn: [0xdc, 'Portoa - Inn'],
  portoaToolShop: [0xdd, 'Portoa - Tool Shop'],
  portoaPalaceLeft: [0xde, 'Portoa - Palace Left'],
  portoaPalaceThroneRoom: [0xdf, 'Portoa - Palace Throne Room'],
  portoaPalaceRight: [0xe0, 'Portoa - Palace Right'],
  portoaAsinaRoom: [0xe1, 'Portoa - Asina Room'],
  amazonesElderDownstairs: [0xe2, 'Amazones - Elder Downstairs'],
  joelElderHouse: [0xe3, 'Joel - Elder House'],
  joelShed: [0xe4, 'Joel - Shed'],
  joelToolShop: [0xe5, 'Joel - Tool Shop'],
  // INVALID: 0xe6
  joelInn: [0xe7, 'Joel - Inn'],
  zombieTownHouse: [0xe8, 'Zombie Town - House'],
  zombieTownHouseBasement: [0xe9, 'Zombie Town - House Basement'],
  // INVALID: 0xea
  swanToolShop: [0xeb, 'Swan - Tool Shop'],
  swanStomHut: [0xec, 'Swan - Stom Hut'],
  swanInn: [0xed, 'Swan - Inn'],
  swanArmorShop: [0xee, 'Swan - Armor Shop'],
  swanTavern: [0xef, 'Swan - Tavern'],
  swanPawnShop: [0xf0, 'Swan - Pawn Shop'],
  swanDanceHall: [0xf1, 'Swan - Dance Hall'],
  shyronFortress: [0xf2, 'Shyron - Fortress'],
  shyronTrainingHall: [0xf3, 'Shyron - Training Hall'],
  shyronHospital: [0xf4, 'Shyron - Hospital'],
  shyronArmorShop: [0xf5, 'Shyron - Armor Shop'],
  shyronToolShop: [0xf6, 'Shyron - Tool Shop'],
  shyronInn: [0xf7, 'Shyron - Inn'],
  saharaInn: [0xf8, 'Sahara - Inn'],
  saharaToolShop: [0xf9, 'Sahara - Tool Shop'],
  saharaElderHouse: [0xfa, 'Sahara - Elder House'],
  saharaPawnShop: [0xfb, 'Sahara - Pawn Shop'],
} as const;
// type Locations = typeof LOCATIONS;

// NOTE: this works to constrain the keys to exactly the same.
// const x: {readonly [T in keyof typeof LOCATIONS]?: string} = {};

// NOTE: the following allows pretty robust checks!
// const x = check<KeysOf<Locations, string | boolean>>()({
//   leaf: 'x',
//   swan: true,
// });
// const y = check<KeysOf<typeof x, number, string>>()({
//   swan: 1,
// });

// type KeysOf<T, V = unknown, R = unknown> = {[K in keyof T]?: T[K] extends R ? V : never};

// function check<T>(): <U extends T>(arg: U) => U {
//   return arg => arg;
// }

const locationNames: (string | undefined)[] = (() => {
  const names = [];
  for (const key of Object.keys(LOCATIONS)) {
    const [id, name] = (LOCATIONS as any)[key];
    names[id] = name;
  }
  return names;
})();

// building the CSV for the location table.
//const h=(x)=>x==null?'null':'$'+x.toString(16).padStart(2,0);
//'id,name,bgm,width,height,animation,extended,tilepat0,tilepat1,tilepal0,tilepal1,tileset,tile effects,exits,sprpat0,sprpat1,sprpal0,sprpal1,obj0d,obj0e,obj0f,obj10,obj11,obj12,obj13,obj14,obj15,obj16,obj17,obj18,obj19,obj1a,obj1b,obj1c,obj1d,obj1e,obj1f\n'+rom.locations.map(l=>!l||!l.used?'':[h(l.id),l.name,h(l.bgm),l.layoutWidth,l.layoutHeight,l.animation,l.extended,h((l.tilePatterns||[])[0]),h((l.tilePatterns||[])[1]),h((l.tilePalettes||[])[0]),h((l.tilePalettes||[])[1]),h(l.tileset),h(l.tileEffects),[...new Set(l.exits.map(x=>h(x[2])))].join(':'),h((l.spritePatterns||[])[0]),h((l.spritePatterns||[])[1]),h((l.spritePalettes||[])[0]),h((l.spritePalettes||[])[1]),...new Array(19).fill(0).map((v,i)=>((l.objects||[])[i]||[]).slice(2).map(x=>x.toString(16)).join(':'))]).filter(x=>x).join('\n')

// building csv for loc-obj cross-reference table
// seq=(s,e,f)=>new Array(e-s).fill(0).map((x,i)=>f(i+s));
// uniq=(arr)=>{
//   const m={};
//   for (let o of arr) {
//     o[6]=o[5]?1:0;
//     if(!o[5])m[o[2]]=(m[o[2]]||0)+1;
//   }
//   for (let o of arr) {
//     if(o[2] in m)o[6]=m[o[2]];
//     delete m[o[2]];
//   }
//   return arr;
// }
// 'loc,locname,mon,monname,spawn,type,uniq,patslot,pat,palslot,pal2,pal3\n'+
// rom.locations.flatMap(l=>!l||!l.used?[]:uniq(seq(0xd,0x20,s=>{
//   const o=(l.objects||[])[s-0xd]||null;
//   if (!o) return null;
//   const type=o[2]&7;
//   const m=type?null:0x50+o[3];
//   const patSlot=o[2]&0x80?1:0;
//   const mon=m?rom.objects[m]:null;
//   const palSlot=(mon?mon.palettes(false):[])[0];
//   const allPal=new Set(mon?mon.palettes(true):[]);
//   return [h(l.id),l.name,h(m),'',h(s),type,0,patSlot,m?h((l.spritePatterns||[])[patSlot]):'',palSlot,allPal.has(2)?h((l.spritePalettes||[])[0]):'',allPal.has(3)?h((l.spritePalettes||[])[1]):''];
// }).filter(x=>x))).map(a=>a.join(',')).filter(x=>x).join('\n');

const NEXUSES = new Set<number>([
  LOCATIONS.mtSabreWestLower[0],
  LOCATIONS.mtSabreWestUpper[0],
  LOCATIONS.mtSabreNorthMain[0],
  LOCATIONS.mtSabreNorthMiddle[0],
  LOCATIONS.mtSabreNorthCave1[0],
  LOCATIONS.mtSabreNorthCave2[0],
  LOCATIONS.mtHydra[0],
  LOCATIONS.mtHydraOutsideShyron[0],
  LOCATIONS.mtHydraCave1[0],
]);
