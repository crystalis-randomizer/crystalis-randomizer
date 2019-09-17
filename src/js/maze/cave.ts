import {Maze} from './maze.js';
import {SpecSet} from './spec.js';
import {Dir, Pos, Scr} from './types.js';
import {Random} from '../random.js';
//import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';
//import {Monster} from '../rom/monster.js';
import {seq} from '../rom/util.js';

// invariants for shuffling caves:
//  - dead ends
//  - doors (types/directions)
//  - walls (number, not necessarily direction)
//  - "big rooms"
//  - treasure chests, etc.

export function shuffleBridgeCave(upper: Location, lower: Location,
                                  random: Random, {attempts = 100} = {}) {
  // TODO - doesn't work yet.

  // Plan - shuffle the first one normally, then find displacement and
  // set the initial displacement for the lower screen accordingly.
  //      - need to mark the correct stairs as fixed (and fix up how we
  //        handle fixed in general).

  shuffleCave(upper, random, {attempts});
  shuffleCave(lower, random, {attempts});
}

interface ShuffleCaveOptions {
  attempts?: number;
  check?: (maze: Maze) => boolean;
  allowTightCycles?: boolean;
}

function defaultCheck(maze: Maze): boolean {
  const traverse = maze.traverse();
  return traverse.size > 2 &&
      traverse[Symbol.iterator]().next().value[1].size === traverse.size;
  // TODO - must have at least one non-dead-end tile???
}

export function shuffleCave(loc: Location, random: Random,
                            opts: ShuffleCaveOptions = {}): void {
  let {
    attempts = 50,
    check = defaultCheck,
  } = opts;

  if (loc.id === 0x27) check = cycleCaveCheck;
  if (loc.id === 0x4b) opts.allowTightCycles = true;
  if (loc.id === 0x4b || loc.id === 0x54) check = cycleCaveCheck;

  // Want a general-purpose algorithm.
  // Analyze the current location.
  const survey = SpecSet.CAVE.survey(loc);
  const w0 = loc.width;
  const h0 = loc.height;
  //const sizeDiff = random.nextInt(4);
  const w = Math.min(w0 + 1/*(sizeDiff & 1)*/, 8);
  const h = Math.min(h0 + 1/*(sizeDiff >>> 1)*/, 16);
  const allPos = seq(w * h, yx => ((yx % w) | Math.floor(yx / w) << 4) as Pos);

  // Count entrances and exits.
  const density = survey.size / w / h;

  let tryShuffle: (maze: Maze) => boolean;

  //if ((false as any) && !survey.branches) {
  //  tryShuffle = tryShuffleNoBranch;
  //} else {
  tryShuffle = tryShuffleCave;
  //}

  for (let attempt = 0; attempt < attempts; attempt++) {
    // Grow the width/height just a little.  We still try to keep roughly
    // the same number of screens, so we may not use the full size, but
    // it's here in case it helps.
    //const maze = new Maze(random, h0 + 2, Math.min(8, w0 + 2), screens);

    const maze = new Maze(random, h, w, survey.specs);
    if (tryShuffle(maze)) return;
  }

  // TODO - consider moving "tryShuffleNoBranch" here?

  function tryShuffleCave(maze: Maze): boolean {

    // Initial setup: add points of interest, then fill map with 1's as much
    // as possible.

    let {walls} = survey;
    const fixed = new Set<Pos>();
    for (const [pos0, edge] of survey.edges) {
      while (true) {
        const pos = randomEdge(edge.dir);
        if (fixed.has(pos)) continue;
        fixed.add(pos);
        const fixedScr = survey.fixed.get(pos0);
        if (fixedScr == null) {
          maze.setBorder(pos, edge.dir, 6);
        } else {
          // NOTE: location 35 (sabre N summit prison) has a '1' exit edge
          maze.setBorder(pos, edge.dir,
                         (fixedScr.edges >>> Dir.shift(edge.dir)) & 0xf);
          fixBorders(maze, pos, fixedScr.edges);
          maze.set(pos, fixedScr.edges);
          if (fixedScr.wall) walls--;
        }
        break;
      }
    }

    for (const [pos0, scr] of survey.fixed) {
      if (survey.edges.has(pos0)) continue;
      for (const pos of random.ishuffle(allPos)) {
        if (fixed.has(pos)) continue;
        const ok = maze.saveExcursion(() => {
          fixBorders(maze, pos, scr.edges);
          return maze.trySet(pos, scr.edges);
        });
        if (!ok) continue;
        fixed.add(pos);
        if (scr.wall) walls--;
        break;
      }
    }

    const stairs = [...survey.stairs.values()];
    let tries = 0;
    for (let i = 0; tries < 10 && i < stairs.length; tries++) {
      const pos = maze.randomPos();
      if (fixed.has(pos)) continue;
      if (!maze.fill(pos, {stair: stairs[i].dir})) continue;
      fixed.add(pos);
      // console.log(`Added ${stairs[i].dir} stair at ${hex(pos)}`);
      tries = 0;
      i++;
    }
    if (tries >= 10) return fail(`could not add all stairs`);
    // fill the edge screens and fixed screens and their neighbors first, since
    // they tend to have more esoteric requirements.

    if (survey.wide) return fillWideMaze(maze, fixed);

    const fillOpts = {
      edge: 1,
      fuzzy: 1,
      shuffleOrder: true,
      skipAlternates: true,
    };
    if (!maze.fillAll(fillOpts)) return fail(`could not fill open`);

    // console.log(`initial:\n${maze.show()}`);
    if (!check(maze)) return fail(`check failed after initial setup`);

    const empty = 0 as Scr;
    const opts2 = {skipAlternates: true};
    for (const [pos] of random.shuffle([...maze])) {
      if (maze.density() <= density) break;
      if (!maze.isFixed(pos)) {
        const changed =
            maze.saveExcursion(
                () => maze.setAndUpdate(pos, empty, opts2) && check(maze));
        if (changed) continue;
      }
    }

    // console.log(`percolated:\n${maze.show()}`);

    // Remove any tight cycles
    if (!opts.allowTightCycles) {
      for (let y = 1; y < h; y++) {
        for (let x = 1; x < w; x++) {
          const pos = (y << 4 | x) as Pos;
          if (!isTightCycle(maze, pos)) continue;
          // remove the tight cycle
          let replaced = false;
          for (const dir of random.ishuffle(Dir.ALL)) {
            // TODO - this will need to change if we invert the direction!
            const pos2 = (dir < 2 ? pos - 1 : pos - 16) as Pos;
            const ok =
                maze.saveExcursion(
                    () => maze.replaceEdge(pos2, dir, 0) && check(maze));
            if (!ok) continue;
            replaced = true;
          }
          if (!replaced) return fail(`failed to remove tight cycle`);
        }
      }
    }

    // Add stair hallways and walls
    //   TODO - make sure they're on *a* critical path?
    {
      const replaced = new Set<Pos>();
      const alts = [...maze.alternates()];
      for (const tile of [0x8c]) { // , 0x8d, 0x8e]) {
        if (survey.tiles.count(tile)) {
          const steps = random.shuffle(alts.filter(x => x[3].tile === tile));
          if (steps.length < survey.tiles.count(tile)) {
            return fail(`could not add stair hallway`);
          }
          for (let i = survey.tiles.count(tile) - 1; i >= 0; i--) {
            maze.replace(steps[i][0], steps[i][2]);
            replaced.add(steps[i][0]);
          }
        }
      }
      const wallScreens = random.shuffle(alts.filter(x => x[3].wall));
      for (let i = 0; i < walls; i++) {
        const scr = wallScreens.pop();
        if (scr == null) return fail(`could not add wall ${i}`);
        if (replaced.has(scr[0])) {
          i--;
          continue;
        }
        maze.replace(scr[0], scr[2]);
        replaced.add(scr[0]);
      }
    }

    return finish(maze);
  }

  function fillWideMaze(maze: Maze, fixed: Set<Pos>): boolean {
    // Initial state should be some exit screens on top, and a stair
    // somewhere beneath.  These are listed in `fixed`.  Iterate over
    // this set and connect them in some way or other.
    const poi = [...fixed];
    // First connect poi[0] to poi[1].
    if (!maze.connect(poi[0], null, poi[1], null)) return false;
    // Connect all remaining poi to the existing channel.
    for (let i = 2; i < poi.length; i++) {
      if (!maze.connect(poi[i])) return false;
    }
    console.log(maze.show());
    maze.fillAll({edge: 0});
    return finish(maze);
  }

  // TODO - consolidate as much of this as possible into Maze.
  //      - move all the SCREEN constants into there as well
  //        so that we can reuse them more widely - consolidate
  //        goa and swamp?
  function finish(maze: Maze): boolean {
    maze.trim();
    //console.log(`final:\n${maze.show()}`);
    maze.write(loc, new Set());
    return maze.finish(survey, loc);
    // Map from priority to array of [y, x] pixel coords
    // Write back to the location.  Exits, entrances, npcs, triggers,
    // monsters, and chests must all be mapped to new locations.
    // walls, NPCs, triggers, chests, monsters...?
    // TODO - random things like triggers (summit cave, zebu cave), npcs?
    // TODO - need to actually fill in exits, stairs, monsters, chests
    // TODO - extend out any additional needed dead-ends, either
    //        just to get the right number, or to have a chest
  }

  function randomEdge(dir: Dir): Pos {
    const tile = random.nextInt(dir & 1 ? h : w);
    const other = dir === Dir.RIGHT ? w - 1 : dir === Dir.DOWN ? h - 1 : 0;
    return (dir & 1 ? tile << 4 | other : other << 4 | tile) as Pos;
  }
  throw new Error(`Could not shuffle`);
}

function fail(msg: string): false {
  console.error(`Reroll: ${msg}`);
  return false;
}

// Ensure the cave has at least one cycle.
function cycleCaveCheck(maze: Maze): boolean {
  const allTiles = [...maze];
  const nonCritical = allTiles.filter(t => {
    const trav = [...maze.traverse({without: [t[0]]})];
    return trav[0][1].size === trav.length;
  });
  if (!nonCritical.length) return false;
  // find two noncritical tiles that together *are* critical
  for (let i = 0; i < nonCritical.length; i++) {
    for (let j = 0; j < i; j++) {
      const trav = [...maze.traverse({without: [nonCritical[i][0],
                                                nonCritical[j][0]]})];
      if (trav[0][1].size !== trav.length) return true;
    }
  }
  return false;
}

// Check whether there's a "tight cycle" at `pos`.  We will
// probably want to break it.
function isTightCycle(maze: Maze, pos: Pos): boolean {
  const ul = maze.get((pos - 17) as Pos) || 0;
  const dr = maze.get((pos) as Pos) || 0;
  return !!((ul & 0x0f00) && (ul & 0x00f0) && (dr & 0xf000) && (dr & 0x000f));
}

// Ensure borders are consistent with any pre-placed fixed tiles/edges.
function fixBorders(maze: Maze, pos: Pos, scr: Scr): void {
  try {
    for (const dir of Dir.ALL) {
      if (!maze.inBounds(Pos.plus(pos, dir)) &&
          ((scr >> Dir.shift(dir)) & 0x7) === 7) {
        maze.setBorder(pos, dir, 7);
      }
    }
  } catch (err) {}
}

    //maze.trackOpenEdges();

    //const mapping: Array<[Pos, Pos]> = []; // NOTE: may need to xform if shrink
    //const poi: Array<[Pos, Dir]> = [];
    //let {branches, deadEnds, size, walls} = survey;


    

    // // Possible approach:
    // //  1. seed a bunch of initial screens
    // //  2. check step: traverse the map with
    // //     missing items treated as connecting everything
    // //  3. add random screens, biasing toward fewer exits
    // //     based on branching factor?
    // // This should ensure we don't do anything too stupid to
    // // paint ourselves into a corner.

    // Place (1) edge exits, (2) fixed screens, (3) stairs.
//     const setEdges = new Set<Pos>();
//     for (const [, edge] of survey.edges) {
//       while (true) {
//         const tile = /*1 +*/ random.nextInt(edge.dir & 1 ? h0 : w0);
//         const other =
//             edge.dir === Dir.RIGHT ? /*1 +*/ w0 :
//             edge.dir === Dir.DOWN ? /*1 +*/ h0 : 0;
//         const pos = (edge.dir & 1 ? tile << 4 | other : other << 4 | tile) as Pos;
//         if (setEdges.has(pos)) continue;
//         maze.setBorder(pos, edge.dir, 6);
//         break;
//       }
//       // if (!maze.fill(moved, {maxExits: 2 + branches})) continue OUTER;
//       // const filled = maze.get(moved)!;
//       // mapping.push([pos, moved]);
//       // let exits = 0;
//       // for (const dir of Dir.ALL) {
//       //   if (dir != edge.dir && (filled & Dir.edgeMask(dir))) {
//       //     // poi.push([moved, dir]);
//       //     exits++;
//       //   }
//       // }
//       // size--;
//       // if (exits > 1) branches -= (exits - 1);
//     }

//     for (const [, scr] of survey.fixed) {
//       if (maze.addScreen(scr) == null) continue OUTER;
//     }

//     for (const stair of survey.stairs) {
//       const eligible = [];
//       for (const spec of screens) {
//         if (spec.stairs.some(s => s.dir === stair.dir)) eligible.push(spec.edges);
//       }
//       if (maze.addScreen(random.pick(eligible)) == null) continue OUTER;
//     }

//     // // Now fill out a basic structure by walking random paths.
//     // while (maze.density() < density) {
//     //   if (maze.randomExtension(branches / size)) branches--;
//     //   size--;
//     // }


//     //   for (let i = 0; i < 10; i++) {
//     //     const tile0 = random.nextInt(h0 * w0);
//     //     const x = tile0 % w0;
//     //     const y = (tile0 - x) / w0;
//     //     if (!maze.trySet(pos, 
//     // }


//     // for (const stair of survey.stairs) {
//     //   // Find a random location for a correct-direction stair.
//     //   const pos = maze.randomUnfilledPos();
//     // }

//     console.log(maze.show());
//   }
// }

  // function tryShuffleNoBranch(maze: Maze): boolean {
  //   if (survey.tiles.count(0x91) || survey.tiles.count(0x92)) {
  //     throw new Error(`Cannot handle tile`);
  //   }

  //   // Basic plan: make a list of screens, which include turns, straights,
  //   // and fixed screens.
  //   let {size, walls} = survey;
  //   const [] = [walls];

  //   // We need at most two exits, at most one can be an edge.
  //   const edgeCount = survey.edges.size;
  //   const stairCount = survey.stairs.size;
  //   const exitCount = edgeCount + stairCount;
  //   if (edgeCount > 1) throw new Error(`too many edges: ${edgeCount}`);
  //   if (exitCount > 2) throw new Error(`too many exits: ${exitCount}`);

  //   let start: Pos;
  //   let entranceEdges: number;
  //   let target: ExitSpec | undefined;

  //   // Place the first tile.
  //   const stairs = [...survey.stairs.values()];
  //   if (edgeCount) {
  //     const [edge] = [...survey.edges.values()];
  //     start = randomEdge(edge.dir);
  //     maze.setBorder(start, edge.dir, 6);
  //     if (!maze.fill(start, {maxExits: 2})) return fail('entrance edge fill');
  //     entranceEdges = maze.get(start)! & ~Dir.edgeMask(edge.dir) & 0xffff;
  //     target = stairs[0];
  //   } else {
  //     // start with a stair
  //     start = maze.randomPos();
  //     if (!maze.fill(start, {maxExits: 1, stair: stairs[0].dir})) {
  //       return fail('entrance stair fill');
  //     }
  //     entranceEdges = maze.get(start)! & 0xffff;
  //     target = stairs[1];
  //   }

  //   // Figure out start direction
  //   let startDir = 0 as Dir;
  //   for (; startDir < 4; startDir++) {
  //     if (entranceEdges & Dir.edgeMask(startDir)) break;
  //   }
  //   if (startDir === 4) return fail('no edge exit');

  //   // Make up a path
  //   type Turn = -1 | 0 | 1;
  //   function turn(): Turn { return (random.nextInt(3) - 1) as Turn; }
  //   const path = seq(size - 2 + random.nextInt(2), turn);
  //   const finalOpts = target ? {stair: target.dir} : {};
  //   if (!maze.fillPathToDeadEnd(start, startDir, path[Symbol.iterator](),
  //                               {edge: 1}, finalOpts)) {
  //     return fail(`could not fill path: ${path}`);
  //   }

  //   // Add in [fixed screens], stair halls/bridges, and walls (respectively).

  //   // TODO - flesh this out LATER, for now don't worry about non-branching.

  //   // for (const tile of [0x8c]) { // , 0x8d, 0x8e]) {
  //   //   if (survey.tiles.count(tile)) {
  //   //     const steps = random.shuffle(alts.filter(x => x[3].tile === tile));
  //   //     if (steps.length < survey.tiles.count(tile)) {
  //   //       return fail(`could not add stair hallway`);
  //   //     }
  //   //     for (let i = survey.tiles.count(tile) - 1; i >= 0; i--) {
  //   //       maze.replace(steps[i][0], steps[i][2]);
  //   //       replaced.add(steps[i][0]);
  //   //     }
  //   //   }
  //   // }

  //   // console.log(`done\n${maze.show()}`);
  //   if (loc.rom.spoiler) loc.rom.spoiler.addMaze(loc.id, loc.name, maze.show());
  //   return true;
  // }
