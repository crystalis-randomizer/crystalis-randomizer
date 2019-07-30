import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Location, Flag} from '../rom/location.js';
import {MapBuilder} from '../rom/mapscreen.js';
import { seq } from '../rom/util.js';

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
const [] = [GOA1, shuffleGoa1, Flag];

export function shuffleSwamp1(rom: Rom, random: Random): boolean {
  const swamp = rom.locations.swamp;
  // 1. Start by fixing up the swamp tiles.
  //extendSwampScreens(rom);

  // Collect the available screens (7c is boss room, 7f is solid)
  const screens = [0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x7b, 0x7d, 0x7e, 0x7f];
  //const doorable = new Set([0x76, 0x7a, 0x7b, 0x7e]);
  const leftEntrances = [/*0x75,*/ /*0x77, 0x78,*/ 0x7a,/* 0x7d,*/ 0x7e];

  const builder = new MapBuilder(rom.tileset(swamp.tileset), screens, random,
                                 swamp.height, swamp.width);

  // Pick random location for entrance and boss.
  let bossPos;
  let entrancePos;

  do {
    bossPos = random.nextInt(swamp.width);
    // TODO - builder.setFixed(pos, tile) - return false if bad constraints
    // TODO - specify edge rather than tile?
    entrancePos = (1 + random.nextInt(swamp.height - 2)) << 4;
  } while (bossPos < 2 && entrancePos < 0x20);
  builder.screens[entrancePos] = ~random.pick(leftEntrances);
  builder.screens[bossPos] = ~0x7c;

  const targets = [entrancePos << 8 | 0x88, bossPos << 8 | 0x1008];
  builder.reset();
  for (let i = 0; i < 100; i++) {
    if (!builder.fill(100)) throw new Error(`failed to fill`);
    const map = builder.traverse();
    const targetParts = targets.map(t => map.get(t));
    if (!allSame(targetParts)) { // end tiles not in same partition
      builder.deleteSomeScreens();
      continue;
    }
  }

  // Actually commit the change!
  swamp.screens = seq(swamp.height, y => seq(swamp.width, x => {
    const pos = y << 4 | x;
    const scr = builder.screens[pos];
    return scr as number < 0 ? ~(scr as number) : scr || 0;
    //if (scr == null) throw new Error(`Missing screen`);
    //return scr < 0 ? ~scr : scr;
    //builder.screens[pos] =
    // TODO - set flag
  }));

  //const swamp = rom.locations.swamp;
  return true;
}

export function shuffleSwamp(rom: Rom, random: Random) {
  const swamp = rom.locations.swamp;
  // 1. Start by fixing up the swamp tiles.
  //extendSwampScreens(rom);

  // Collect the available screens (7c is boss room, 7f is solid)
  const screens = [
    0x7f, // 0000 x
    0x9a, // 0001 ^
    0x76, // 0010 >
    0x79, // 0011 ^>
    0x9b, // 0100 v
    0x8f, // 0101 |
    0x83, // 0110 v>
    0x87, // 0111 |>
    0x7b, // 1000 <
    0x75, // 1001 <^
    0x90, // 1010 _
    0x7d, // 1011 —^—
    0x7e, // 1100 <v
    0x78, // 1101 <|
    0x7a, // 1110 —v—
    0x77, // 1111 —|—
  ];
  const w = 5;
  const h = 5;
  const map = new Array(0x100).fill(0xf);
  const dirs = [0, 1, 2, 3] as const;
  const delta = [-16, 1, 16, -1] as const;
  const counts = new Array(16).fill(0);
  counts[0xf] = w * h - 1;
  let closed = 0;
  const fixed = new Set<number>();

  function bits(x: number): number[] {
    const out = [];
    if (x & 1) out.push(0);
    if (x & 2) out.push(1);
    if (x & 4) out.push(2);
    if (x & 8) out.push(3);
    return out;
  }

  function ok(x: number): boolean {
    return x >= 0 && (x & 0xf) < w && (x >> 4) < h && !fixed.has(x);
  }

  function set(pos: number, value: number) {
    if (pos !== boss) counts[map[pos]]--;
    map[pos] = value;
    if (pos !== boss) counts[value]++;
  }
  
  function cut(pos: number, dir: number): () => void {
    const mask = 1 << dir;
    const npos = pos + delta[dir];
    const nmask = 1 << (dir ^ 2);
    const origClosed = closed;
    const origPos = map[pos];
    const okNpos = ok(npos);
    const origNpos = okNpos ? map[npos] : 0;
    if (origPos === mask) closed++;
    set(pos, map[pos] & ~mask);
    if (okNpos) {
      if (origNpos === nmask) closed++;
      set(npos, map[npos] & ~nmask);
    }
    return () => {
      set(pos, origPos);
      if (okNpos) set(npos, origNpos);
      closed = origClosed;
    };
  }

  function kill(pos: number) {
    for (const dir of bits(map[pos])) {
      cut(pos, dir);
    }
  }

  function unique(max: number): Set<number> | null {
    const c = counts.flatMap((x, i) => x ? [[x, i]] : []).sort(([a], [b]) => b - a);
    if (c.length <= max) return null;
    return new Set(c.map(x => x[1]).slice(0, max));
  }

  function randomPos(): number {
    const yx = random.nextInt(w * h);
    return Math.floor(yx / w) << 4 | (yx % w);
  }

  const [boss, entrance] = (() => {
    let boss;
    let entrance;
    do {
      boss = random.nextInt(w);
      entrance = random.nextInt(h);
    } while (boss < 2 || entrance < 2);
    return [boss, entrance << 4];
  })();

  // Set up boundary, boss, and entrance
  for (let x = 0; x < w; x++) {
    cut(x, 0);
    cut(x | (h - 1) << 4, 2);
  }
  for (let y = 0; y < h; y++) {
    cut(y << 4, 3);
    cut(y << 4 | (w - 1), 1);
  }
  if (boss > 0) kill(boss - 1);
  if (boss < w - 1) kill(boss + 1);
  set(entrance, map[entrance] | 8);
  set(boss, 4);
  fixed.add(boss);
  fixed.add(boss - 1);
  fixed.add(boss + 1);
  
  function check(): boolean {
    // check whether we can do a full traverse.
    const queue: number[] = [map.findIndex(x => x)];
    const seen = new Set<number>();
    while (queue.length) {
      const next = queue.pop();
      if (next == null || (!ok(next) && next !== boss) || seen.has(next)) continue;
      seen.add(next);
      for (const bit of bits(map[next])) {
        queue.push(next + delta[bit]);
      }
    }
    return seen.size === w * h - closed;
  }

  // Attempt to add w*h walls
  for (let i = Math.floor(0.75 * w * h); i; i--) {
    const pos = randomPos();
    const cur = map[pos];
    if (!cur) continue;
    const ds = bits(cur);
    const d = random.pick(ds);
    if (!ok(pos) || !ok(pos + delta[d])) continue;
    const undo = cut(pos, d);
    if (!check()) undo();
  }

  function toggle(pos: number, dir: number): boolean {
    const npos = pos + delta[dir];
    if (ok(npos)) {
      if (map[pos] & (1 << dir)) {
        // attempt a cut
        const undo = cut(pos, dir);
        if (check()) return true;
        undo();
      } else {
        // do a join
        set(pos, map[pos] | (1 << dir));
        set(npos, map[npos] | (1 << (dir ^ 2)));
        return true;
      }
    }
    return false;
  }

  let attempts = 1000;
  function consolidate(): boolean {
    // Pick a random tile and add to it
    const u = unique(9);
    if (!u) return false;
    const bad = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pos = y << 4 | x;
        if (ok(pos) && !u.has(map[pos])) {
          bad.push(pos);
          for (const dir of random.shuffle([...dirs])) {
            const npos = pos + delta[dir];
            if (ok(npos) && !u.has(map[npos]) && toggle(pos, dir)) return true;
          }
        }
      }
    }
    const pos = random.pick(bad);
    const dir = random.pick(dirs);
    if (ok(pos + delta[dir])) toggle(pos, dir);
    return true;
  }

  // Now find the minority tiles
  while (--attempts && consolidate());
  if (!attempts) throw new Error(`Failed to converge`);

  // Plug in the most common 9 screens

  // Set everything
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pos = y << 4 | x;
      if (pos === boss) {
        swamp.screens[y][x] = 0x7c;
        continue;
      }
      swamp.width = w;
      swamp.height = h;
      swamp.screens[y][x] = screens[map[pos]];
    }
  }
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

  // // TEMP - add flags to all screens
  // const swamp = rom.locations.swamp;
  // const hasDoor = new Set([0x76, 0x7a, 0x7b, 0x7e]);
  // for (let y = 0; y < swamp.screens.length; y++) {
  //   for (let x = 0; x < swamp.screens[y].length; x++) {
  //     if (hasDoor.has(swamp.screens[y][x])) {
  //       swamp.flags.push(Flag.of({yx: y << 4 | x, flag: 0x2ef}));
  //     }
  //   }
  // }      
}

function write<T>(arr: T[], corner: number, repl: readonly T[][]) {
  for (let i = 0; i < repl.length; i++) {
    for (let j = 0; j < repl[i].length; j++) {
      if (repl[i][j] != null) arr[corner + (i << 4 | j)] = repl[i][j];
    }
  }
}

function allSame<T>(arr: T[],
                    eq: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
  for (const elem of arr) {
    if (!eq(elem, arr[0])) {
      return false;
    }
  }
  return true;
}
