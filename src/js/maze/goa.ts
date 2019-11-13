import {Maze} from './maze.js';
import {GOA1_SCREENS, write2d} from './spec.js';
import {Dir, Pos, Scr} from './types.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {Flag} from '../rom/location.js';
import {hex} from '../rom/util.js';
import {Monster} from '../rom/monster.js';

export function shuffleGoa1(rom: Rom, random: Random, attempts = 1500): void {
  // NOTE: also need to move enemies...
  extendGoaScreens(rom);
  const loc = rom.locations.GoaFortress_Kelbesque;
  const w = loc.width;
  const h = loc.height;

  // TODO - consider bigger icons? '┘║└\n═╬═\n┐║┌' or '┘┃└\n━╋━\n┐┃┌' ??

  OUTER:
  for (let attempt = 0; attempt < attempts; attempt++) {
    const maze = new Maze(random, h, w, GOA1_SCREENS);

    // Place the entrance at the bottom, boss at top.
    const entrance = ((h - 1) << 4 | random.nextInt(w)) as Pos;
    const boss = random.nextInt(w) as Pos;

    const entranceTile = entrance << 8 | 0x02;
    const exitTiles = [(boss + 32) << 8 | 0x01, (boss + 32) << 8 | 0x03];

    function fixed(pos: number, value: number) {
      maze.set(pos as Pos, value as Scr, {force: true}); // NOTE: no check OOB
    }

    fixed(entrance, 0xf0f1);
    fixed(entrance - 1, 0x00f0);
    fixed(entrance + 1, 0xf000);
    fixed(boss, 0xfff0);
    fixed(boss - 1, 0x0ff0);
    fixed(boss + 1, 0xff00);
    fixed(boss + 16, 0xf1ff);
    fixed(boss + 15, 0x00ff);
    fixed(boss + 17, 0xf00f);

    // console.log(`initial\n${maze.show()}`);

    // make the initial path from the entrance to the boss
    if (!maze.connect(entrance as Pos, Dir.UP, boss + 16 as Pos, Dir.DOWN)) {
      continue OUTER;
    }
    // don't allow a direct forward entrance
    if (maze.get((boss + 32) as Pos) === 0x0101 ||
        maze.get((entrance - 16) as Pos) === 0x0101) continue OUTER;
    //console.log('first', maze.show());

    // add an extra path until we fail 10 times
    for (let i = 0; i < 10 && maze.density() < 0.65; i++) {
      if (maze.addLoop()) i = 0;
    }
    //console.log(`loop\n${maze.show()}`);

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

    maze.fillAll({edge: 0});

    function check(): boolean {
      const traversal = maze.traverse();
      //(window as any).TRAV = traversal;

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

    // console.log(`success after ${attempt} attempts`);
    // console.log(maze.show());
    if (rom.spoiler) rom.spoiler.addMaze(loc.id, loc.name, maze.show());
    return;
  }

  throw new Error(`unable to shuffle goa1 after ${attempts} attempts`);
}

export function extendGoaScreens(rom: Rom) {
  // PLAN:
  // tileset a4,8c: move 19,1b -> 2b,ba
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
                    [0xba, [0x1b, 0xc5], ~0xc4]);
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
  write2d(rom.screens[0xe0].tiles, 0x61, w); // open up (wide), right (vanilla open)
  write2d(rom.screens[0xe1].tiles, 0x6d, w); // open up (wide), left (vanilla shut)
  write2d(rom.screens[0xe2].tiles, 0x91, w); // open down (wide), right (vanilla open)
  write2d(rom.screens[0xe3].tiles, 0x9d, w); // open down (wide), left (vanilla shut)
  write2d(rom.screens[0xe4].tiles, 0x41, w); // stairs
  write2d(rom.screens[0xe4].tiles, 0x8d, w);
  write2d(rom.screens[0xe5].tiles, 0x61, w); // horizontal wall
  write2d(rom.screens[0xe5].tiles, 0xad, w);
  write2d(rom.screens[0xe6].tiles, 0x0d, w); // four-way passages
  write2d(rom.screens[0xe6].tiles, 0xd1, w);
  write2d(rom.screens[0xe7].tiles, 0x01, w); // corners up top
  write2d(rom.screens[0xe7].tiles, 0x0d, w);
  write2d(rom.screens[0xe8].tiles, 0xd1, w); // corners on bottom
  write2d(rom.screens[0xe8].tiles, 0xdd, w);

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

  // This defaults to a8, but that doesn't work for wide screens.
  // We should make sure this doesn't break partitions for music
  // and/or palette shuffles.
  rom.locations.WaterfallCave3.tileset = 0x88;
}
