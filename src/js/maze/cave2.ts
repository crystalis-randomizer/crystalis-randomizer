import { Random } from '../random.js';
//import {Rom} from '../rom.js';
import { Location } from '../rom/location.js';
import { Metalocation, Pos } from '../rom/metalocation.js';
import { Metascreen } from '../rom/metascreen.js';
//import {Monster} from '../rom/monster.js';
import { hex, seq } from '../rom/util.js';
import { iters } from '../util.js';
import { Dir } from '../logic/dir.js';
import { ConnectionType, Feature } from '../rom/metascreendata.js';
import { MetascreenIndex } from '../rom/metascreenindex.js';
import { Failure, ok, Ok, FailureContext } from '../failure.js';

// IDEA:
//  - build up a more abstract (2h+1) x (2w+1) cave map.
//  - bomberman style: impassible corners
//     | | | |
//    -+-+-+-+-
//     | | | |
//    -+-+-+-+-
//     | | | |
//    -+-+-+-+-
//     | | | |
//  - start with all valid inner points filled
//  - add edges as needed
//  - remove arbitrary points, keeping connected
//  - refinement:
//     no bendy entrance (maybe do this early)
//     consolidate screens if necessary
//     simple transformations to ensure actual tiles?
//  - consider memoizing the edges on neighboring centers?
//     easier computation...
//  - concretize and try to add other features as needed?
//     add blocks, etc, ...
//  - tiles can be different colors
//     0 for blank (-1 for permablank?)
//     1 for cave, 2 for river, 3 for spikes, etc
//  - double mazes are also possible
//     mado 2 might want a triple maze where upper level has a hard
//     partition separating the two separate maps
//  - ensure pit above spike when possible (make both at same time)
//     rules for pit: 3 points long, no intersection allowed
//     all 3 points must be above non-empty spots
//     enforce with checks at each removal?
//  - bridge: initial fill stairs and bridge on both
//     rule: bridge has no cross neighbor for _2_ spaces either dir
//           bridge has non-empty straight neighbor for 2 spaces
//  - how to represent stairs??? maybe just generic "fixed" screen?
//     or else generalize "up" vs "down" vs "edge" exits?

//  0123456789abcdef
//   | | | | | | | |
//  -+-+-+-+-+-+-+-+-
//
// doesn't fit - how to compress better?
//   pos = yyxx, xx: 0..16
//   (pos & 0xff) + (pos >>> 8) * 9 for maximum density, but crummier

// overworld would have very different rules
// mountain may have different as well???



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

  // These are all assigned in shuffle(), before tryShuffle() is called.
  survey: Metalocation;
  caveIndex: MetascreenIndex;

  out!: Metalocation;
  w!: number;
  h!: number;
  allPos!: Pos[];
  walls!: number;
  bridges!: number;
  fixed!: Set<Pos>;
  empty!: Set<Pos>;

  constructor(readonly loc: Location, readonly random: Random) {
    this.survey = Metalocation.of(loc);
    this.caveIndex = new MetascreenIndex(this.survey.tileset, 'c');
  }

  shuffle(): void {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const w = this.w = Math.max(1, Math.min(8, this.pickWidth()));
      const h = this.h = Math.max(1, Math.min(16, this.pickHeight()));
      this.allPos =
          seq(w * h, yx => ((yx % w) | Math.floor(yx / w) << 4) as Pos);
      this.walls = this.bridges = 0;
      for (const pos of this.survey.allPos()) {
        const scr = this.survey.get(pos);
        if (scr.hasFeature('wall')) this.walls++;
        if (scr.hasFeature('bridge')) this.bridges++;
      }
      this.fixed = new Set();
      this.empty = new Set();
      this.out =
          new Metalocation(this.survey.id, this.survey.tileset, this.h, this.w);
      if (this.tryShuffle()) return;
    }
    throw new Error(`Could not shuffle ${hex(this.loc.id)} ${this.loc.name}`);
  }

  check(): Ok {
    const traverse = this.out.traverse();
    if (traverse.size <= 2) {
      return Failure.of('traversal too small: %d', traverse.size);
    } else if (traverse.values().next().value.size !== traverse.size) {
      return Failure.of('multiple disconnected domains: %s', traverse);
    }
  }

  pickWidth(): number {
    return this.loc.width + Math.floor((this.random.nextInt(5)) / 3);
    //return this.loc.width + Math.floor((this.random.nextInt(6) - 1) / 3);
  }

  pickHeight(): number {
    return this.loc.height + Math.floor((this.random.nextInt(5)) / 3);
    //return this.loc.height + Math.floor((this.random.nextInt(6) - 1) / 3);
  }

  tryShuffle(): Ok {
    let context = new FailureContext();
    if (DEBUG) context.note(`Shuffle ${this.loc}`);
    context.do('Initialize fixed screens', () => this.initializeFixedScreens());
    if (DEBUG) context.note(`Initialized\n${this.out.show()}`);
    context.do('Initial fill', () => this.initialFillMaze());
    if (DEBUG) context.note(`Initial fill\n${this.out.show()}`);
    context.do('Refine', () => this.refineMaze());
    if (DEBUG) context.note(`Refined\n${this.out.show()}`);
    context.do('Add features', () => this.addFeatures());
    if (DEBUG) context.note(`Features\n${this.out.show()}`);
    return context.do('Finish', () => this.finish());
  }

  initializeFixedScreens(): Ok {
    // First, assign any border screens that need to be exits.
    const rom = this.survey.rom;
    for (const [, dir, edge, exit] of this.survey.borders()) {
      if (!exit) continue; // If it's not an exit, ignore for now.
      // For each exit, find an unconstrained edge position for it.
      let found = false;
      const failures: Failure[] = [];
      for (const pos of this.random.ishuffle(this.edges(dir))) {
        if (this.out.isConstrained(pos)) continue;
        //const fixedScr = edge;
        const fail1 = this.out.saveExcursion((): Ok => {
          const fail2 = this.out.trySet(pos + DELTA[dir], rom.metascreens.exit);
          if (fail2) return fail2;
          if (edge.hasFeature('arena')) {
            const fail3 = this.out.trySet(pos, edge);
            if (fail3) return fail3;
            this.out.setFeatures(pos, edge.features);
            // this.fixed.add(pos);
            // Arenas can't have adjacent empties.  Everything else OK.
            // TODO - allow other empty screens here?!?
            this.empty.add(pos + 1);
            this.empty.add(pos - 1);
          }
          // TODO - are there any other fixed features?
        });
        if (fail1) {
          failures.push(fail1);
        } else {
          found = true;
          break;
        }
        // } else {
        //   // NOTE: location 35 (sabre N summit prison) has a '1' exit edge
        //   // NOTE: can't handle edge exits for 1x? maps.
        //   if (this.h === 1) return false;
        //   maze.setBorder(pos, edge.dir,
        //                  (fixedScr.edges >>> Dir.shift(edge.dir)) & 0xf);
        //   fixBorders(maze, pos, fixedScr.edges);
        //   maze.set(pos, fixedScr.edges);
        //   if (fixedScr.wall) this.walls--;
        // }
      }
      // If we couldn't find a place to put the exit, bail out.
    }

    for (const pos0 of this.survey.allPos()) {
      const scr = this.survey.get(pos0);
      if (!scr.manual) continue;
      // Note: we no longer pay special attention to fixed edges...?
      //if (this.survey.edges.has(pos0)) continue;
      for (const pos of this.random.ishuffle(this.allPos)) {
        //if (this.fixed.has(pos) || this.out.isFixed(pos)) continue;
        if (!this.screen(pos).hasFeature('empty')) continue;
        const ok = this.out.saveExcursion(() => {
          this.fixBorders(pos, scr); // TODO - flag to autofix borders?
          return this.out.set(pos, scr);
        });
        if (!ok) continue;
        this.fixed.add(pos);
        if (scr.hasFeature('wall')) this.walls--;
        if (scr.hasFeature('bridge')) this.bridges--;
        break;
      }
    }

    const stairs: Feature[] = [];
    for (const pos0 of this.survey.allPos()) {
      // TODO - probably better off indexing these...?
      const scr = this.survey.get(pos0);
      for (const exit of scr.data.exits ?? []) {
        if (/stair:/.test(exit.type)) stairs.push(exit.type as Feature);
      }
    }
    let tries = 0;
    const allPos = this.out.allPos();
    const failures: Failure[] = [];
    for (let i = 0; tries < 10 && i < stairs.length; tries++) {
      const pos = this.random.pick(allPos);
      // TODO - prefilter out fixed ??? - TODO - delete fixed...
      if (this.fixed.has(pos)) continue;
      const result = this.out.saveExcursion((): Ok => {
        const result =
            this.caveIndex.tryAddFeature(this.out, pos, stairs[i], this.random);
        if (result) return result;
        return this.check();
      });
          // this.out.tryAddOneOf(pos, this.out.tileset.getExits(stairs[i]));
      if (result) {
        failures.push(result);
        continue;
      }
      this.fixed.add(pos);
      // console.log(`Added ${stairs[i].dir} stair at ${hex(pos)}`);
      tries = 0;
      i++;
    }
    if (tries >= 10) return Failure.all(failures, `could not add all stairs`);
    // fill the edge screens and fixed screens and their neighbors first, since
    // they tend to have more esoteric requirements.
  }

  fixBorders(pos: Pos, scr: Metascreen) {
    try {
      let exits = scr.edgeExits();
      for (let dir = 0; dir < 4; dir++) {
        if (exits & 1) {
          const neighbor = pos + DELTA[dir];
          if (!this.out.inBounds(neighbor)) {
            this.out.set(neighbor, this.out.tileset.exit);
          }
        }
        exits >>>= 1;
      }
    } catch (err) {}
  }

  screen(pos: Pos): Metascreen {
    return this.out.get(pos);
  }

  initialFillMaze(): Ok { // TODO - options?
    const eligible = this.out.tileset.getScreensWithOnlyFeatures('empty');
    eligible.sort((a, b) => (b.data.connect || '').length -
                            (a.data.connect || '').length);
    for (const pos of this.out.allPos()) {
      if (!this.out.get(pos).isEmpty() || this.out.isConstrained(pos)) continue;
      // Start placing full connections first.
      const res = this.out.tryAddOneOf(pos, eligible);
      if (res) return res;
    }
    // const fillOpts = {
    //   edge: 1,
    //   fuzzy: 1,
    //   shuffleOrder: true,
    //   skipAlternates: true,
    //   ...opts,
    // };
    // if (!maze.fillAll(fillOpts)) return fail(`could not fill open`, maze);

    // TODO - figure out how to do this?

    return this.check();
  }

  refineMaze(opts: RefineOpts = {}): boolean {
    // Initial setup: add points of interest, then fill map with 1's as much
    // as possible.
    // console.log(`initial:\n${maze.show()}`);
    if (!this.check()) return this.fail(`check failed after initial setup`);

    for (const pos of this.random.ishuffle([...this.out.allPos()])) {
      if (this.out.size <= this.survey.size) break;
      if (!this.out.isConstrained(pos)) {
        const changed =
            this.out.saveExcursion(
                () => this.caveIndex.tryClear(this.out, pos, this.random) &&
                      this.check());
        //console.log(`Refinement step ${pos.toString(16)} changed ${changed}\n${maze.show()}`);
        if (changed) {
          this.postRefine(pos);
          continue;
        }
      }
    }

    // console.log(`percolated:\n${maze.show()}`);

    // Remove any tight cycles
    return this.removeTightCycles();
  }

  // Runs after a tile is deleted during refinement.  For override.
  postRefine(pos: Pos) {}

  removeTightCycles(): Ok {
    for (let y = 1; y < this.h; y++) {
      for (let x = 1; x < this.w; x++) {
        const pos = (y << 4 | x) as Pos;
        if (!this.caveIndex.isTightCycle(this.out, pos)) continue;
        // remove the tight cycle
        //const failures = new ErrorCollector();
        const failures: Failure[] = [];
        let replaced = false;
        for (const dir of this.random.ishuffle([0, 1, 2, 3])) {
          // TODO - this will need to change if we invert the direction!
          const pos2 = (dir < 2 ? pos - 1 : pos - 16) as Pos;
          const result = this.out.saveExcursion((): Ok => {
            const clear =
                this.caveIndex.tryClearEdge(this.out, pos2, dir, this.random);
            if (!ok(clear)) return clear;
            const check = this.check('clearing edge %02x dir %d', pos2, dir);
            if (!ok(check)) return check;
          });
          if (ok(result)) {
            replaced = true;
          } else {
            failures.push(result);
          }
        }
        if (!replaced) {
          return Failure.all(failures,
                             'failed to replace tight cycle at %02x', pos);
        }
      }
    }
  }

  addFeatures(): Ok {

    // TODO - combinators for errorcollector?
    //      -   Some? -> OK if any one passes...?
    //      - overload set() to return void if no strategy?


    // Add ramp hallways and walls
    //   TODO - make sure they're on *a* critical path?
    const replaced = new Set<Pos>();
    const alts = [...maze.alternates()];
    for (const tile of [0x8c]) { // , 0x8d, 0x8e]) {
      if (this.survey.tiles.count(tile)) {
        const steps = this.random.shuffle(alts.filter(x => x[3].tile === tile));
        if (steps.length < this.survey.tiles.count(tile)) {
          return this.fail(`could not add stair hallway`);
        }
        for (let i = this.survey.tiles.count(tile) - 1; i >= 0; i--) {
          maze.replace(steps[i][0], steps[i][2]);
          replaced.add(steps[i][0]);
        }
      }
    }
    for (const type of ['wall', 'bridge']) {

      // TODO http://localhost:8081/#rom=orig.nes&init=crystalis/debug&patch=crystalis/patch&flags=DsFcprstwGfHbdgwMertPsRoprstScktSmTabmpWmtuw&seed=3138e151
      // - only placed 1 wall, also missed a chest, maybe? - needs to error
      // 152 -> can't make iron walls horizontal! --> look at tileset!!!

      const screens =
          this.random.shuffle(alts.filter(x => x[3].wall &&
                                               x[3].wall.type === type));
      const count = type === 'wall' ? this.walls : this.bridges;
      for (let i = 0; i < count; i++) {
        const scr = screens.pop();
        if (scr == null) return this.fail(`could not add ${type} ${i}`);
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
  finish(): boolean {
    if (DEBUG) console.log(`finish:\n${maze.show()}`);
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

  /** Returns all the possible positions along the given edge. */
  edges(dir: Dir): Pos[] {
    const other = dir & 2 ? (dir & 1 ? this.w - 1 : this.h - 1) : 0;
    if (dir & 1) return seq(this.h, y => (y << 4 | other) as Pos);
    return seq(this.w, x => (other << 4 | x) as Pos);
  }

  /** Returns a single random position along the given edge. */
  randomEdge(dir: Dir): Pos {
    const tile = this.random.nextInt(dir & 1 ? this.h : this.w);
    const other = dir & 2 ? (dir & 1 ? this.w - 1 : this.h - 1) : 0;
    return (dir & 1 ? tile << 4 | other : other << 4 | tile) as Pos;
  }

  retry(maze: Maze, f: () => boolean, tries: number): boolean {
    for (let i = 0; i < tries; i++) {
      if (maze.saveExcursion(f)) return true;
    }
    return false;
  }

  fail(msg: string): false {
    console.error(`Reroll: ${msg}`);
    if (DEBUG) console.log(this.out.show());
    return false;
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
    //console.log(maze.show());
    return true;
  }

  check(stage?: string, ...args: unknown[]): Ok {
    const traverse = this.out.traverse();
    const partitions = [...new Set(traverse.values())].map(s => s.size);
    if (partitions.length === 2 &&
      partitions[0] + partitions[1] === traverse.size &&
      partitions[0] > 2 && partitions[1] > 2) return;
    return stage ?
        Failure.of('Check failed after %s: partitions %s vs traverse %d',
                   Failure.of(stage, ...args), partitions, traverse.size) :
        Failure.of('Check failed: partitions %s vs traverse %d',
                   partitions, traverse.size);
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

class RiverCaveShuffle extends BasicCaveShuffle {

  // Setting up a viable rivier is really hard.
  // Possible ideas:
  //  1. start with full river coverage, anneal away tiles until we get the
  //     correct river density, then do land tiles the same way
  //     - issue: we don't get enough straight tiles that way
  //  2. use lines?  start w/ full vertical line rivers, disconnected
  //     then add random horizontal segments, discarding rivers above/below
  //     as necessary (shorter direction)
  //  3. fill in all bridges at the start, then randomly remove bridges
  //     or add outcroppings?
  //  4. a. draw an initial path from left to right
  //     b. add additional paths from there
  //     c. 1/4 or so chance of turning a path to help encourage straight
  //        segments
  //     d. spurs can come out of top/bottom of a straight or dead end
  //     e. 1/5 chance of ending a path?  or it runs into something...?
  //     f. paths can come any direction out of a dead end
  //     g. start w/ all bridges, remove randomly?

  landPartitions!: Array<Set<Pos>>;
  river!: Set<Pos>;

  addBridge = new Map([[0x0_3030, 0x1_3030],
                       [0x0_0303, 0x1_0303],
                       [0x0_0003, 0x1_0003],
                       [0x0_0300, 0x1_0300]]);

  removeBridge = new Map([
    [0x1_3030, [0, 8]],
    // Give extra weight to adding an outcropping
    [0x1_0303, [0, 2, 2, 2, 4, 4, 4, 8]],
    [0x1_0003, [0]],
    [0x1_0300, [0]],
  ]);

  stairScreens = new Map<Dir, readonly Scr[]>([
    [Dir.DOWN, [0x2_1000, 0x2_0010, 0x2_0001] as Scr[]],
    [Dir.UP, [0x2_1010, 0x1_1000, 0x1_0010, 0x2_0100] as Scr[]],
  ]);

  // notch: 0_0303 -> 2_ or 4_
  riverPathAlternatives = new Map([[0x0303 as Scr, [1]], [0x3030 as Scr, [1]]]);
  initialRiverAllowed = [0x1_0303, 0x1_3030,
                         0x0033, 0x0330, 0x3300, 0x3003] as Scr[];
  riverLoopAllowed = [0x1_0303, 0x1_3030, 0x1_0303, 0x1_3030,
                      0x8_0303, 0x8_3030, // also allow "broken" paths?
                      0x0033, 0x0330, 0x3300, 0x3003,
                      0x3033, 0x3330, 0x3333] as Scr[];

  // TODO - can this be used for waterfall cave (with a slight tweak since there
  // are no bridges? - detect this case and allow it?)
  tryShuffle(maze: Maze): boolean {
    this.landPartitions = [];
    this.river = new Set();

    // if (!this.retry(maze, () => this.initializeFixedScreens(maze), 5)) return false;
    // if (DEBUG) console.log(`Initialize fixed:\n${maze.show()}`);

    // I. send a river all the way across the map.
    if (!this.retry(maze, () => this.makeInitialRiver(maze), 5)) return false;
    if (DEBUG) console.log(`Initial river:\n${maze.show()}`);
    // II. make it a bit more interesting with some branches and loops.
    if (!this.retry(maze, () => this.branchRiver(maze), 5)) return false;
    if (DEBUG) console.log(`Branched river:\n${maze.show()}`);
    // III. add connections to land and fill the remainder of the map with land.
    // Make sure everything is still accessible.  Consider deleting any two-tile
    // segments that are otherwise inaccessible.
    if (!this.retry(maze, () => this.connectLand(maze), 3)) return false;
    if (DEBUG) console.log(`Connected land:\n${maze.show()}`);
    // IV. do some checks to make sure the entire map is accessible.
    // Then remove bridges and add blockages to reduce to a minimum accessibility.
    // Ensure we have fewer than the total available number of bridges left.
    if (!this.retry(maze, () => this.removeBridges(maze), 5)) return false;
    if (DEBUG) console.log(`Removed bridges:\n${maze.show(true)}`);
    // V. Distribute stairs across multiple partitions.
    if (!this.retry(maze, () => this.addStairs(maze), 3)) return false;
    if (DEBUG) console.log(`Added stairs:\n${maze.show()}`);
    // VI. perform the normal percolation on just the land tiles.
    for (const pos of this.river) this.fixed.add(pos);
    if (!this.refineMaze(maze)) return false;
    for (const pos of this.river) this.fixed.delete(pos);
    this.bridges = 0;
    if (!this.addFeatures(maze)) return false;
    if (DEBUG) console.log(`Features\n${maze.show()}\n${maze.show(true)}`);
    maze.fillAll({edge: 0});
    return this.finish(maze);
  }

  makeInitialRiver(maze: Maze): boolean {
    const leftY = this.random.nextInt(this.h - 2) + 1;
    const leftScr = (leftY < this.h / 2 ? 0x1_0300 : 0x1_0003) as Scr;
    const rightY = this.random.nextInt(this.h - 2) + 1;
    const rightScr = (rightY < this.h / 2 ? 0x1_0300 : 0x1_0003) as Scr;
    const left = (leftY << 4) as Pos;
    const right = (rightY << 4 | (this.w - 1)) as Pos;
    maze.set(left, leftScr);
    maze.set(right, rightScr);
    if (!maze.connect(left, null, right, null,
                      {allowed: this.initialRiverAllowed,
                       pathAlternatives: this.riverPathAlternatives})) {
      return false;
    }
    return true;
  }

  branchRiver(maze: Maze): boolean {
    // TODO - use survey and density to get a sense of when to stop?
    // How to know how many loops to add?
    const targetDensity = this.survey.rivers / this.w / this.h;
    for (let i = 0; i < 10 && maze.density() < targetDensity; i++) {
      // TODO - add spurs in addition to loops...
      if (maze.addLoop({allowed: this.riverLoopAllowed,
                        pathAlternatives: this.riverPathAlternatives})) {
        i = 0;
      }
    }
    for (const pos of this.allPos) {
      if (maze.get(pos)) this.river.add(pos);
    }
    return true;
  }

  connectLand(maze: Maze): boolean {
    // Add a bunch of land tiles, then try to add connections to each, or else
    // remove the connected segments.
    if (!this.initialFillMaze(maze)) return false;
    // At this point everything is disconnected.  For each partition, look for
    // a suitable connection point.
    const traversal = maze.traverse();
    const partitions = [...new Set(traversal.values())];
    NEXT_PARTITION:
    for (const partition of partitions) {
      const positions = new Set<Pos>();
      for (const spot of partition) {
        const pos = (spot >> 8) as Pos;
        // Skip the water partition.
        if (this.river.has(pos)) continue NEXT_PARTITION;
        // Otherwise add stuff.
        positions.add(pos);
        if (!(spot & 0x0f)) { // e.g. 2310 - on the left edge -> so (2,3) and (2,2)
          positions.add((pos - 1) as Pos);
        } else if (!(spot & 0xf0)) {
          positions.add((pos - 16) as Pos);
        }
      }
      this.landPartitions.push(positions);
      // We now have the set of all pos in this partition.  Find a neighbor that's
      // water and try to connect.
      let found = false;
      for (const pos of this.random.ishuffle([...positions])) {
        for (const dir of Dir.ALL) {
          const pos1 = Pos.plus(pos, dir);
          const river = maze.get(pos1)! & 0xffff;
          if (river !== (dir & 1 ? 0x0303 : 0x3030)) continue;
          //const riverAdj = 1 << ((dir ^ 2) << 2);
          const landAdj = 1 << (dir << 2);
          //maze.setAndUpdate(pos1, (river | riverAdj) as Scr, {force: true});
          maze.setAndUpdate(pos, (maze.get(pos)! | landAdj) as Scr, {replace: true});
          found = true;
          if (this.random.nextInt(2)) break; // maybe add another connection?
          continue NEXT_PARTITION;
        }
      }
      // Failed to connect.  If it's tiny (2 or less) then delete, else fail.
      if (found) continue NEXT_PARTITION;
      if (positions.size > 2) return false;
      for (const pos of positions) {
        maze.delete(pos);
        this.landPartitions.pop();
      }
    }
    return this.check(maze);
  }

  removeBridges(maze: Maze): boolean {
    // Basic plan: take out as many bridges as we can until the map is no longer
    // traversible.
    for (const pos of this.random.ishuffle([...this.river])) {
      const scr = maze.get(pos);
      if (scr == null) throw new Error(`expected a screen at ${hex(pos)}`);
      for (const opt of this.random.ishuffle(this.removeBridge.get(scr) || [])) {
        const success = maze.saveExcursion(() => {
          maze.replace(pos, (scr & 0xffff | opt << 16) as Scr);
          return this.check(maze);
        });
        if (success) break; // don't try any other options
      }
    }
    // Count bridges, make sure we don't still have too many!
    const bridges = iters.count(iters.filter(this.river, pos => {
      const wall = maze.getSpec(pos)!.wall;
      return wall ? wall.type === 'bridge' : false;
    }));
    return bridges <= this.survey.bridges;
  }

  addStairs(maze: Maze): boolean {
    // First make sure there's no edges.
    if (this.survey.edges.size) throw new Error(`Unexpected edge: ${this.survey.edges}`);
    // Add any fixed screens.
    OUTER:
    for (const spec of this.survey.fixed.values()) {
      for (const pos of this.random.ishuffle(this.allPos)) {
        if (this.fixed.has(pos) || this.river.has(pos)) continue;
        const ok = maze.saveExcursion(() => {
          const opts = {replace: true, skipAlternates: true};
          return maze.setAndUpdate(pos, spec.edges, opts) && this.check(maze);
        });
        if (!ok) continue;
        this.fixed.add(pos);
        continue OUTER;
      }
      return this.fail(`Could not place fixed screen ${hex(spec.edges)}`);
    }
    // TODO - Also add any other fixed screens...?
    // NOTE - will need to clear out some space for $91 - 0x0_7176
    //      - might be tricky...?  maybe should do that first?

    const posToPartition = new Map<Pos, Set<Pos>>();
    for (const partition of this.landPartitions) {
      for (const pos of partition) {
        posToPartition.set(pos, partition);
      }
    }

    // Now try to pick spots for stairs.
    const stairs = [...this.survey.stairs];
    const seen = new Set<Set<Pos>>();
    for (const pos of this.random.ishuffle([...posToPartition.keys()])) {
      if (!stairs.length) break;
      const partition = posToPartition.get(pos)!;
      if (seen.has(partition)) continue;
      if (this.fixed.has(pos)) continue;
      for (const stairScr of this.stairScreens.get(stairs[0][1].dir)!) {
        const ok = maze.saveExcursion(() => {
          // TODO - what are all the eligible stairs for the given spec?!?
          const opts = {replace: true, skipAlternates: true};
          return maze.setAndUpdate(pos, stairScr, opts) && this.check(maze);
        });
        if (!ok) continue;
        stairs.shift()!;
        this.fixed.add(pos);
        seen.add(partition);
        break;
      }
    }

    // NEXT_PARTITION:
    // for (const partition of this.random.ishuffle(this.landPartitions)) {
    //   if (!stairs.length) break;
    //   for (const pos of this.random.ishuffle([...partition])) {
    //     if (this.fixed.has(pos)) continue;
    //     for (const stairScr of this.stairScreens.get(stairs[0][1].dir)!) {
    //       const ok = maze.saveExcursion(() => {
    //         // TODO - what are all the eligible stairs for the given spec?!?
    //         const opts = {replace: true, skipAlternates: true};
    //         return maze.setAndUpdate(pos, stairScr, opts) && this.check(maze);
    //       });
    //       if (!ok) continue;
    //       stairs.shift()!;
    //       this.fixed.add(pos);
    //       continue NEXT_PARTITION;
    //     }
    //   }
    // }

    if (stairs.length) return false;
    return true;
  }
}

class EvilSpiritRiverCaveShuffle_old extends BasicCaveShuffle {

  // Setting up a viable rivier is really hard.
  // Possible ideas:
  //  1. start with full river coverage, anneal away tiles until we get the
  //     correct river density, then do land tiles the same way
  //     - issue: we don't get enough straight tiles that way
  //  2. use lines?  start w/ full vertical line rivers, disconnected
  //     then add random horizontal segments, discarding rivers above/below
  //     as necessary (shorter direction)
  //  3. fill in all bridges at the start, then randomly remove bridges
  //     or add outcroppings?
  //  4. a. draw an initial path from left to right
  //     b. add additional paths from there
  //     c. 1/4 or so chance of turning a path to help encourage straight
  //        segments
  //     d. spurs can come out of top/bottom of a straight or dead end
  //     e. 1/5 chance of ending a path?  or it runs into something...?
  //     f. paths can come any direction out of a dead end
  //     g. start w/ all bridges, remove randomly?


  phase!: 'river' | 'cave';
  fixedRiver!: Set<Pos>;

  goodScrs = new Set([0x0003, 0x0030, 0x0300, 0x3000,
                      0x0033, 0x0303, 0x3003, 0x0330, 0x3030, 0x3300,
                      0x3033, 0x3330, 0x3333]) as Set<Scr>;
  badScrs = new Set([0x3303, 0x0303]) as Set<Scr>;

  initializeFixedScreens(maze: Maze): boolean {
    // Basic plan: do two full rounds of shuffle.
    // First round is low-density just for river tiles.
    this.density = this.survey.rivers / this.w / this.h;
    this.phase = 'river';
    this.fixedRiver = new Set();

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
    //console.log(`REFINEMENT:\n${maze.show()}`);

    // Find any remaining "fake" tiles and add dead-ends at least
    for (const pos of this.allPos) {
      const scr = maze.get(pos);
      if (!scr) continue;
      const dir = scr === 0x3303 ? Dir.LEFT : scr === 0x0333 ? Dir.RIGHT : null;
      if (dir != null) {
        const pos1 = Pos.plus(pos, dir);
        const scr1 = maze.get(pos1);
        if (scr1) return false;
        maze.replace(pos1, (scr ^ 0x3333) as Scr);
      }
    }

    // Delete all the blanks
    for (const pos of this.allPos) {
      if (!maze.get(pos)) {
        maze.delete(pos);
      } else {
        this.fixed.add(pos);
      }
    }

    // Find all the possible connections between river and land.
    for (const pos of this.allPos) {
      const scr = maze.get(pos);
      if (!scr) continue;
      // Can only augment straight paths
      if (scr !== ((scr << 8 | scr >> 8) & 0xffff)) continue;
      // Pick one of the two directions to add a land path
      const aug = (scr << 4 | scr >> 4) & this.random.pick([0x1100, 0x0011]);
      const scr1 = (scr | aug) as Scr;
      maze.saveExcursion(() => maze.setAndUpdate(pos, scr1));
    }    

    //console.log(`CONNECTED:\n${maze.show()}`);

    
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

  postRefine(maze: Maze, pos: Pos) {
    //let bad = 0;
    //let fixed = 0;
    //console.log(`postRefine ${pos.toString(16)}\n${maze.show()}`);
    if (this.phase !== 'river') return;
    // If any neighbors were made into fake tiles, then try to delete an
    // edge to bring them back to non-fake.
    for (const dir of Dir.ALL) {
      const scr = maze.get(pos, dir);
      if (scr != null && this.badScrs.has(scr)) {
        //bad++;
        /*if (*/maze.saveExcursion(
            () => maze.tryConsolidate(
                Pos.plus(pos, dir),
                this.goodScrs,
                this.badScrs,
                () => this.check(maze)));//) fixed++;
      }
    }
    //if (fixed) console.log(`postRefine bad ${bad} fixed ${fixed}\n${maze.show()}`);
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

        if (x === 0) tile &= 0x0fff;
        if (x === this.w - 1) tile &= 0xff0f;

        // const loop = y > 0 && (maze.get((pos - 16) as Pos)! & 0x0f00) != 0;
        // if (x === 0) {
        //   if (loop) {
        //     tile = 0x0033;
        //   } else {
        //     tile = y < this.h - 1 && this.random.nextInt(2) ? 0x0330 : 0x0030;
        //   }
        // } else if (x === this.w - 1) {
        //   if (loop) {
        //     tile = 0x3003;
        //   } else {
        //     tile = y < this.h - 1 && this.random.nextInt(2) ? 0x3300 : 0x3000;
        //   }
        // }

        maze.set(pos, tile as Scr);
      }
    }
    // Pick a few tiles on opposite edges to mark as fixed.
    // Make sure to pick non-fake tiles, for better results.
    // const turns = new Set([0x0033, 0x0330, 0x3300, 0x3003]) as Set<Scr>;

    // TODO - randomly make a vertical river instead of horizontal?
    for (const x of [0, this.w - 1]) {
      for (const y of this.random.ishuffle(seq(this.h - 3, y => y + 2))) {
        const pos = (y << 4 | x) as Pos;
        // const scr = maze.get(pos);
        // if (scr && turns.has(scr)) {
          this.fixed.add(pos);
          //this.fixed.add(pos - 16 as Pos);
          this.fixedRiver.add(pos);
          //this.fixedRiver.add(pos - 16 as Pos);
          if (this.random.nextInt(2)) break;
        // }
      }
    }
    return true;
  }

  check(maze: Maze): boolean {
    if (this.phase === 'cave') return super.check(maze);
    // River check involves just ensuring everything is reachable by flight?
    // But we don't have that for now...

    if ([...this.fixedRiver].some(pos => !maze.get(pos))) return false;
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
const [] = [EvilSpiritRiverCaveShuffle_old];

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
  [0x69, RiverCaveShuffle],
  [0x84, WideCaveShuffle],
  [0xab, RiverCaveShuffle],
]);

export function shuffleCave(loc: Location, random: Random): void {
  new (STRATEGIES.get(loc.id) || BasicCaveShuffle)(loc, random).shuffle();
}

const DELTA = [-16, -1, 16, 1];
