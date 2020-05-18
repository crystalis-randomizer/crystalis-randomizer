import { Grid, GridCoord, GridIndex, E, S, N, W } from './grid.js';
import { Result, OK } from '../maze/maze.js';
import { CaveShuffleAttempt, CaveShuffle } from './cave.js';
import { Pos, Metalocation } from '../rom/metalocation.js';
import { Location } from '../rom/location.js';

type A = CaveShuffleAttempt;

// Basic plan: this is simple enough that we _should_ be able to work
// with whatever happens.  Do the shuffle once and then never look back.
// HOWEVER, it would be nice if there were a way to do this more
// generally and automatically force a retry after some amount of time.
// Ideally, we decouple _all_ the finishes from _all_ the shuffles and
// retain the grid and metascreens as accessible by all later shuffles,
// allowing for connected retries as needed.  But for now this will do.
export class KarmineUpstairsShuffle extends CaveShuffle {
  readonly patterns = [
    ['     ',
     ' >cc ',
     '   c ',
     '   b ',
     '   c '],
    ['     ',
     ' cc> ',
     ' c   ',
     ' b   ',
     ' c   '],
    ['   c ',
     '   b ',
     '   c ',
     ' >cc ',
     '     '],
    [' c   ',
     ' b   ',
     ' c   ',
     ' cc> ',
     '     ']];

  initialFill(a: A): Result<void> {
    const pattern = this.random.pick(this.patterns);
    a.count = 3;
    const result = this.insertPattern(a, pattern, {top: 1, bottom: 1});
    if (!result.ok) return result;
    this.addAllFixed(a);
    return OK;
  }

  addEdges(a: A): Result<void> {
    let retries = 10;
    while (a.count < a.size && retries) {
      if (!this.tryAdd(a)) retries--;
    }
    return retries ? OK : {ok: false, fail: `addEdges`};
  }

  addEarlyFeatures(a: A): Result<void> {
    // Look for a N-S hallway to add a bridge.
    let found = false;
    for (const s of this.random.ishuffle(a.grid.screens())) {
      if (this.extract(a.grid, s) !== ' c  c  c ') continue;
      a.grid.set(s + 0x808 as GridCoord, 'b');
      found = true;
      break;
    }
    if (!found) return {ok: false, fail: `could not add bridge`};
    return super.addStairs(a, 0, 2);
  }

  refine() { return OK; }
  addLateFeatures() { return OK; }
  addStairs() { return OK; }
}

const STAIRS = new WeakMap<Location, Pos>();

export class KarmineMainShuffle extends CaveShuffle {

  maxAttempts = 200;

  initialFill(a: A): Result<void> {
    // Find the stair from Upstairs, copy the bridges over.
    const bridges: Pos[] = [];
    let stairDown = true;
    let stair: Pos|undefined;
    const upstairs = this.orig.rom.locations.GoaFortress_Karmine3.meta;
    for (const [pos,, [dest]] of upstairs.exits()) {
      if ((dest >>> 8) !== this.orig.id) continue;
      STAIRS.set(this.orig.rom.locations.GoaFortress_Karmine3, pos);
      stair = pos;
      // Offset if it's not the single-tile up-down stairs.
      if (!upstairs.get(pos).isEmpty()) {
        stair += 16;
        stairDown = false;
      }
      break;
    }
    if (stair == null) throw new Error('no stair found');
    for (const pos of upstairs.allPos()) {
      const scr = upstairs.get(pos);
      if (scr.hasFeature('overpass')) bridges.push(pos);
    }
    this.random.shuffle(bridges);

    // Relativize
    let top = stair >>> 4;
    let left = stair & 0xf;
    let right = left;
    let bottom = top;
    for (const bridge of bridges) {
      const y = bridge >>> 4;
      const x = bridge & 0xf;
      top = Math.min(top, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
    const height = bottom - top + 1;
    const width = right - left + 1;
    const origin = top << 4 | left;

    // Place the bridges and stair in a random location.
    const outX = 1 + this.random.nextInt(a.w - width - 2);
    const outY = this.random.nextInt(a.h - height - (stairDown ? 1 : 0));
    const delta = (outY << 4 | outX) - origin;
    const stairRight = (stair & 0xf) - left < width / 2;
    stair += delta;
    for (let i = 0; i < bridges.length; i++) {
      bridges[i] += delta;
    }
    const stairTile =
        stairDown ? '    <  c ' : stairRight ? '    <c   ' : '   c<    ';
    if (!this.insertTile(a, bridges[0], '   cbc   ') ||
        !this.insertTile(a, bridges[1], '   cbc   ')) {
      throw new Error(`Could not insert bridge tile`);
    }
    // Problem: it's possible the stair doesn't fit.  If that's the case,
    // give up and try just moving it somewhere else.  Ideally we'd instead
    // just initiate a retry on the dependent level, but that structure
    // is not yet in place...
    if (!this.insertTile(a, stair, stairTile)) {
      const deltas = [-1, 1, 16, -16, 15, 17, -15, -17];
      let found = false;
      for (const ds of this.random.ishuffle(deltas)) {
        if (this.insertTile(a, stair + ds, stairTile)) {
          stair += ds;
          found = true;
          break;
        }
      }
      if (!found) throw new Error(`Could not insert stair`);
    }
    STAIRS.set(this.orig.rom.locations.GoaFortress_Karmine5, stair);
    // a.fixed.add(this.posToGrid(stair, 0x808));
    // a.fixed.add(this.posToGrid(bridges[0], 0x808));
    // a.fixed.add(this.posToGrid(bridges[1], 0x808));
    this.addAllFixed(a);
    a.count = 3;

    const dx = stairRight ? 1 : -1;
    const ds = stairDown ? 0x10 : dx;
    if (!bridges.includes(stair + dx) &&
        !this.tryConnect(a, this.posToGrid(stair + ds, 0x808),
                         this.posToGrid(bridges[0] - dx, 0x808), 'c', 10)) {
      return {ok: false, fail: `could not connect stair to bridge`};
    }
    if (!this.tryConnect(a, this.posToGrid(bridges[0] + dx, 0x808),
                         this.posToGrid(bridges[1] + dx, 0x808),
                         'c', 10)) {
      return {ok: false, fail: `could not connect bridges`};
    }
    return OK;
  }

  addEdges(a: A): Result<void> {
    let attempts = 100;
    while (a.count < a.size - 4 && attempts) {
      if (!this.tryAdd(a)) attempts--;
    }
    return attempts ? OK : {ok: false, fail: `could not populate`};
  }

  refine() { return OK; }
  refineEdges() { return true; }
  addUnderpasses() { return true; }

  addArenas(a: A): boolean {
    // Try to add kensu's arena.  Look for a place we can add ' c | a | c '.
    // Don't bother adding the stair on the other side, since it doesn't
    // actually matter here.  But to make the seamless work, we do need to
    // have _space_ for it.
    for (const s of this.random.ishuffle(a.grid.screens())) {
      if (!(s & 0xf000)) continue; // top row not allowed
      const c = s + 0x808 as GridCoord;
      if (a.fixed.has(c) || a.grid.get(c)) continue;
      if (a.grid.get(W(c, 2)) || a.grid.get(E(c, 2))) continue;
      if (a.grid.get(S(c, 2)) !== 'c') continue;
      if (!this.canSetAll(a, new Map([[S(c), 'c'], [c, 'a'],
                                      [N(c), 'c'], [N(c, 2), 'c']]))) {
        continue;
      }
      // Add the arena with a dead end.
      a.grid.set(S(c), 'c');
      a.grid.set(c, 'a');
      a.grid.set(N(c), 'c');
      //a.grid.set(N(c, 2), 'c');
      a.fixed.add(c);
      a.fixed.add(N(c, 2));
      return true;
    }
    return false;
  }

  addStairs(a: A, up = 0, down = 0) {
    return super.addStairs(a, up - 1, down);
  }

  finish(newMeta: Metalocation) {
    // The seamless exit is problematic before the other side moves.
    // So delete it for now, and add it back later.
    for (const [pos, type] of this.orig.exits()) {
      if (type.startsWith('seamless')) this.orig.deleteExit(pos, type);
    }
    super.finish(newMeta);
    // Make sure the right stairs connect to the upper floor.
    const upperMeta = this.orig.rom.locations.GoaFortress_Karmine3.meta;
    const upperPos = STAIRS.get(this.orig.rom.locations.GoaFortress_Karmine3);
    const mainPos = STAIRS.get(this.orig.rom.locations.GoaFortress_Karmine5);
    if (upperPos != null && mainPos != null) {
      newMeta.attach(mainPos, upperMeta, upperPos, 'stair:up', 'stair:down');
    }
  }
}

export class KarmineKensuShuffle extends CaveShuffle {

  findArena(meta: Metalocation): Pos {
    for (const pos of meta.allPos()) {
      if (meta.get(pos).hasFeature('arena')) {
        return pos;
      }
    }
    throw new Error(`never found arena`);
  }

  initialFill(a: A): Result<void> {
    const main = this.orig.rom.locations.GoaFortress_Karmine5.meta;
    const arena = this.findArena(main);
    const c = this.posToGrid(arena, 0x808);
    a.grid.set(c, 'a');
    a.grid.set(N(c), 'c');
    a.grid.set(S(c), 'c');
    a.fixed.add(c);
    a.fixed.add(S(c));
    a.fixed.add(S(c, 2));
    return OK;
  }

  addEdges(a: A): Result<void> {
    let retries = 10;
    const size = 2 + this.random.nextInt(2);
    while (a.count < size && retries) {
      if (!this.tryAdd(a)) retries--;
    }
    return retries ? OK : {ok: false, fail: `addEdges`};
  }

  refine() { return OK; }
  addLateFeatures() { return OK; }

  inferScreens(a: A): Result<Metalocation> {
    const result = super.inferScreens(a);
    if (!result.ok) return result;
    const meta = result.value;
    const arena = this.findArena(meta);
    // Move the neighbor
    const main = this.orig.rom.locations.GoaFortress_Karmine5.meta;
    meta.set(arena + 0x10, main.get(arena + 0x10));
    return result;
  }

  finish(newMeta: Metalocation) {
    const main = this.orig.rom.locations.GoaFortress_Karmine5.meta;
    const arena = this.findArena(newMeta);
    super.finish(newMeta);
    main.setExit(arena, 'seamless:up',
                 [newMeta.id << 8 | arena, 'seamless:down']);
    // Make sure these share a flag, in case the neighbor is a wall.
    newMeta.freeFlags = new Set(main.freeFlags);
  }

  reportFailure() {
    // This is fatal because of the seamless exit that won't work.
    throw new Error(`Completely failed to shuffle Karmine Kensu map`);
  }
}

export class KarmineBasementShuffle extends CaveShuffle {
  looseRefine = true;

  pickWidth() { return 8; }
  pickHeight() { return 5; }

  initialFill(a: A): Result<void> {
    // Set up the basic framework:
    //  * a single row of cross-cutting corridor, with three of the
    //    four columns as spikes, and full connections around the
    //    edges.
    if (a.grid.height !== 5 || a.grid.width !== 8) throw new Error('bad size');
    Grid.writeGrid2d(a.grid, 0 as GridCoord, KarmineBasementShuffle.PATTERN);
    a.count = 36;
    return OK;
  }

  addSpikes(a: A): boolean {
    // Change one column of spikes into normal cave,
    // mark the rest as fixed.
    const dropped = this.random.nextInt(4);
    for (let y = 1; y < 10; y++) {
      for (let x = 0; x < 4; x++) {
        const i = 2 * x + 5 + y * 17;
        if (x === dropped) {
          a.grid.data[i] = 'c';
        } else {
          const c = a.grid.coord(i as GridIndex);
          a.fixed.add(c);
          if (y === 5) {
            a.fixed.add(c + 8 as GridCoord);
            a.fixed.add(c + 16 as GridCoord);
            a.fixed.add(c - 8 as GridCoord);
            a.fixed.add(c - 16 as GridCoord);
          }
        }
      }
    }

    // Now pick random places for the stairs.
    let stairs = 0;
    for (const c of this.random.ishuffle(a.grid.screens())) {
      if (stairs === 3) break;
      const mid = (c | 0x808) as GridCoord;
      const up = (mid - 0x800) as GridCoord;
      const down = (mid + 0x800) as GridCoord;
      if (a.grid.get(mid) === 'c' &&
          a.grid.get(up) !== 's' &&
          a.grid.get(down) !== 's') {
        a.grid.set(mid, '<');
        a.fixed.add(mid);
        a.grid.set(up, '');
        a.grid.set(down, '');
        stairs++;
      }
    }

    // Make sure everything is still accessible.
    const partitions = new Set(a.grid.partition().values());
    return partitions.size === 1;
  }

  addStairs() { return OK; }

  static readonly PATTERN = [
    '                 ',
    '   ccccccccccc   ',
    '   c c c c c c   ',
    ' ccc s s s s ccc ',
    ' c c s s s s c c ',
    ' ccccscscscscccc ',
    ' c c s s s s c c ',
    ' ccc s s s s ccc ',
    '   c c c c c c   ',
    '   ccccccccccc   ',
    '                 ',
  ];
}
