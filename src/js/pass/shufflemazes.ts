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
  extendSwampScreens(rom);

  // Collect the available screens (7c is boss room, 7f is solid)
  const screens = [
    0x7f, // 0000 x
    , // 0001 ^
    0x76, // 0010 >
    0x79, // 0011 ^>
    , // 0100 v
    , // 0101 |
    , // 0110 v>
    , // 0111 |>
    0x7b, // 1000 <
    0x75, // 1001 <^
    , // 1010 _
    0x7d, // 1011 —^—
    0x7e, // 1100 <v
    0x78, // 1101 <|
    0x7a, // 1110 —v—
    0x77, // 1111 —|—
  ];

  //for (let i = 0; i < 16; i++) if (screens[i] > 0x7f) delete screens[i];

  const AVAILABLE = 9;
  const w = 5;
  const h = 5;
  const map = new Array(0x100).fill(0xf);
  const dirs = [0, 1, 2, 3] as const;
  const delta = [-16, 1, 16, -1] as const;
  const counts = new Array(16).fill(0);
  counts[0xf] = w * h - 1;
  let closed = 0;
  const fixed = new Set<number>();

  const allPos: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      allPos.push(y << 4 | x);
    }
  }

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
    for (const pos of allPos) {
      if (!seen.has(pos) && map[pos]) return false;
    }
    return true;
    //return seen.size === w * h - closed;
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
    const u = unique(AVAILABLE);
    if (!u) return false;
    const bad = [];
    for (const pos of allPos) {
      if (ok(pos) && (!u.has(map[pos]) || !random.nextInt(w * h * 2))) {
        bad.push(pos);
        for (const dir of random.shuffle([...dirs])) {
          const npos = pos + delta[dir];
          if (ok(npos) && !u.has(map[npos]) && toggle(pos, dir)) return true;
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
  const used = new Set(counts.flatMap((x, i) => x ? [i] : []));
  const available = [];
  for (let i = 0; i < 16; i++) {
    const screen = screens[i];
    if (screen != null && !used.has(i)) {
      available.push(screen);
      delete screens[i];
    }
  }
  for (const i of used) {
    if (screens[i] != null) continue;
    const next = available.pop();
    if (next == null) throw new Error(`No available screen`);
    screens[i] = next;
    rom.screens[next].tiles = SWAMP_SCREENS[i].split(/\s+/g).map(x => parseInt(x, 16));
  }

  // Set everything
  swamp.screens = seq(h, () => []);
  for (const pos of allPos) {
    swamp.screens[pos >> 4][pos & 0xf] = pos === boss ? 0x7c : screens[map[pos]]!;
  }
  swamp.width = w;
  swamp.height = h;

  // Analyze screens
  const exitScreens = new Map<number, number>();
  const puffSpots = new Map<number, number[]>();
  for (let i = 0; i < 0xf; i++) {
    const screen = screens[i];
    if (screen == null) continue;
    const tiles = rom.screens[screen].tiles;
    for (let t = 0; t < 240; t++) {
      if (tiles[t] === 3 && tiles[t - 1] !== 3) exitScreens.set(i, t);
      if (tiles[t] === 0xf0) {
        let arr = puffSpots.get(i);
        if (!arr) puffSpots.set(i, arr = []);
        arr.push(t);
      }
    }
  }
  const doors = [];
  const deadEnds = [];
  const bends = [];
  for (const pos of allPos) {
    if (pos === boss) continue;
    const scr = map[pos];
    if (exitScreens.has(scr)) doors.push(pos);
    if (scr === 1 || scr === 2 || scr === 4 || scr === 8) deadEnds.push(pos);
    if (scr === 3 || scr === 6 || scr === 9 || scr === 12) bends.push(pos);
  }

  // Move main entrnace
  swamp.entrances[0].screen = entrance;
  for (let i = 0; i < 5; i++) swamp.exits[i].screen = entrance;

  // Move oak exit
  const oak = random.pick(doors);
  const oakTile = exitScreens.get(map[oak])!;
  swamp.entrances[1].screen = oak;
  swamp.entrances[1].tile = oakTile + 0x11;
  for (let i = 0; i < 2; i++) {
    swamp.exits[5 + i].screen = oak;
    swamp.exits[5 + i].tile = oakTile + i;
  }
  swamp.flags.push(Flag.of({screen: oak, flag: 0x2ef}));

  // Place boss in screen and child in a dead end (if possible)
  swamp.spawns[0].screen = boss;
  const child = random.pick(deadEnds.length ? deadEnds : bends);
  swamp.spawns[1].screen = child;

  // Put puffs on the tips of plants
  const usedSpawns = new Set();
  for (let i = 2; i < swamp.spawns.length; i++) {
    const spawn = swamp.spawns[i];
    const pos = random.pick(allPos);
    if (pos === boss || pos === entrance || !map[pos] || usedSpawns.has(pos) ||
       (spawn.id === 0xd && !puffSpots.has(map[pos]))) {
      i--;
    } else {
      spawn.screen = pos;
      if (spawn.id === 0xd) {
        spawn.tile = random.pick(puffSpots.get(map[pos])!);
      } else {
        spawn.tile = 0x88; // TODO - do a better job
      }
    }
  }
}

const SWAMP_SCREENS: {[id: number]: string} = {
  // open upward, dead end
  0x1: `c8 c8 c8 c8 cf f6 c7 ad c4 b7 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f6 b8 b9 c3 b7 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f6 b7 b8 ad ad d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 c2 c3 b7 b8 d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 b6 c2 b7 b7 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 ad ad b9 b7 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 ad ad ad ad d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 b9 b8 ad ad d2 e2 c8 c8 c8 c8
        c8 c8 c8 c8 e3 f6 c3 c3 b8 b6 d2 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 e3 fd ad ad fc e2 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 c8 ff fb fb fa c8 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8`,
  // open downward, dead end (door)
  0x4: `c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 c8 cd c9 c9 ca c8 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 cd eb a0 a0 cb ca c8 c8 c8 c8 c8
        c8 c8 c8 c8 cf a0 f9 f5 f7 f8 cb cc c8 c8 c8 c8
        c8 c8 c8 c8 cf a0 ed 08 09 a0 a0 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf db ee 0c 0b ef a0 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d0 d1 03 03 d8 db cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f6 c7 ad ad ae d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 ad b9 b7 b7 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 c2 c3 c3 b7 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f6 c5 c3 c3 b7 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 b6 c2 c3 c3 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f6 b8 b6 b6 b6 d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f6 b7 b7 b7 b7 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f6 b7 b7 b8 b6 d2 cc c8 c8 c8 c8`,
  // vertical passage
  0x5: `c8 c8 c8 c8 cf d3 b6 b6 c6 b6 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 b6 c3 c7 b6 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f5 c3 c7 b6 b6 d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 b6 b6 c6 c5 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d9 b6 c6 c3 c7 d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f5 c3 c3 c3 c3 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d9 ad c2 c3 c3 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d9 c4 c5 c3 c3 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f5 b7 b7 b8 b6 d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d9 c2 b8 b6 b6 d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d9 b6 c2 b7 b7 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d9 b6 b6 b6 b6 d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f6 b7 b7 b8 b6 d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 b9 b7 b7 b7 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f6 b7 b7 c7 b6 d2 cc c8 c8 c8 c8`,
  // down-right openings (turn right), with door
  0x6: `c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 c8 cd c9 c9 c9 c9 c9 c9 c9 c9 c9
        c8 c8 c8 c8 c8 cd a0 a0 a0 e8 04 a0 e8 a0 a0 e4
        c8 c8 c8 c8 cf f8 a0 f0 f1 f5 f5 f7 e9 f4 f7 e5
        c8 c8 c8 c8 cf f6 f7 f8 f2 ea 06 aa e9 f0 f1 e6
        c8 c8 c8 c8 cf a0 dd e0 f3 e0 07 0c ea db f3 e7
        c8 c8 c8 c8 cf db d5 d0 d1 d1 03 03 d0 d1 da da
        c8 c8 c8 c8 cf d5 af c4 c4 ad ad ad ad ad c4 ad
        c8 c8 c8 c8 cf d3 b9 c3 c3 b8 ad ad ad c2 b7 b8
        c8 c8 c8 c8 cf f6 c3 c3 c3 c3 b8 ad ad ad ad ad
        c8 c8 c8 c8 cf f6 c7 ad c2 c3 c7 fc fb fb fb fb
        c8 c8 c8 c8 cf d3 ad ad ad ad d6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 b9 b8 ad b9 f6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf f6 c7 ad b9 c7 d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 b6 b9 c3 b8 d2 cc c8 c8 c8 c8`,
  // up-down-right
  0x7: `c8 c8 c8 c8 cf d3 c4 c3 c3 c3 f7 f8 ca c8 c8 c8
        c8 c8 c8 c8 cf f5 c3 c3 c3 c3 f7 f7 a0 ca c9 c9
        c8 c8 c8 c8 cf f6 c3 c3 b8 b6 d2 cf cf e8 e4 a0
        c8 c8 c8 c8 cf f5 b7 c3 b7 b8 d2 f0 f1 e9 e5 cf
        c8 c8 c8 c8 cf d3 c2 b8 c2 b8 d8 db cf ea e6 cf
        c8 c8 c8 c8 cf d3 ad ad ad ad ae d4 f3 dd e7 cf
        c8 c8 c8 c8 cf d3 ad ad ad ad ad ae d0 d1 d0 d1
        c8 c8 c8 c8 cf d3 c2 c3 c3 b7 b8 ad ad ad ad ad
        c8 c8 c8 c8 cf d3 ad ad c2 b7 b7 b7 b8 c4 ad ad
        c8 c8 c8 c8 cf d3 ad ad b6 b9 b7 b7 b7 b7 b8 ad
        c8 c8 c8 c8 cf d3 ad c4 c3 b7 b8 fc fb fb fb fb
        c8 c8 c8 c8 cf d3 b6 ad ad ad d6 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 ad ad ad ad d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 c4 c3 b7 b8 d2 cc c8 c8 c8 c8
        c8 c8 c8 c8 cf d3 b6 b9 b7 b7 f6 cc c8 c8 c8 c8`,
  // horizontal tunnel
  0xa: `c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8
        c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9 c9
        a0 e4 e8 eb e4 a0 a0 a0 eb eb e8 f0 f1 a0 e4 a0
        a0 e5 e9 f9 f5 f6 f6 f7 ec f9 f7 f8 f2 a0 e5 a0
        a0 e6 f0 f1 e6 e0 08 09 ed de ea de f2 a0 e6 a0
        db e7 db f3 e7 e1 0c 0b dd df e0 df f3 db e7 e0
        d0 d1 da da d0 d1 03 03 d0 d1 d0 d1 da da da da
        ad c4 ad ad ad ad ad ad ad ad ad ad ad ad ad ad
        c2 c5 b8 c6 c4 c4 b9 c7 c4 c5 c5 c7 ad ad ad ad
        ad ad ad ad c2 c3 c3 c3 c3 c3 c7 ad ad ad ad ad
        fb fb fb fb fb fb fb fb fb fb fb fb fb fb fb fb
        c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8
        c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8 c8`,
};

// TODO - parse these screens, add them temporarily elsewhere
// so we can put them together and see how repetitive the fog is

const [] = [SWAMP_SCREENS];

export function extendSwampScreens(rom: Rom) {
  // Move up to 13 swamp tiles to the alternate palette
  // so that we can selectively open up different options for
  // the Oak entrance (or possibly hide other caves?)
  //  - Screens 76, 7a, 7b and then close up 7e.
  //  - Tiles   ac -> da; aa -> dc, e4, e5, e6, e7, f0, f1, f2, f3

  // for (let i = 0; i < 0xa; i++) {
  //   const screen = SWAMP_SCREENS[i];
  //   if (!screen) continue;
  //   rom.screens[0x80 | i].tiles = screen.split(/\s+/g).map(x => parseInt(x, 16));
  // }

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
