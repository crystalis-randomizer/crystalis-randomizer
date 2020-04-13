import { CaveShuffleAttempt, CaveShuffle } from './cave.js';
import { GridCoord, coordToPos } from './grid.js';
import { Survey } from './maze.js';
import { Random } from '../random.js';
import { Location } from '../rom/location.js';
import { Pos, Metalocation } from '../rom/metalocation.js';
import { iters } from '../util.js';

// Basic idea: Overpass runs underpass first.
// Underpass saves its result, is read by overpass attempt.
// TODO - the current setup is O(n^2) attempts; we could switch to an
//        intersection where both attempts need to pass at the same time.

export class OverpassShuffle extends CaveShuffle {

  maxAttempts = 1000;
  under!: UnderpassShuffle;

  constructor(readonly underpass: number, readonly reverse = false) { super(); }

  shuffle(loc: Location, random: Random) {
    this.under = new UnderpassShuffle(loc, this.reverse);
    this.under.shuffle(loc.rom.locations[this.underpass], random);
    super.shuffle(loc, random);
  }

  attempt(height: number, width: number,
          survey: Survey, random: Random): OverpassShuffleAttempt {
    this.under.downStairs = [];
    return new OverpassShuffleAttempt(height, width, survey, random,
                                      this.under, this.reverse);
  }

  finish(loc: Location, newMeta: Metalocation, random: Random) {
    const under = this.under;
    //this.fixedExits = new Map([[this.underpass, this.under.downStair!]]);
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
    under.actualFinish!();

    // Attach the stairs.  newMeta is the overpass.
    for (const [up, down] of iters.zip(under.upStairs, under.downStairs)) {
      newMeta.attach(down, under.meta!, up);
    }
  }
}

class OverpassShuffleAttempt extends CaveShuffleAttempt {

  constructor(height: number, width: number, params: Survey, random: Random,
              readonly underpass: UnderpassShuffle, readonly reverse: boolean) {
    super(height, width, params, random);
  }

  // build() {
  //   const result = super.build();
  //   if (result) return result + '\n' + this.grid.show();
  //   return '';
  // }

  // Consider not finalizing any of the shuffles until after all
  // maps are done??  then we can access all the prior shuffles and
  // mark it as a dep and/or invalidate it to try again?

  // Basic idea: we've added a *single* overpass.  Add more overpasses and
  // stairs to fit.

  addEarlyFeatures(): boolean {
    if (!super.addEarlyFeatures()) return false;
//if(this.params.id===5)debugger;
    // Find the bridge that was added.
    let xMin = 16;
    let xMax = 0
    let yMin = 16;
    let yMax = 0;

    // Bracket the whole thing to ensure the placements are even feasible.
    let bridge = 1;
    for (const pos of [...this.underpass.underBridges,
                       -1,
                       ...this.underpass.upStairs]) {
      if (pos === -1) {
        bridge = 0;
        continue;
      }
      const y = pos >>> 4;
      const x = pos & 0xf;
      xMin = Math.min(x, xMin);
      xMax = Math.max(x, xMax);
      yMin = Math.min(y - bridge, yMin);
      yMax = Math.max(y + bridge, yMax);
    }

    OUTER:
    for (let attempt = 0; attempt < 10; attempt++) {
      const mods: Array<[GridCoord, string]> = [];
      const x = this.random.nextInt(this.w - (xMax - xMin)) + xMin;
      const y = this.random.nextInt(this.h - (yMax - yMin)) + yMin;
      const delta = (y - yMin) << 4 + (x - xMin);
      for (const bridge of this.underpass.underBridges) {
        const pos = bridge + delta;
        const sy = pos >>> 4;
        const sx = pos & 0xf;
        const c = (sy << 12 | sx << 4 | 0x808) as GridCoord;
        if (this.grid.get(c) !== 'c') continue OUTER; // out of bounds.
        mods.push([c, 'b']);
        mods.push([c - 8 as GridCoord, '']);
        mods.push([c + 8 as GridCoord, '']);
      }
      for (const stair of this.underpass.upStairsEffective) {
        const pos = stair + delta;
        const sy = pos >>> 4;
        const sx = pos & 0xf;
        const c = (sy << 12 | sx << 4 | 0x808) as GridCoord;
        if (this.grid.get(c) !== 'c') continue OUTER;
        mods.push([c, this.reverse ? '<' : '>']);
        mods.push([c + (this.reverse ? -0x800 : 0x800) as GridCoord, '']);
        // Pick a single direction for the stair.
        let neighbors = [c - 8, c + 8, c - 0x800] as GridCoord[];
        // NOTE: if we delete then we forget to zero it out...
        // But it would still be nice to "point" them in the easy direction?
        // if (this.delta < -16) neighbors.splice(2, 1);
        // if ((this.delta & 0xf) < 8) neighbors.splice(1, 1);
        neighbors = neighbors.filter(c => this.grid.get(c) === 'c');
        if (!neighbors.length) continue OUTER;
        const keep = this.random.nextInt(neighbors.length);
        for (let j = 0; j < neighbors.length; j++) {
          if (j !== keep) mods.push([neighbors[j], '']);
        }
      }

      for (const [c, v] of mods) {
        if (v) this.fixed.add(c);
        if (v === '<' || v === '>') {
          this.underpass.downStairs.push(coordToPos(c));
        }
        this.grid.set(c, v);
      }
      return true;
    }
    return false;
  }


  addEarlyFeatures_old(): boolean {
    if (!super.addEarlyFeatures()) return false;
    let delta: Pos|undefined;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.grid.get2(y + .5, x + .5) === 'b') {
          delta = (y << 4 | x) as Pos - this.underpass.underBridges[0];
          break;
        }
      }
      if (delta != null) break;
    }
    if (delta == null) throw new Error(`Never found the first overpass`);

    // Add the remaining bridges and stairs.
    for (const bridge of this.underpass.underBridges.slice(1)) {
      const pos = bridge + delta;
      const sy = pos >>> 4;
      const sx = pos & 0xf;
      const i = this.grid.index2(sy + .5, sx + .5);
      if (this.grid.data[i] !== 'c') return false; // out of bounds.
      const c = this.grid.coord(i);
      this.fixed.add(c);
      this.grid.data[i] = 'b';
      this.grid.data[i - 1] = '';
      this.grid.data[i + 1] = '';
    }
    for (const stair of this.underpass.upStairsEffective) {
      const pos = stair + delta;
      const sy = pos >>> 4;
      const sx = pos & 0xf;
      const i = this.grid.index2(sy + .5, sx + .5);
      if (this.grid.data[i] !== 'c') return false;
      const c = this.grid.coord(i);
      this.fixed.add(c);
      this.underpass.downStairs.push(coordToPos(c));
      this.grid.data[i] = this.reverse ? '<' : '>';
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
    }
    return true;
  }

  addStairs(up = 0, down = 0): boolean {
    if (this.reverse) {
      return super.addStairs(up - this.underpass.upStairs.length, down);
    }
    return super.addStairs(up, down - this.underpass.upStairs.length);
  }

  addOverpasses() {
    return true;
  }
}

class UnderpassShuffle extends CaveShuffle {

  actualFinish?: () => void;
  // These are filled in by this.finish
  underBridges: Pos[] = [];
  upStairs: Pos[] = [];
  upStairsEffective: Pos[] = []; // for matching purposes, shift some stairs.
  meta?: Metalocation;
  // These are filled in by OverpassShuffleAttempt
  downStairs: Pos[] = [];

  constructor(readonly overpass: Location,
              readonly reverse: boolean) { super(); }

  finish(loc: Location, newMeta: Metalocation, random: Random) {
    const upStair = this.reverse ? 'stair:down' : 'stair:up';
    for (const pos of newMeta.allPos()) {
      const scr = newMeta.get(pos);
      if (scr.hasFeature('underpass')) this.underBridges.push(pos);
      if (scr.hasFeature(upStair)) {
        let delta = 0;
        for (const exit of scr.data.exits!) {
          // "Effective" pos is shifted up or down one for non-double stairs
          if (exit.type === 'stair:up' && exit.entrance < 0x8000) delta = -16;
          if (exit.type === 'stair:down' && exit.entrance > 0x8000) delta = 16;
        }
        this.upStairsEffective.push(pos + delta);
        this.upStairs.push(pos);
      }
      // const exit = newMeta.getExit(pos, 'stair:up');
      // if ((exit && (exit[0] >>> 8)) === this.overpass.id) stair = pos;
    }
    // http://localhost:8082/#flags=DsErsGtRostWm&seed=b63c4b02&debug
    if (!this.underBridges.length) {
      throw new Error(`Expected bridge in ${loc}\n${newMeta.show()}`);
    }
    if (!this.upStairs.length) {
      throw new Error(`Expected stair in ${loc}\n${newMeta.show()}`);
    }

    let stairsLen = 0;
    for (const [, type, [dest]] of loc.meta.exits()) {
      if (type === upStair && (dest >>> 8) === this.overpass.id) stairsLen++;
    }
    this.upStairs = random.shuffle(this.upStairs).slice(0, stairsLen);
    this.meta = newMeta;

    this.actualFinish = () => {
      super.finish(loc, newMeta, random);
    };
  }

  // TODO - consider instead pickExitForPos(pos: Pos, oldLoc: Metalocation)
  // that we can change the logic for, and call super().
}
