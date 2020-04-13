import { CaveShuffleAttempt, CaveShuffle } from './cave.js';
import { Random } from '../random.js';
import { Location } from '../rom/location.js';
import { Survey } from './maze.js';
import { Pos, Metalocation } from '../rom/metalocation.js';
import { GridCoord, coordToPos } from './grid.js';

// Basic idea: Overpass runs underpass first.
// Underpass saves its result, is read by overpass attempt.
// TODO - the current setup is O(n^2) attempts; we could switch to an
//        intersection where both attempts need to pass at the same time.

export class OverpassShuffle extends CaveShuffle {

  under!: UnderpassShuffle;
  fixedExits?: Map<number, Pos>;

  constructor(readonly underpass: number) { super(); }

  shuffle(loc: Location, random: Random) {
    this.under = new UnderpassShuffle(loc);
    this.under.shuffle(loc.rom.locations[this.underpass], random);
    super.shuffle(loc, random);
  }

  attempt(height: number, width: number,
          survey: Survey, random: Random): OverpassShuffleAttempt {
    return new OverpassShuffleAttempt(height, width, survey, random,
                                      this.under);
  }

  finish(loc: Location, newMeta: Metalocation, random: Random) {
    this.fixedExits = new Map([[this.underpass, this.under.downStair!]]);
    super.finish(loc, newMeta, random);

    // // Check that the exit is correct.  If not, swap with one.
    // const exit = newMeta.getExit(this.under.downStair!, 'stair:down');
    // if (!exit) throw new Error(`no downstair at ${hex(this.under.downStair!)}`);
    // if (exit[0] !== this.underpass) {
    //   let found = false;
    //   for (const pos of newMeta.allPos()) {
    //     if (pos === this.under.downStair) continue;
    //     const other = newMeta.getExit(pos, 'stair:down');
    //     if (!other) continue;
    //     newMeta.moveExits([pos, 'stair:down', exit[0], exit[1]],
    //                       [this.under.downStair!, 'stair:down',
    //                        other[0], other[1]]);
    //   }
    //   if (!found) throw new Error(`could not find downstair to swap with`);
    // }

    // Finish up the underpass map
    this.under.actualFinish!();
  }

  getFixedExits() { return this.fixedExits; }
}

class OverpassShuffleAttempt extends CaveShuffleAttempt {

  constructor(height: number, width: number, params: Survey, random: Random,
              readonly underpass: UnderpassShuffle) {
    super(height, width, subtractDownStair(params), random);
  }


  // TODO - seems broken - does it need to be based on other map?
  // Consider not finalizing any of the shuffles until after all
  // maps are done??  then we can access all the prior shuffles and
  // mark it as a dep and/or invalidate it to try again?

  addEarlyFeatures(): boolean {
    if (!super.addEarlyFeatures()) return false;
//if(this.params.id===5)debugger;
    // Add in the bridge and the stair.
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.grid.get2(y + .5, x + .5) === 'b') {
          const pos = (y << 4 | x) + this.underpass.delta!;
          const sy = pos >>> 4;
          const sx = pos & 0xf;
          const i = this.grid.index2(sy + .5, sx + .5);
          if (this.grid.data[i] !== 'c') return false;
          const c = this.grid.coord(i);
          this.fixed.add(c);
          this.underpass.downStair = coordToPos(c);
          this.grid.data[i] = '>';
          this.grid.data[i + this.grid.row] = '';
          // Pick a single direction for the stair.
          let neighbors = [c - 8, c + 8, c - 0x800] as GridCoord[];
          // NOTE: if we delete then we forget to zero it out...
          // if (this.delta < -16) neighbors.splice(2, 1);
          // if ((this.delta & 0xf) < 8) neighbors.splice(1, 1);
          neighbors = neighbors.filter(c => this.grid.get(c) === 'c');
          if (!neighbors.length) return false;
          const keep = this.random.nextInt(neighbors.length);
          for (let j = 0; j < neighbors.length; j++) {
            if (j !== keep) this.grid.set(neighbors[j], '');
          }
          return true;
        }
      }
    }
    throw new Error(`never found the bridge:\n${this.grid.show()}`);
  }

  // addOverpasses() {
  //   return true;
  // }
}

function subtractDownStair(params: Survey): Survey {
  const {stairs: [...stairs] = []} = params;
  stairs[1]--;
  return {...params, stairs}
}

class UnderpassShuffle extends CaveShuffle {

  actualFinish?: () => void;
  delta?: number; // stair - bridge  TODO - switch direction for multiple bridges!
  downStair?: Pos; // filled in OverpassShuffleAttempt
  upStair?: Pos;

  fixedExits?: Map<number, Pos>;

  constructor(readonly overpass: Location) { super(); }

  finish(loc: Location, newMeta: Metalocation, random: Random) {

    let bridge, stair: Pos|undefined;
    for (const pos of random.ishuffle(newMeta.allPos())) {
      const scr = newMeta.get(pos);
      if (scr.hasFeature('underpass')) bridge = pos;
      if (scr.hasFeature('stair:up')) stair = pos;
      // const exit = newMeta.getExit(pos, 'stair:up');
      // if ((exit && (exit[0] >>> 8)) === this.overpass.id) stair = pos;
    }
    // http://localhost:8082/#flags=DsErsGtRostWm&seed=b63c4b02&debug
    if (bridge == null) {
      throw new Error(`Expected bridge in ${loc}\n${newMeta.show()}`);
    }
    if (stair == null) {
      throw new Error(`Expected stair in ${loc}\n${newMeta.show()}`);
    }
    this.fixedExits = new Map([[this.overpass.id, stair]]);

    this.delta = stair - bridge;
    this.actualFinish = () => {
      super.finish(loc, newMeta, random);
    };
  }

  // TODO - consider instead pickExitForPos(pos: Pos, oldLoc: Metalocation)
  // that we can change the logic for, and call super().
  getFixedExits() { return this.fixedExits; }
}
