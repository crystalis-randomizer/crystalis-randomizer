import { CaveShuffleAttempt, CaveShuffle } from './cave.js';
import { GridCoord, GridIndex } from './grid.js';
import { Monogrid, Cursor } from './monogrid.js';
import { Result, OK } from './maze.js';
import { Metalocation, Pos } from '../rom/metalocation.js';
import { Metascreen } from '../rom/metascreen.js';
import { hex } from '../rom/util.js';

type A = CaveShuffleAttempt;

export class RiverCaveShuffle extends CaveShuffle {
  // basic problem: missing |- and -| pieces.
  //  one solution would be to just add them
  //  outside of that, we need to switch to a pathgen algo rather
  //  than refinement

  // simple pathgen should be pretty easy w/ grid

  // alternatively, trial removals are further-reaching?
  //  - if we remove a horizontal edge then also remove the
  //    opposite edges of any neighbors, continuing.
  //  - or remove a vertical edge of one...?

  maxAttempts = 250;

  initialFill(a: A): Result<void> {
    this.initialFillRiver(a);
    this.initialFillLand(a);
    this.connectLandToWater(a);
    return OK;
  }

  initialFillRiver(a: A) {
    const g = new Monogrid(a.h, a.w, this.getValidRiverScreens());
    let attempts = 0;
    const target = this.params.features?.river || 0;
    while (attempts++ < 20 && g.size < target) {
      if (g.addPath(this.random, target)) attempts = 0;
    }

    a.grid.data = g.toGrid('r').data;
    this.addAllFixed(a);
  }

  getValidRiverScreens(): Set<number> {
    // TODO - automatically infer this from the metatileset.
    return new Set([0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15]);
  }

  initialFillLand(a: A) {
    // Add cave screens where possible
    for (let y = 0; y < a.h; y++) {
      for (let x = 0; x < a.w; x++) {
        const c = (y << 12 | x << 4 | 0x808) as GridCoord;
        if (!a.grid.get(c)) a.grid.set(c, 'c');
      }
    }

    // Connect all the 'c' screens, don't connect to 'r'
    for (let y = 0; y < a.h; y++) {
      for (let x = 0; x < a.w; x++) {
        for (const d of [8, 0x800]) {
          const c = (y << 12 | x << 4 | 0x808) as GridCoord;
          const c1 = c + d as GridCoord;
          const c2 = c + 2 * d as GridCoord;
          if (!a.grid.isBorder(c1) && !a.grid.get(c1) &&
              a.grid.get(c) === 'c' && a.grid.get(c2) === 'c') {
            a.grid.set(c1, 'c');
          }
        }
      }
    }
  }

  connectLandToWater(a: A) {
    // Add connections between land and water
    for (const s of this.random.ishuffle(a.grid.screens())) {
      for (const d of [8, 0x800]) {
        const c = s | 0x808 as GridCoord;
        const c1 = c + d as GridCoord;
        const c2 = c + 2 * d as GridCoord;
        if (a.grid.isBorder(c1) || a.grid.get(c1)) continue;
        // Check if adding c1 is valid
        a.grid.set(c1, 'c');
        const s1 = this.extract(a.grid, c - 0x808 as GridCoord);
        const s2 = this.extract(a.grid, c2 - 0x808 as GridCoord);
        if (!this.orig.tileset.getMetascreensFromTileString(s1).length ||
            !this.orig.tileset.getMetascreensFromTileString(s2).length) {
          a.grid.set(c1, '');
        }
      }
    }
  }

  pruneDisconnectedLand(a: A): Result<void> {
    // Prune anything not attached to river, make sure it's big enough.
    const parts = new Set(a.grid.partition().values());
    let size = 0;
    for (const part of parts) {
      const river = [...part].some(c => a.grid.get(c) === 'r');
      if (river) {
        size += [...part].filter(c => (c & 0x808) === 0x808).length;
      } else {
        for (const c of part) {
          if (a.fixed.has(c)) {
            return {ok: false, fail: `fixed tile ${hex(c)} disconnected`};
          }
          a.grid.set(c, '');
        }
      }
    }
    if (size < this.params.size) {
      //console.error(a.grid.show());
      return {ok: false, fail: 'lost too much land'};
    }
    return OK;
  }

  // addEarlyFeatures(a: A): Result<void> {
  //   // fill with river and then refine down to the correct size.
  //   //this.fillCave(
  //   return
  // }

  // canRemove(c: string) {
  //   return c === 'c' || c === 'r';
  // }

  // removalMap(a: A, coord: GridCoord): Map<GridCoord, string> {
  //   if ((coord & 0x808) !== 0x800) return new Map([[coord, '']]);
  //   // need to be a little cleverer: horizontal branches are not
  //   // allowed (though we could add them, in which case this gets
  //   // a lot easier), so ensure we're left with a bend instead.
  //   const map = new Map([[coord, '']]);
  //   const left = coord - 8 as GridCoord;
  //   if (a.grid.get(left) === 'r') {
  //     const leftUp = left - 0x800 as GridCoord;
  //     const leftDown = left + 0x800 as GridCoord;
  //     const leftLeft = left - 8 as GridCoord;
  //     // may need to remove another neighbor.
  //     if (a.grid.get(leftUp) === 'r' && a.grid.get(leftDown) === 'r' &&
  //         a.grid.get(leftLeft) === 'r') {
  //       map.set(this.random.nextInt(2) ? leftUp : leftDown, '');
  //     }
  //   }
  //   const right = coord + 8 as GridCoord;
  //   if (a.grid.get(right) === 'r') {
  //     const rightUp = right - 0x800 as GridCoord;
  //     const rightDown = right + 0x800 as GridCoord;
  //     const rightRight = right + 8 as GridCoord;
  //     // may need to remove another neighbor.
  //     if (a.grid.get(rightUp) === 'r' && a.grid.get(rightDown) === 'r' &&
  //         a.grid.get(rightRight) === 'r') {
  //       map.set(this.random.nextInt(2) ? rightUp : rightDown, '');
  //     }
  //   }
  //   return map;
  // }

  preinfer(a: A): Result<void> {
    // Make sure river is actually necessary!
    if ([...this.orig.exits()].length < 2) return OK;
    const override = new Map<GridCoord, string>();
    for (let i = 0 as GridIndex; i < a.grid.data.length; i++) {
      if (a.grid.data[i] === 'r') override.set(a.grid.coord(i), '');
    }
    const parts = a.grid.partition(override);
    const stairParts: unknown[] = [];
    for (let i = 0 as GridIndex; i < a.grid.data.length; i++) {
      if (a.grid.data[i] === '<' || a.grid.data[i] === '>' ||
          (a.grid.data[i] && a.grid.isBorder(a.grid.coord(i)))) {
        stairParts.push(parts.get(a.grid.coord(i)));
      }
    }
    if (new Set(stairParts).size < stairParts.length) {
      //console.error(a.grid.show());
      return {ok: false, fail: `river didn't matter`};
    }
    return super.preinfer(a);
  }

  addLateFeatures(a: A): Result<void> {
    // console.error(a.grid.show());
    // return super.addLateFeatures(a);
    return OK;
  }

  addEarlyFeatures(a: A): Result<void> {
    if (!this.addArenas(a, this.params.features?.arena ?? 0)) {
      return {ok: false, fail: 'addArenas'};
    }
    let result: Result<void>
    if ((result = this.pruneDisconnectedLand(a)), !result.ok) return result;
    return super.addEarlyFeatures(a);
  }

  addArenas(a: A, arenas: number): boolean {
    // This version works a little differently, since it runs as an early
    // feature (before refinement) rather than late.  We look for a 3x1
    // block of 'c' screens, zero out all but the middle (which gets the
    // arena), and then afterwards we prune away any newly-disconnected
    // land screens.
    if (!arenas) return true;
    const g = a.grid;
    for (const c of this.random.ishuffle(a.grid.screens())) {
      const middle = (c | 0x808) as GridCoord;
      const left = (middle - 8) as GridCoord;
      const left2 = (left - 8) as GridCoord;
      const right = (middle + 8) as GridCoord;
      const right2 = (right + 8) as GridCoord;
      const up = middle - 0x800 as GridCoord;
      const down = middle + 0x800 as GridCoord;
      if (g.get(middle) !== 'c') continue;
      if (g.get(up) !== 'c') continue;
      if (g.get(down) !== 'c') continue;
      const leftTile =
          g.isBorder(left) ? '' : this.extract(g, left2 - 0x808 as GridCoord);
      const rightTile =
          g.isBorder(right) ? '' : this.extract(g, right2 - 0x808 as GridCoord);
      if (/[^ c]/.test(leftTile + rightTile)) continue;
      if (!g.isBorder(left)) {
        g.set(left, '');
        g.set(left2, '');
        g.set(left2 - 8 as GridCoord, '');
        g.set(left2 - 0x800 as GridCoord, '');
        g.set(left2 + 0x800 as GridCoord, '');
      }
      if (!g.isBorder(right)) {
        g.set(right, '');
        g.set(right2, '');
        g.set(right2 + 8 as GridCoord, '');
        g.set(right2 - 0x800 as GridCoord, '');
        g.set(right2 + 0x800 as GridCoord, '');
      }
      a.fixed.add(middle);
      a.fixed.add(up);
      a.fixed.add(down);
      g.set(middle, 'a');
      arenas--;
      if (!arenas) {
        this.pruneDisconnectedLand(a);
        return true;
      }
    }
    //console.error('could not add arena');
    return false;
  }

  addAllFixed(a: A) {
    for (let i = 0; i < a.grid.data.length; i++) {
      if (a.grid.data[i]) a.fixed.add(a.grid.coord(i as GridIndex));
    }
  }
}

export class WaterfallRiverCaveShuffle extends RiverCaveShuffle {

  addBlocks = false;

  initialFillRiver(a: A) {
    const g = new Monogrid(a.h, a.w, this.getValidRiverScreens());
    const x0 = 2 + this.random.nextInt(a.w - 4);
    const x1 = 2 + this.random.nextInt(a.w - 4);
    const c = new Cursor(g, a.h - 1, x1);
    c.go(0);
    c.directedPath(this.random, 1, x0);
    c.go(0);

    a.grid.data = g.toGrid('r').data;
    this.addAllFixed(a);
  }

  addEdges(a: A): Result<void> {
    let r = -1;
    const h = (a.h - 1) << 12 | 0x808;
    for (let x = 0; x < a.w; x++) {
      if (a.grid.get((h | (x << 4)) as GridCoord) === 'r') r = x;
    }
    if (r < 0) throw new Error(`no river on bottom edge`);
    const c0 = (h | this.random.nextInt(r) << 4) as GridCoord;
    const c1 =
        (h | (r + 1 + this.random.nextInt(a.w - 1 - r)) << 4) as GridCoord;
    a.grid.set(c0, '>');
    a.grid.set(c0 - 8 as GridCoord, '');
    a.grid.set(c0 + 8 as GridCoord, '');
    a.grid.set(c1, '>');
    a.grid.set(c1 - 8 as GridCoord, '');
    a.grid.set(c1 + 8 as GridCoord, '');
    a.fixed.add(c0);
    a.fixed.add(c1);
    return OK;
  }

  addStairs(): Result<void> { return OK; }

  checkMeta(meta: Metalocation, pos: Pos, scr: Metascreen): boolean {
    const parts = meta.traverse({flight: true, with: new Map([[pos, scr]])});
    return new Set(parts.values()).size === this.maxPartitions;
  }
}
