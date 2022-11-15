import { Grid, GridCoord, GridIndex, E, S, N, W } from './grid';
import { Result, OK } from '../maze/maze';
import { CaveShuffle } from './cave';
import { Pos, Metalocation } from '../rom/metalocation';
import { Location } from '../rom/location';

export function karmine(upstairs: Location, main: Location,
                        kensu: Location): CaveShuffle[] {
  const u = new KarmineUpstairsShuffle(upstairs);
  const m = new KarmineMainShuffle(main, u);
  const k = new KarmineKensuShuffle(kensu, m);
  return [u, m, k];
}

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

  stair: Pos|undefined;

  initialFill(): Result<void> {
    const pattern = this.random.pick(this.patterns);
    this.count = 3;
    const result = this.insertPattern(pattern, {top: 1, bottom: 1});
    if (!result.ok) return result;
    this.addAllFixed();
    for (let i = 0; i < this.grid.data.length; i++) {
      if (this.grid.data[i] !== '>') continue;
      const s = this.grid.coord(i as GridIndex);
      this.stair = (s >>> 8) & 0xf0 | (s >>> 4) & 0xf;
    }
    return OK;
  }

  addEdges(): Result<void> {
    let retries = 10;
    while (this.count < this.size && retries) {
      if (!this.tryAdd()) retries--;
    }
    return retries ? OK : {ok: false, fail: `addEdges`};
  }

  addEarlyFeatures(): Result<void> {
    // Look for a N-S hallway to add a bridge.
    let found = false;
    for (const s of this.random.ishuffle(this.grid.screens())) {
      if (this.extract(this.grid, s) !== ' c  c  c ') continue;
      this.grid.set(s + 0x808 as GridCoord, 'b');
      found = true;
      break;
    }
    if (!found) return {ok: false, fail: `could not add bridge`};
    return super.addStairs(0, 2);
  }

  refine() { return OK; }
  addLateFeatures() { return OK; }
  addStairs() { return OK; }
}

export class KarmineMainShuffle extends CaveShuffle {

  maxAttempts = 200;
  stair: Pos|undefined;

  constructor(readonly location: Location,
              readonly upper: KarmineUpstairsShuffle) { super(location); }

  build(): Result<void> {
    if (this.upper.attempt < this.attempt) {
      this.upper.meta = undefined;
      this.upper.shuffle(this.random);
      if (!this.upper.meta) return {ok: false, fail: `dependent failed`};
    }
    return super.build();
  }

  initialFill(): Result<void> {
    // Find the stair from Upstairs, copy the bridges over.
    const bridges: Pos[] = [];
    let stairDown = true;
    const upstairs = this.upper.meta!;
    let stair = this.upper.stair!;
    // Offset if it's not the single-tile up-down stairs.
    if (!upstairs.get(stair).isEmpty()) {
      stair += 16;
      stairDown = false;
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
    const outX = 1 + this.random.nextInt(this.w - width - 2);
    const outY = this.random.nextInt(this.h - height - (stairDown ? 1 : 0));
    const delta = (outY << 4 | outX) - origin;
    const stairRight = (stair & 0xf) - left < width / 2;
    stair += delta;
    for (let i = 0; i < bridges.length; i++) {
      bridges[i] += delta;
    }
    const stairTile =
        stairDown ? '    <  c ' : stairRight ? '    <c   ' : '   c<    ';
    if (!this.insertTile(bridges[0], '   cbc   ') ||
        !this.insertTile(bridges[1], '   cbc   ')) {
      throw new Error(`Could not insert bridge tile`);
    }
    // Problem: it's possible the stair doesn't fit.  If that's the case,
    // give up and try just moving it somewhere else.  Ideally we'd instead
    // just initiate a retry on the dependent level, but that structure
    // is not yet in place...
    if (!this.insertTile(stair, stairTile)) {
      const deltas = [-1, 1, 16, -16, 15, 17, -15, -17];
      let found = false;
      for (const ds of this.random.ishuffle(deltas)) {
        if (this.insertTile(stair + ds, stairTile)) {
          stair += ds;
          found = true;
          break;
        }
      }
      if (!found) throw new Error(`Could not insert stair`);
    }
    this.stair = stair;
    // this.fixed.add(this.posToGrid(stair, 0x808));
    // this.fixed.add(this.posToGrid(bridges[0], 0x808));
    // this.fixed.add(this.posToGrid(bridges[1], 0x808));
    this.addAllFixed();
    this.count = 3;

    const dx = stairRight ? 1 : -1;
    const ds = stairDown ? 0x10 : dx;
    if (!bridges.includes(stair + dx) &&
        !this.tryConnect(this.posToGrid(stair + ds, 0x808),
                         this.posToGrid(bridges[0] - dx, 0x808), 'c', 10)) {
      return {ok: false, fail: `could not connect stair to bridge`};
    }
    if (!this.tryConnect(this.posToGrid(bridges[0] + dx, 0x808),
                         this.posToGrid(bridges[1] + dx, 0x808),
                         'c', 10)) {
      return {ok: false, fail: `could not connect bridges`};
    }
    return OK;
  }

  addEdges(): Result<void> {
    let attempts = 100;
    while (this.count < this.size - 4 && attempts) {
      if (!this.tryAdd()) attempts--;
    }
    return attempts ? OK : {ok: false, fail: `could not populate`};
  }

  refine() { return OK; }
  refineEdges() { return true; }
  addUnderpasses() { return true; }

  addArenas(): boolean {
    // Try to add kensu's arena.  Look for a place we can add ' c | a | c '.
    // Don't bother adding the stair on the other side, since it doesn't
    // actually matter here.  But to make the seamless work, we do need to
    // have _space_ for it.
    for (const s of this.random.ishuffle(this.grid.screens())) {
      if (!(s & 0xf000)) continue; // top row not allowed
      const c = s + 0x808 as GridCoord;
      if (this.fixed.has(c) || this.grid.get(c)) continue;
      if (this.grid.get(W(c, 2)) || this.grid.get(E(c, 2))) continue;
      if (this.grid.get(S(c, 2)) !== 'c') continue;
      if (!this.canSetAll(new Map([[S(c), 'c'], [c, 'a'],
                                   [N(c), 'c'], [N(c, 2), 'c']]))) {
        continue;
      }
      // Add the arena with a dead end.
      this.grid.set(S(c), 'c');
      this.grid.set(c, 'a');
      this.grid.set(N(c), 'c');
      //this.grid.set(N(c, 2), 'c');
      this.fixed.add(c);
      this.fixed.add(N(c, 2));
      return true;
    }
    return false;
  }

  addStairs(up = 0, down = 0) {
    return super.addStairs(up - 1, down);
  }

  finishInternal() {
    if (!this.meta) throw new Error(`impossible`);
    this.upper.finish();
    // // The seamless exit is problematic before the other side moves.
    // // So delete it for now, and add it back later.
    // for (const [pos, type] of this.orig.exits()) {
    //   if (type.startsWith('seamless')) this.orig.deleteExit(pos, type);
    // }
    super.finishInternal();
    // Make sure the right stairs connect to the upper floor.
    const upperMeta = this.upper.meta!;
    const upperPos = this.upper.stair!;
    const mainPos = this.stair!;
    if (upperPos != null && mainPos != null) {
      this.meta.attach(mainPos, upperMeta, upperPos, 'stair:up', 'stair:down');
    }
  }
}

export class KarmineKensuShuffle extends CaveShuffle {

  constructor(loc: Location, readonly main: KarmineMainShuffle) { super(loc); }

  build(): Result<void> {
    if (this.main.attempt < this.attempt) {
      this.main.meta = undefined;
      this.main.shuffle(this.random);
      if (!this.main.meta) return {ok: false, fail: `dependent failed`};
    }
    return super.build();
  }

  findArena(meta: Metalocation): Pos {
    for (const pos of meta.allPos()) {
      if (meta.get(pos).hasFeature('arena')) {
        return pos;
      }
    }
    throw new Error(`never found arena`);
  }

  initialFill(): Result<void> {
    const main = this.main.meta!;
    const arena = this.findArena(main);
    const c = this.posToGrid(arena, 0x808);
    this.grid.set(c, 'a');
    this.grid.set(N(c), 'c');
    this.grid.set(S(c), 'c');
    this.fixed.add(c);
    this.fixed.add(S(c));
    this.fixed.add(S(c, 2));
    return OK;
  }

  addEdges(): Result<void> {
    let retries = 10;
    const size = 2 + this.random.nextInt(2);
    while (this.count < size && retries) {
      if (!this.tryAdd()) retries--;
    }
    return retries ? OK : {ok: false, fail: `addEdges`};
  }

  refine() { return OK; }
  addLateFeatures() { return OK; }

  inferScreens(): Result<Metalocation> {
    const result = super.inferScreens();
    if (!result.ok) return result;
    const meta = result.value;
    const arena = this.findArena(meta);
    // Move the neighbors (including kitty corner)
    const main = this.main.meta!;
    meta.set(arena + 0x0f,
             this.orig.tileset.unreachableVariant(main.get(arena + 0x0f)));
    meta.set(arena + 0x10,
             this.orig.tileset.unreachableVariant(main.get(arena + 0x10)));
    meta.set(arena + 0x11,
             this.orig.tileset.unreachableVariant(main.get(arena + 0x11)));
    return result;
  }

  finishInternal() {
    if (!this.meta) throw new Error(`impossible`);
    this.main.finish();
    const main = this.main.meta!;
    const arena = this.findArena(this.meta);
    super.finishInternal();
    main.setExit(arena, 'seamless:up',
                 [this.meta.id << 8 | arena, 'seamless:down']);
    // Make sure these share a flag, in case the neighbor is a wall.
    this.meta.freeFlags = new Set(main.freeFlags);
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

  initialFill(): Result<void> {
    // Set up the basic framework:
    //  * a single row of cross-cutting corridor, with three of the
    //    four columns as spikes, and full connections around the
    //    edges.
    if (this.grid.height !== 5 || this.grid.width !== 8) throw new Error('bad size');
    Grid.writeGrid2d(this.grid, 0 as GridCoord, KarmineBasementShuffle.PATTERN);
    this.count = 36;
    return OK;
  }

  addSpikes(): boolean {
    // Change one column of spikes into normal cave,
    // mark the rest as fixed.
    const dropped = this.random.nextInt(4);
    for (let y = 1; y < 10; y++) {
      for (let x = 0; x < 4; x++) {
        const i = 2 * x + 5 + y * 17;
        if (x === dropped) {
          this.grid.data[i] = 'c';
        } else {
          const c = this.grid.coord(i as GridIndex);
          this.fixed.add(c);
          if (y === 5) {
            this.fixed.add(c + 8 as GridCoord);
            this.fixed.add(c + 16 as GridCoord);
            this.fixed.add(c - 8 as GridCoord);
            this.fixed.add(c - 16 as GridCoord);
          }
        }
      }
    }

    // Now pick random places for the stairs.
    let stairs = 0;
    for (const c of this.random.ishuffle(this.grid.screens())) {
      if (stairs === 3) break;
      const mid = (c | 0x808) as GridCoord;
      const up = N(mid);
      const up2 = N(mid, 2);
      const down = S(mid);
      const down2 = S(mid, 2);
      const left = W(mid);
      const right = E(mid);
      if (this.grid.get(mid) !== 'c') continue;
      if (this.grid.get(up) === 's') continue;
      if (this.grid.get(up2) === 's') continue;
      if (this.grid.get(down) === 's') continue;
      if (this.grid.get(down2) === 's') continue;
      const neighbors = [];
      const fixedNeighbors = [];
      for (const n of [down, left, right]) {
        if (this.grid.get(n) !== 'c') continue;
        if (this.grid.get(2 * n - mid as GridCoord) === 's') {
          fixedNeighbors.push(n);
        } else {
          neighbors.push(n);
        }
      }
      if (fixedNeighbors.length > 1) continue;
      if (!neighbors.length && !fixedNeighbors.length) continue;
      while (neighbors.length + fixedNeighbors.length > 1) {
        if (neighbors.length + fixedNeighbors.length === 2 &&
            !neighbors.includes(down) && !fixedNeighbors.includes(down)) break;
        const [n] = neighbors.splice(this.random.nextInt(neighbors.length), 1);
        this.grid.set(n, '');
      }
      this.grid.set(up, '');
      this.fixed.add(mid);
      this.grid.set(mid, '<');
      stairs++;
    }

    // Make sure everything is still accessible.
    const partitions = new Set(this.grid.partition().values());
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
