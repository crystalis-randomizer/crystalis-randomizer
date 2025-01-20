// Shuffle floors of Goa fortress amongst each other.
// One key difficulty is the direction of the doors.
// The door at the top of karmine points down, whereas all others are up.
// We need a way to change the direction of each.

import {Random} from '../random';
import {Rom} from '../rom';
import {Metalocation, Pos} from '../rom/metalocation';
import {ConnectionType} from '../rom/metascreendata';
import {ShuffleData} from '../appatch';

type Exit = [Metalocation, Pos, ConnectionType];
type Exit2 = [Metalocation, Pos, ConnectionType,
              ((e: Exit, r: Random) => void)?];

function flipSaberaEntrance(exit: Exit) {
  //console.log(`flip sabera entrance`);
  const loc = exit[0];
  loc.set2d(0x71, [[loc.rom.metascreens.deadEndE_upStair],
                   [loc.rom.metascreens.caveEmpty]]);
  loc.moveExits([0x81, 'stair:down', 0x71, 'stair:up']);
  exit[1] = 0x71;
  exit[2] = 'stair:up';
}

function flipKarmineEntrance(exit: Exit, random: Random) {
  //console.log(`flip karmine entrance`);
  const loc = exit[0];
  const ms = loc.rom.metascreens;
  loc.set2d(0x20, [[ms.caveEmpty, ms.hallNS],
                   [ms.deadEndE_upStair, ms.hallNW]]);
  loc.replaceMonsters(random);
  loc.moveExits([0x30, 'stair:down', 0x30, 'stair:up']);
  exit[2] = 'stair:up';
}

function flipKarmineExit(exit: Exit) {
  //console.log(`flip karmine exit`);
  const loc = exit[0];
  const ms = loc.rom.metascreens;
  loc.set2d(0x01, [[ms.deadEndS_stairs, ms.caveEmpty]]);
  loc.moveExits([0x02, 'stair:down', 0x01, 'stair:up']);
  exit[1] = 0x01;
  exit[2] = 'stair:up';
}

function flipExit(exit: Exit) {
  //console.log(`flip generic exit`);
  const loc = exit[0];
  const ms = loc.rom.metascreens;
  if (loc.width < 2) loc.width = 2; // should alredy be filled w/ empty
  loc.set2d(0x00, [[ms.hallSE, ms.deadEndW_downStair]]);
  loc.moveExits([0x00, 'stair:up', 0x01, 'stair:down']);
  exit[1] = 0x01;
  exit[2] = 'stair:down';
}

function flip(e: Exit2, random: Random) {
  e[3]!(e as Exit, random);
  e[3] = undefined;
}

export function shuffleGoa(rom: Rom, random: Random, predetermined?: ShuffleData) {
  const $ = rom.locations;
  let floors = [0, 1, 2, 3];
  if (predetermined?.goaFloors){
    floors = predetermined.goaFloors.map(floor => floor[0]);
  } else {
    random.shuffle(floors);
  }

  const entrances: Exit2[] = [
    [$.GoaFortress_Kelbesque.meta!, 0x83, 'stair:down'],
    [$.GoaFortress_Sabera.meta!, 0x81, 'stair:down', flipSaberaEntrance],
    [$.GoaFortress_Mado1.meta!, 0x72, 'stair:down'],
    [$.GoaFortress_Karmine1.meta!, 0x30, 'stair:down', flipKarmineEntrance],
  ];
  const exits: Exit2[] = [
    [$.GoaFortress_Zebu.meta!, 0x00, 'stair:up', flipExit],
    [$.GoaFortress_Tornel.meta!, 0x00, 'stair:up', flipExit],
    [$.GoaFortress_Asina.meta!, 0x00, 'stair:up', flipExit],
    [$.GoaFortress_Kensu.meta!, 0x02, 'stair:down', flipKarmineExit],
  ];

  // Plan: piece it together...
  //  - probably just rearrange the arrays, then do all the mutations later????
  const a: Exit2[] = [[$.GoaFortress_Entrance.meta!, 0x00, 'edge:top']];
  const b: Exit2[] = [];
  let up = true;
  let lastA: Exit2 = a[0];

  for (const f of floors) {
    const flexible = up || entrances[f][3] || a[a.length - 1][3];
    let reverse = flexible ? random.pick([false, true]) : true;
    if (predetermined?.goaFloors){
        //just trust that the predetermined did this right
        reverse = predetermined.goaFloors[a.length - 1][1];
    }
    //console.log(`FLOOR ${f}: up ${up} flexible ${!!flexible} reverse ${reverse}`);
    const lastB: Exit2 = reverse ? exits[f] : entrances[f];
    //console.log(`push b ${rom.locations[lastB[0].id].name}`);
    b.push(lastB);
    if (up !== (lastB[2] === 'stair:down')) {
      if (lastB[3]) {
        flip(lastB, random);
      } else {
        flip(lastA, random);
      }
    }
    a.push(lastA = reverse ? entrances[f] : exits[f]);
    //console.log(`push a ${rom.locations[lastA[0].id].name}`);
    up = lastA[2] === 'stair:up';
  }
  if (up) flip(lastA, random); // NOTE: all entrances can be down, only some up
  b.push([$.GoaFortress_Exit.meta!, 0x01, 'stair:up']);

  for (let i = 0; i < a.length; i++) {
    // TODO - simplify to remove specific type
    a[i][0].attach(a[i][1], b[i][0], b[i][1], a[i][2], b[i][2]);
  }

  // let last = [exits[0][0], exits[0][1], 'stair:up'];
  // for (let i = 1; i <= 4; i++) {
  //   const floor = floors[i];
  //   // Each floor may be reversed.  Exception: if we're coming through a down
  //   // stair into kelby or mado's area then we MUST be reversed since these
  //   // maps are not compatible with an up stair at the start.
  //   const reverse =
  //       last === 'stair:up' || (floor & 1) ? random.pick([false, true]) : true;
  //   const entrance = (reverse ? exits : entrances)[floor];
  //   const exit = (reverse ? entrances : exits)[floor];
  //   if (entrance[2] === last) {
  //     flip(entrance);
  //   }
  //   if (i === 4) { // exit must be down
  //     if (exit[2] !== 'stair:down') flip(exit);
  //   } else { // exit should be up if possible, but not required.
  //     if (exit[2] !== 'stair:up' &&
  //         exit[0] !== $.GoaFortress_Kelbesque.meta &&
  //         exit[0] !== $.GoaFortress_Mado1.meta) {
  //       flip(exit);
  //     }
  //   }
  //   const prev = exits[floors[i - 1]];
  //   prev[0].attach(prev[1], prev[2])
  //   last = exit[2];
  // }


  // // Update the exit position of Kensu and exits[floots[4]] if not same
  // const last = floors[3];
  // if (last !== 4) {
  //   flipKarmineExit();
  //   flipNonKarmineExit(last);
  // }

  // // Now go through each and do the links.
  // // exits[0] : entrances[floors[0]]
  // // exits[floors[0]] : entrances[floors[1]]
  // // ...
  // // exits[floors[3]] : entrances[0]

  // function connect(from: Location, exit: number,
  //                  to: Location, entrance: number) {
  //   // find all exits in 'from' that map to the same entrance
  //   const want = from.exits[exit];
  //   const found = [];
  //   for (const e of from.exits) {
  //     if (e.dest === want.dest && e.entrance === want.entrance) found.push(e);
  //   }
  //   for (const e of found) {
  //     e.dest = to.id;
  //     e.entrance = entrance;
  //   }
  // }

  // for (let i = 0; i <= 4; i++) {
  //   const lower = i === 0 ? 0 : floors[i - 1];
  //   const upper = i === 4 ? 0 : floors[i];
  //   const [lowerLoc, lowerIn, lowerOut] = exits[lower];
  //   const [upperLoc, upperIn, upperOut] = entrances[upper];
  //   connect(upperLoc, upperOut, lowerLoc, lowerIn);
  //   connect(lowerLoc, lowerOut, upperLoc, upperIn);
  // }

  // // Fix the palettes and music.
  // for (const [l] of exits) {
  //   if (typeof l.data.music === 'number') {
  //     l.bgm = l.neighborForEntrance(l.data.music as number).bgm;
  //   }
  //   if (typeof l.data.palette === 'number') {
  //     const n = l.neighborForEntrance(l.data.palette as number).tilePalettes;
  //     l.tilePalettes = [n[0], n[1], n[2]];
  //   }
  // }
}
