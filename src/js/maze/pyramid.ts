import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Entrance} from '../rom/location.js';

type Dir = 'u' | 'd';

export function shufflePyramid(rom: Rom, random: Random): void {
  const loc = rom.locations.pyramidMain;
  const dir = 'dudududuudududduu'.split('') as Dir[];
  let realDir: Dir = 'u';

  // 50% chance to flip the top entrance upside down.
  if (random.next() < 0/*.5*/) {
    loc.screens[0][3] = 0x84;
    loc.screens[0][2] = 0x99;
    loc.entrances[12].screen = 0x02;
    loc.entrances[12].coord = 0xafd0;
    dir[12] = realDir = 'd';

    // Fix up the landing to be the other direction, too.
    const loc2 = rom.locations.pyramidDraygon;
    loc2.width = 2;
    loc2.screens[0].push(0x80);
    loc2.screens[1].push(0x80);
    loc2.screens[2] = [0xe0, 0x96];
    loc2.exits[0].screen = loc2.exits[1].screen = 0x21;
    loc2.exits[0].tile = 0x32;
    loc2.exits[1].tile = 0x33;
    loc2.entrances[0].screen = 0x21;
    loc2.entrances[0].coord = 0x4030;
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
  const downEntrance = all['d'].pop()!;
  entrances[0] = loc.entrances[downEntrance];
  setExit(downEntrance, 0x9d, 1);
  const upEntrance = all['u'].pop()!;
  entrances[1] = loc.entrances[upEntrance];
  setExit(upEntrance, 0x9d, 2);
  // Now do the full shuffled remap
  const copy = {'u': [...all['u']], 'd': [...all['d']]};
  random.shuffle(copy['u']);
  random.shuffle(copy['d']);
  const inv = {'u': 'd', 'd': 'u'} as const;
  for (let i = 2; i < 16; i++) {
    const source = all[dir[i]].pop();
    const dest = copy[inv[dir[i]]].pop();
    if (source == null || dest == null) throw new Error('impossible');
    entrances[i] = loc.entrances[source];
    setExit(dest, 0x9e, i);
  }
  loc.entrances = entrances;

  function setExit(i: number, dest: number, entrance: number) {
    loc.exits[2 * i].dest = loc.exits[2 * i + 1].dest = dest;
    loc.exits[2 * i].entrance = loc.exits[2 * i + 1].entrance = entrance;
  }
}
