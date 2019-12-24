import {Area, Areas} from './area.js';
import {Entity} from './entity.js';
import {Screen} from './screen.js';
import {Data, DataTuple,
        concatIterables, group, hex, initializer,
        readLittleEndian, seq, tuple, varSlice,
        writeLittleEndian, upperCamelToSpaces} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';
import {UnionFind} from '../unionfind.js';
import {assertNever, iters, DefaultMap} from '../util.js';
import {Monster} from './monster.js';
import {Random} from '../random.js';

// Number indicates to copy whatever's at the given exit
type Key = string | symbol | number;
// Local for defining names on Locations objects.
interface LocationInit {
  area?: (areas: Areas) => Area;
  subArea?: string;
  music?: Key | ((area: Area) => Key);
  palette?: Key | ((area: Area) => Key);
  bossScreen?: number;
}
interface LocationData {
  area: Area;
  name: string;
  music: Key;
  palette: Key;
  subArea?: string;
  bossScreen?: number;
  fixed?: number[]; // fixed spawn slots?
}

const CAVE = {
  subArea: 'cave',
  music: (area: Area) => `${area.name}-Cave`,
  palette: (area: Area) => `${area.name}-Cave`,
} as const;
const HOUSE = {
  subArea: 'house',
  palette: () => Symbol(),
} as const;
const FORTUNE_TELLER = {
  subArea: 'house',
  palette: () => Symbol(),
  music: (area: Area) => `${area.name}-FortuneTeller`,
} as const;
const MESIA = {
  name: 'mesia',
  music: (area: Area) => `${area.name}-Mesia`,
  // Mesia in tower keeps same palette
  palette: (area: Area) => area.name === 'Tower' ?
      area.name : `${area.name}-Mesia`,
} as const;
const DYNA = {
  name: 'dyna',
  music: (area: Area) => `${area.name}-Dyna`,
  palette: (area: Area) => `${area.name}-Dyna`,
} as const;
const KELBESQUE = {
  name: 'goa 1',
  music: 'goa 1',
  palette: 'goa 1',
} as const;
const SABERA = {
  name: 'goa 2',
  music: 'goa 2',
  palette: 'goa 2',
} as const;
const MADO_LOWER = {
  name: 'goa 3',
  music: 'goa 3',
  palette: 'goa 3',
} as const;
const MADO_UPPER = {...MADO_LOWER, palette: 'goa 3 upper'} as const;
const KARMINE_UPPER = {
  name: 'goa 4',
  music: 'goa 4',
  palette: 'goa 4',
} as const;
const KARMINE_LOWER = {...KARMINE_UPPER, palette: 'goa 4 lower'} as const;

type InitParams = readonly [number, LocationInit?];
type Init = {(...args: InitParams): Location,
             commit(locations: Locations): void};
const $: Init = (() => {
  const $ = initializer<[number, LocationInit], Location>();
  let area!: (areas: Areas) => Area;
  function $$(id: number, data: LocationInit = {}): Location {
    data = {...data};
    area = data.area = data.area || area;
    return $(id, data);
  };
  ($$ as Init).commit = (locations: Locations) => {
    const areas = locations.rom.areas;
    $.commit(locations, (prop: string, id: number, init: LocationInit) => {
      const name = upperCamelToSpaces(prop);
      const area = init.area!(areas);
      const music = typeof init.music === 'function' ?
          init.music(area) : init.music != null ?
          init.music : area.name;
      const palette = typeof init.palette === 'function' ?
          init.palette(area) : init.palette || area.name;
      const data: LocationData = {area, name, music, palette};
      if (init.subArea != null) data.subArea = init.subArea;
      if (init.bossScreen != null) data.bossScreen = init.bossScreen;
      const location = new Location(locations.rom, id, data);
      // negative id indicates it's not registered.
      if (id >= 0) locations[id] = location;
      return location;
    });
  };
  return $$ as Init;
})();

export class Locations extends Array<Location> {

  readonly MezameShrine             = $(0x00, {area: a => a.Mezame});
  readonly Leaf_OutsideStart        = $(0x01, {music: 1});
  readonly Leaf                     = $(0x02, {area: a => a.Leaf});
  readonly ValleyOfWind             = $(0x03, {area: a => a.ValleyOfWind});
  readonly SealedCave1              = $(0x04, {area: a => a.SealedCave});
  readonly SealedCave2              = $(0x05);
  readonly SealedCave6              = $(0x06);
  readonly SealedCave4              = $(0x07);
  readonly SealedCave5              = $(0x08);
  readonly SealedCave3              = $(0x09);
  readonly SealedCave7              = $(0x0a, {bossScreen: 0x91});
  // INVALID: 0x0b
  readonly SealedCave8              = $(0x0c);
  // INVALID: 0x0d
  readonly WindmillCave             = $(0x0e, {area: a => a.WindmillCave});
  readonly Windmill                 = $(0x0f, {area: a => a.Windmill, music: 0});
  readonly ZebuCave                 = $(0x10, {area: a => a.ZebuCave});
  readonly MtSabreWest_Cave1        = $(0x11, {area: a => a.MtSabreWest, ...CAVE});
  // INVALID: 0x12
  // INVALID: 0x13
  readonly CordelPlainWest          = $(0x14, {area: a => a.CordelPlain});
  readonly CordelPlainEast          = $(0x15);
  // INVALID: 0x16 -- unused copy of 18
  // INVALID: 0x17
  readonly Brynmaer                 = $(0x18, {area: a => a.Brynmaer});
  readonly OutsideStomHouse         = $(0x19, {area: a => a.StomHouse,
                                               music: 0});
  readonly Swamp                    = $(0x1a, {area: a => a.Swamp,
                                               bossScreen: 0x7c});
  readonly Amazones                 = $(0x1b, {area: a => a.Amazones,
                                               fixed: [0x0d, 0x0e]}); // guard/empty
  readonly Oak                      = $(0x1c, {area: a => a.Oak});
  // INVALID: 0x1d
  readonly StomHouse                = $(0x1e, {area: a => a.StomHouse});
  // INVALID: 0x1f
  readonly MtSabreWest_Lower        = $(0x20, {area: a => a.MtSabreWest});
  readonly MtSabreWest_Upper        = $(0x21);
  readonly MtSabreWest_Cave2        = $(0x22, CAVE);
  readonly MtSabreWest_Cave3        = $(0x23, CAVE);
  readonly MtSabreWest_Cave4        = $(0x24, CAVE);
  readonly MtSabreWest_Cave5        = $(0x25, CAVE);
  readonly MtSabreWest_Cave6        = $(0x26, CAVE);
  readonly MtSabreWest_Cave7        = $(0x27, CAVE);
  readonly MtSabreNorth_Main        = $(0x28, {area: a => a.MtSabreNorth,
                                              bossScreen: 0xb5});
  readonly MtSabreNorth_Middle      = $(0x29);
  readonly MtSabreNorth_Cave2       = $(0x2a, CAVE);
  readonly MtSabreNorth_Cave3       = $(0x2b, CAVE);
  readonly MtSabreNorth_Cave4       = $(0x2c, CAVE);
  readonly MtSabreNorth_Cave5       = $(0x2d, CAVE);
  readonly MtSabreNorth_Cave6       = $(0x2e, CAVE);
  readonly MtSabreNorth_PrisonHall  = $(0x2f, CAVE);
  readonly MtSabreNorth_LeftCell    = $(0x30, CAVE);
  readonly MtSabreNorth_LeftCell2   = $(0x31, CAVE);
  readonly MtSabreNorth_RightCell   = $(0x32, CAVE);
  readonly MtSabreNorth_Cave8       = $(0x33, CAVE);
  readonly MtSabreNorth_Cave9       = $(0x34, CAVE);
  readonly MtSabreNorth_SummitCave  = $(0x35, CAVE);
  // INVALID: 0x36
  // INVALID: 0x37
  readonly MtSabreNorth_Cave1       = $(0x38, CAVE);
  readonly MtSabreNorth_Cave7       = $(0x39, CAVE);
  // INVALID: 0x3a
  // INVALID: 0x3b
  readonly Nadare_Inn               = $(0x3c, {area: a => a.Nadare, ...HOUSE});
  readonly Nadare_ToolShop          = $(0x3d, HOUSE);
  readonly Nadare_BackRoom          = $(0x3e, HOUSE);
  // INVALID: 0x3f
  readonly WaterfallValleyNorth     = $(0x40, {area: a => a.WaterfallValley});
  readonly WaterfallValleySouth     = $(0x41);
  readonly LimeTreeValley           = $(0x42, {area: a => a.LimeTreeValley,
                                               music: 0});
  readonly LimeTreeLake             = $(0x43, {area: a => a.LimeTreeLake,
                                               music: 0});
  readonly KirisaPlantCave1         = $(0x44, {area: a => a.KirisaPlantCave});
  readonly KirisaPlantCave2         = $(0x45);
  readonly KirisaPlantCave3         = $(0x46);
  readonly KirisaMeadow             = $(0x47, {area: a => a.KirisaMeadow});
  readonly FogLampCave1             = $(0x48, {area: a => a.FogLampCave});
  readonly FogLampCave2             = $(0x49);
  readonly FogLampCave3             = $(0x4a);
  readonly FogLampCaveDeadEnd       = $(0x4b);
  readonly FogLampCave4             = $(0x4c);
  readonly FogLampCave5             = $(0x4d);
  readonly FogLampCave6             = $(0x4e);
  readonly FogLampCave7             = $(0x4f);
  readonly Portoa                   = $(0x50, {area: a => a.Portoa});
  readonly Portoa_FishermanIsland   = $(0x51, {area: a => a.FishermanHouse,
                                               music: 0});
  readonly MesiaShrine              = $(0x52, {area: a => a.LimeTreeLake,
                                               ...MESIA});
  // INVALID: 0x53
  readonly WaterfallCave1           = $(0x54, {area: a => a.WaterfallCave});
  readonly WaterfallCave2           = $(0x55);
  readonly WaterfallCave3           = $(0x56);
  readonly WaterfallCave4           = $(0x57);
  readonly TowerEntrance            = $(0x58, {area: a => a.Tower});
  readonly Tower1                   = $(0x59);
  readonly Tower2                   = $(0x5a);
  readonly Tower3                   = $(0x5b);
  readonly TowerOutsideMesia        = $(0x5c);
  readonly TowerOutsideDyna         = $(0x5d);
  readonly TowerMesia               = $(0x5e, MESIA);
  readonly TowerDyna                = $(0x5f, DYNA);
  readonly AngrySea                 = $(0x60, {area: a => a.AngrySea});
  readonly BoatHouse                = $(0x61);
  readonly JoelLighthouse           = $(0x62, {area: a => a.Lighthouse,
                                               music: 0});
  // INVALID: 0x63
  readonly UndergroundChannel       = $(0x64, {area: a => a.UndergroundChannel});
  readonly ZombieTown               = $(0x65, {area: a => a.ZombieTown});
  // INVALID: 0x66
  // INVALID: 0x67
  readonly EvilSpiritIsland1        = $(0x68, {area: a => a.EvilSpiritIslandEntrance,
                                               music: 1});
  readonly EvilSpiritIsland2        = $(0x69, {area: a => a.EvilSpiritIsland});
  readonly EvilSpiritIsland3        = $(0x6a);
  readonly EvilSpiritIsland4        = $(0x6b);
  readonly SaberaPalace1            = $(0x6c, {area: a => a.SaberaFortress,
                                               bossScreen: 0xfd});
  readonly SaberaPalace2            = $(0x6d);
  readonly SaberaPalace3            = $(0x6e, {bossScreen: 0xfd});
  // INVALID: 0x6f -- Sabera Palace 3 unused copy
  readonly JoelSecretPassage        = $(0x70, {area: a => a.JoelPassage});
  readonly Joel                     = $(0x71, {area: a => a.Joel});
  readonly Swan                     = $(0x72, {area: a => a.Swan, music: 1});
  readonly SwanGate                 = $(0x73, {area: a => a.SwanGate,
                                               music: 1});
  // INVALID: 0x74
  // INVALID: 0x75
  // INVALID: 0x76
  // INVALID: 0x77
  readonly GoaValley                = $(0x78, {area: a => a.GoaValley});
  // INVALID: 0x79
  // INVALID: 0x7a
  // INVALID: 0x7b
  readonly MtHydra                  = $(0x7c, {area: a => a.MtHydra});
  readonly MtHydra_Cave1            = $(0x7d, CAVE);
  readonly MtHydra_OutsideShyron    = $(0x7e, {fixed: [0x0d, 0x0e]}); // guards
  readonly MtHydra_Cave2            = $(0x7f, CAVE);
  readonly MtHydra_Cave3            = $(0x80, CAVE);
  readonly MtHydra_Cave4            = $(0x81, CAVE);
  readonly MtHydra_Cave5            = $(0x82, CAVE);
  readonly MtHydra_Cave6            = $(0x83, CAVE);
  readonly MtHydra_Cave7            = $(0x84, CAVE);
  readonly MtHydra_Cave8            = $(0x85, CAVE);
  readonly MtHydra_Cave9            = $(0x86, CAVE);
  readonly MtHydra_Cave10           = $(0x87, CAVE);
  readonly Styx1                    = $(0x88, {area: a => a.Styx});
  readonly Styx2                    = $(0x89);
  readonly Styx3                    = $(0x8a);
  // INVALID: 0x8b
  readonly Shyron                   = $(0x8c, {area: a => a.Shyron});
  // INVALID: 0x8d
  readonly Goa                      = $(0x8e, {area: a => a.Goa});
  readonly GoaFortressBasement      = $(0x8f, {area: a => a.FortressBasement,
                                               music: 0});
  readonly Desert1                  = $(0x90, {area: a => a.Desert1});
  readonly OasisCaveMain            = $(0x91, {area: a => a.OasisCave});
  readonly DesertCave1              = $(0x92, {area: a => a.DesertCave1,
                                               music: 0});
  readonly Sahara                   = $(0x93, {area: a => a.Sahara});
  readonly SaharaOutsideCave        = $(0x94, {music: 0}); // TODO - sahara?? generic??
  readonly DesertCave2              = $(0x95, {area: a => a.DesertCave2, music: 1});
  readonly SaharaMeadow             = $(0x96, {area: a => a.SaharaMeadow, music: 0});
  // INVALID: 0x97
  readonly Desert2                  = $(0x98, {area: a => a.Desert2});
  // INVALID: 0x99
  // INVALID: 0x9a
  // INVALID: 0x9b
  readonly Pyramid_Entrance         = $(0x9c, {area: a => a.Pyramid});
  readonly Pyramid_Branch           = $(0x9d);
  readonly Pyramid_Main             = $(0x9e);
  readonly Pyramid_Draygon          = $(0x9f);
  readonly Crypt_Entrance           = $(0xa0, {area: a => a.Crypt});
  readonly Crypt_Hall1              = $(0xa1);
  readonly Crypt_Branch             = $(0xa2);
  readonly Crypt_DeadEndLeft        = $(0xa3);
  readonly Crypt_DeadEndRight       = $(0xa4);
  readonly Crypt_Hall2              = $(0xa5);
  readonly Crypt_Draygon2           = $(0xa6);
  readonly Crypt_Teleporter         = $(0xa7, {music: 'Crypt-Teleporter'});
  readonly GoaFortress_Entrance     = $(0xa8, {area: a => a.GoaFortress,
                                               music: 1});
  readonly GoaFortress_Kelbesque    = $(0xa9, {bossScreen: 0x73,
                                               ...KELBESQUE});
  readonly GoaFortress_Zebu         = $(0xaa, {...KELBESQUE, palette: 1});
  readonly GoaFortress_Sabera       = $(0xab, SABERA);
  readonly GoaFortress_Tornel       = $(0xac, {bossScreen: 0x91,
                                               ...SABERA,
                                               palette: 1});
  readonly GoaFortress_Mado1        = $(0xad, MADO_LOWER);
  readonly GoaFortress_Mado2        = $(0xae, MADO_UPPER);
  readonly GoaFortress_Mado3        = $(0xaf, MADO_UPPER);
  readonly GoaFortress_Karmine1     = $(0xb0, KARMINE_UPPER);
  readonly GoaFortress_Karmine2     = $(0xb1, KARMINE_UPPER);
  readonly GoaFortress_Karmine3     = $(0xb2, KARMINE_UPPER);
  readonly GoaFortress_Karmine4     = $(0xb3, KARMINE_UPPER);
  readonly GoaFortress_Karmine5     = $(0xb4, KARMINE_UPPER);
  readonly GoaFortress_Karmine6     = $(0xb5, KARMINE_LOWER);
  readonly GoaFortress_Karmine7     = $(0xb6, {bossScreen: 0xfd,
                                               ...KARMINE_LOWER});
  readonly GoaFortress_Exit         = $(0xb7, {music: 0});
  readonly OasisCave_Entrance       = $(0xb8, {area: a => a.OasisEntrance,
                                               music: 2});
  readonly GoaFortress_Asina        = $(0xb9, {area: a => a.GoaFortress,
                                               ...MADO_UPPER,
                                               bossScreen: 0x91});
  readonly GoaFortress_Kensu        = $(0xba, KARMINE_UPPER);
  readonly Goa_House                = $(0xbb, {area: a => a.Goa, ...HOUSE});
  readonly Goa_Inn                  = $(0xbc, HOUSE);
  // INVALID: 0xbd
  readonly Goa_ToolShop             = $(0xbe, HOUSE);
  readonly Goa_Tavern               = $(0xbf, HOUSE);
  readonly Leaf_ElderHouse          = $(0xc0, {area: a => a.Leaf, ...HOUSE});
  readonly Leaf_RabbitHut           = $(0xc1, HOUSE);
  readonly Leaf_Inn                 = $(0xc2, HOUSE);
  readonly Leaf_ToolShop            = $(0xc3, HOUSE);
  readonly Leaf_ArmorShop           = $(0xc4, HOUSE);
  readonly Leaf_StudentHouse        = $(0xc5, HOUSE);
  readonly Brynmaer_Tavern          = $(0xc6, {area: a => a.Brynmaer, ...HOUSE});
  readonly Brynmaer_PawnShop        = $(0xc7, HOUSE);
  readonly Brynmaer_Inn             = $(0xc8, HOUSE);
  readonly Brynmaer_ArmorShop       = $(0xc9, HOUSE);
  // INVALID: 0xca
  readonly Brynmaer_ItemShop        = $(0xcb, HOUSE);
  // INVALID: 0xcc
  readonly Oak_ElderHouse           = $(0xcd, {area: a => a.Oak, ...HOUSE});
  readonly Oak_MotherHouse          = $(0xce, HOUSE);
  readonly Oak_ToolShop             = $(0xcf, HOUSE);
  readonly Oak_Inn                  = $(0xd0, HOUSE);
  readonly Amazones_Inn             = $(0xd1, {area: a => a.Amazones, ...HOUSE});
  readonly Amazones_ItemShop        = $(0xd2, HOUSE);
  readonly Amazones_ArmorShop       = $(0xd3, HOUSE);
  readonly Amazones_Elder           = $(0xd4, HOUSE);
  readonly Nadare                   = $(0xd5, {area: a => a.Nadare}); // edge-door?
  readonly Portoa_FishermanHouse    = $(0xd6, {area: a => a.FishermanHouse,
                                               ...HOUSE, music: 0});
  readonly PortoaPalace_Entrance    = $(0xd7, {area: a => a.PortoaPalace,
                                               fixed: [0x0d, 0x0e]}); // guard/empty
  readonly Portoa_FortuneTeller     = $(0xd8, {area: a => a.Portoa,
                                               ...FORTUNE_TELLER});
  readonly Portoa_PawnShop          = $(0xd9, HOUSE);
  readonly Portoa_ArmorShop         = $(0xda, HOUSE);
  // INVALID: 0xdb
  readonly Portoa_Inn               = $(0xdc, HOUSE);
  readonly Portoa_ToolShop          = $(0xdd, HOUSE);
  readonly PortoaPalace_Left        = $(0xde, {area: a => a.PortoaPalace,
                                               ...HOUSE});
  readonly PortoaPalace_ThroneRoom  = $(0xdf, HOUSE);
  readonly PortoaPalace_Right       = $(0xe0, HOUSE);
  readonly Portoa_AsinaRoom         = $(0xe1, {area: a => a.UndergroundChannel,
                                               ...HOUSE, music: 'asina'});
  readonly Amazones_ElderDownstairs = $(0xe2, {area: a => a.Amazones,
                                               ...HOUSE});
  readonly Joel_ElderHouse          = $(0xe3, {area: a => a.Joel, ...HOUSE});
  readonly Joel_Shed                = $(0xe4, HOUSE);
  readonly Joel_ToolShop            = $(0xe5, HOUSE);
  // INVALID: 0xe6
  readonly Joel_Inn                 = $(0xe7, HOUSE);
  readonly ZombieTown_House         = $(0xe8, {area: a => a.ZombieTown,
                                               ...HOUSE});
  readonly ZombieTown_HouseBasement = $(0xe9, HOUSE);
  // INVALID: 0xea
  readonly Swan_ToolShop            = $(0xeb, {area: a => a.Swan, ...HOUSE});
  readonly Swan_StomHut             = $(0xec, HOUSE);
  readonly Swan_Inn                 = $(0xed, HOUSE);
  readonly Swan_ArmorShop           = $(0xee, HOUSE);
  readonly Swan_Tavern              = $(0xef, HOUSE);
  readonly Swan_PawnShop            = $(0xf0, HOUSE);
  readonly Swan_DanceHall           = $(0xf1, HOUSE);
  readonly Shyron_Temple            = $(0xf2, {area: a => a.ShyronTemple,
                                               bossScreen: 0x70});
  readonly Shyron_TrainingHall      = $(0xf3, {area: a => a.Shyron, ...HOUSE});
  readonly Shyron_Hospital          = $(0xf4, HOUSE);
  readonly Shyron_ArmorShop         = $(0xf5, HOUSE);
  readonly Shyron_ToolShop          = $(0xf6, HOUSE);
  readonly Shyron_Inn               = $(0xf7, HOUSE);
  readonly Sahara_Inn               = $(0xf8, {area: a => a.Sahara, ...HOUSE});
  readonly Sahara_ToolShop          = $(0xf9, HOUSE);
  readonly Sahara_ElderHouse        = $(0xfa, HOUSE);
  readonly Sahara_PawnShop          = $(0xfb, HOUSE);

  // New locations, no ID procured yet.
  readonly EastCave1      = $(-1, {area: a => a.EastCave});
  readonly EastCave2      = $(-1);
  readonly EastCave3      = $(-1);
  readonly FishermanBeach = $(-1, {area: a => a.FishermanHouse, ...HOUSE});

  constructor(readonly rom: Rom) {
    super(0x100);
    $.commit(this);
    // Fill in any missing ones
    for (let id = 0; id < 0x100; id++) {
      if (this[id]) continue;
      this[id] = new Location(rom, id, {
        area: rom.areas.Empty,
        name: '',
        music: '',
        palette: '',
      });
    }
    // TODO - method to add an unregistered location to an empty index.
  }

  allocate(location: Location): Location {
    // pick an unused location
    for (const l of this) {
      if (l.used) continue;
      (location as any).id = l.id;
      location.used = true;
      return this[l.id] = location;
    }
    throw new Error('No unused location');
  }

  // // Find all groups of neighboring locations with matching properties.
  // // TODO - optional arg: check adjacent # IDs...?
  // partition<T>(func: (loc: Location) => T, eq: Eq<T> = (a, b) => a === b, joinNexuses = false): [Location[], T][] {
  //   const seen = new Set<Location>();
  //   const out: [Location[], T][] = [];
  //   for (let loc of this) {
  //     if (seen.has(loc) || !loc.used) continue;
  //     seen.add(loc);
  //     const value = func(loc);
  //     const group = [];
  //     const queue = [loc];
  //     while (queue.length) {
  //       const next = queue.pop()!;
  //       group.push(next);
  //       for (const n of next.neighbors(joinNexuses)) {
  //         if (!seen.has(n) && eq(func(n), value)) {
  //           seen.add(n);
  //           queue.push(n);
  //         }
  //       }
  //     }
  //     out.push([[...group], value]);
  //   }
  //   return out;
  // }
}

// Location entities
export class Location extends Entity {

  used: boolean;

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

  spritePalettes: [number, number];
  spritePatterns: [number, number];
  spawns: Spawn[];

  constructor(rom: Rom, id: number, readonly data: LocationData) {
    // will include both MapData *and* NpcData, since they share a key.
    super(rom, id);

    const mapDataBase =
        id >= 0 ? readLittleEndian(rom.prg, this.mapDataPointer) + 0xc000 : 0;
    // TODO - pass this in and move LOCATIONS to locations.ts
    this.used = mapDataBase > 0xc000 && !!this.name;

    if (!this.used) {
      this.bgm = 0;
      this.layoutWidth = 0;
      this.layoutHeight = 0;
      this.animation = 0;
      this.extended = 0;
      this.screens = [[0]];
      this.tilePalettes = [0x24, 0x01, 0x26];
      this.tileset = 0x80;
      this.tileEffects = 0xb3;
      this.tilePatterns = [2, 4];
      this.exits = [];
      this.entrances = [];
      this.flags = [];
      this.pits = [];
      this.spawns = [];
      this.spritePalettes = [0, 0];
      this.spritePatterns = [0, 0];
      return;
    }

    const layoutBase = readLittleEndian(rom.prg, mapDataBase) + 0xc000;
    const graphicsBase = readLittleEndian(rom.prg, mapDataBase + 2) + 0xc000;
    const entrancesBase = readLittleEndian(rom.prg, mapDataBase + 4) + 0xc000;
    const exitsBase = readLittleEndian(rom.prg, mapDataBase + 6) + 0xc000;
    const flagsBase = readLittleEndian(rom.prg, mapDataBase + 8) + 0xc000;

    // Read the exits first so that we can determine if there's entrance/pits
    // metadata encoded at the end.
    let hasPits = this.used && layoutBase !== mapDataBase + 10;
    let entranceLen = exitsBase - entrancesBase;
    this.exits = (() => {
      const exits = [];
      let i = exitsBase;
      while (!(rom.prg[i] & 0x80)) {
        // NOTE: set dest to FF to disable an exit (it's an invalid location anyway)
        if (rom.prg[i + 2] != 0xff) {
          exits.push(Exit.from(rom.prg, i));
        }
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
    const pitsBase =
        !hasPits ? 0 : readLittleEndian(rom.prg, mapDataBase + 10) + 0xc000;

    this.bgm = rom.prg[layoutBase];
    this.layoutWidth = rom.prg[layoutBase + 1];
    this.layoutHeight = rom.prg[layoutBase + 2];
    this.animation = rom.prg[layoutBase + 3];
    this.extended = rom.prg[layoutBase + 4];
    this.screens = seq(
        this.height,
        y => tuple(rom.prg, layoutBase + 5 + y * this.width, this.width));
    this.tilePalettes = tuple<number>(rom.prg, graphicsBase, 3);
    this.tileset = rom.prg[graphicsBase + 3];
    this.tileEffects = rom.prg[graphicsBase + 4];
    this.tilePatterns = tuple(rom.prg, graphicsBase + 5, 2);

    this.entrances =
      group(4, rom.prg.slice(entrancesBase, entrancesBase + entranceLen),
            x => Entrance.from(x));
    this.flags = varSlice(rom.prg, flagsBase, 2, 0xff, Infinity,
                          x => Flag.from(x));
    this.pits = pitsBase ? varSlice(rom.prg, pitsBase, 4, 0xff, Infinity,
                                    x => Pit.from(x)) : [];

    const npcDataBase = readLittleEndian(rom.prg, this.npcDataPointer) + 0x10000;
    const hasSpawns = npcDataBase !== 0x10000;
    this.spritePalettes =
        hasSpawns ? tuple(rom.prg, npcDataBase + 1, 2) : [0, 0];
    this.spritePatterns =
        hasSpawns ? tuple(rom.prg, npcDataBase + 3, 2) : [0, 0];
    this.spawns =
        hasSpawns ? varSlice(rom.prg, npcDataBase + 5, 4, 0xff, Infinity,
                             x => Spawn.from(x)) : [];
  }

  get name(): string {
    return this.data.name;
  }

  get mapDataPointer(): number {
    if (this.id < 0) throw new Error(`no mapdata pointer for ${this.name}`);
    return 0x14300 + (this.id << 1);
  }

  get npcDataPointer(): number {
    if (this.id < 0) throw new Error(`no npcdata pointer for ${this.name}`);
    return 0x19201 + (this.id << 1);
  }

  get hasSpawns(): boolean {
    return this.spawns.length > 0;
  }

  // Offset to OR with screen IDs.
  get screenPage(): number {
    if (!this.rom.compressedMapData) return this.extended ? 0x100 : 0;
    return this.extended << 8;
  }

  isShop(): boolean {
    return this.rom.shops.findIndex(s => s.location === this.id) >= 0;
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
    if (!this.spawns.length) {
      this.spritePalettes = [0xff, 0xff];
      this.spritePatterns = [0xff, 0xff];
    }
    // write NPC data first, if present...
    const data = [0, ...this.spritePalettes, ...this.spritePatterns,
                  ...concatIterables(this.spawns), 0xff];
    promises.push(
        writer.write(data, 0x18000, 0x1bfff, `NpcData ${hex(this.id)}`)
            .then(address => writeLittleEndian(
                writer.rom, this.npcDataPointer, address - 0x10000)));
    const write = (data: Data<number>, name: string) =>
        writer.write(data, 0x14000, 0x17fff, `${name} ${hex(this.id)}`);
    const layout = this.rom.compressedMapData ? [
      this.bgm,
      // Compressed version: yx in one byte, ext+anim in one byte
      this.layoutHeight << 4 | this.layoutWidth,
      this.extended << 2 | this.animation,
      ...concatIterables(this.screens),
    ] : [
      this.bgm,
      this.layoutWidth, this.layoutHeight, this.animation, this.extended,
      ...concatIterables(this.screens),
    ];
    const graphics =
        [...this.tilePalettes,
         this.tileset, this.tileEffects,
         ...this.tilePatterns];
    // Quick sanity check: if an entrance/exit is below the HUD on a
    // non-vertically scrolling map, then we need to move it up.
    if (this.height === 1) {
      for (const entrance of this.entrances) {
        if (!entrance.used) continue;
        if (entrance.y > 0xbf) entrance.y = 0xbf;
      }
      for (const exit of this.exits) {
        if (exit.yt > 0x0c) exit.yt = 0x0c;
      }
    }
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
      // Set the "restore music" byte for the boss, but if it's Draygon 2, set
      // it to zero since no music is actually playing, and if the music in the
      // teleporter room happens to be the same as the music in the crypt, then
      // resetting to that means it will just remain silent, and not restart.
      const restoreBgm = this.id === 0xa6 ? 0 : this.bgm;
      const bossRestore = [
        ,,, restoreBgm,,
        ...this.tilePalettes,,,, this.spritePalettes[0],,
        ,,,, /*pats[0]*/, /*pats[1]*/,
        this.animation,
      ];
      const [] = [pats]; // avoid error

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
    const ext = this.screenPage;
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

  // neighbors(joinNexuses: boolean = false): Set<Location> {
  //   const out = new Set<Location>();
  //   const addNeighbors = (l: Location) => {
  //     for (const exit of l.exits) {
  //       const id = exit.dest;
  //       const neighbor = this.rom.locations[id];
  //       if (neighbor && neighbor.used &&
  //           neighbor !== this && !out.has(neighbor)) {
  //         out.add(neighbor);
  //         if (joinNexuses && NEXUSES[neighbor.key]) {
  //           addNeighbors(neighbor);
  //         }
  //       }
  //     }
  //   }
  //   addNeighbors(this);
  //   return out;
  // }

  hasDolphin(): boolean {
    return this.id === 0x60 || this.id === 0x64 || this.id === 0x68;
  }

  /**
   * @return Map of tiles ($YXyx) reachable from any entrance to
   * unflagged tileeffects.
   */
  reachableTiles(fly = false): Map<number, number> {
    // TODO - args for (1) use non-2ef flags, (2) only from given entrance/tile
    // Dolphin makes NO_WALK okay for some levels.
    if (this.hasDolphin()) fly = true;
    // Take into account the tileset and flags but not any overlay.
    const exits = new Set(this.exits.map(exit => exit.screen << 8 | exit.tile));
    const uf = new UnionFind<number>();
    const tileset = this.rom.tileset(this.tileset);
    const tileEffects = this.rom.tileEffects[this.tileEffects - 0xb3];
    const passable = new Set<number>();
    
    for (let y = 0; y < this.height; y++) {
      const row = this.screens[y];
      for (let x = 0; x < this.width; x++) {
        const screen = this.rom.screens[row[x] | this.screenPage];
        const pos = y << 4 | x;
        const flag = this.flags.find(f => f.screen === pos);
        for (let t = 0; t < 0xf0; t++) {
          const tileId = pos << 8 | t;
          if (exits.has(tileId)) continue; // don't go past exits
          let tile = screen.tiles[t];
          // flag 2ef is "always on", don't even bother making it conditional.
          let effects = tileEffects.effects[tile];
          let blocked = fly ? effects & 0x04 : effects & 0x06;
          if (flag && blocked && tile < 0x20 && tileset.alternates[tile] != tile) {
            tile = tileset.alternates[tile];
            effects = tileEffects.effects[tile];
            blocked = fly ? effects & 0x04 : effects & 0x06;
          }
          if (!blocked) passable.add(tileId);
        }
      }
    }

    for (let t of passable) {
      const right = (t & 0x0f) === 0x0f ? t + 0xf1 : t + 1;
      if (passable.has(right)) uf.union([t, right]);
      const below = (t & 0xf0) === 0xe0 ? t + 0xf20 : t + 16;
      if (passable.has(below)) uf.union([t, below]);
    }

    const map = uf.map();
    const sets = new Set<Set<number>>();
    for (const entrance of this.entrances) {
      if (!entrance.used) continue;
      const id = entrance.screen << 8 | entrance.tile;
      // NOTE: map should always have id, but bogus entrances
      // (e.g. Goa Valley entrance 2) can cause problems.
      sets.add(map.get(id) || new Set());
    }

    const out = new Map<number, number>();
    for (const set of sets) {
      for (const t of set) {
        const scr = this.screens[t >>> 12][(t >>> 8) & 0x0f];
        const screen = this.rom.screens[scr | this.screenPage];
        out.set(t, tileEffects.effects[screen.tiles[t & 0xff]]);
      }
    }
    return out;
  }

  /** Safer version of the below? */
  screenMover(): (orig: number, repl: number) => void {
    const map = new DefaultMap<number, Array<{screen: number}>>(() => []);
    const objs =
        iters.concat<{screen: number}>(this.spawns, this.exits, this.entrances);
    for (const obj of objs) {
      map.get(obj.screen).push(obj);
    }
    return (orig: number, repl: number) => {
      for (const obj of map.get(orig)) {
        obj.screen = repl;
      }
    };
  }

  /**
   * Moves all spawns, entrances, and exits.
   * @param orig YX of the original screen.
   * @param repl YX of the equivalent replacement screen.
   */
  moveScreen(orig: number, repl: number): void {
    const objs =
        iters.concat<{screen: number}>(this.spawns, this.exits, this.entrances);
    for (const obj of objs) {
      if (obj.screen === orig) obj.screen = repl;
    }
  }

  // TODO - factor this out into a separate class?
  //   - holds metadata about map tiles in general?
  //   - need to figure out what to do with pits...
  monsterPlacer(random: Random): (m: Monster) => number | undefined {
    // If there's a boss screen, exclude it from getting enemies.
    const boss = this.data.bossScreen;
    // Start with list of reachable tiles.
    const reachable = this.reachableTiles(false);
    // Do a breadth-first search of all tiles to find "distance" (1-norm).
    const extended = new Map<number, number>([...reachable.keys()].map(x => [x, 0]));
    const normal: number[] = []; // reachable, not slope or water
    const moths: number[] = [];  // distance ∈ 3..7
    const birds: number[] = [];  // distance > 12
    const plants: number[] = []; // distance ∈ 2..4
    const placed: Array<[Monster, number, number, number]> = [];
    const normalTerrainMask = this.hasDolphin() ? 0x25 : 0x27;
    for (const [t, distance] of extended) {
      const scr = this.screens[t >>> 12][(t >>> 8) & 0xf];
      if (scr === boss) continue;
      for (const n of neighbors(t, this.width, this.height)) {
        if (extended.has(n)) continue;
        extended.set(n, distance + 1);
      }
      if (!distance && !(reachable.get(t)! & normalTerrainMask)) normal.push(t);
      if (this.id === 0x1a) {
        // Special-case the swamp for plant placement
        if (this.rom.screens[scr].tiles[t & 0xff] === 0xf0) plants.push(t);
      } else {
        if (distance >= 2 && distance <= 4) plants.push(t);
      }
      if (distance >= 3 && distance <= 7) moths.push(t);
      if (distance >= 12) birds.push(t);
      // TODO - special-case swamp for plant locations?
    }
    // We now know all the possible places to place things.
    //  - NOTE: still need to move chests to dead ends, etc?
    return (m: Monster) => {
      // check for placement.
      const placement = m.placement();
      const pool = [...(placement === 'normal' ? normal :
                        placement === 'moth' ? moths :
                        placement === 'bird' ? birds :
                        placement === 'plant' ? plants :
                        assertNever(placement))]
      POOL:
      while (pool.length) {
        const i = random.nextInt(pool.length);
        const [pos] = pool.splice(i, 1);

        const x = (pos & 0xf00) >>> 4 | (pos & 0xf);
        const y = (pos & 0xf000) >>> 8 | (pos & 0xf0) >>> 4;
        const r = m.clearance();

        // test distance from other enemies.
        for (const [, x1, y1, r1] of placed) {
          const z2 = ((y - y1) ** 2 + (x - x1) ** 2);
          if (z2 < (r + r1) ** 2) continue POOL;
        }
        // test distance from entrances.
        for (const {x: x1, y: y1, used} of this.entrances) {
          if (!used) continue;
          const z2 = ((y - (y1 >> 4)) ** 2 + (x - (x1 >> 4)) ** 2);
          if (z2 < (r + 1) ** 2) continue POOL;
        }

        // Valid spot (still, how toa approximately *maximize* distances?)
        placed.push([m, x, y, r]);
        const scr = (y & 0xf0) | (x & 0xf0) >>> 4;
        const tile = (y & 0x0f) << 4 | (x & 0x0f);
        return scr << 8 | tile;
      }
      return undefined;
    }
  }
  // TODO - allow less randomness for certain cases, e.g. top of north sabre or
  // appropriate side of cordel.

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


  // TODO - use metascreen for this later
  resizeScreens(top: number, left: number, bottom: number, right: number,
                fill = 0) {
    const newWidth = this.width + left + right;
    const newHeight = this.height + top + bottom;
    const newScreens = Array.from({length: newHeight}, (_, y) => {
      y -= top;
      return Array.from({length: newWidth}, (_, x) => {
        x -= left;
        if (y < 0 || x < 0 || y >= this.height || x >= this.width) return fill;
        return this.screens[y][x];
      });
    });
    this.width = newWidth;
    this.height = newHeight;
    this.screens = newScreens;
    // TODO - if any of these go negative, we're in trouble...
    // Probably the best bet would be to put a check in the setter?
    for (const f of this.flags) {
      f.xs += left;
      f.ys += top;
    }
    for (const p of this.pits) {
      p.fromXs += left;
      p.fromYs += top;
    }
    for (const s of [...this.spawns, ...this.exits]) {
      s.xt += 16 * left;
      s.yt += 16 * top;
    }
    for (const e of this.entrances) {
      if (!e.used) continue;
      e.x += 256 * left;
      e.y += 256 * top;
    }
  }

  writeScreens2d(start: number,
                 data: ReadonlyArray<ReadonlyArray<number | null>>) {
    const x0 = start & 0xf;
    const y0 = start >>> 4;
    for (let y = 0; y < data.length; y++) {
      const row = data[y];
      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (tile != null) this.screens[y0 + y][x0 + x] = tile;
      }
    }
  }

  // Connect two screens via entrances.
  // Assumes exits and entrances are completely absent.
  // Screen IDs must be in screenExits.
  // SUPER HACKY - if pos is negative, use complement and alternate stairs.
  connect(pos: number, that: Location, thatPos: number) {
    const thisAlt = pos < 0 ? 0x100 : 0;
    const thatAlt = thatPos < 0 ? 0x100 : 0;
    pos = pos < 0 ? ~pos : pos;
    thatPos = thatPos < 0 ? ~thatPos : thatPos;
    const thisY = pos >>> 4;
    const thisX = pos & 0xf;
    const thatY = thatPos >>> 4;
    const thatX = thatPos & 0xf;
    const thisTile = this.screens[thisY][thisX];
    const thatTile = that.screens[thatY][thatX];
    const [thisEntrance, thisExits] = screenExits[thisAlt | thisTile];
    const [thatEntrance, thatExits] = screenExits[thatAlt | thatTile];
    const thisEntranceIndex = this.entrances.length;
    const thatEntranceIndex = that.entrances.length;
    this.entrances.push(Entrance.of({y: thisY << 8 | thisEntrance >>> 8,
                                     x: thisX << 8 | thisEntrance & 0xff}));
    that.entrances.push(Entrance.of({y: thatY << 8 | thatEntrance >>> 8,
                                     x: thatX << 8 | thatEntrance & 0xff}));
    for (const exit of thisExits) {
      this.exits.push(Exit.of({screen: pos, tile: exit,
                               dest: that.id, entrance: thatEntranceIndex}));
    }
    for (const exit of thatExits) {
      that.exits.push(Exit.of({screen: thatPos, tile: exit,
                               dest: this.id, entrance: thisEntranceIndex}));
    }
  }

  neighborForEntrance(entranceId: number): Location {
    const entrance = this.entrances[entranceId];
    if (!entrance) throw new Error(`no entrance ${hex(this.id)}:${entranceId}`);
    for (const exit of this.exits) {
      if (exit.screen !== entrance.screen) continue;
      const dx = Math.abs(exit.x - entrance.x);
      const dy = Math.abs(exit.y - entrance.y);
      if (dx < 24 && dy < 24) return this.rom.locations[exit.dest];
    }
    throw new Error(`no exit found near ${hex(this.id)}:${entranceId}`);
  }
}

// TODO - move to a better-organized dedicated "geometry" module?
function neighbors(tile: number, width: number, height: number): number[] {
  const out = [];
  const y = tile & 0xf0f0;
  const x = tile & 0x0f0f;
  if (y < ((height - 1) << 12 | 0xe0)) {
    out.push((tile & 0xf0) === 0xe0 ? tile + 0x0f20 : tile + 16);
  }
  if (y) {
    out.push((tile & 0xf0) === 0x00 ? tile - 0x0f20 : tile - 16);
  }
  if (x < ((width - 1) << 8 | 0x0f)) {
    out.push((tile & 0x0f) === 0x0f ? tile + 0x00f1 : tile + 1);
  }
  if (x) {
    out.push((tile & 0x0f) === 0x00 ? tile - 0x00f1 : tile - 1);
  }
  return out;
}

export const Entrance = DataTuple.make(4, {
  x: DataTuple.prop([0], [1, 0xff, -8]),
  y: DataTuple.prop([2], [3, 0xff, -8]),

  screen: DataTuple.prop([3, 0x0f, -4], [1, 0x0f]),
  tile:   DataTuple.prop([2, 0xf0], [0, 0xf0, 4]),
  coord:  DataTuple.prop([2, 0xff, -8], [0, 0xff]),

  used: {
    get(this: any): boolean { return this.data[1] != 0xff; },
  },

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

  screen: DataTuple.prop([0, 0xf0], [1, 0x70, 4]),
  tile:   DataTuple.prop([0, 0x0f, -4], [1, 0x0f]),

  patternBank: DataTuple.prop([2, 0x80, 7]),
  type:  DataTuple.prop([2, 0x07]),

// patternBank: {get(this: any): number { return this.data[2] >>> 7; },
//               set(this: any, v: number) { if (this.data[3] === 120) debugger;
//                                           if (v) this.data[2] |= 0x80; else this.data[2] &= 0x7f; }},
  id:    DataTuple.prop([3]),

  used: {get(this: any): boolean { return this.data[0] !== 0xfe; },
         set(this: any, used: boolean) { this.data[0] = used ? 0 : 0xfe; }},
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
  isShootingWall(this: any, location: Location): boolean {
    return this.isWall() &&
        !!(this.data[2] & 0x20 ? this.data[2] & 0x10 :
           location.id === 0x8f || location.id === 0xa8);
  },
  wallType(this: any): '' | 'wall' | 'bridge' {
    if (this.type !== 3) return '';
    const obj = this.data[2] & 0x20 ? this.id >>> 4 : this.id;
    if (obj >= 4) return '';
    return obj === 2 ? 'bridge' : 'wall';
  },
  wallElement(this: any): number {
    if (!this.isWall()) return -1;
    return this.id & 3;
  },
  toString(this: any): string {
    return `Spawn ${this.hex()}: (${hex(this.x)}, ${hex(this.y)}) ${
            this.timed ? 'timed' : 'fixed'} ${this.type}:${hex(this.id)}`;
  },
});
export type Spawn = InstanceType<typeof Spawn>;

// export const LOCATIONS = {
//   mezameShrine: [0x00, 'Mezame Shrine'],
//   leafOutsideStart: [0x01, 'Leaf - Outside Start'],
//   leaf: [0x02, 'Leaf'],
//   valleyOfWind: [0x03, 'Valley of Wind'],
//   sealedCave1: [0x04, 'Sealed Cave 1'],
//   sealedCave2: [0x05, 'Sealed Cave 2'],
//   sealedCave6: [0x06, 'Sealed Cave 6'],
//   sealedCave4: [0x07, 'Sealed Cave 4'],
//   sealedCave5: [0x08, 'Sealed Cave 5'],
//   sealedCave3: [0x09, 'Sealed Cave 3'],
//   sealedCave7: [0x0a, 'Sealed Cave 7'],
//   // INVALID: 0x0b
//   sealedCave8: [0x0c, 'Sealed Cave 8'],
//   // INVALID: 0x0d
//   windmillCave: [0x0e, 'Windmill Cave'],
//   windmill: [0x0f, 'Windmill'],
//   zebuCave: [0x10, 'Zebu Cave'],
//   mtSabreWestCave1: [0x11, 'Mt Sabre West - Cave 1'],
//   // INVALID: 0x12
//   // INVALID: 0x13
//   cordelPlainsWest: [0x14, 'Cordel Plains West'],
//   cordelPlainsEast: [0x15, 'Cordel Plains East'],
//   // INVALID: 0x16 -- unused copy of 18
//   // INVALID: 0x17
//   brynmaer: [0x18, 'Brynmaer'],
//   outsideStomHouse: [0x19, 'Outside Stom House'],
//   swamp: [0x1a, 'Swamp'],
//   amazones: [0x1b, 'Amazones'],
//   oak: [0x1c, 'Oak'],
//   // INVALID: 0x1d
//   stomHouse: [0x1e, 'Stom House'],
//   // INVALID: 0x1f
//   mtSabreWestLower: [0x20, 'Mt Sabre West - Lower'],
//   mtSabreWestUpper: [0x21, 'Mt Sabre West - Upper'],
//   mtSabreWestCave2: [0x22, 'Mt Sabre West - Cave 2'],
//   mtSabreWestCave3: [0x23, 'Mt Sabre West - Cave 3'],
//   mtSabreWestCave4: [0x24, 'Mt Sabre West - Cave 4'],
//   mtSabreWestCave5: [0x25, 'Mt Sabre West - Cave 5'],
//   mtSabreWestCave6: [0x26, 'Mt Sabre West - Cave 6'],
//   mtSabreWestCave7: [0x27, 'Mt Sabre West - Cave 7'],
//   mtSabreNorthMain: [0x28, 'Mt Sabre North - Main'],
//   mtSabreNorthMiddle: [0x29, 'Mt Sabre North - Middle'],
//   mtSabreNorthCave2: [0x2a, 'Mt Sabre North - Cave 2'],
//   mtSabreNorthCave3: [0x2b, 'Mt Sabre North - Cave 3'],
//   mtSabreNorthCave4: [0x2c, 'Mt Sabre North - Cave 4'],
//   mtSabreNorthCave5: [0x2d, 'Mt Sabre North - Cave 5'],
//   mtSabreNorthCave6: [0x2e, 'Mt Sabre North - Cave 6'],
//   mtSabreNorthPrisonHall: [0x2f, 'Mt Sabre North - Prison Hall'],
//   mtSabreNorthLeftCell: [0x30, 'Mt Sabre North - Left Cell'],
//   mtSabreNorthLeftCell2: [0x31, 'Mt Sabre North - Left Cell 2'],
//   mtSabreNorthRightCell: [0x32, 'Mt Sabre North - Right Cell'],
//   mtSabreNorthCave8: [0x33, 'Mt Sabre North - Cave 8'],
//   mtSabreNorthCave9: [0x34, 'Mt Sabre North - Cave 9'],
//   mtSabreNorthSummitCave: [0x35, 'Mt Sabre North - Summit Cave'],
//   // INVALID: 0x36
//   // INVALID: 0x37
//   mtSabreNorthCave1: [0x38, 'Mt Sabre North - Cave 1'],
//   mtSabreNorthCave7: [0x39, 'Mt Sabre North - Cave 7'],
//   // INVALID: 0x3a
//   // INVALID: 0x3b
//   nadareInn: [0x3c, 'Nadare - Inn'],
//   nadareToolShop: [0x3d, 'Nadare - Tool Shop'],
//   nadareBackRoom: [0x3e, 'Nadare - Back Room'],
//   // INVALID: 0x3f
//   waterfallValleyNorth: [0x40, 'Waterfall Valley North'],
//   waterfallValleySouth: [0x41, 'Waterfall Valley South'],
//   limeTreeValley: [0x42, 'Lime Tree Valley'],
//   limeTreeLake: [0x43, 'Lime Tree Lake'],
//   kirisaPlantCave1: [0x44, 'Kirisa Plant Cave 1'],
//   kirisaPlantCave2: [0x45, 'Kirisa Plant Cave 2'],
//   kirisaPlantCave3: [0x46, 'Kirisa Plant Cave 3'],
//   kirisaMeadow: [0x47, 'Kirisa Meadow'],
//   fogLampCave1: [0x48, 'Fog Lamp Cave 1'],
//   fogLampCave2: [0x49, 'Fog Lamp Cave 2'],
//   fogLampCave3: [0x4a, 'Fog Lamp Cave 3'],
//   fogLampCaveDeadEnd: [0x4b, 'Fog Lamp Cave Dead End'],
//   fogLampCave4: [0x4c, 'Fog Lamp Cave 4'],
//   fogLampCave5: [0x4d, 'Fog Lamp Cave 5'],
//   fogLampCave6: [0x4e, 'Fog Lamp Cave 6'],
//   fogLampCave7: [0x4f, 'Fog Lamp Cave 7'],
//   portoa: [0x50, 'Portoa'],
//   portoaFishermanIsland: [0x51, 'Portoa - Fisherman Island'],
//   mesiaShrine: [0x52, 'Mesia Shrine'],
//   // INVALID: 0x53
//   waterfallCave1: [0x54, 'Waterfall Cave 1'],
//   waterfallCave2: [0x55, 'Waterfall Cave 2'],
//   waterfallCave3: [0x56, 'Waterfall Cave 3'],
//   waterfallCave4: [0x57, 'Waterfall Cave 4'],
//   towerEntrance: [0x58, 'Tower - Entrance'],
//   tower1: [0x59, 'Tower 1'],
//   tower2: [0x5a, 'Tower 2'],
//   tower3: [0x5b, 'Tower 3'],
//   towerOutsideMesia: [0x5c, 'Tower - Outside Mesia'],
//   towerOutsideDyna: [0x5d, 'Tower - Outside Dyna'],
//   towerMesia: [0x5e, 'Tower - Mesia'],
//   towerDyna: [0x5f, 'Tower - Dyna'],
//   angrySea: [0x60, 'Angry Sea'],
//   boatHouse: [0x61, 'Boat House'],
//   joelLighthouse: [0x62, 'Joel - Lighthouse'],
//   // INVALID: 0x63
//   undergroundChannel: [0x64, 'Underground Channel'],
//   zombieTown: [0x65, 'Zombie Town'],
//   // INVALID: 0x66
//   // INVALID: 0x67
//   evilSpiritIsland1: [0x68, 'Evil Spirit Island 1'],
//   evilSpiritIsland2: [0x69, 'Evil Spirit Island 2'],
//   evilSpiritIsland3: [0x6a, 'Evil Spirit Island 3'],
//   evilSpiritIsland4: [0x6b, 'Evil Spirit Island 4'],
//   saberaPalace1: [0x6c, 'Sabera Palace 1'],
//   saberaPalace2: [0x6d, 'Sabera Palace 2'],
//   saberaPalace3: [0x6e, 'Sabera Palace 3'],
//   // INVALID: 0x6f -- Sabera Palace 3 unused copy
//   joelSecretPassage: [0x70, 'Joel - Secret Passage'],
//   joel: [0x71, 'Joel'],
//   swan: [0x72, 'Swan'],
//   swanGate: [0x73, 'Swan - Gate'],
//   // INVALID: 0x74
//   // INVALID: 0x75
//   // INVALID: 0x76
//   // INVALID: 0x77
//   goaValley: [0x78, 'Goa Valley'],
//   // INVALID: 0x79
//   // INVALID: 0x7a
//   // INVALID: 0x7b
//   mtHydra: [0x7c, 'Mt Hydra'],
//   mtHydraCave1: [0x7d, 'Mt Hydra - Cave 1'],
//   mtHydraOutsideShyron: [0x7e, 'Mt Hydra - Outside Shyron'],
//   mtHydraCave2: [0x7f, 'Mt Hydra - Cave 2'],
//   mtHydraCave3: [0x80, 'Mt Hydra - Cave 3'],
//   mtHydraCave4: [0x81, 'Mt Hydra - Cave 4'],
//   mtHydraCave5: [0x82, 'Mt Hydra - Cave 5'],
//   mtHydraCave6: [0x83, 'Mt Hydra - Cave 6'],
//   mtHydraCave7: [0x84, 'Mt Hydra - Cave 7'],
//   mtHydraCave8: [0x85, 'Mt Hydra - Cave 8'],
//   mtHydraCave9: [0x86, 'Mt Hydra - Cave 9'],
//   mtHydraCave10: [0x87, 'Mt Hydra - Cave 10'],
//   styx1: [0x88, 'Styx 1'],
//   styx2: [0x89, 'Styx 2'],
//   styx3: [0x8a, 'Styx 3'],
//   // INVALID: 0x8b
//   shyron: [0x8c, 'Shyron'],
//   // INVALID: 0x8d
//   goa: [0x8e, 'Goa'],
//   goaFortressOasisEntrance: [0x8f, 'Goa Fortress - Oasis Entrance'],
//   desert1: [0x90, 'Desert 1'],
//   oasisCaveMain: [0x91, 'Oasis Cave - Main'],
//   desertCave1: [0x92, 'Desert Cave 1'],
//   sahara: [0x93, 'Sahara'],
//   saharaOutsideCave: [0x94, 'Sahara - Outside Cave'],
//   desertCave2: [0x95, 'Desert Cave 2'],
//   saharaMeadow: [0x96, 'Sahara Meadow'],
//   // INVALID: 0x97
//   desert2: [0x98, 'Desert 2'],
//   // INVALID: 0x99
//   // INVALID: 0x9a
//   // INVALID: 0x9b
//   pyramidEntrance: [0x9c, 'Pyramid - Entrance'],
//   pyramidBranch: [0x9d, 'Pyramid - Branch'],
//   pyramidMain: [0x9e, 'Pyramid - Main'],
//   pyramidDraygon: [0x9f, 'Pyramid - Draygon'],
//   cryptEntrance: [0xa0, 'Crypt - Entrance'],
//   cryptHall1: [0xa1, 'Crypt - Hall 1'],
//   cryptBranch: [0xa2, 'Crypt - Branch'],
//   cryptDeadEndLeft: [0xa3, 'Crypt - Dead End Left'],
//   cryptDeadEndRight: [0xa4, 'Crypt - Dead End Right'],
//   cryptHall2: [0xa5, 'Crypt - Hall 2'],
//   cryptDraygon2: [0xa6, 'Crypt - Draygon 2'],
//   cryptTeleporter: [0xa7, 'Crypt - Teleporter'],
//   goaFortressEntrance: [0xa8, 'Goa Fortress - Entrance'],
//   goaFortressKelbesque: [0xa9, 'Goa Fortress - Kelbesque'],
//   goaFortressZebu: [0xaa, 'Goa Fortress - Zebu'],
//   goaFortressSabera: [0xab, 'Goa Fortress - Sabera'],
//   goaFortressTornel: [0xac, 'Goa Fortress - Tornel'],
//   goaFortressMado1: [0xad, 'Goa Fortress - Mado 1'],
//   goaFortressMado2: [0xae, 'Goa Fortress - Mado 2'],
//   goaFortressMado3: [0xaf, 'Goa Fortress - Mado 3'],
//   goaFortressKarmine1: [0xb0, 'Goa Fortress - Karmine 1'],
//   goaFortressKarmine2: [0xb1, 'Goa Fortress - Karmine 2'],
//   goaFortressKarmine3: [0xb2, 'Goa Fortress - Karmine 3'],
//   goaFortressKarmine4: [0xb3, 'Goa Fortress - Karmine 4'],
//   goaFortressKarmine5: [0xb4, 'Goa Fortress - Karmine 5'],
//   goaFortressKarmine6: [0xb5, 'Goa Fortress - Karmine 6'],
//   goaFortressKarmine7: [0xb6, 'Goa Fortress - Karmine 7'],
//   goaFortressExit: [0xb7, 'Goa Fortress - Exit'],
//   oasisCaveEntrance: [0xb8, 'Oasis Cave - Entrance'],
//   goaFortressAsina: [0xb9, 'Goa Fortress - Asina'],
//   goaFortressKensu: [0xba, 'Goa Fortress - Kensu'],
//   goaHouse: [0xbb, 'Goa - House'],
//   goaInn: [0xbc, 'Goa - Inn'],
//   // INVALID: 0xbd
//   goaToolShop: [0xbe, 'Goa - Tool Shop'],
//   goaTavern: [0xbf, 'Goa - Tavern'],
//   leafElderHouse: [0xc0, 'Leaf - Elder House'],
//   leafRabbitHut: [0xc1, 'Leaf - Rabbit Hut'],
//   leafInn: [0xc2, 'Leaf - Inn'],
//   leafToolShop: [0xc3, 'Leaf - Tool Shop'],
//   leafArmorShop: [0xc4, 'Leaf - Armor Shop'],
//   leafStudentHouse: [0xc5, 'Leaf - Student House'],
//   brynmaerTavern: [0xc6, 'Brynmaer - Tavern'],
//   brynmaerPawnShop: [0xc7, 'Brynmaer - Pawn Shop'],
//   brynmaerInn: [0xc8, 'Brynmaer - Inn'],
//   brynmaerArmorShop: [0xc9, 'Brynmaer - Armor Shop'],
//   // INVALID: 0xca
//   brynmaerItemShop: [0xcb, 'Brynmaer - Item Shop'],
//   // INVALID: 0xcc
//   oakElderHouse: [0xcd, 'Oak - Elder House'],
//   oakMotherHouse: [0xce, 'Oak - Mother House'],
//   oakToolShop: [0xcf, 'Oak - Tool Shop'],
//   oakInn: [0xd0, 'Oak - Inn'],
//   amazonesInn: [0xd1, 'Amazones - Inn'],
//   amazonesItemShop: [0xd2, 'Amazones - Item Shop'],
//   amazonesArmorShop: [0xd3, 'Amazones - Armor Shop'],
//   amazonesElder: [0xd4, 'Amazones - Elder'],
//   nadare: [0xd5, 'Nadare'],
//   portoaFishermanHouse: [0xd6, 'Portoa - Fisherman House'],
//   portoaPalaceEntrance: [0xd7, 'Portoa - Palace Entrance'],
//   portoaFortuneTeller: [0xd8, 'Portoa - Fortune Teller'],
//   portoaPawnShop: [0xd9, 'Portoa - Pawn Shop'],
//   portoaArmorShop: [0xda, 'Portoa - Armor Shop'],
//   // INVALID: 0xdb
//   portoaInn: [0xdc, 'Portoa - Inn'],
//   portoaToolShop: [0xdd, 'Portoa - Tool Shop'],
//   portoaPalaceLeft: [0xde, 'Portoa - Palace Left'],
//   portoaPalaceThroneRoom: [0xdf, 'Portoa - Palace Throne Room'],
//   portoaPalaceRight: [0xe0, 'Portoa - Palace Right'],
//   portoaAsinaRoom: [0xe1, 'Portoa - Asina Room'],
//   amazonesElderDownstairs: [0xe2, 'Amazones - Elder Downstairs'],
//   joelElderHouse: [0xe3, 'Joel - Elder House'],
//   joelShed: [0xe4, 'Joel - Shed'],
//   joelToolShop: [0xe5, 'Joel - Tool Shop'],
//   // INVALID: 0xe6
//   joelInn: [0xe7, 'Joel - Inn'],
//   zombieTownHouse: [0xe8, 'Zombie Town - House'],
//   zombieTownHouseBasement: [0xe9, 'Zombie Town - House Basement'],
//   // INVALID: 0xea
//   swanToolShop: [0xeb, 'Swan - Tool Shop'],
//   swanStomHut: [0xec, 'Swan - Stom Hut'],
//   swanInn: [0xed, 'Swan - Inn'],
//   swanArmorShop: [0xee, 'Swan - Armor Shop'],
//   swanTavern: [0xef, 'Swan - Tavern'],
//   swanPawnShop: [0xf0, 'Swan - Pawn Shop'],
//   swanDanceHall: [0xf1, 'Swan - Dance Hall'],
//   shyronFortress: [0xf2, 'Shyron - Fortress'],
//   shyronTrainingHall: [0xf3, 'Shyron - Training Hall'],
//   shyronHospital: [0xf4, 'Shyron - Hospital'],
//   shyronArmorShop: [0xf5, 'Shyron - Armor Shop'],
//   shyronToolShop: [0xf6, 'Shyron - Tool Shop'],
//   shyronInn: [0xf7, 'Shyron - Inn'],
//   saharaInn: [0xf8, 'Sahara - Inn'],
//   saharaToolShop: [0xf9, 'Sahara - Tool Shop'],
//   saharaElderHouse: [0xfa, 'Sahara - Elder House'],
//   saharaPawnShop: [0xfb, 'Sahara - Pawn Shop'],
// } as const;
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

// const locationNames: (string | undefined)[] = (() => {
//   const names = [];
//   for (const key of Object.keys(LOCATIONS)) {
//     const [id, name] = (LOCATIONS as any)[key];
//     names[id] = name;
//   }
//   return names;
// })();

// const locationKeys: (locationKey | undefined)[] = (() => {
//   const keys = [];
//   for (const key of Object.keys(LOCATIONS)) {
//     const [id] = (LOCATIONS as any)[key];
//     keys[id] = key;
//   }
//   return keys as any;
// })();


// very simple version of what we're doing with metascreens
const screenExits: {[id: number]: readonly [number, readonly [number, number]]} = {
  0x15: [0x90_a0, [0x89, 0x8a]], // cave on left boundary
  0x19: [0x60_90, [0x58, 0x59]], // cave on right boundary (not on grass)
  0x96: [0x40_30, [0x32, 0x33]], // up stair from left
  0x97: [0xaf_30, [0xb2, 0xb3]], // down stair from left
  0x98: [0x40_d0, [0x3c, 0x3d]], // up stair from right
  0x99: [0xaf_d0, [0xbc, 0xbd]], // down stair from right
  0x9a: [0x1f_80, [0x27, 0x28]], // down stair (double - just use down!)
  0x9e: [0xdf_80, [0xe7, 0xe8]], // bottom edge
  0xc1: [0x50_a0, [0x49, 0x4a]], // cave on top boundary
  0xc2: [0x60_b0, [0x5a, 0x5b]], // cave on bottom-right boundary
  0x19a: [0xd0_80, [0xc7, 0xc8]], // up stair on double
};

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
