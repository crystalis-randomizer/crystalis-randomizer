import { CaveShuffle } from './cave';
import { GridCoord, coordToPos } from './grid';
import { Location } from '../rom/location';
import { Pos } from '../rom/metalocation';
import { iters } from '../util';
import { Result, OK } from './maze';

// Basic idea: Overpass runs underpass first.
// Underpass saves its result, is read by overpass attempt.
// TODO - the current setup is O(n^2) attempts; we could switch to an
//        intersection where both attempts need to pass at the same time.

export function bridgeCaveShuffle(underpass: Location,
                              overpass: Location,
                              reverse = false): CaveShuffle[] {
  const under = new UnderpassShuffle(underpass, overpass, reverse);
  const over = new OverpassShuffle(overpass, under, reverse);
  return [under, over];
}


class OverpassShuffle extends CaveShuffle {

  downStairs: Pos[] = [];

  constructor(readonly location: Location, readonly under: UnderpassShuffle,
              readonly reverse: boolean) { super(location); }

  init() {
    // start fresh
    this.downStairs = [];
  }

  build(): Result<void> {
    if (this.under.attempt < this.attempt) {
      this.under.meta = undefined;
      this.under.shuffle(this.random);
      if (!this.under.meta) return {ok: false, fail: `dependent failed`};
    }
    return super.build();
  }

  finishInternal() {
    if (!this.meta || !this.under.meta) throw new Error(`impossible`);
    this.under.finish();
    super.finishInternal();
    // Attach the stairs.  newMeta is the overpass.
    for (const [up, down] of iters.zip(this.under.upStairs,
                                       this.downStairs)) {
      this.meta.attach(down, this.under.meta, up);
    }
  }

  addEarlyFeatures(): Result<void> {
    const result = super.addEarlyFeatures();
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
      const x = this.random.nextInt(this.w - (xMax - xMin)) + xMin;
      const y = this.random.nextInt(this.h - (yMax - yMin)) + yMin;
      const delta = (y - yMin) << 4 + (x - xMin);
      for (const bridge of this.under.underBridges) {
        const pos = bridge + delta;
        const sy = pos >>> 4;
        const sx = pos & 0xf;
        const c = (sy << 12 | sx << 4 | 0x808) as GridCoord;
        if (this.grid.get(c) !== 'c') continue OUTER; // out of bounds.
        mods.push([c, 'b']);
        mods.push([c - 8 as GridCoord, '']);
        mods.push([c + 8 as GridCoord, '']);
      }
      for (const stair of this.under.upStairsEffective) {
        const pos = stair + delta;
        const sy = pos >>> 4;
        const sx = pos & 0xf;
        const c = (sy << 12 | sx << 4 | 0x808) as GridCoord;
        if (this.grid.get(c) !== 'c') continue OUTER;
        mods.push([c, this.reverse ? '<' : '>']);
        mods.push([c + (this.reverse ? -0x800 : 0x800) as GridCoord, '']);
        // Pick a single direction for the stair.
        // NOTE: if we delete then we forget to zero it out...
        // But it would still be nice to "point" them in the easy direction?
        // if (this.delta < -16) neighbors.splice(2, 1);
        // if ((this.delta & 0xf) < 8) neighbors.splice(1, 1);
        const stairMods = this.addEarlyStair(c, this.reverse ? '<' : '>');
        if (!stairMods.length) continue OUTER;
        mods.push(...stairMods);
      }

      for (const [c, v] of mods) {
        if (v) this.fixed.add(c);
        if (v === '<' || v === '>') {
          this.downStairs.push(coordToPos(c));
        }
        this.grid.set(c, v);
      }
      return OK;
    }
    return {ok: false, fail: 'add fixed stairs with early features'};
  }

  addStairs(up = 0, down = 0): Result<void> {
    if (this.reverse) {
      return super.addStairs(up - this.under.upStairs.length, down);
    }
    return super.addStairs(up, down - this.under.upStairs.length);
  }

  addOverpasses() {
    return true;
  }

  // Expected to have several failures
  //reportFailure() {}
}

class UnderpassShuffle extends CaveShuffle {

  // These are filled in by this.finish
  underBridges: Pos[] = [];
  upStairs: Pos[] = [];
  upStairsEffective: Pos[] = []; // for matching purposes, shift some stairs.

  constructor(readonly loc: Location, readonly overpass: Location,
              readonly reverse: boolean) { super(loc); }

  init() {
    this.underBridges = [];
    this.upStairs = [];
    this.upStairsEffective = [];
  }

  build(): Result<void> {
    const result = super.build();
    if (!result.ok) return result;
    if (!this.meta) throw new Error('impossible');

    // Record the positions of the relevant stairs and bridges
    const upStair = this.reverse ? 'stair:down' : 'stair:up';
    for (const pos of this.meta.allPos()) {
      const scr = this.meta.get(pos);
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
      throw new Error(`Expected bridge in ${this.loc}\n${this.meta.show()}`);
    }
    if (!this.upStairs.length) {
      throw new Error(`Expected stair in ${this.loc}\n${this.meta.show()}`);
    }

    let stairsLen = 0;
    for (const [, type, [dest]] of this.orig.exits()) {
      if (type === upStair && (dest >>> 8) === this.overpass.id) stairsLen++;
    }
    this.upStairs = this.random.shuffle(this.upStairs).slice(0, stairsLen);

    return OK;
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
