import '../polyfill.js';

import {Dir, Maze, Pos, Scr, Spec} from './maze.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Flag} from '../rom/location.js';
import {MapBuilder} from '../rom/mapscreen.js';
import {hex, seq} from '../rom/util.js';
import {Monster} from '../rom/monster.js';

export function shuffleMazes(rom: Rom, random: Random) {
  shuffleSwamp(rom, random);
  shuffleGoa1(rom, random);
}

export function shuffleGoa1(rom: Rom, random: Random, attempts = 1500): void {
  // NOTE: also need to move enemies...
  extendGoaScreens(rom);
  const loc = rom.locations.goaFortressKelbesque;
  const w = loc.width;
  const h = loc.height;

  const screens = [
    // Clear screens
    Spec(0x0000, 0x80, ' '),
    Spec(0x0011, 0xe0, '└', 'flag', 0x1f, 0x2e, 0x3d),
    Spec(0x0101, 0xe4, '│', 'flag', 0x1239ab),
    Spec(0x0110, 0xe2, '┌', 'flag', 0x9d, 0xae, 0xbf),
    Spec(0x1001, 0xe1, '┘', 'flag', 0x15, 0x26, 0x37),
    Spec(0x1010, 0xea, '─',         0x5d, 0x6e, 0x7f),
    Spec(0x1011, 0xe7, '┴', 'flag', 0x15, 0x26e, 0x3d, 0x7f),
    Spec(0x1100, 0xe3, '┐', 'flag', 0x5b, 0x6a, 0x79),
    Spec(0x1110, 0xe8, '┬', 'flag', 0x5d, 0x6ae, 0x79, 0xbf),
    Spec(0x1111, 0xe6, '┼', 'flag', 0x15, 0x26ae, 0x3d, 0x79, 0xbf),
    // Simple flagged screens (don't generate these!)
    Spec(0x1_0011, 0xe0, '└', 'fixed', 0x2e, 0x3d),
    Spec(0x1_0101, 0xe4, '│', 'fixed', 0x12ab),
    Spec(0x1_0110, 0xe2, '┌', 'fixed', 0xae, 0xbf),
    Spec(0x1_1001, 0xe1, '┘', 'fixed', 0x15, 0x26),
    Spec(0x1_1011, 0xe7, '┴', 'fixed', 0x26e, 0x7f),
    Spec(0x1_1100, 0xe3, '┐', 'fixed', 0x6a, 0x79),
    Spec(0x1_1110, 0xe8, '┬', 'fixed', 0x5d, 0x6ae),
    Spec(0x1_1111, 0xe6, '┼', 'fixed', 0x15, 0x26ae, 0xbf),
    // Dead ends
    Spec(0x2_0101, 0xe5, '┊', 'fixed', 'flag', 0x139b), // dead end
    Spec(0x3_0101, 0xe5, '┊', 'fixed', 0x39), // dead end
    // Fixed screens (entrance)
    Spec(0xf0f1, 0x71, '╽', 'fixed', 0x2a),
    Spec(0x00f0, 0x80, '█', 'fixed'),
    Spec(0xf000, 0x80, '█', 'fixed'),
    // Fixed screens (boss)
    Spec(0xfff0, 0x73, '═', 'fixed', 'boss'), // , 0x2a),
    Spec(0xf1ff, 0x72, '╤', 'fixed'), // , 0x29b),
    Spec(0x0ff0, 0x80, '╔', 'fixed'),
    Spec(0xff00, 0x80, '╗', 'fixed'),
    Spec(0x00ff, 0x80, '╚', 'fixed'),
    Spec(0xf00f, 0x80, '╝', 'fixed'),
  ];

  // TODO - consider bigger icons? '┘║└\n═╬═\n┐║┌' or '┘┃└\n━╋━\n┐┃┌' ??

  OUTER:
  for (let attempt = 0; attempt < attempts; attempt++) {
    const maze = new Maze(random, h, w, screens);

    // Place the entrance at the bottom, boss at top.
    const entrance = ((h - 1) << 4 | random.nextInt(w)) as Pos;
    const boss = random.nextInt(w) as Pos;
    const translation = new Map<number, number>();

    const entranceTile = entrance << 8 | 0x02;
    const exitTiles = [(boss + 32) << 8 | 0x01, (boss + 32) << 8 | 0x03];

    function fixed(pos: number, value: number, screen: number): number {
      // NOTE: may be out of bounds, set(force) will handle that
      maze.set(pos as Pos, value as Scr, true);
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
    // don't allow a direct forward entrance
    if (maze.get((boss + 32) as Pos) === 0x0101 ||
        maze.get((entrance - 16) as Pos) === 0x0101) continue OUTER;
    console.log('first', maze.show());

    // add an extra path until we fail 10 times
    for (let i = 0; i < 10 && maze.density() < 0.65; i++) {
      if (maze.addLoop()) i = 0;
    }
    console.log(`loop\n${maze.show()}`);

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

    if (!check()) continue OUTER;

    // Find any vertically-adjacent 0101 and try to make them into 20101
    for (const [pos, scr] of maze) {
      if (scr === 0x0101 && maze.get((pos + 16) as Pos) === 0x0101) {
        const order = random.shuffle([0, 16]);
        if (!tryFlag((pos + order[0]) as Pos, 0x2_0000) &&
            !tryFlag((pos + order[1]) as Pos, 0x2_0000)) {
          continue OUTER;
        }
      }
    }

    // Try all possible alternates, skipping any that don't work.
    // TODO - is it ever possible that coming back to one later _will_ work?
    //      ---> maybe, depending on how they're arranged.  In our case,
    //           0101 => 1239ab; 10101 => 12ab; 20101 => 139b; 30101 => 39
    //           so 0 -> 1 -> 3 MIGHT open a path, but 2 should have passed...?

    for (const [pos, alt] of random.shuffle([...maze.alternates()])) {
      tryFlag(pos, alt);
    }

    maze.fillZeros();

    function check(): boolean {
      const traversal = maze.traverse();
      (window as any).TRAV = traversal;

      const main = traversal.get(entranceTile);
      if (!main) return false;
      if (!exitTiles.filter(t => main.has(t)).length) return false;
      if (main.size < 0.8 * traversal.size) return false;
      return true;
    }

    function tryFlag(pos: Pos, mod = 0x1_0000): boolean {
      const prev = maze.get(pos);
      if (prev == null) throw new Error(`Cannot flag empty screen ${hex(pos)}`);
      maze.replace(pos, (prev | mod) as Scr);
      if (check()) return true;
      maze.replace(pos, prev);
      return false;
    }

    loc.moveScreen(0x06, boss);
    loc.moveScreen(0x83, entrance);

    maze.write(loc, new Set());

    const monsterPlacer = loc.monsterPlacer(random);
    for (const spawn of loc.spawns) {
      if (!spawn.isMonster()) continue;
      const monster = rom.objects[spawn.monsterId];
      if (!(monster instanceof Monster)) continue;
      const pos = monsterPlacer(monster);
      if (pos == null) {
        console.error(`no valid location for ${hex(monster.id)} in ${hex(loc.id)}`);
        spawn.used = false;
        continue;
      } else {
        spawn.screen = pos >>> 8;
        spawn.tile = pos & 0xff;
      }
    }    

    console.log(`success after ${attempt} attempts`);
    console.log(maze.show());

    return;
  }

  throw new Error(`unable to shuffle goa1 after ${attempts} attempts`);
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
      Flag.of({screen: 0x20, flag: 0x2ef}),
      Flag.of({screen: 0x21, flag: 0x2ef}),
      Flag.of({screen: 0x24, flag: 0x2ef}),
      Flag.of({screen: 0x25, flag: 0x2ef}),
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
