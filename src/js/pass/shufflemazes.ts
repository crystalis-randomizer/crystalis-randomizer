import {Dir, Maze, Pos, Screen} from './maze.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Flag} from '../rom/location.js';
import {MapBuilder} from '../rom/mapscreen.js';
import {seq} from '../rom/util.js';
import {UnionFind} from '../unionfind.js';

export function shuffleGoa1(rom: Rom, random: Random): void {
  // NOTE: also need to move enemies...
  const loc = rom.locations.goaFortressKelbesque;
  const w = loc.width;
  const h = loc.height;

  const screens = [
    0x0000,
    0x0011,
    0x0101,
    0x0110,
    0x1001,
    0x1010,
    0x1100,
    0x1011,
    0x1110,
    0x1111,
  ];


  OUTER:
  for (let attempt = 0; attempt < 1000; attempt++) {
    const maze = new Maze(random, h, w, screens);

    // Place the entrance at the bottom, boss at top.
    const entrance = ((h - 1) << 4 | random.nextInt(w)) as Pos;
    const boss = random.nextInt(w) as Pos;
    const translation = new Map<number, number>();
    function fixed(pos: number, value: number, screen: number): number {
      // NOTE: may be out of bounds, set(force) will handle that
      maze.set(pos as Pos, value as Screen, true);
      translation.set(value, screen);
      return value;
    }

    fixed(entrance, 0xf0f1, 0x71);
    fixed(entrance - 1, 0x00f0, 0x80);
    fixed(entrance + 1, 0xf000, 0x80);
    fixed(boss, 0xfff0, 0x73);
    fixed(boss - 1, 0x0ff0, 0x80);
    fixed(boss + 1, 0xff00, 0x80);
    fixed(boss + 16, 0xf1ff, 0x72);
    fixed(boss + 15, 0x00ff, 0x80);
    fixed(boss + 17, 0xf00f, 0x80);

    console.log(`initial\n${maze.show()}`);

    // make the initial path from the entrance to the boss
    if (!maze.connect(entrance as Pos, 0 as Dir, boss + 16 as Pos, 2 as Dir)) {
      continue OUTER;
    }
    console.log('first', maze.show());

    // add an extra path until we fail 10 times
    for (let i = 0; i < 10 && maze.density() < 0.65; i++) {
      if (maze.addLoop()) i = 0;
    }
    console.log('loop', maze.show());

    // Ensure a minimum density
    if (maze.density() < 0.45) continue OUTER;

    // Now start adding walls and ensure the maze is completeable.
    // In particular, we need to convert some of the vertical hallways
    // into either stairways or dead ends.
    // The basic strategy at this point is to make the map as open as
    // possible, count the number of reachable tiles, and then add
    // walls until we can't do so any more without making some
    // previously-reachable tile unreachable.  At that point, try every
    // wall once more and then quit.


    maze.fillZeros();
    console.log(`success after ${attempt} attempts`);
    console.log(maze.show());

    return;
  }

  // function showMap(map: number[]) {
  //   return seq(h, y => Array.from(map.slice(16 * y, 16 * y + w), x => (x || ' ').toString(16)).join(' ')).join('\n');
  // }

  // Now build the skeleton of a map?
  // Start with the most open possibility?  All flags on (no walls) and
  // go along perimeter?  Domains of lower-floor, connected by parapets?

  // Only "T" in parapet is from dead-end in lower area.  Otherwise
  // everything is a cycle.

  // Pretend 4 & 5 are vertical halls?  Then 



  return;
}









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

export function shuffleGoa1a(rom: Rom, random: Random) {
  // NOTE: also need to move enemies...

  const loc = rom.locations.goaFortressKelbesque;
  const w = loc.width;
  const h = loc.height;
  function inBounds(x: number): boolean {
    return x >= 0 && (x & 0xf) < w && (x >> 4) < h;
  }

  const allPos: readonly number[] =
      ([] as number[]).concat(...seq(h, y => seq(w, x => y << 4 | x)));

  const screens = [
    0x80, // 0000 no exits
    ,     // 0001 fixed screen (entrance/boss)
    ,
    0xe0, // 0011 up/right exits
    0xe5, // 0100 vertical dead ends (H)
    0xe4, // 0101 stairs
    0xe2, // 0110 down/right exits
    ,
    ,
    0xe1, // 1001 up/left exits
    0xea, // 1010 horizontal hallway
    0xe7, // 1011 up/left/right (upside-down T)
    0xe3, // 1100 down/left exits
    ,
    0xe8, // 1110 down/left/right (T)
    0xe6, // 1111 all exits
  ];
  const usedScreens =
      seq(16, x => screens[x] != null ? x : -1).filter(x => x >= 0);
  const [] = [usedScreens];

  // HEX            1 2 8|1 2 4|2  4  8| 1  4  8 
  // closed top:    0         6   10    12 14    => 5441
  // open top:        1 3 4 5   9    11       15 => 8a3a
  // closed bottom: 0   3       9 10 11          => 0e09
  // open bottom:     1   4 5 6         12 14 15 => 
  // closed left:   0 1 3 4 5 6
  // open left:                 9 10 11 12 14 15
  // closed right:  0 1   4 5   9       12
  // open right:        3     6   10 11    14 15

  // Allowed neighbors.  Key is left/top and value is a bitmap of
  // right/bottom IDs.

  // NOTE: It's pretty hideous to hard-code these, but it makes it a lot
  // easier to deal with the various exceptions, rather than trying to
  // intuit it all programmatically.
  const horizontal = new Set([
    0x00, 0x01, 0x03, 0x04, 0x05, 0x06,
    0x10,
                                        0x39, 0x3a, 0x3b, 0x3c, 0x3e, 0x3f,
    0x40,       0x43, 0x44, 0x45, 0x46,
    0x50,       0x53, 0x54, 0x55, 0x56,
                                        0x69, 0x6a, 0x6b, 0x6c, 0x6e, 0x6f,
    0x90,       0x93, 0x94, 0x95, 0x96,
                                        0xa9, 0xaa, 0xab, 0xac, 0xae, 0xaf,
                                        0xb9, 0xba, 0xbb, 0xbc, 0xbe, 0xbf,
    0xc0,       0xc3, 0xc4, 0xc5, 0xc6,
                                        0xe9, 0xea, 0xeb, 0xec, 0xee, 0xef,
                                        0xf9, 0xfa, 0xfb, 0xfc, 0xfe, 0xff,
  ]);
  const vertical = new Set([
    0x00,                         0x06,       0x0a,       0x0c, 0x0e,
          0x11, 0x13, 0x14, 0x15,       0x19,       0x1b,             0x1f,
    0x30,                         0x36,       0x3a,       0x3c, 0x3e,
          0x41, 0x43, 0x44, 0x45,       0x49,       0x4b,             0x4f,
          0x51, 0x53, 0x54,             0x59,       0x5b,             0x5f,
          0x61, 0x63, 0x64,             0x69,       0x6b,             0x6f,
    0x90,                         0x96,       0x9a,       0x9c, 0x9e,
    0xa0,                         0xa6,       0xaa,       0xac, 0xae,
    0xb0,                         0xb6,       0xba,       0xbc, 0xbe,
          0xc1, 0xc3, 0xc4, 0xc5,       0xc9,       0xcb,             0xcf,
          0xe1, 0xe3, 0xe4, 0xe5,       0xe9,       0xeb,             0xef,
          0xf1, 0xf3, 0xf4, 0xf5,       0xf9,       0xfb,             0xff,
  ]);

  const check: ReadonlyArray<(a: number, b: number) => boolean> = [
    (a, b) => vertical.has(b << 4 | a),
    (a, b) => horizontal.has(a << 4 | b),
    (a, b) => vertical.has(a << 4 | b),
    (a, b) => horizontal.has(b << 4 | a),
  ]

  // Set of connected edges, mapping [1 2 3] as top edges (left to right),
  // [5 6 7] as left edges (top to bottom), then [9 a b] and [d e f] for
  // the bottom and right edges, respectively (OR'ing with 8 corresponds).
  // Moreover, we introduce additional "screens" 10..1f for flag *clear*.
  // Outer index is screen id, inner array is a partition, where each number
  // is taken as a set of nibbles.  Ultimately these are mapped to arrays of
  // tile indices within a screen.
  const connections: number[][][] = [
    ,,, // 0..2 make no connections
    [0x3d, 0x2e, 0x1f], // 3
    [0x139b], // 4
    [0x1239ab], // 5
    [0x9d, 0xae, 0xbf], // 6
    ,, // 7..8
    [0x15, 0x26, 0x37], // 9
    [0xd5, 0xe6, 0xf7], // a
    [0x26e, 0x7f, 0x15, 0x3d], // b
    [0x6a, 0x79, 0x5b], // c
    , // d
    [0x6ae, 0x5d, 0x79, 0xbf], // e
    [0x26ae, 0x15, 0xbf, 0x3d, 0x79], // f
    ,,, // 0..2 make no connections, not flaggable
    [0x3d, 0x2e], // 13
    [0x39], // 14
    [0x12ab], // 15
    [0xae, 0xbf], // 16
    ,, // 7..8 missing
    [0x15, 0x26], // 19
    , // 'a' is not flaggable
    [0x26e, 0x7f], // 1b
    [0x6a, 0x79], // 1c
    , // d missing
    [0x6ae, 0x5d], // 1e
    [0x26ae, 0x15, 0xbf], // 1f
  ].map(xs => !xs ? [] : xs.map(x => {
    const tiles = [];
    while (x) {
      // Canonical indices: 2,8,d for 1239ab and 2,8,c for rest
      // 8 bit indicates "next screen" - shift to 100 bit
      // x&4 indicates left/right edge -> shift one nibble
      let tile = [2, 8, x & 4 ? 0xc : 0xd][x & 3] | (x & 8) << 5;
      tiles.push(x & 4 ? tile << 4 : tile);
      x >>>= 4;
    }
    return tiles;
  }));
  if (connections.length != 32) throw new Error(`bad connections array`);

  OUTER:
  for (let attempt = 0; attempt < 1000; attempt++) {

    // Start building a map
    let map = new Array(h << 4);

    // Place the entrance at the bottom, boss at top.
    const entrance = random.nextInt(w);
    const boss = random.nextInt(w);
    map[(h - 1) << 4 | entrance] = map[boss] = map[0x10 | boss] = 1;

    console.log('initial', showMap(map));

    // make the initial path from the entrance to the boss
    if (!navigate(map, (h - 1) << 4 | entrance, 0, 0x20 | boss, 0)) continue OUTER;

    // add an extra path until we fail 10 times
    for (let i = 0; i < 10; i++) {
      if (addExtraPath()) i = 0;
    }


    // Fill the rest with zero
    for (let i = 0; i < map.length; i++) if (map[i] == null) map[i] = 0;
    console.log(`success after ${attempt} attempts`);
    console.log(showMap(map));
    return;

    function addExtraPath(): boolean {
      // TODO - find an eligible tile to split?
console.log(`addExtraPath\n${showMap(map)}`);
      const m = [...map];
      const expansions: Array<[number, number]> = [];
      const uf = new UnionFind<number>();
      for (const pos of allPos) {
        const scr = m[pos];
        if (scr == null) {
          if ((pos & 0xf0) && m[pos - 16] == null) uf.union([pos, pos - 16]);
          if ((pos & 0x0f) && m[pos - 1] == null) uf.union([pos, pos - 1]);
        }
        if (!scr || scr === 1 || scr === 4 || scr === 5) continue;
        for (let dir = 0; dir < 4; dir++) {
          const mask = 1 << dir;
          if ((scr & mask) || screens[scr | mask] == null) continue;
          delete m[pos];
          if (ok(m, pos, scr | mask)) expansions.push([pos, dir]);
          m[pos] = scr;
        }
      }

      const [pos1, dir1] = random.pick(expansions);
      const next = pos1 + delta[dir1];
      const group = uf.map().get(uf.find(next));
      if (!group) {
        console.log(`no group`);
        return false;
      }

      // try to find a nearby screen to also expand
      const connected: Array<[number, number]> = [];
      for (const [pos2, dir2] of expansions) {
        if (pos2 === pos1 && dir2 === dir1) continue;
        if (group.has(pos2 + delta[dir2])) connected.push([pos2, dir2]);
      }
      const [pos2, dir2] = random.pick(connected);
      m[pos1] |= (1 << dir1);
      m[pos2] |= (1 << dir2);
      if (navigate(m, pos1, dir1, pos2 + delta[dir2], dir2 ^ 2)) {
        map = m;
        return true;
      }
      return false;
    }

    function ok(map: readonly number[], pos: number, screen: number): boolean {
      if (!inBounds(pos)) return false;
      if (map[pos] != null) return false;
      for (let dir = 0; dir < 4; dir++) {
        const tile = pos + delta[dir];
        const neighbor = inBounds(tile) ? map[tile] : 0;
        if (neighbor != null && !check[dir](screen, neighbor)) return false;
      }
      return true;
    }

    // Attempt to make a path from start to end.
    // Returns true if successful.  Copies the map first.
    // start tile is an already-placed screen
    // startDir is the direction coming out
    // end tile is the not-yet-placed screen
    // endDir points from not-yet-placed screen to actually-placed one
    // Ideally start and end are same direction
    function navigate(map: number[],
                      start: number, startDir: number,
                      end: number, endDir: number): boolean {
      const m = [...map];
      let currentVertical = 5; // next tile to place for vertical.

      function advanceStart(): boolean {
        const newStart = start + delta[startDir];
        console.log(`advanceStart: ${newStart.toString(16)}`);
        if (!(startDir & 1)) { // vertical
          if (!ok(m, newStart, currentVertical)) {
            currentVertical ^= 1;
            if (!ok(m, newStart, currentVertical)) {
              console.error('could not advance start vert');
              return false;
            }
          }
          m[newStart] = currentVertical;
          currentVertical ^= 1; // toggle between 4 and 5
        } else { // horizontal
          if (!ok(m, newStart, 10)) {
            console.error('could not advance start horiz');
            return false;
          }
          m[newStart] = 10;
        }
        start = newStart;
console.log(`start: ${start.toString(16)}, startDir: ${startDir}\n${showMap(m)}`);
        return true;
      }
      function advanceEnd(): boolean {
        //console.log(`advanceEnd: ${newEnd.toString(16)}`);
        const tile = 1 << endDir | 1 << (endDir ^ 2);
        if (!ok(m, end, tile)) {
          console.error('could not advance end');
          return false;
        }
        m[end] = tile;
        end -= delta[endDir];
//console.log(`start: ${start.toString(16)}, startDir: ${startDir}\n${showMap(m)}`);
        return true;
      }
      function turnStart(dirs: number): boolean {
        console.log(`turnStart(${dirs})`);
        let newStartDir = (startDir + 1) & 3;
        if (!(dirs & (1 << newStartDir))) newStartDir = (startDir - 1) & 3;
        if (!(dirs & (1 << newStartDir))) {
          console.error('could not turn start');
          return false;
        }
        start += delta[startDir];
        const newTile = 1 << (startDir ^ 2) | 1 << newStartDir;
        if (!ok(m, start, newTile)) {
          console.error('could not turn start: obstructed');
          return advanceStart();
          //return false;
        }
        m[start] = newTile;
        startDir = newStartDir;
console.log(`start: ${start.toString(16)}, startDir: ${startDir}\n${showMap(m)}`);
        return true;
      }

      function turnEnd(dirs: number): boolean {
        console.log(`turnEnd(${dirs})`);
        let newEndDir = (endDir + 1) & 3;
        if (!(dirs & (1 << newEndDir))) newEndDir = (endDir - 1) & 3;
        if (!(dirs & (1 << newEndDir))) {
          console.error('could not turn end');
          return false;
        }
        const newTile = 1 << (newEndDir ^ 2) | 1 << (startDir ^ 2);
        if (!ok(m, end, newTile)) {
          console.error('could not turn end: obstructed');
          return advanceEnd();
          //return false;
        }
        m[end] = newTile;
        end += delta[newEndDir ^ 2];
        endDir = newEndDir;
console.log(`end: ${end.toString(16)}, endDir: ${endDir}\n${showMap(m)}`);
        return true;
      }

      while (start != end) {
        // First check if one direction is opposite.
        const dirs = directionsTo(start, end);
        if (!(dirs & (1 << startDir))) {
          // Try to turn start toward end
          if (!turnStart(dirs)) return false;
          continue;
        }
        if (!(dirs & (1 << endDir))) {
          // Try to turn end toward start (TODO - less repetition)
          if (!turnEnd(dirs)) return false;
          continue;
        }

        // At this point, start and end dirs are roughly in the right
        // direction.  If they're different, turn one toward the other.
        if (startDir != endDir) {
          let wantDir = 0; // up-down
          let mask = 5;
          if (Math.abs((start >>> 4) - (end >>> 4)) <
              Math.abs((start & 0xf) - (end & 0xf))) {
            wantDir = 1; // left-right
            mask = 10;
          }
          if ((startDir & 1) !== wantDir) {
            if (!turnStart(dirs & mask)) return false;
          }
          if ((endDir & 1) !== wantDir) {
            if (!turnEnd(dirs & mask)) return false;
          }
        }

        // Now startDir == endDir.  Figure out the breakout of
        // turns vs ahead vs across.
        const isVertical = !(startDir & 1);
        const dy = (start >>> 4) - (end >>> 4);
        const dx = (start & 0xf) - (end & 0xf);
        const ahead = Math.abs(startDir & 1 ? dx : dy);
        const across = Math.abs(startDir & 1 ? dy : dx);
        let sideDir = (isVertical ? 10 : 5) & dirs;
        if (across === 0) sideDir &= (random.nextInt(2) ? 0xc : 0x3);
        const aheadDir = 1 << startDir;

        console.log(`vert: ${isVertical}
start: ${start.toString(16)}, startDir: ${startDir}, end: ${end.toString(16)}, endDir: ${endDir}
dy: ${dy}, dx: ${dx}, ahead: ${ahead}, across: ${across}, sideDir: ${sideDir}, aheadDir: ${aheadDir}
${showMap(m)}`);

        // Chance of turning on this row: 1/ahead
        // If turn, place (across - 1) tiles, with variance of ±(ahead - 1)
        if (ahead === 1 || !random.nextInt(ahead)) {
          if (ahead === 1 && !across) {
            if (!advanceStart()) return false;
            continue; // should return immediately?
          }
          // turn and go directly - no time to waste
          const deltaAdvance = ahead > 1 ? random.nextInt(2 * ahead - 1) : 0;
          let advances = across + deltaAdvance - ahead;
          if (advances == -1) {
            if (!advanceStart()) return false;
          } else if (advances < 0) {
            advances = -advances - 2
            sideDir ^= (isVertical ? 10 : 5);
          }
          if (!turnStart(sideDir)) return false;
          for (let i = 0; i < advances; i++) {
            if (!advanceStart()) break;
          }
          let turned;
          while (!(turned = turnStart(aheadDir)) && advances-- > 0) {
            // unadvance one space
            delete m[start];
            start -= delta[startDir];
          }
          if (!turned) return false;
          // if (!turnStart(aheadDir)) return false;
          continue;
        } else {
          if (!advanceStart()) return false;
        }
      }
      console.log(`NAVIGATION FINISHED: ${showMap(m)}`);
      map.splice(0, map.length, ...m);
      return true;
    }
  }

  function showMap(map: number[]) {
    return seq(h, y => Array.from(map.slice(16 * y, 16 * y + w), x => (x || ' ').toString(16)).join(' ')).join('\n');
  }

  // Now build the skeleton of a map?
  // Start with the most open possibility?  All flags on (no walls) and
  // go along perimeter?  Domains of lower-floor, connected by parapets?

  // Only "T" in parapet is from dead-end in lower area.  Otherwise
  // everything is a cycle.

  // Pretend 4 & 5 are vertical halls?  Then 

}

/** Returns a bitmap of directions from start to end. */
function directionsTo(start: number, end: number): number {
  let out = 0;
  if ((start & 0xf0) >= (end & 0xf0)) out |= 1;
  if ((start & 0x0f) <= (end & 0x0f)) out |= 2;
  if ((start & 0xf0) <= (end & 0xf0)) out |= 4;
  if ((start & 0x0f) >= (end & 0x0f)) out |= 8;
  return out;
}

export function extendGoaScreens(rom: Rom) {
  // PLAN:
  // tileset a4,8c: move 19,1b -> 2b,38
  // tileset a8:    move 19,1b -> 17,18
  // tileset 88:    move c5 -> 19,1b
  //     17,18 used in 88, which shares a lot with a8, but
  //     no 88 maps have any 19,1b so they'll never see conflicting 17,18
  // change the 88 users of e1,e2 (hydra) to tileset a8 with pat1=2a to avoid
  // conflict?  the cost is one wall that doesn't fit in quite as well.
  // This frees up 19,1b to absorb c6/c4 with alts of c5
  
  for (const t of [0x8c, 0xa4, 0xa8]) { // get around check
    const ts = rom.tileset(t);
    ts.alternates[0x19] = 0x19;
    ts.alternates[0x1b] = 0x1b;
  }
  rom.swapMetatiles([0xa4, 0x8c],
                    [0x2b, [0x19, 0xc5], ~0xc6],
                    [0x38, [0x1b, 0xc5], ~0xc4]);
  rom.swapMetatiles([0xa8],
                    [[0x17, 0x54], ~0x19],
                    [[0x18, 0x58], ~0x1b]);
  rom.swapMetatiles([0x88],
                    [0x19, ~0xc5],
                    [0x1b, ~0xc5]);

  // Screens that can now be opened or shut (* means currently shut):
  //   e0, e1*, e2, e3*, e4, e5, e6, e7, e8**
  // We need to pick which wall(s) are toggled...
  
  const w = [[0x19, 0x19], [0x1b, 0x1b]] as const;
  write(rom.screens[0xe0].tiles, 0x61, w); // open up (wide), right (vanilla open)
  write(rom.screens[0xe1].tiles, 0x6d, w); // open up (wide), left (vanilla shut)
  write(rom.screens[0xe2].tiles, 0x91, w); // open down (wide), right (vanilla open)
  write(rom.screens[0xe3].tiles, 0x9d, w); // open down (wide), left (vanilla shut)
  write(rom.screens[0xe4].tiles, 0x41, w); // stairs
  write(rom.screens[0xe4].tiles, 0x8d, w);
  write(rom.screens[0xe5].tiles, 0x61, w); // horizontal wall
  write(rom.screens[0xe5].tiles, 0xad, w);
  write(rom.screens[0xe6].tiles, 0x0d, w); // four-way passages
  write(rom.screens[0xe6].tiles, 0xd1, w);
  write(rom.screens[0xe7].tiles, 0x01, w); // corners up top
  write(rom.screens[0xe7].tiles, 0x0d, w);
  write(rom.screens[0xe8].tiles, 0xd1, w); // corners on bottom
  write(rom.screens[0xe8].tiles, 0xdd, w);

  // To maintain current behavior we need to push flags for all the
  // screens that need to be *open*.

  // NOTE: after testing, only normally-open tiles need flags...?
  //   - just make a list and iterate over 

  rom.locations[0xa9].flags.push(
      Flag.of({screen: 0x10, flag: 0x2ef}),
      Flag.of({screen: 0x14, flag: 0x200}),
      Flag.of({screen: 0x20, flag: 0x2ef}),
      Flag.of({screen: 0x21, flag: 0x2ef}),
      Flag.of({screen: 0x24, flag: 0x2ef}),
      Flag.of({screen: 0x25, flag: 0x2ef}),
      Flag.of({screen: 0x26, flag: 0x200}),
      Flag.of({screen: 0x30, flag: 0x2ef}),
      Flag.of({screen: 0x31, flag: 0x2ef}),
      Flag.of({screen: 0x33, flag: 0x2ef}),
      Flag.of({screen: 0x34, flag: 0x2ef}),
      Flag.of({screen: 0x41, flag: 0x2ef}),
      Flag.of({screen: 0x54, flag: 0x2ef}),
      Flag.of({screen: 0x62, flag: 0x2ef}),
      Flag.of({screen: 0x64, flag: 0x2ef}),
      Flag.of({screen: 0x72, flag: 0x2ef}),
      Flag.of({screen: 0x74, flag: 0x200}));
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

export function shuffleSwamp(rom: Rom, random: Random, attempts = 100) {
  const swamp = rom.locations.swamp;
  // 1. Start by fixing up the swamp tiles.
  extendSwampScreens(rom);

  while (attempts-- > 0) {

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

    let steps = 1000;
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
    while (--steps && consolidate());
    if (!steps) break;

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
    return;
  }
  throw new Error('Failed to shuffle');
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

function write<T>(arr: T[], corner: number,
                  repl: ReadonlyArray<ReadonlyArray<T|undefined>>) {
  for (let i = 0; i < repl.length; i++) {
    for (let j = 0; j < repl[i].length; j++) {
      const x = repl[i][j];
      if (x != null) arr[corner + (i << 4 | j)] = x;
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

// PROVIDE FLATMAP POLYFILL?
if (!Array.prototype.flatMap) {
  Object.defineProperties(Array.prototype, {
    flatMap: {
      value<T, U>(this: Array<T>, f: (x: T, i: number) => U[]): U[] {
        const out = [];
        let i = 0;
        for (const x of this) {
          let y = f(x, i++);
          if (typeof y[Symbol.iterator] !== 'function') y = [y] as any;
          y = [...y];
          if (y.length) out.push(...y);
        }
        return out;
      },
    },
  });
}

// Goa 1 - need 2 extra flaggable tiles
//  - 0..12 used for walls
//  - 17,18,1c,1d used for bridges

// a8 (intersecting)
//  - 13..16, 19..1b,1f used for walls

// 8c
//  - 07..13 for wall
//  - 17,18,1c,1d stairs behind statues
//  - 14..16,1a.1e hole in floor

// 8c does not use tiles 0..6
//  -> can we shift 1a..1f there?
// But these are shared with a4, which does use them... so no

// 8c does not *flag* 19 or 1b
//  -> shift to higher spot
// a8 does flag them, and we share
//  -> can a8 move them to elsewhere, too?
//  -> 17,18 or 1c..1e ???
//   - 17,18 is used by 8c, but not on any shared screens?
//   - but 17,18 is used by 88, which does share with a8.
//   - 1a,1e looks like the ones we need...?

// PLAN
// for a4,8c, move 19,1b -> 2b,38
// for a8, move 19,1b -> 17,18
//     17,18 used in 88, which shares a lot with a8, but
//     no 88 maps have any 19,1b so they'll never see conflicting 17,18



// NOTE: Screens 93, 9d are UNUSED!

const dirs = [0, 1, 2, 3] as const;
const delta = [-16, 1, 16, -1] as const;
