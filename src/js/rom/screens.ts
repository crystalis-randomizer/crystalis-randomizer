//import {Rom} from '../rom.js';
import {Screen} from './screen.js';
import {SparseArray} from '../util.js';

export class Screens extends SparseArray<Screen> {

  

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

const SCREENS = {
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
  fortressEntrance: {
    id: 0x08,
    icon: icon`
      |███|
      |█@█|
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
  exitW_cave: {
    id: 0x0a,
    icon: icon`@
      |█@█|
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
    icon: icon`@
      |█@█|
      |█!▀|
      |│  |`,
    tilesets: {river: {}},
  },
  riverBendSE: {
    id: 0x14,
    icon: `
      |w  |
      | ╔═|
      | ║ |`,
    tilesets: {river: {}},
  },
  boundaryW_cave: {
    id: 0x15,
    icon: icon`
      |█▌ |
      |█@ |
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
      | @█|
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
    icon: ' ',
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
    icon: icon`@
      |█@█|
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
      |█@█|
      |█ █|`,
    tilesets: {grass: {}},
  },
  townExitW_cave: { // TODO: consider just deleting?
    id: 0x2d,
    icon: icon`@
      |█@█|
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
      | ╏ |
      | ║ |`,
    tilesets: {river: {}},
    // TODO - indicate bridge
  },
 
} as const;
const [] = [SCREENS];

// ▗▄▖  ▟▙
// ▐█▌   ▜▛ 
// ▝▀▘
//   ╔╦╗         ╢  ╥
//   ╠╬╣ ╞═╤╧╪╡  ║  ╫
//   ╚╩╝         ╨  ╟

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
