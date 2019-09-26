import {FillOpts, Maze} from './maze.js';
import {SpecSet, Survey} from './spec.js';
import {Dir, Pos, Scr} from './types.js';
import {Random} from '../random.js';
//import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';
//import {Monster} from '../rom/monster.js';
import {hex, seq} from '../rom/util.js';

const DEBUG: boolean = true;

// invariants for shuffling caves:
//  - dead ends
//  - doors (types/directions)
//  - walls (number, not necessarily direction)
//  - "big rooms"
//  - treasure chests, etc.

// export function shuffleBridgeCave(upper: Location, lower: Location,
//                                   random: Random, {attempts = 100} = {}) {
//   // TODO - doesn't work yet.

//   // Plan - shuffle the first one normally, then find displacement and
//   // set the initial displacement for the lower screen accordingly.
//   //      - need to mark the correct stairs as fixed (and fix up how we
//   //        handle fixed in general).

//   shuffleCave(upper, random, {attempts});
//   shuffleCave(lower, random, {attempts});
// }

interface ShuffleStrategy {
  new(loc: Location, random: Random): {shuffle: () => void};
}

const ATTEMPTS = 100;
class BasicCaveShuffle {
  readonly survey: Survey;

  // These are all assigned in shuffle(), before tryShuffle() is called.
  w!: number;
  h!: number;
  density!: number;
  allPos!: Pos[];
  walls!: number;
  bridges!: number;
  fixed!: Set<Pos>;

  constructor(readonly loc: Location, readonly random: Random) {
    this.survey = SpecSet.CAVE.survey(loc);
  }

  shuffle(): void {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const w = this.w = Math.max(1, Math.min(8, this.pickWidth()));
      const h = this.h = Math.max(1, Math.min(16, this.pickHeight()));
      this.allPos =
          seq(w * h, yx => ((yx % w) | Math.floor(yx / w) << 4) as Pos);
      this.density = this.survey.size / w / h;
      this.walls = this.survey.walls;
      this.bridges = this.survey.bridges;
      this.fixed = new Set();
      const maze = new Maze(this.random, this.h, this.w, this.survey.specs);
      if (this.tryShuffle(maze)) return;
    }
    throw new Error(`Could not shuffle ${hex(this.loc.id)} ${this.loc.name}`);
  }

  check(maze: Maze): boolean {
    const traverse = maze.traverse();
    return traverse.size > 2 &&
        traverse.values().next().value.size === traverse.size;
  }

  pickWidth(): number {
    return this.loc.width + Math.floor((this.random.nextInt(5)) / 3);
    //return this.loc.width + Math.floor((this.random.nextInt(6) - 1) / 3);
  }

  pickHeight(): number {
    return this.loc.height + Math.floor((this.random.nextInt(5)) / 3);
    //return this.loc.height + Math.floor((this.random.nextInt(6) - 1) / 3);
  }

  tryShuffle(maze: Maze): boolean {
    if (DEBUG) console.log(`Shuffle ${this.loc.name}`);
    if (!this.initializeFixedScreens(maze)) return false;
    if (DEBUG) console.log(`Initialized\n${maze.show()}`);
    if (!this.initialFillMaze(maze)) return false;
    if (DEBUG) console.log(`Initial fill\n${maze.show()}`);
    if (!this.refineMaze(maze)) return false;
    if (DEBUG) console.log(`Refined\n${maze.show()}`);
    if (!this.addFeatures(maze)) return false;
    if (DEBUG) console.log(`Features\n${maze.show()}`);
    return this.finish(maze);
  }

  initializeFixedScreens(maze: Maze): boolean {
    for (const [pos0, edge] of this.survey.edges) {
      for (const pos of this.random.ishuffle(this.edges(edge.dir))) {
        if (this.fixed.has(pos)) continue;
        this.fixed.add(pos);
        const fixedScr = this.survey.fixed.get(pos0);
        if (fixedScr == null) {
          maze.setBorder(pos, edge.dir, 6);
        } else {
          // NOTE: location 35 (sabre N summit prison) has a '1' exit edge
          // NOTE: can't handle edge exits for 1x? maps.
          if (this.h === 1) return false;
          maze.setBorder(pos, edge.dir,
                         (fixedScr.edges >>> Dir.shift(edge.dir)) & 0xf);
          fixBorders(maze, pos, fixedScr.edges);
          maze.set(pos, fixedScr.edges);
          if (fixedScr.wall) this.walls--;
        }
        break;
      }
    }

    for (const [pos0, scr] of this.survey.fixed) {
      if (this.survey.edges.has(pos0)) continue;
      for (const pos of this.random.ishuffle(this.allPos)) {
        if (this.fixed.has(pos)) continue;
        const ok = maze.saveExcursion(() => {
          fixBorders(maze, pos, scr.edges);
          return maze.trySet(pos, scr.edges);
        });
        if (!ok) continue;
        this.fixed.add(pos);
        if (scr.wall) this.walls--;
        break;
      }
    }

    const stairs = [...this.survey.stairs.values()];
    let tries = 0;
    for (let i = 0; tries < 10 && i < stairs.length; tries++) {
      const pos = maze.randomPos();
      if (this.fixed.has(pos)) continue;
      if (!maze.fill(pos, {stair: stairs[i].dir})) continue;
      this.fixed.add(pos);
      // console.log(`Added ${stairs[i].dir} stair at ${hex(pos)}`);
      tries = 0;
      i++;
    }
    if (tries >= 10) return fail(`could not add all stairs`);
    // fill the edge screens and fixed screens and their neighbors first, since
    // they tend to have more esoteric requirements.
    return true;
  }

  initialFillMaze(maze: Maze, opts: FillOpts = {}): boolean {
    const fillOpts = {
      edge: 1,
      fuzzy: 1,
      shuffleOrder: true,
      skipAlternates: true,
      ...opts,
    };
    if (!maze.fillAll(fillOpts)) return fail(`could not fill open`, maze);
    return true;
  }

  refineMaze(maze: Maze, opts: RefineOpts = {}): boolean {
    // Initial setup: add points of interest, then fill map with 1's as much
    // as possible.
    // console.log(`initial:\n${maze.show()}`);
    if (!this.check(maze)) return fail(`check failed after initial setup`, maze);

    const empty = 0 as Scr;
    const fillOpts = {skipAlternates: true, ...(opts.fill || {})};
    for (const [pos] of this.random.shuffle([...maze])) {
      if (maze.density() <= this.density) break;
      if (!maze.isFixed(pos)) {
        const changed =
            maze.saveExcursion(
                () => maze.setAndUpdate(pos, empty, fillOpts) &&
                      this.check(maze));
        if (changed) continue;
      }
    }

    // console.log(`percolated:\n${maze.show()}`);

    // Remove any tight cycles
    return this.removeTightCycles(maze);
  }

  removeTightCycles(maze: Maze): boolean {
    for (let y = 1; y < this.h; y++) {
      for (let x = 1; x < this.w; x++) {
        const pos = (y << 4 | x) as Pos;
        if (!isTightCycle(maze, pos)) continue;
        // remove the tight cycle
        let replaced = false;
        for (const dir of this.random.ishuffle(Dir.ALL)) {
          // TODO - this will need to change if we invert the direction!
          const pos2 = (dir < 2 ? pos - 1 : pos - 16) as Pos;
          const ok =
              maze.saveExcursion(
                  () => maze.replaceEdge(pos2, dir, 0) && this.check(maze));
          if (!ok) continue;
          replaced = true;
        }
        if (!replaced) return fail(`failed to remove tight cycle`);
      }
    }
    return true;
  }

  addFeatures(maze: Maze): boolean {
    // Add stair hallways and walls
    //   TODO - make sure they're on *a* critical path?
    const replaced = new Set<Pos>();
    const alts = [...maze.alternates()];
    for (const tile of [0x8c]) { // , 0x8d, 0x8e]) {
      if (this.survey.tiles.count(tile)) {
        const steps = this.random.shuffle(alts.filter(x => x[3].tile === tile));
        if (steps.length < this.survey.tiles.count(tile)) {
          return fail(`could not add stair hallway`);
        }
        for (let i = this.survey.tiles.count(tile) - 1; i >= 0; i--) {
          maze.replace(steps[i][0], steps[i][2]);
          replaced.add(steps[i][0]);
        }
      }
    }
    for (const type of ['wall', 'bridge']) {
      const screens =
          this.random.shuffle(alts.filter(x => x[3].wall &&
                                               x[3].wall.type === type));
      const count = type === 'wall' ? this.walls : this.bridges;
      for (let i = 0; i < count; i++) {
        const scr = screens.pop();
        if (scr == null) return fail(`could not add ${type} ${i}`);
        if (replaced.has(scr[0])) {
          i--;
          continue;
        }
        maze.replace(scr[0], scr[2]);
        replaced.add(scr[0]);
      }
    }
    return true;
  }

  // TODO - consolidate as much of this as possible into Maze.
  //      - move all the SCREEN constants into there as well
  //        so that we can reuse them more widely - consolidate
  //        goa and swamp?
  finish(maze: Maze): boolean {
    maze.trim();
    console.log(`final:\n${maze.show()}`);
    maze.write(this.loc, new Set());
    return maze.finish(this.survey, this.loc);
    // Map from priority to array of [y, x] pixel coords
    // Write back to the location.  Exits, entrances, npcs, triggers,
    // monsters, and chests must all be mapped to new locations.
    // walls, NPCs, triggers, chests, monsters...?
    // TODO - random things like triggers (summit cave, zebu cave), npcs?
    // TODO - need to actually fill in exits, stairs, monsters, chests
    // TODO - extend out any additional needed dead-ends, either
    //        just to get the right number, or to have a chest
  }

  edges(dir: Dir): Pos[] {
    const other =
        dir === Dir.RIGHT ? this.w - 1 : dir === Dir.DOWN ? this.h - 1 : 0;
    if (dir & 1) return seq(this.h, y => (y << 4 | other) as Pos);
    return seq(this.w, x => (other << 4 | x) as Pos);
  }

  randomEdge(dir: Dir): Pos {
    const tile = this.random.nextInt(dir & 1 ? this.h : this.w);
    const other =
        dir === Dir.RIGHT ? this.w - 1 : dir === Dir.DOWN ? this.h - 1 : 0;
    return (dir & 1 ? tile << 4 | other : other << 4 | tile) as Pos;
  }
}

interface RefineOpts {
  fill?: FillOpts;
  loop?: boolean;
}

class WideCaveShuffle extends BasicCaveShuffle {
  initialFillMaze(maze: Maze): boolean {
    // Initial state should be some exit screens on top, and a stair
    // somewhere beneath.  These are listed in `fixed`.  Iterate over
    // this set and connect them in some way or other.
    const poi = [...this.fixed];
    // First connect poi[0] to poi[1].
    if (!maze.connect(poi[0], null, poi[1], null)) return false;
    // Connect all remaining poi to the existing channel.
    for (let i = 2; i < poi.length; i++) {
      if (!maze.connect(poi[i])) return false;
    }
    //console.log(maze.show());
    maze.fillAll({edge: 0});
    return true;
  }

  // Nothing else to do at this point.
  refineMaze(): boolean {
    return true;
  }

  addFeatures(): boolean {
    return true;
  }
}

class WaterfallRiverCaveShuffle extends BasicCaveShuffle {
  initializeFixedScreens(maze: Maze): boolean {
    const set = (pos: number, scr: number) => {
      this.fixed.add(pos as Pos);
      maze.set(pos as Pos, scr as Scr);
    };
    const river = 1 + this.random.nextInt(this.w - 2);
    const left = this.random.nextInt(river);
    const right = this.w - 1 - this.random.nextInt(this.w - river - 1);
    const bottom = (this.h - 1) << 4;
    set(bottom + left, 0x2_0001);
    set(bottom + right, 0x2_0001);
    set(bottom + river, 0x0_0003);
    set(river, 0x0_0300);
    const riverScreens = [];
    for (let y = 1; y < this.h - 1; y += 2) {
      riverScreens.push(0x0_1303);
      riverScreens.push(0x0_0313);
    }
    this.random.shuffle(riverScreens);
    for (let y = 1; y < this.h - 1; y++) {
      set((y << 4) + river, riverScreens.pop()!);
    }
    console.log(maze.show());
    return true;
  }

  check(maze: Maze): boolean {
    const traverse = maze.traverse();
    const partitions = [...new Set(traverse.values())].map(s => s.size);
    return partitions.length === 2 &&
      partitions[0] + partitions[1] === traverse.size &&
      partitions[0] > 2 && partitions[1] > 2;
  }
}

class EvilSpiritRiverCaveShuffle extends BasicCaveShuffle {
  phase!: 'river' | 'cave';

  initializeFixedScreens(maze: Maze): boolean {
    // Basic plan: do two full rounds of shuffle.
    // First round is low-density just for river tiles.
    this.density = this.survey.rivers / this.w / this.h;
    this.phase = 'river';
    
    // This is copied from initialFillMaze

    if (!this.initializeRiver(maze)) return false;

    // if (!super.initialFillMaze(maze, {
    //   edge: 3,
    //   print: true,
    //   fuzzy: opts => {
    //     return {
    //       ...opts,
    //       edge: 1,
    //       fuzzy: 1,
    //     };
    //   },
    // })) return false;

    if (!this.refineMaze(maze)) return false;
    console.log(`REFINEMENT:\n${maze.show()}`);

    // Delete all the blanks
    for (const pos of this.allPos) {
      if (!maze.get(pos)) {
        maze.delete(pos);
      } else {
        this.fixed.add(pos);
      }
    }

    if (!super.initializeFixedScreens(maze)) return false;

    // Figure out how many bridges we have so far (only from 4-way tiles),
    // if it's too many then bail out; if it's not enough then add a few.

    // Block off some of the edges to ensure a single path...?

    // Then extend the tiles whenever possible.

    // Then do the normal thing from there.
    this.density = this.survey.size / this.w / this.h;
    this.phase = 'cave';
    return true;
  }

  initializeRiver(maze: Maze): boolean {
    // NOTE: This is a difficult fill because there's no
    // ||= or =|| tiles, so the left/right edges get a little
    // troubled.  But there ARE dead-ends, so we can fill the
    // column with either pairs of tight cycles or else
    // dead ends, as we see fit.  Do this manually.
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let tile = 0x3333;
        const pos = (y << 4 | x) as Pos;
        if (y === 0) tile &= 0xfff0;
        if (y === this.h - 1) tile &= 0xf0ff;
        const loop = y > 0 && (maze.get((pos - 16) as Pos)! & 0x0f00) != 0;
        if (x === 0) {
          if (loop) {
            tile = 0x0033;
          } else {
            tile = y < this.h - 1 && this.random.nextInt(2) ? 0x0330 : 0x0030;
          }
        } else if (x === this.w - 1) {
          if (loop) {
            tile = 0x3003;
          } else {
            tile = y < this.h - 1 && this.random.nextInt(2) ? 0x3300 : 0x3000;
          }
        }
        maze.set(pos, tile as Scr);
      }
    }
    return true;
  }

  check(maze: Maze): boolean {
    if (this.phase === 'cave') return super.check(maze);
    // River check involves just ensuring everything is reachable by flight?
    // But we don't have that for now...

    const traverse = maze.traverse({flight: true});
    const partitions = [...new Set(traverse.values())].map(s => s.size);
    return partitions.length === 1 && partitions[0] === traverse.size;
    // let sum = 0;
    // for (const part of partitions) {
    //   sum += part;
    // }
    // return partitions.every(p => p > 2) && sum === traverse.size;
  }
}

class CycleCaveShuffle extends BasicCaveShuffle {
  // Ensure the cave has at least one cycle.
  check(maze: Maze): boolean {
    const allTiles = [...maze];
    const nonCritical = allTiles.filter(t => {
      const trav = [...maze.traverse({without: [t[0]]})];
      return trav.length && trav[0][1].size === trav.length;
    });
    if (!nonCritical.length) return false;
    // find two noncritical tiles that together *are* critical
    for (let i = 0; i < nonCritical.length; i++) {
      for (let j = 0; j < i; j++) {
        const trav = [...maze.traverse({without: [nonCritical[i][0],
                                                  nonCritical[j][0]]})];
        if (trav.length && trav[0][1].size !== trav.length) return true;
      }
    }
    return false;
  }
}

class TightCycleCaveShuffle extends CycleCaveShuffle {
  // Just don't remove them
  removeTightCycles(): boolean {
    return true;
  }
}

function fail(msg: string, maze?: Maze): false {
  console.error(`Reroll: ${msg}`);
  if (maze && DEBUG) console.log(maze.show());
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

const STRATEGIES = new Map<number, ShuffleStrategy>([
  [0x27, CycleCaveShuffle],
  [0x4b, TightCycleCaveShuffle],
  [0x54, CycleCaveShuffle],
  [0x56, WideCaveShuffle],
  [0x57, WaterfallRiverCaveShuffle],
  [0x69, EvilSpiritRiverCaveShuffle],
  [0x84, WideCaveShuffle],
]);

export function shuffleCave(loc: Location, random: Random): void {
  new (STRATEGIES.get(loc.id) || BasicCaveShuffle)(loc, random).shuffle();
}
