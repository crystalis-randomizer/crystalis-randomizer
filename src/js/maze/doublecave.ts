import { CaveShuffleAttempt, CaveShuffle } from './cave.js';
import { GridCoord, coordToPos } from './grid.js';
import { Random } from '../random.js';
import { Location } from '../rom/location.js';
import { Pos, Metalocation } from '../rom/metalocation.js';
import { iters } from '../util.js';
import { Result, OK } from './maze.js';

// Basic idea: Overpass runs underpass first.
// Underpass saves its result, is read by overpass attempt.
// TODO - the current setup is O(n^2) attempts; we could switch to an
//        intersection where both attempts need to pass at the same time.

type A = CaveShuffleAttempt;

export class BridgeCaveShuffle {
  over: OverpassShuffle;
  under: UnderpassShuffle;
  constructor(readonly overpass: Location, readonly underpass: Location,
              reverse = false) {
    this.under = new UnderpassShuffle(underpass, overpass, reverse);
    this.over = new OverpassShuffle(overpass, this.under, reverse);
  }

  shuffle(random: Random) {
    while (this.under.attempts < this.under.maxAttempts) {
      this.under.finished = undefined;
      this.under.shuffle(random);
      if (!this.under.finished) return; // no dice
      this.over.maxAttempts = this.under.attempts;
      this.over.shuffle(random);
      if (this.over.finished) {
        this.over.actuallyFinish();
        this.under.actuallyFinish();
        return; // success
      }
    }
  }
}

class DoubleShuffle extends CaveShuffle {
  finished?: Metalocation;
  finish(meta: Metalocation) {
    this.finished = meta;
  }
  actuallyFinish() {
    super.finish(this.finished!);
  }
}

class OverpassShuffle extends DoubleShuffle {

  constructor(readonly location: Location, readonly under: UnderpassShuffle,
              readonly reverse: boolean) { super(location); }

  init() {
    // start fresh
    this.under.downStairs = [];
  }

  actualFinish() {
    // Attach the stairs.  newMeta is the overpass.
    for (const [up, down] of iters.zip(this.under.upStairs,
                                       this.under.downStairs)) {
      this.finished!.attach(down, this.under.finished!, up);
    }
  }

  addEarlyFeatures(a: A): Result<void> {
    const result = super.addEarlyFeatures(a);
    if (!result.ok) return result;
//if(this.params.id===5)debugger;
    // Find the bridge that was added.
    let xMin = 16;
    let xMax = 0
    let yMin = 16;
    let yMax = 0;

    // Bracket the whole thing to ensure the placements are even feasible.
    let bridge = 1;
    for (const pos of [...this.under.underBridges,
                       -1,
                       ...this.under.upStairs]) {
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
      const x = this.random.nextInt(a.w - (xMax - xMin)) + xMin;
      const y = this.random.nextInt(a.h - (yMax - yMin)) + yMin;
      const delta = (y - yMin) << 4 + (x - xMin);
      for (const bridge of this.under.underBridges) {
        const pos = bridge + delta;
        const sy = pos >>> 4;
        const sx = pos & 0xf;
        const c = (sy << 12 | sx << 4 | 0x808) as GridCoord;
        if (a.grid.get(c) !== 'c') continue OUTER; // out of bounds.
        mods.push([c, 'b']);
        mods.push([c - 8 as GridCoord, '']);
        mods.push([c + 8 as GridCoord, '']);
      }
      for (const stair of this.under.upStairsEffective) {
        const pos = stair + delta;
        const sy = pos >>> 4;
        const sx = pos & 0xf;
        const c = (sy << 12 | sx << 4 | 0x808) as GridCoord;
        if (a.grid.get(c) !== 'c') continue OUTER;
        mods.push([c, this.reverse ? '<' : '>']);
        mods.push([c + (this.reverse ? -0x800 : 0x800) as GridCoord, '']);
        // Pick a single direction for the stair.
        // NOTE: if we delete then we forget to zero it out...
        // But it would still be nice to "point" them in the easy direction?
        // if (this.delta < -16) neighbors.splice(2, 1);
        // if ((this.delta & 0xf) < 8) neighbors.splice(1, 1);
        const stairMods = this.addEarlyStair(a, c, this.reverse ? '<' : '>');
        if (!stairMods.length) continue OUTER;
        mods.push(...stairMods);
      }

      for (const [c, v] of mods) {
        if (v) a.fixed.add(c);
        if (v === '<' || v === '>') {
          this.under.downStairs.push(coordToPos(c));
        }
        a.grid.set(c, v);
      }
      return OK;
    }
    return {ok: false, fail: 'add fixed stairs with early features'};
  }

  addStairs(a: A, up = 0, down = 0): Result<void> {
    if (this.reverse) {
      return super.addStairs(a, up - this.under.upStairs.length, down);
    }
    return super.addStairs(a, up, down - this.under.upStairs.length);
  }

  addOverpasses() {
    return true;
  }

  // Expected to have several failures
  overpassFailure() {}
}

class UnderpassShuffle extends DoubleShuffle {

  // These are filled in by this.finish
  underBridges: Pos[] = [];
  upStairs: Pos[] = [];
  upStairsEffective: Pos[] = []; // for matching purposes, shift some stairs.
  // These are filled in by OverpassShuffleAttempt
  downStairs: Pos[] = [];

  constructor(readonly loc: Location, readonly overpass: Location,
              readonly reverse: boolean) { super(loc); }

  init() {
    this.underBridges = [];
    this.upStairs = [];
    this.upStairsEffective = [];
  }

  finish(newMeta: Metalocation) {
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
      throw new Error(`Expected bridge in ${this.loc}\n${newMeta.show()}`);
    }
    if (!this.upStairs.length) {
      throw new Error(`Expected stair in ${this.loc}\n${newMeta.show()}`);
    }

    let stairsLen = 0;
    for (const [, type, [dest]] of this.orig.exits()) {
      if (type === upStair && (dest >>> 8) === this.overpass.id) stairsLen++;
    }
    this.upStairs = this.random.shuffle(this.upStairs).slice(0, stairsLen);

    super.finish(newMeta);
  }

  // TODO - consider instead pickExitForPos(pos: Pos, oldLoc: Metalocation)
  // that we can change the logic for, and call super().
}


//// OVERPASS:
  // addEarlyFeatures_old(): boolean {
  //   if (!super.addEarlyFeatures()) return false;
  //   let delta: Pos|undefined;
  //   for (let y = 0; y < this.h; y++) {
  //     for (let x = 0; x < this.w; x++) {
  //       if (this.grid.get2(y + .5, x + .5) === 'b') {
  //         delta = (y << 4 | x) as Pos - this.underpass.underBridges[0];
  //         break;
  //       }
  //     }
  //     if (delta != null) break;
  //   }
  //   if (delta == null) throw new Error(`Never found the first overpass`);

  //   // Add the remaining bridges and stairs.
  //   for (const bridge of this.underpass.underBridges.slice(1)) {
  //     const pos = bridge + delta;
  //     const sy = pos >>> 4;
  //     const sx = pos & 0xf;
  //     const i = this.grid.index2(sy + .5, sx + .5);
  //     if (this.grid.data[i] !== 'c') return false; // out of bounds.
  //     const c = this.grid.coord(i);
  //     this.fixed.add(c);
  //     this.grid.data[i] = 'b';
  //     this.grid.data[i - 1] = '';
  //     this.grid.data[i + 1] = '';
  //   }
  //   for (const stair of this.underpass.upStairsEffective) {
  //     const pos = stair + delta;
  //     const sy = pos >>> 4;
  //     const sx = pos & 0xf;
  //     const i = this.grid.index2(sy + .5, sx + .5);
  //     if (this.grid.data[i] !== 'c') return false;
  //     const c = this.grid.coord(i);
  //     this.fixed.add(c);
  //     this.underpass.downStairs.push(coordToPos(c));
  //     this.grid.data[i] = this.reverse ? '<' : '>';
  //     this.grid.data[i + this.grid.row] = '';
  //     // Pick a single direction for the stair.
  //     let neighbors = [c - 8, c + 8, c - 0x800] as GridCoord[];
  //     // NOTE: if we delete then we forget to zero it out...
  //     // if (this.delta < -16) neighbors.splice(2, 1);
  //     // if ((this.delta & 0xf) < 8) neighbors.splice(1, 1);
  //     neighbors = neighbors.filter(c => this.grid.get(c) === 'c');
  //     if (!neighbors.length) return false;
  //     const keep = this.random.nextInt(neighbors.length);
  //     for (let j = 0; j < neighbors.length; j++) {
  //       if (j !== keep) this.grid.set(neighbors[j], '');
  //     }
  //   }
  //   return true;
  // }
