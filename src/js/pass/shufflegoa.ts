// Shuffle floors of Goa fortress amongst each other.
// One key difficulty is the direction of the doors.
// The door at the top of karmine points down, whereas all others are up.
// We need a way to change the direction of each.

import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';

export function shuffleGoa(rom: Rom, random: Random) {
  const $ = rom.locations;
  const floors = [1, 2, 3, 4];
  random.shuffle(floors);

  // (location, entrance ID, exit index)
  const entrances: ReadonlyArray<readonly [Location, number, number]> = [
    [$.GoaFortress_Exit, 0, 0], // 0 or 4
    [$.GoaFortress_Kelbesque, 0, 0],
    [$.GoaFortress_Sabera, 0, 0],
    [$.GoaFortress_Mado1, 0, 0],
    [$.GoaFortress_Karmine1, 0, 0],
  ];
  const exits: ReadonlyArray<readonly [Location, number, number]> = [
    [$.GoaFortress_Entrance, 1, 2], // 0 or 4
    [$.GoaFortress_Zebu, 1, 4],
    [$.GoaFortress_Tornel, 1, 2],
    [$.GoaFortress_Asina, 1, 2],
    [$.GoaFortress_Kensu, 5, 10],
  ];

  // Update the exit position of Kensu and exits[floots[4]] if not same
  const last = floors[3];
  if (last !== 4) {
    flipKarmineExit(...exits[4]);
    flipNonKarmineExit(...exits[last]);
  }

  // Now go through each and do the links.
  // exits[0] : entrances[floors[0]]
  // exits[floors[0]] : entrances[floors[1]]
  // ...
  // exits[floors[3]] : entrances[0]

  function connect(from: Location, exit: number,
                   to: Location, entrance: number) {
    // find all exits in 'from' that map to the same entrance
    const want = from.exits[exit];
    const found = [];
    for (const e of from.exits) {
      if (e.dest === want.dest && e.entrance === want.entrance) found.push(e);
    }
    for (const e of found) {
      e.dest = to.id;
      e.entrance = entrance;
    }
  }

  for (let i = 0; i <= 4; i++) {
    const lower = i === 0 ? 0 : floors[i - 1];
    const upper = i === 4 ? 0 : floors[i];
    const [lowerLoc, lowerIn, lowerOut] = exits[lower];
    const [upperLoc, upperIn, upperOut] = entrances[upper];
    connect(upperLoc, upperOut, lowerLoc, lowerIn);
    connect(lowerLoc, lowerOut, upperLoc, upperIn);
  }

  // Fix the palettes and music.
  for (const [l] of exits) {
    if (typeof l.data.music === 'number') {
      l.bgm = l.neighborForEntrance(l.data.music as number).bgm;
    }
    if (typeof l.data.palette === 'number') {
      const n = l.neighborForEntrance(l.data.palette as number).tilePalettes;
      l.tilePalettes = [n[0], n[1], n[2]];
    }
  }
}

function flipKarmineExit(l: Location, i: number, o: number) {
  l.writeScreens2d(0x01, [[0x9a, 0x80]]);
  l.entrances[i].screen = l.exits[o].screen = l.exits[o + 1].screen = 0x01;
  l.entrances[i].coord = 0xd080;
  l.exits[o].tile = 0xc7;
  l.exits[o + 1].tile = 0xc8;
}

function flipNonKarmineExit(l: Location, i: number, o: number) {
  if (l.width < 2) l.resizeScreens(0, 0, 0, 1, 0x80);
  l.writeScreens2d(0x00, [[0x83, 0x97]]);
  l.entrances[i].screen = l.exits[o].screen = l.exits[o + 1].screen = 0x01;
  l.entrances[i].coord = 0xaf30;
  l.exits[o].tile = 0xb2;
  l.exits[o + 1].tile = 0xb3;
}
