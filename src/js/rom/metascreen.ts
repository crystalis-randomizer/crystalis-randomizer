import {Rom} from '../rom.js';
import {Screen} from './screen.js';
import {collectionBase} from './util.js';
//import {SparseArray} from '../util.js';

// TODO - make a separate Metascreens??? Then Screens can just be normal?

// BASIC PLAN: Screen is the physical array, Metascreen has the extra info.
//             Only Metascreen is tied to specific (Meta)tilesets.

// type ScreenKey = keyof typeof SCREENS;
// type MetascreensBase = {readonly [T in ScreenKey]: Metascreen};
// const MetascreensBase: {new(): MetascreensBase} = class {};

export class Metascreens extends collectionBase<typeof METASCREENS, Metascreen>() {
  constructor(readonly rom: Rom) {
    super(METASCREENS, (data: MetascreenData) => new Metascreen(rom, data));
  }
}

// export type Tilesets = TilesetsClass & {[T in keyof typeof TILESETS]: Metatileset};

// export const Tilesets: {new(rom: Rom): Tilesets} = TilesetsClass as any;

export class Metascreen {
  readonly screen: number;

  constructor(readonly rom: Rom, readonly data: MetascreenData) {
    this.screen = data.id;
  }
}

interface Icon {
  short: string; // single character
  full: readonly [string, string, string]; // 3x3 grid
}

function icon(arr: TemplateStringsArray): Icon {
  if (arr.length != 1) throw new Error('Bad icon input');
  const str = arr[0];
  // parse the string.
  const lines = str.split('\n');
  // lines 1..3 are the full icon.
  const full = lines.slice(1).map(l => l.replace(/^\s*\||\|\s*$/g, ''));
  const short = /\S/.test(lines[0]) ? lines[0][0] : full[1][1];
  return {short, full: [full[0], full[1], full[2]]};
}

// const GRASS = 0x80;
// const TOWN = 0x84;
// const CAVE = 0x88;
// const PYRAMID = 0x8c;
// const RIVER = 0x90;
// const MOUNTAIN = 0x94;
// const SEA = 0x94;
// const SHRINE = 0x98;
// const DESERT = 0x9c;
// const MOUNTAIN_RIVER = 0x9c;
// const SWAMP = 0xa0;
// const HOUSE = 0xa0;
// const FORTRESS = 0xa4;
// const ICE_CAVE = 0xa8;
// const TOWER = 0xac;

export const METASCREENS = {
  mountain: {
    id: 0x00,
    icon: icon`
      |███|
      |███|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  // boundaryW_trees: ???
  boundaryW_trees: {
    id: 0x01,
    icon: icon`
      |█▌ |
      |█▌^|
      |█▌ |`,
    tilesets: {grass: {}, river: {}},
    // NOTE: could use this on 9c (desert) if we move 5b elsewhere
    // (only used on oasis screen) and define 5e - then just copy
    // existing tiles into those slots.  Same with 94 (sea) - these
    // tiles intersect w/ mountain but could be moved and only a
    // handful of screens (which don't share tilesets) would need to
    // be updated.
  },
  boundaryW: {
    id: 0x02,
    icon: icon`
      |█▌ |
      |█▌ |
      |█▌ |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  boundaryE_rocks: {
    id: 0x03,
    icon: icon`
      |.▐█|
      | ▐█|
      |.▐█|`,
    tilesets: {grass: {}, river: {}},
    // NOTE: could use this on desert/sea if move 5a, 5c, 5d
  },
  boundaryE: {
    id: 0x04,
    icon: icon`
      | ▐█|
      | ▐█|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  longGrassS: {
    id: 0x05,
    icon: icon`
      |vv |
      | vv|
      |   |`,
    tilesets: {river: {}},
    // NOTE: could use this on 80 (grass) if we made 40..47
    // meaningful.  These are currently completely unused in this
    // tileset, and we'd only need to copy a handful of grass-border
    // from 50..57 to make it work.
  },
  longGrassN: {
    id: 0x06,
    icon: icon`
      |   |
      | vv|
      |vv |`,
    tilesets: {river: {}},
    // See note above
  },
  boundaryS_rocks: {
    id: 0x07,
    icon: icon`
      | . |
      |▄▄▄|
      |███|`,
    tilesets: {grass: {}, river: {}},
    // See note above about rocks
  },
  fortressTownEntrance: { // goa
    id: 0x08,
    icon: icon`
      |███|
      |█∩█|
      |   |`,
    // TODO - entrance!
    // TODO - right edge wants top-half mountain; left edge top can have
    //        any top half (bottom half plain), top edge can have any
    //        left-half (right-half mountain)
    tilesets: {grass: {}},
  },
  bendSE_longGrass: {
    id: 0x09,
    icon: icon`▗
      | v |
      |vv▄|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  exitW_cave: { // near sahara, fog lamp
    id: 0x0a,
    icon: icon`∩
      |█∩█|
      |  █|
      |███|`,
    // TODO - entrance
    // TODO - edge
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  bendNE_grassRocks: {
    id: 0x0b,
    icon: icon`▝
      |.▐█|
      |  ▀|
      |;;;|`,
    tilesets: {grass: {}, river: {}}, // See note above about rocks
  },
  cornerNW: {
    id: 0x0c,
    icon: icon`▛
      |███|
      |█ ▀|
      |█▌ |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  cornerNE: {
    id: 0x0d,
    icon: icon`▜
      |███|
      |▀██|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  cornerSW: {
    id: 0x0e,
    icon: icon`▙
      |█▌ |
      |██▄|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  cornerSE: {
    id: 0x0f,
    icon: icon`▟
      | ▐█|
      |▄██|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  exitE: {
    id: 0x10,
    icon: icon`╶
      | ▐█|
      |   |
      | ▐█|`,
    tilesets: {grass: {}, river: {}}, // See note above about rocks
    // TODO - edge
  },
  boundaryN_trees: {
    id: 0x11,
    icon: icon`
      |███|
      |▀▀▀|
      | ^ |`,
    tilesets: {grass: {}, river: {}, desert: {}}, // See note about trees in sea
  },
  bridgeToPortoa: {
    id: 0x12,
    icon: icon`╴
      |═  |
      |╞══|
      |│  |`,
    tilesets: {river: {}},
    // TODO - edge
  },
  slopeAbovePortoa: {
    id: 0x13,
    icon: icon`
      |█↓█|
      |█↓▀|
      |│  |`,
    tilesets: {river: {}},
  },
  riverBendSE: {
    id: 0x14,
    icon: icon`
      |w  |
      | ╔═|
      | ║ |`,
    tilesets: {river: {}},
  },
  boundaryW_cave: {
    id: 0x15,
    icon: icon`
      |█▌ |
      |█∩ |
      |█▌ |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    // TODO - flaggable?
  },
  exitN: {
    id: 0x16,
    icon: icon`╵
      |█ █|
      |▀ ▀|
      | ^ |`,
    tilesets: {grass: {}, river: {}, desert: {}}, // sea has no need for exits?
    // TODO - edge
  },
  riverWE_woodenBridge: {
    id: 0x17,
    icon: icon`═
      |   |
      |═║═|
      |   |`,
    tilesets: {river: {}},
    // TODO - seamless transition????
  },
  riverBoundaryE_waterfall: {
    id: 0x18,
    icon: icon`╡
      | ▐█|
      |══/|
      | ▐█|`,
    tilesets: {river: {}},
  },
  boundaryE_cave: {
    id: 0x19,
    icon: icon`
      | ▐█|
      | ∩█|
      | ▐█|`,
    tilesets: {river: {}}, // desert seems infeasible here? see above re: grass
  },
  exitW_southwest: {
    id: 0x1a,
    icon: icon`╴
      |█▌ |
      |▀ ▄|
      |▄██|`,
    tilesets: {grass: {}, river: {}}, // TODO - desert with 5a/5e fix
    // sea also possible, but not sure where it would go? some other beach?
  },
  nadare: {
    id: 0x1b,
    //icon: '?',
    migrated: 0x2000,
    tilesets: {house: {}},
  },
  townExitW: {
    id: 0x1c,
    icon: icon`╴
      |█▌ |
      |▀ ^|
      |█▌ |`,
    tilesets: {grass: {}, river: {}},
  },
  shortGrassS: {
    id: 0x1d,
    icon: icon` |
      |;;;|
      | v |
      |   |`,
    tilesets: {grass: {}},
  },
  townExitS: {
    id: 0x1e,
    icon: icon`╷
      | ^ |
      |▄ ▄|
      |█ █|`,
    tilesets: {grass: {}, river: {}},
  },
  swanGate: {
    id: 0x1f,
    //icon: '?',
    tilesets: {town: {}},
  }, 

  riverBranchNSE: {
    id: 0x20,
    icon: icon`
      | ║ |
      | ╠═|
      | ║ |`,
    tilesets: {river: {}},
  },
  riverWE: {
    id: 0x21,
    icon: icon`
      |   |
      |═══|
      |   |`,
    tilesets: {river: {}},
  },
  riverBoundaryS_waterfall: {
    id: 0x22,
    icon: icon`╨
      | ║ |
      |▄║▄|
      |█/█|`,
    tilesets: {river: {}},
  },
  shortGrassSE: {
    id: 0x23,
    icon: icon`
      |;;;|
      |;  |
      |; ^|`,
    tilesets: {grass: {}},
  },
  shortGrassNE: {
    id: 0x24,
    icon: icon` |
      |;  |
      |;v |
      |;;;|`,
    tilesets: {grass: {}},
  },
  stomHouse: {
    id: 0x25,
    //icon: '?', // Should never share a map??? - or just make something
    tilesets: {grass: {}},
  },
  bendNW_trees: {
    id: 0x26,
    icon: icon`▘
      |█▌ |
      |▀ ^|
      | ^^|`,
    tilesets: {grass: {}, river: {}}, // TODO - desert
  },
  shortGrassSW: {
    id: 0x27,
    icon: icon`
      |;;;|
      |  ;|
      |^ ;|`,
    tilesets: {grass: {}},
  },
  riverBranchNWS: {
    id: 0x28,
    icon: icon`
      | ║ |
      |═╣ |
      | ║ |`,
    tilesets: {river: {}},
  },
  shortGrassNW: {
    id: 0x29,
    icon: icon`
      |  ;|
      | v;|
      |;;;|`,
    tilesets: {grass: {}},
  },
  valleyBridge: {
    id: 0x2a,
    icon: icon` |
      |▛║▜|
      | ║ |
      |▙║▟|`,
    tilesets: {grass: {}, river: {}},
  },
  exitS_cave: {
    id: 0x2b,
    icon: icon`∩
      |█∩█|
      |▌ ▐|
      |█ █|`,
    tilesets: {grass: {}, river: {}, desert: {}},
    // TODO - could be viable in sea except for $0a blocking entrance.
    //      - consider changing these?
  },
  outsideWindmill: {
    id: 0x2c,
    icon: icon`╳
      |██╳|
      |█∩█|
      |█ █|`,
    tilesets: {grass: {}},
    // TODO - annotate 3 exits, spawn for windmill blade
  },
  townExitW_cave: { // outside leaf (TODO - consider just deleting?)
    id: 0x2d,
    icon: icon`∩
      |█∩█|
      |▄▄█|
      |███|`,
    tilesets: {grass: {}}, // cave entrance breaks river and others...
  },
  riverNS: {
    id: 0x2e,
    icon: icon`
      | ║ |
      | ║ |
      | ║ |`,
    tilesets: {river: {}},
  },
  riverNS_bridge: {
    id: 0x2f,
    icon: icon`
      | ║ |
      |w╏w|
      | ║ |`,
    tilesets: {river: {}},
    // TODO - indicate bridge
  },
  riverBendWS: {
    id: 0x30,
    icon: icon`
      | w▜|
      |═╗w|
      | ║ |`,
    tilesets: {river: {}},
  },
  borderN_waterfallCave: {
    id: 0x31,
    icon: icon`
      |▛║█|
      |▘║▀|
      | ║ |`,
    tilesets: {river: {}},
  },
  open_trees: {
    id: 0x32,
    icon: icon`
      | ^ |
      |^ ^|
      | ^ |`,
    tilesets: {river: {}}, // fix 5x for grass, 68..6f for desert
  },
  exitS: {
    id: 0x33,
    icon: icon`╷
      | w |
      |▄ ▄|
      |█ █|`,
    tilesets: {grass: {}, river: {}},
  },
  bendNW: {
    id: 0x34,
    icon: icon`▘
      |█▌ |
      |▀▀ |
      |   |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  bendNE: {
    id: 0x35,
    icon: icon`▝
      | ▐█|
      |  ▀|
      |   |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  bendSE: {
    id: 0x36,
    icon: icon`▗
      |   |
      | ▄▄|
      | ▐█|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  bendWS: {
    id: 0x37,
    icon: icon`▖
      |   |
      |▄▄ |
      |█▌ |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  towerPlain: {
    id: 0x38,
    icon: icon`┴
      | ┊ |
      |─┴─|
      |   |`,
    tilesets: {tower: {}},
    // TODO - annotate possible stairway w/ flag?
  },
  towerRobotDoor_downStair: {
    id: 0x39,
    icon: icon`┬
      | ∩ |
      |─┬─|
      | ┊ |`,
    tilesets: {tower: {}},
  },
  towerDynaDoor: {
    id: 0x3a,
    icon: icon`∩
      | ∩ |
      |└┬┘|
      | ┊ |`,
    tilesets: {tower: {}},
  },
  towerLongStairs: {
    id: 0x3b,
    icon: icon`
      | ┊ |
      | ┊ |
      | ┊ |`,
    tilesets: {tower: {}},
  },
  towerMesiaRoom: {
    id: 0x3c,
    tilesets: {tower: {}},
  },
  towerEntrance: {
    id: 0x3d,
    tilesets: {tower: {}},
  },
  caveAbovePortoa: {
    id: 0x3e,
    icon: icon`
      |███|
      |█∩█|
      |█↓█|`,
    tilesets: {river: {}},
  },
  cornerNE_flowers: {
    id: 0x3f,
    icon: icon`▜
      |███|
      |▀*█|
      | ▐█|`,
    tilesets: {grass: {}},
    // NOTE: could extend this to desert/etc by swapping the 7e/7f tiles
    // with e.g. a windmill or castle tile that's not used in 9c, but
    // we still don't have a good sprite to use for it...
  },
  towerEdge: {
    id: 0x40,
    icon: icon` |
      |   |
      |┤ ├|
      |   |`,
    tilesets: {tower: {}},
  },
  towerRobotDoor: {
    id: 0x41,
    icon: icon`─
      | O |
      |───|
      |   |`,
    tilesets: {tower: {}},
  },
  towerDoor: {
    id: 0x42,
    icon: icon`∩
      | ∩ |
      |─┴─|
      |   |`,
    tilesets: {tower: {}},
  },
  house_bedroom: {
    id: 0x43,
    tilesets: {house: {}},
  },
  shed: {
    id: 0x44,
    tilesets: {house: {}},
  },
  tavern: {
    id: 0x45,
    tilesets: {house: {}},
  },
  house_twoBeds: {
    id: 0x46,
    tilesets: {house: {}},
  },
  throneRoom_stairs: {
    id: 0x47,
    tilesets: {house: {}},
  },
  house_ruinedUpstairs: {
    id: 0x48,
    tilesets: {house: {}},
  },
  house_ruinedDownstairs: {
    id: 0x49,
    tilesets: {house: {}},
  },
  foyer: {
    id: 0x4a,
    tilesets: {house: {}},
  },
  throneRoom_door: {
    id: 0x4b,
    tilesets: {house: {}},
  },
  fortuneTeller: {
    id: 0x4c,
    tilesets: {house: {}},
  },
  backRoom: {
    id: 0x4d,
    tilesets: {house: {}},
  },
  dojo: {
    id: 0x4e,
    tilesets: {house: {}},
  },
  windmillInside: {
    id: 0x4f,
    tilesets: {house: {}},
  },
  horizontalTownMiddle: {
    // brynmaer + swan (TODO - split so we can move exits)
    id: 0x50,
    tilesets: {town: {}},
  },
  brynmaerRight_exitE: {
    // brynmaer
    id: 0x51,
    tilesets: {town: {type: 'horizontal'}},
  },
  brynmaerLeft_deadEnd: {
    // brynmaer
    id: 0x52,
    tilesets: {town: {type: 'horizontal'}},
  },
  swanLeft_exitW: {
    // swan
    id: 0x53,
    tilesets: {town: {type: 'horizontal'}},
  },
  swanRight_exitS: {
    // swan
    id: 0x54,
    tilesets: {town: {type: 'horizontal'}},
  },
  horizontalTownLeft_exitN: {
    // sahara, amazones (TODO - split so we can move exits)
    id: 0x55,
    tilesets: {town: {type: 'horizontal'}},
  },
  amazonesRight_deadEnd: {
    // amazones
    id: 0x56,
    tilesets: {town: {type: 'horizontal'}},
  },
  saharaRight_exitE: {
    // sahara
    id: 0x57,
    tilesets: {town: {type: 'horizontal'}},
  },
  portoaNW: {
    // portoa
    id: 0x58,
    tilesets: {town: {type: 'square'}},
  },
  portoaNE: {
    // portoa
    id: 0x59,
    tilesets: {town: {type: 'square'}},
  },
  portoaSW_exitW: {
    // portoa
    id: 0x5a,
    tilesets: {town: {type: 'square'}},
  },
  portoaSE_exitE: {
    // portoa
    id: 0x5b,
    tilesets: {town: {type: 'square'}},
  },
  dyna: {
    id: 0x5c,
    tilesets: {tower: {}},
  },
  portoaFisherman: {
    // portoa
    id: 0x5d,
    tilesets: {town: {type: 'square'}},
  },
  verticalTownTop_fortress: {
    // shyron, zombie town (probably not worth splitting this one)
    id: 0x5e,
    tilesets: {town: {type: 'vertical'}},
  },
  shyronMiddle: {
    // shyron
    id: 0x5f,
    tilesets: {town: {type: 'vertical'}},
  },
  shyronBottom_exitS: {
    // shyron
    id: 0x60,
    tilesets: {town: {type: 'vertical'}},
  },
  zombieTownMiddle: {
    // zombie town
    id: 0x61,
    tilesets: {town: {type: 'vertical'}},
  },
  zombieTownBottom_caveExit: {
    // zombie town
    id: 0x62,
    tilesets: {town: {type: 'vertical'}},
  },
  leafNW_houseShed: {
    // leaf
    id: 0x63,
    tilesets: {town: {type: 'square'}},
  },
  squareTownNE_house: {
    // leaf, goa (TODO - split)
    id: 0x64,
    tilesets: {town: {type: 'square'}},
  },
  leafSW_shops: {
    // leaf
    id: 0x65,
    tilesets: {town: {type: 'square'}},
  },
  leafSE_exitE: {
    // leaf
    id: 0x66,
    tilesets: {town: {type: 'square'}},
  },
  goaNW_tavern: {
    // goa
    id: 0x67,
    tilesets: {town: {type: 'square'}},
  },
  squareTownNW_exitS: {
    // goa, joel (TODO - split)
    id: 0x68,
    tilesets: {town: {type: 'square'}},
  },
  goaSE_shop: {
    // goa
    id: 0x69,
    tilesets: {town: {type: 'square'}},
  },
  joelNE_shop: {
    // joel
    id: 0x6a,
    tilesets: {town: {type: 'square'}},
  },
  joelSE_lake: {
    // joel
    id: 0x6b,
    tilesets: {town: {type: 'square'}},
  },
  oakNW: {
    // oak
    id: 0x6c,
    tilesets: {town: {type: 'square'}},
  },
  oakNE: {
    // oak
    id: 0x6d,
    tilesets: {town: {type: 'square'}},
  },
  oakSW: {
    // oak
    id: 0x6e,
    tilesets: {town: {type: 'square'}},
  },
  oakSE: {
    // oak
    id: 0x6f,
    tilesets: {town: {type: 'square'}},
  },
  temple: {
    // shyron
    id: 0x70,
    tilesets: {house: {}},
  },
  wideDeadEndN: {
    id: 0x71,
    icon: icon`
      | ┃ |
      | > |
      |   |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  },
  wideDeadEndN_goa: {
    id: 0x71,
    icon: icon`
      |╵┃╵|
      | > |
      |   |`,
    tilesets: {goa1: {}},
  },
  wideHallNS: {
    id: 0x72,
    icon: icon`
      | ┃ |
      | ┃ |
      | ┃ |`,
    tilesets: {cave: {}, fortress: {}, pyramid: {}, iceCave: {}},
  },
  wideHallNS_goa: {
    id: 0x72,
    // TODO - don't show this for all fortresses,
    //        just opt in for the one where we actually use it...
    // Consider tagging "Goa 1" as a separate tileset?? but then redundant
    icon: icon`
      |│┃│|
      |│┃│|
      |│┃│|`,
    tilesets: {goa1: {}},
  },
  wideHallNS_goaBlockedRight: {
    // NOTE: this is a possible unflagged 72?
    icon: icon`
      |│┃│|
      |│┃ |
      |│┃│|`,
    tilesets: {goa1: {}},
    generate: { // TODO - method to generate this screen
      id: 0x72,
      option: 0,
      flagged: false,
    },
    //   - probably given an existing screen?
    //   - will need to also tell where to put itself?
  },
  wideArena_parapets: {
    id: 0x73,
    icon: icon`<
      |╻<╻|
      |┡━┩|
      |│╻│|`,
    tilesets: {goa1: {}},
  },
  limeTreeLake: {
    id: 0x74,
    tilesets: {}, // sea or mountain (94) - but not really
  },
  // Swamp screens
  swampNW: {
    id: 0x75,
    icon: icon`
      | │ |
      |─┘ |
      |   |`,
    tileset: {swamp: {}},
  },
  swampE: {
    id: 0x76,
    icon: icon`
      |   |
      | ╶─|
      |   |`,
    tileset: {swamp: {}},
    // TODO - flaggable for door
  },
  swampE_door: {
    icon: icon`∩
      | ∩ |
      | ╶─|
      |   |`,
    tileset: {swamp: {}},
  },
  swampNWSE: {
    id: 0x77,
    icon: icon`
      | │ |
      |─┼─|
      | │ |`,
    tileset: {swamp: {}},
  },
  swampNWS: {
    id: 0x78,
    icon: icon`
      | │ |
      |─┤ |
      | │ |`,
    tileset: {swamp: {}},
  },
  swampNE: {
    id: 0x79,
    icon: icon`
      | │ |
      | └─|
      |   |`,
    tileset: {swamp: {}},
  },
  swampWSE: {
    id: 0x7a,
    icon: icon`
      |   |
      |─┬─|
      | │ |`,
    tileset: {swamp: {}},
    // TODO - flaggable
  },
  swampWSE_door: {
    icon: icon`∩
      | ∩  |
      |─┬─|
      | │ |`,
    tileset: {swamp: {}},
    // TODO - flaggable
  },
  swampW: {
    id: 0x7b,
    icon: icon`
      |   |
      |─╴ |
      |   |`,
    tileset: {swamp: {}},
    // TODO - flaggable
  },
  swampW_door: {
    icon: icon`∩
      | ∩ |
      |─╴ |
      |   |`,
    tileset: {swamp: {}},
    // TODO - flaggable
  },
  swampArena: {
    id: 0x7c,
    icon: icon`
      |   |
      |┗┯┛|
      | │ |`,
    tileset: {swamp: {}},
  },
  swampNWE: {
    id: 0x7d,
    icon: icon`
      | │ |
      |─┴─|
      |   |`,
    tileset: {swamp: {}},
  },
  swampSW: {
    id: 0x7e,
    icon: icon`
      |   |
      |─┐ |
      | │ |`,
    tileset: {swamp: {}},
  },
  swampSW_door: {
    icon: icon`∩
      | ∩ |
      |─┐ |
      | │ |`,
    tileset: {swamp: {}},
  },
  swampEmpty: {
    id: 0x7f,
    icon: icon`
      |   |
      |   |
      |   |`,
    tileset: {swamp: {}},
  },
  // Missing swamp screens
  swampN: {
    icon: icon`
      | │ |
      | ╵ |
      |   |`,
    tileset: {swamp: {}},
  },
  swampS: {
    icon: icon`
      |   |
      | ╷ |
      | │ |`,
    tileset: {swamp: {}},
  },
  swampNS: {
    icon: icon`
      | │ |
      | │ |
      | │ |`,
    tileset: {swamp: {}},
  },
  swampWE: {
    icon: icon`
      |   |
      |───|
      |   |`,
    tileset: {swamp: {}},
  },
  swampWE_door: {
    icon: icon`∩
      | ∩ |
      |───|
      |   |`,
    tileset: {swamp: {}},
    // TODO - how to link to swampWE to indicate flag=false?
  },
  swampSE: {
    icon: icon`
      |   |
      | ┌─|
      | │ |`,
    tileset: {swamp: {}},
  },
  swampSE_door: {
    icon: icon`∩
      | ∩ |
      | ┌─|
      | │ |`,
    tileset: {swamp: {}},
  },
  swampNSE: {
    icon: icon`
      | │ |
      | ├─|
      | │ |`,
    tileset: {swamp: {}},
  },
  // Cave screens
  empty: {
    id: 0x80,
    icon: icon`
      |   |
      |   |
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallNS: {
    id: 0x81,
    icon: icon`
      | │ |
      | │ |
      | │ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallWE: {
    id: 0x82,
    icon: icon`
      |   |
      |───|
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallSE: {
    id: 0x83,
    icon: icon`
      |   |
      | ┌─|
      | │ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallWS: {
    id: 0x84,
    icon: icon`
      |   |
      |─┐ |
      | │ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallNE: {
    id: 0x85,
    icon: icon`
      | │ |
      | └─|
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallNW: {
    id: 0x86,
    icon: icon`
      | │ |
      |─┘ |
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  branchNSE: {
    id: 0x87,
    icon: icon`
      | │ |
      | ├─|
      | │ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  branchNWSE: {
    id: 0x88,
    icon: icon`
      | │ |
      |─┼─|
      | │ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  branchNWS: {
    id: 0x89,
    icon: icon`
      | │ |
      |─┤ |
      | │ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  branchWSE: {
    id: 0x8a,
    icon: icon`
      |   |
      |─┬─|
      | │ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  branchNWE: {
    id: 0x8b,
    icon: icon`
      | │ |
      |─┴─|
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallNS_stairs: {
    id: 0x8c,
    icon: icon`
      | ┋ |
      | ┋ |
      | ┋ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallSN_overBridge: {
    id: 0x8d,
    icon: icon`
      | ╽ |
      |─┃─|
      | ╿ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallWE_underBridge: {
    id: 0x8e,
    icon: icon`
      | ╽ |
      |───|
      | ╿ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallNS_wall: {
    id: 0x8f,
    icon: icon`
      | │ |
      | ┆ |
      | │ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
    // TODO - record the wall
  },
  hallWE_wall: {
    id: 0x90,
    icon: icon`
      |   |
      |─┄─|
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallNS_arena: {
    id: 0x91,
    icon: icon`
      |┌┸┐|
      |│&│|
      |└┬┘|`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  hallNS_arenaWall: {
    id: 0x92,
    icon: icon`
      |┌┄┐|
      |│&│|
      |└┬┘|`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  // NOTE: screen 93 is missing!
  branchNWE_wall: {
    id: 0x94,
    icon: icon`
      | ┆ |
      |─┴─|
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  branchNWE_upStair: {
    id: 0x95,
    icon: icon`<
      | < |
      |─┴─|
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  deadEndW_upStair: {
    id: 0x96,
    icon: icon`<
      | < |
      |─┘ |
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  deadEndW_downStair: {
    id: 0x97,
    icon: icon`>
      |   |
      |─┐ |
      | > |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  deadEndE_upStair: {
    id: 0x98,
    icon: icon`<
      | < |
      | └─|
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  deadEndE_downStair: {
    id: 0x99,
    icon: icon`>
      |   |
      | ┌─|
      | > |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  deadEndNS_stairs: {
    id: 0x9a,
    icon: icon`
      | > |
      |   |
      | < |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  deadEndNS: {
    id: 0x9b,
    icon: icon`
      | ╵ |
      |   |
      | ╷ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  deadEndWE: {
    id: 0x9c,
    icon: icon`
      |   |
      |╴ ╶|
      |   |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  // NOTE: 9d missing
  hallNS_entrance: {
    id: 0x9e,
    icon: icon`╽
      | │ |
      | │ |
      | ╽ |`,
    tileset: {cave: {}, fortress: {}, pyramid: {}, sea: {}, iceCave: {}},
  },
  channelExitSE: {
    id: 0x9f,
    icon: icon`
      |   |
      | ╔═|
      | ║ |`,
    tileset: {cave: {}},
  },
  channelBendWS: {
    id: 0xa0,
    icon: icon`
      |█  |
      |═╗ |
      |█║ |`,
    tileset: {cave: {}},
  },
  channelHallNS: {
    id: 0xa1,
    icon: icon`
      | ║ |
      | ╠┈|
      | ║ |`,
    tileset: {cave: {}},
  },
  channelEntranceSE: {
    id: 0xa2,
    icon: icon`
      |   |
      | ╔┈|
      |╷║ |`,
    tileset: {cave: {}},
  },
  channelCross: {
    id: 0xa3,
    icon: icon`
      | ║ |
      |═╬═|
      |╷║╷|`,
    tileset: {cave: {}},
  },
  channelDoor: {
    id: 0xa4,
    icon: icon`∩
      | ∩█|
      |┈══|
      |  █|`,
    tileset: {cave: {}},
  },
  mountainFloatingIsland: {
    id: 0xa5,
    icon: icon`*
      |═╗█|
      |*║ |
      |═╣█|`,
    tileset: {mountainRiver: {}},
  },
  mountainPathNE_stair: {
    id: 0xa6,
    icon: icon`└
      |█┋█|
      |█  |
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainBranchNWE: {
    id: 0xa7,
    icon: icon`┴
      |█ █|
      |   |
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainPathWE_iceBridge: {
    id: 0xa8,
    icon: icon`╫
      |█║█|
      | ┆ |
      |█║█|`,
    tileset: {mountainRiver: {}},
  },
  mountainPathSE: {
    id: 0xa9,
    icon: icon`┌
      |███|
      |█  |
      |█ █|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainDeadEndW_caveEmpty: {
    id: 0xaa,
    icon: icon`∩
      |█∩█|
      |▐ ▐|
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainPathNE: {
    id: 0xab,
    icon: icon`└
      |█ █|
      |█  |
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainBranchWSE: {
    id: 0xac,
    icon: icon`┬
      |███|
      |   |
      |█ █|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainPathW_cave: {
    id: 0xad,
    icon: icon`∩
      |█∩█|
      |  ▐|
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainPathE_slopeS: {
    id: 0xae,
    icon: icon`╓
      |███|
      |█  |
      |█↓█|`,
    tileset: {mountain: {}},
  },
  mountainPathNW: {
    id: 0xaf,
    icon: icon`┘
      |█ █|
      |  █|
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainCave_empty: {
    id: 0xb0,
    icon: icon`∩
      |█∩█|
      |▌ ▐|
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainPathE_cave: {
    id: 0xb1,
    icon: icon`∩
      |█∩█|
      |█  |
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainPathWE_slopeN: {
    id: 0xb2,
    icon: icon`╨
      |█↓█|
      |   |
      |███|`,
    tileset: {mountain: {}},
  },
  mountainDeadEndW: {
    id: 0xb3,
    icon: icon`╴
      |███|
      |  █|
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainPathWE: {
    id: 0xb4,
    icon: icon`─
      |███|
      |   |
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainArena_gate: {
    id: 0xb5,
    icon: icon`#
      |█#█|
      |▌ ▐|
      |█┋█|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainPathN_slopeS_cave: {
    id: 0xb6,
    icon: icon`∩
      |█┋∩|
      |▌  |
      |█↓█|`,
    tileset: {mountain: {}},
  },
  mountainPathWE_slopeNS: {
    id: 0xb7,
    icon: icon`╫
      |█↓█|
      |   |
      |█↓█|`,
    tileset: {mountain: {}},
  },
  mountainPathWE_slopeN_cave: {
    id: 0xb8,
    icon: icon`∩
      |█↓∩|
      |   |
      |███|`,
    tileset: {mountain: {}},
  },
  mountainPathWS: {
    id: 0xb9,
    icon: icon`┐
      |███|
      |  █|
      |█ █|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  mountainSlope: {
    id: 0xba,
    icon: icon`↓
      |█↓█|
      |█↓█|
      |█↓█|`,
    tileset: {mountain: {}},
  },
  mountainRiver: {
    id: 0xba,
    icon: icon`║
      |█║█|
      |█║█|
      |█║█|`,
    tileset: {mountainRiver: {}},
  },
  mountainPathE_gate: {
    id: 0xbb,
    icon: icon`∩
      |█∩█|
      |█  |
      |███|`,
    tileset: {mountain: {}},
  },
  mountainPathWE_inn: {
    id: 0xbc,
    icon: icon`∩
      |█∩█|
      |   |
      |███|`,
    tileset: {mountain: {}},
  },
  mountainPathWE_bridgeOverSlope: {
    id: 0xbd,
    icon: icon`═
      |█↓█|
      | ═ |
      |█↓█|`,
    tileset: {mountain: {}},
  },
  mountainPathWE_bridgeOverRiver: {
    id: 0xbd,
    icon: icon`═
      |█║█|
      | ═ |
      |█║█|`,
    tileset: {mountainRiver: {}},
  },
  mountainSlope_underBridge: {
    id: 0xbe,
    icon: icon`↓
      |█↓█|
      | ═ |
      |█↓█|`,
    tileset: {mountain: {}},
    // TODO - could fly under bridge on mountainRiver
  },
  mountainSolid: {
    id: 0xbf,
    icon: icon`
      |███|
      |███|
      |███|`,
    tileset: {mountain: {}, mountainRiver: {}},
  },
  boundaryS: {
    id: 0xc0,
    icon: icon`
      |   |
      |▄▄▄|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
    // TODO - grass/river should maybe use rocks instead?
  },
  boundaryN_cave: {
    id: 0xc1,
    icon: icon`
      |███|
      |▀∩▀|
      |   |`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  boundarySE_cave: {
    id: 0xc2,
    icon: icon`
      | ▐█|
      |▄∩█|
      |███|`,
    tilesets: {grass: {}, river: {}, sea: {}, desert: {}},
  },
  waterfall: {
    id: 0xc3,
    icon: icon`
      |   |
      |↓↓↓|
      |   |`,
    tilesets: {sea: {}},
  },
  whirlpoolBlocker: {
    id: 0xc4,
    icon: icon`
      |   |
      |█╳█|
      |   |`,
    tilesets: {sea: {}},
    // TODO - indicate flag
  },
  beachExitN: {
    id: 0xc5,
    icon: icon`
      |█ █|
      |█╱▀|
      |█▌ |`,
    tilesets: {sea: {}},
  },
  whirlpoolOpen: {
    id: 0xc6,
    icon: icon`
      |   |
      | ╳ |
      |   |`,
    tilesets: {sea: {}},
  },
  lighthouseEntrance: {
    id: 0xc7,
    icon: icon`
      |▗▟█|
      |▐∩▛|
      |▝▀▘|`,
    tilesets: {sea: {}},
    // TODO - indicate uniqueness?
  },
  beachCave: {
    id: 0xc8,
    icon: icon`
      |█∩█|
      |▀╲█|
      |   |`,
    tilesets: {sea: {}},
  },
  beachCabinEntrance: {
    id: 0xc9,
    icon: icon`
      | ∩█|
      | ╲▀|
      |█▄▄|`,
    tilesets: {sea: {}},
  },
  oceanShrine: {
    id: 0xca,
    icon: icon`
      |▗▄▖|
      |▐*▌|
      |▝ ▘|`,
    tilesets: {sea: {}},
    // TODO - indicate uniqueness?
  },
  pyramidEntrance: {
    id: 0xcb,
    icon: icon`
      | ▄ |
      |▟∩▙|
      | ╳ |`,
    tilesets: {desert: {}},
    // TODO - indicate uniqueness?
  },
  cryptEntrance: {
    id: 0xcc,
    icon: icon`
      | ╳ |
      |▐>▌|
      |▝▀▘|`,
    tilesets: {desert: {}},
  },
  oasisLake: {
    id: 0xcd,
    icon: icon`
      | ^ |
      |vOv|
      | vv|`,
    tilesets: {desert: {}},
  },
  desertCaveEntrance: {
    id: 0xce,
    icon: icon`
      |▗▄▖|
      |▜∩▛|
      | ╳ |`,
    tilesets: {desert: {}},
  },
  oasisCave: {
    id: 0xcf,
    icon: icon`
      | vv|
      |▄∩v|
      |█▌ |`,
    tilesets: {desert: {}},
  },
  channelEndW_cave: {
    id: 0xd0,
    icon: icon`
      |██∩|
      |══ |
      |███|`,
    tileset: {cave: {}},
  },
  boatChannel: {
    id: 0xd1,
    icon: icon`
      |███|
      |▀▀▀|
      |▄▄▄|`,
    tileset: {sea: {}},
  },
  channelWE: {
    id: 0xd2,
    icon: icon`
      |███|
      |═══|
      |███|`,
    tileset: {cave: {}},
  },
  riverCaveNWSE: {
    id: 0xd3,
    icon: icon`
      |┘║└|
      |═╬═|
      |┬┆┬|`,
    tileset: {cave: {}, fortress: {}},
    // TODO - consider using solids for the corners instead?
  },
} as const;

//   ╔╦╗         ╢  ╥
//   ╠╬╣ ╞═╤╧╪╡  ║  ╫
//   ╚╩╝         ╨  ╟
//  ┌┬┐  ╷
//  ├┼┤  │ ╶─╴ 
//  └┴┘  ╵
// ▗▄▖   ▟▙
// ▐█▌   ▜▛ 
// ▝▀▘
// U+250x ─ ━ │ ┃ ┄ ┅ ┆ ┇ ┈ ┉ ┊ ┋ ┌ ┍ ┎ ┏
// U+251x ┐ ┑ ┒ ┓ └ ┕ ┖ ┗ ┘ ┙ ┚ ┛ ├ ┝ ┞ ┟
// U+252x ┠ ┡ ┢ ┣ ┤ ┥ ┦ ┧ ┨ ┩ ┪ ┫ ┬ ┭ ┮ ┯
// U+253x ┰ ┱ ┲ ┳ ┴ ┵ ┶ ┷ ┸ ┹ ┺ ┻ ┼ ┽ ┾ ┿
// U+254x ╀ ╁ ╂ ╃ ╄ ╅ ╆ ╇ ╈ ╉ ╊ ╋ ╌ ╍ ╎ ╏
// U+255x ═ ║ ╒ ╓ ╔ ╕ ╖ ╗ ╘ ╙ ╚ ╛ ╜ ╝ ╞	╟
// U+256x ╠ ╡ ╢ ╣ ╤ ╥ ╦ ╧ ╨ ╩ ╪ ╫ ╬ ╭ ╮ ╯
// U+257x ╰ ╱ ╲ ╳ ╴ ╵ ╶ ╷ ╸ ╹ ╺ ╻ ╼ ╽ ╾ ╿
// U+258x ▀ ▁ ▂ ▃ ▄ ▅ ▆ ▇ █ ▉ ▊ ▋ ▌ ▍ ▎ ▏
// U+259x ▐ ░ ▒ ▓ ▔ ▕ ▖ ▗ ▘ ▙ ▚ ▛ ▜ ▝ ▞ ▟
//
// ∩ \cap

const TILESET_FIXES = {
  grass: {
    id: 0x80,
    0x40: 0x51,
    0x41: 0x52,
    0x42: 0x53,
    0x43: 0x54,
    0x44: 0x55,
    0x45: 0x56,
    0x46: 0x58,
    0x47: 0x59,
  },
  desert: {
    id: 0x9c,
    0x5a: {base: 0x98, bl: 0x94, br: 0x94},
    0x5b: {base: 0x80, tl: 0xfd, tr: 0xfc},
    0x5c: {base: 0x80, bl: 0xff, br: 0xfe},
    0x5d: {base: 0x80, tr: 0xff, br: 0xfd},
    0x5e: {base: 0x80, tl: 0xfe, bl: 0xfc},
    0x63: 0x71,
    0x68: 0x70,
    0x69: 0x60,
    0x6a: 0x65,
    0x6c: 0x70,
    0x6e: 0x76,
    0x6f: 0x78,
  },
} as const;

const SCREEN_REMAPS = [
  {tilesets: [0x9c], src: 0x5b, dest: 0x5f, screens: [0xcf]},
];
const [] = SCREEN_REMAPS;
// TODO - copy 5f <- 5b in 9c, then remap in screen cf
//      - better notation?
// Consider doing this programmatically, though we'd want to use
// the _actual_ screen-tileset usages rather than declared options

export function fixTilesets(rom: Rom) {
  const desert = rom.tilesets.desert;
  //const grass = rom.tilesets.grass;

  desert.getTile(0x5f).copyFrom(0x5b); //.moveUses(rom.screens.oasis);
   rom.screens.oasis.replace(0x5b, 0x5f);

  desert.getTile(0x5a).copyFrom(0x98).setTiles([, , 0x1a, 0x18]);
  desert.getTile(0x5b).copyFrom(0x80).setTiles([0x34, 0x32, , ]);
  desert.getTile(0x5c).copyFrom(0x80).setTiles([, , 0x37, 0x35]);
  desert.getTile(0x5d).copyFrom(0x80).setTiles([, 0x37, , 0x34]);
  desert.getTile(0x5e).copyFrom(0x80).setTiles([0x35, , 0x32, ]);
  desert.getTile(0x63).copyFrom(0x71);

  for (const x of Object.values(TILESET_FIXES)) {
    const id = x.id;
    const ts = rom.tilesets[id];
    const te = ts.effects();
    for (const tstr in x) {
      const t = Number(tstr);
      if (isNaN(t)) continue;
      const y: number|{base: number} = (x as any)[t];
      const base = typeof y === 'number' ? y : (y as any).base;
      const rest: any = typeof y === 'number' ? {} : y;
      ts.attrs[t] = ts.attrs[base];
      te.effects[t] = te.effects[base];
      [rest.tl, rest.tr, rest.bl, rest.br].forEach((m, i) => {
        ts.tiles[i][t] = ts.tiles[i][m != null ? m : base];
      });
      if (rest.move) {}
      // if (rest.tiles) {
      //   rest.tiles.forEach((s: number, i: number) => void (ts.tiles[i][t] = s));
      // }
    }
  }
}

// class LocationsClass extends Array<Location> {
  
//   static get [Symbol.species]() { return Array; }

//   constructor(readonly rom: Rom) {
//     super(0x100);
//     for (let id = 0; id < 0x100; id++) {
//       this[id] = new Location(rom, id);
//     }
//     for (const key of Object.keys(LOCATIONS)) {
//       const [id,] = namesTyped[key];
//       (this as unknown as {[name: string]: Location})[key] = this[id];
//     }
//   }

//   // Find all groups of neighboring locations with matching properties.
//   // TODO - optional arg: check adjacent # IDs...?
//   partition<T>(func: (loc: Location) => T, eq: Eq<T> = (a, b) => a === b, joinNexuses = false): [Location[], T][] {
//     const seen = new Set<Location>();
//     const out: [Location[], T][] = [];
//     for (let loc of this) {
//       if (seen.has(loc) || !loc.used) continue;
//       seen.add(loc);
//       const value = func(loc);
//       const group = [];
//       const queue = [loc];
//       while (queue.length) {
//         const next = queue.pop()!;
//         group.push(next);
//         for (const n of next.neighbors(joinNexuses)) {
//           if (!seen.has(n) && eq(func(n), value)) {
//             seen.add(n);
//             queue.push(n);
//           }
//         }
//       }
//       out.push([[...group], value]);
//     }
//     return out;
//   }
// }

// type Eq<T> = (a: T, b: T) => boolean;

// const namesTyped = LOCATIONS as unknown as {[name: string]: [number, string]};

// export type Locations = LocationsClass & {[T in keyof typeof LOCATIONS]: Location};

// export const Locations: {new(rom: Rom): Locations} = LocationsClass as any;
