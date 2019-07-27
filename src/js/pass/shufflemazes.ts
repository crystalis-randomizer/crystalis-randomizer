import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Location, Flag} from '../rom/location.js';

// For now we hardcode data about the available screens...
// Edges of tile: [0 1 2] along top, [3 4 5] down left,
// [6 7 8] on bottom, [9 10 11] down right edge.
const GOA1 = [
  [0x72, [0, 6], [1, 7], [2, 8]],
  [0xe0, [0, 11], [1, 10], [2, 9]],
  [0xe1, [0, 3], [1, 4], [2, 5]],
  [0xe2, [6, 9], [7, 10], [8, 11]],
  [0xe3, [3], [4, 7], [5, 6], [11]],
];

function shuffleGoa1(location: Location, random: Random) {
  // NOTE: also need to move enemies...


}


export function shuffleSwamp(rom: Rom, random: Random) {
  // 1. Start by fixing up the swamp tiles.
  extendSwampScreens(rom);

  // Collect the available screens (7c is boss room, 7f is solid)
  const screens = [0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x7b, 0x7d, 0x7e, 0x7f];



  //const swamp = rom.locations.swamp;



}

export function extendSwampScreens(rom: Rom) {
  // Move up to 13 swamp tiles to the alternate palette
  // so that we can selectively open up different options for
  // the Oak entrance (or possibly hide other caves?)
  //  - Screens 76, 7a, 7b and then close up 7e.
  //  - Tiles   ac -> da; aa -> dc, e4, e5, e6, e7, f0, f1, f2, f3

  // Make a handful of removable tiles
  rom.swapMetatiles([0xa0],
                    [[0x03, 0xac], ~0xda],
                    [[0x04, 0xaa], ~0xe4],
                    [[0x05, 0xaa], ~0xe5],
                    [[0x06, 0xaa], ~0xe6],
                    [[0x07, 0xaa], ~0xe7],
                    [[0x08, 0xaa], ~0xf0],
                    [[0x09, 0xaa], ~0xf1],
                    [[0x0a, 0xaa], ~0xf2],
                    [[0x0b, 0xaa], ~0xf3],
                    [[0x0c, 0xaa], ~0xdc],
                    [[0x0d, 0xaa], ~0xdd]);

  // Plug removable tiles into several of the screens.
  write(rom.screens[0x7f].tiles, 0x00, [ // solid block - add left column
    [0xa8, 0xcc], // 0
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xa8, 0xcc],
    [0xd2, 0xcc], // 9
    [0xd2, 0xcc],
    [0xd2, 0xcc],
    [0xd2, 0xe2], // c
    [0xe2, 0xc8], // d
  ]);

  write(rom.screens[0x76].tiles, 0x4c, [ // left dead end - add optional door
    [0x08, 0x09], // f0 f1
    [0x0c, 0x0b], // dc f3
    [0x03, 0x03], // da da
  ]);

  write(rom.screens[0x7a].tiles, 0x25, [ // tee - add an optional door
    [    ,     , 0x04], //       e4
    [0x08, 0x09, 0x05], // f0 f1 e5
    [    , 0x0a, 0x06], //    f2 e6
    [    , 0x0b, 0x07], //    f3 e7
    [    , 0x03, 0x03], //    da da
  ]);

  write(rom.screens[0x7b].tiles, 0x24, [ // right dead end - add optional door
    [0x04      ], // e4
    [          ], //
    [0x06      ], // e6
    [0x07, 0x0d], // e7 dd
    [0x03, 0x03], // da da
  ]);

  write(rom.screens[0x7e].tiles, 0x47, [ // down/left - existing door optional
    [0x08, 0x09], // f0 f1
    [0x0c, 0x0b], // dc f3
    [0x03, 0x03], // da da
  ]);

  // TEMP - add flags to all screens
  const swamp = rom.locations.swamp;
  const hasDoor = new Set([0x76, 0x7a, 0x7b, 0x7e]);
  for (let y = 0; y < swamp.screens.length; y++) {
    for (let x = 0; x < swamp.screens[y].length; x++) {
      if (hasDoor.has(swamp.screens[y][x])) {
        swamp.flags.push(Flag.of({yx: y << 4 | x, flag: 0x2ef}));
      }
    }
  }      
}

function write<T>(arr: T[], corner: number, repl: readonly T[][]) {
  for (let i = 0; i < repl.length; i++) {
    for (let j = 0; j < repl[i].length; j++) {
      if (repl[i][j] != null) arr[corner + (i << 4 | j)] = repl[i][j];
    }
  }
}
