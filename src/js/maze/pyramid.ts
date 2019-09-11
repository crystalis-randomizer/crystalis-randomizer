import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Entrance} from '../rom/location.js';

type Dir = 'u' | 'd';

export function shufflePyramid(rom: Rom, random: Random): void {
  // The pyramid has 17 entrances/exits: 8 down, 9 up.
  // The entrances and exits are paired: entrance 0 <==> exits 0 and 1,
  // entrance 1 <==> exits 2 and 3, etc.  Normally 0 and 1 go back to
  // the entrance and 16 advances.
  //
  // Our strategy here is to shuffle the positions of the entrances,
  // so that we don't need to change the exit destinations pointing
  // to them.  We start by picking 3 entrances to be normal, and pull
  // them out of the mix, assigning them the correct information so
  // that they're properly reversible.  The remaining 7 up and 7 down
  // entrances are then paired up randomly, not necessarily reversibly.
  //
  // There's one edge case to be aware of: it's possible that the chest
  // room forms a closed loop, either because both back entrances are
  // there, or because they reversibly point to each other.  We must
  // detect either case and reroll.

  const loc = rom.locations.pyramidMain;
  const dir = 'dudududuudududduu'.split('') as Dir[];
  let realDir: Dir = 'u';

  // 50% chance to flip the top entrance upside down.
  if (random.next() < 0.5) {
    // Add an extra screen to point the top exit downward.
    loc.screens[0][3] = 0x84;
    loc.screens[0][2] = 0x99;
    dir[16] = realDir = 'd';

    // Move entrance 12 to the vanilla advancement door.
    loc.entrances[12].screen = loc.entrances[16].screen;
    loc.entrances[12].coord = loc.entrances[16].coord;
    loc.exits[2 * 12].screen = loc.exits[2 * 16].screen;
    loc.exits[2 * 12].tile = loc.exits[2 * 16].tile;
    loc.exits[2 * 12 + 1].screen = loc.exits[2 * 16 + 1].screen;
    loc.exits[2 * 12 + 1].tile = loc.exits[2 * 16 + 1].tile;

    // Move entrance 16 to the new tile.
    loc.entrances[16].screen = 0x02;
    loc.entrances[16].coord = 0xafd0;
    loc.exits[2 * 16].screen = loc.exits[2 * 16 + 1].screen = 0x02;
    loc.exits[2 * 16].tile = 0xbc;
    loc.exits[2 * 16 + 1].tile = 0xbd;

    // Fix up the landing to be the other direction, too.
    const loc2 = rom.locations.pyramidDraygon;
    loc2.width = 2;
    loc2.screens[0].push(0x9a);
    loc2.screens[1].push(0xfd);
    loc2.screens[2] = [0xe0, 0xe1];
    loc2.exits[0].screen = loc2.exits[1].screen = 0x01;
    loc2.exits[0].tile = 0xc7;
    loc2.exits[1].tile = 0xc8;
    loc2.entrances[0].screen = 0x01;
    loc2.entrances[0].coord = 0xd080;
  }

  const all = {'u': [] as number[], 'd': [] as number[]};
  for (let i = 0; i < dir.length; i++) {
    all[dir[i]].push(i);
  }

  random.shuffle(all['u']);
  random.shuffle(all['d']);
  const realEntrance = all[realDir].pop()!;

  const entrances: Entrance[] = [];
  // Fix the "real entrance"
  entrances[16] = loc.entrances[realEntrance];
  setExit(realEntrance, 0x9f, 0);
  // Fix the branched entrances
  const upEntrance = all['u'].pop()!;
  entrances[1] = loc.entrances[upEntrance];
  setExit(upEntrance, 0x9d, 2);
  let downEntrance = all['d'].pop()!;
  if (realDir === 'u' && downEntrance === 0xe && upEntrance === 0xc) {
    // prevent the case where both back entrances are in the chest room
    [downEntrance] = all['d'].splice(0, 1, downEntrance);
  } else if (realDir === 'd' &&
             ((downEntrance === 0xe && realEntrance === 0x10) ||
              (downEntrance === 0x10 && realEntrance === 0xe))) {
    // prevent the case where both down-back and real exit are in chest room
    [downEntrance] = all['d'].splice(0, 1, downEntrance);
  }
  entrances[0] = loc.entrances[downEntrance];
  setExit(downEntrance, 0x9d, 1);
  // Now do the full shuffled remap
  do {
    const sources = {'u': [...all['u']], 'd': [...all['d']]};
    const dests = {'u': [...all['u']], 'd': [...all['d']]};
    random.shuffle(dests['u']);
    random.shuffle(dests['d']);
    const inv = {'u': 'd', 'd': 'u'} as const;
    for (let i = 2; i < 16; i++) {
      // For each entrance i=2..16, pick a remaining same-direction entrance
      // and a remaining opposite-direction entrance.
      const source = sources[dir[i]].pop();
      const dest = dests[inv[dir[i]]].pop();
      if (source == null || dest == null) throw new Error('impossible');
      entrances[i] = loc.entrances[source];
      setExit(dest, 0x9e, i);
    }
    // Make sure we didn't cut off the chest room from the rest of the map.
    const cExit = loc.exits[2 * 0xc];
    const eExit = loc.exits[2 * 0xe];
    if (realDir === 'u' && cExit.dest === eExit.dest &&
        loc.entrances[0xe] === entrances[cExit.entrance] &&
        loc.entrances[0xc] === entrances[eExit.entrance]) {
      continue; // try again
    }
    break;
  } while (true);
  loc.entrances = entrances;

  function setExit(i: number, dest: number, entrance: number) {
    loc.exits[2 * i].dest = loc.exits[2 * i + 1].dest = dest;
    loc.exits[2 * i].entrance = loc.exits[2 * i + 1].entrance = entrance;
  }
}
