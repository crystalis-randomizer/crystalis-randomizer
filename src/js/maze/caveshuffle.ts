import { Grid, GridCoord, GridIndex } from './grid.js';
import { Random } from '../random.js';
import { seq, hex } from '../rom/util.js';
import { Metatileset } from '../rom/metatileset.js';
import { Metascreen } from '../rom/metascreen.js';
import { Metalocation, Pos } from '../rom/metalocation.js';
import { Location } from '../rom/location.js';

const [] = [hex];

// Maps the numbers to the Metascreen code.
const EDGE_CODES = ' cnwrsp';
const [] = [EDGE_CODES];

interface Params {
  id: number;
  random: Random;
  tileset: Metatileset;
  height: number;
  width: number;
  size: number;
  edges?: number[]; // [top, left, bottom, right]
  stairs?: number[]; // [up, down]
  //poi?: number;
  features?: Record<string, number>; // a, r, s, p, b, w
}

// TODO:
//  - when there's a bridge, new rule to require a stair or poi
//    to be partitioned off if bridge tile is removed
//  - possibly also *link* to other screen?
//  - place bridge early or late?
//    - if early then no way to enforce throughness rule
//    - if late then hard to sync up with other floor
// ALSO, we don't have a ref to the tileset right now, don't even
// know what the tiles are!  Need to map the 3x3 grid of (??) to
// metatiles.
//  - consider updating "edge" to be whole 9x9?
//     ' c /ccc/   '
//     cave('cc c', 'c')
//     tile`
//       | c |
//       |ccc|
//       |   |`,
//
//     tile`
//       |   |
//       |cu |
//       |   |`,
//
// Basic idea would be to simplify the "features" bit quite a bit,
// and encapsulate the whole thing into the tile - edges, corners, center.
//
// For overworld, 'o' means open, 'g' for grass, etc...?
// - then the letters are always the walkable tiles, which makes sense
//   since those are the ones that have all the variety.
//     tile`
//       |oo |
//       |oo |
//       |   |`,
//     tile`
//       |oo |
//       |ooo|
//       |ogo|`,

export class CaveShuffle {

  readonly h: number;
  readonly w: number;
  readonly tileset: Metatileset;
  readonly random: Random;
  readonly grid: Grid<string>;
  readonly fixed = new Set<GridCoord>();
  readonly screens: readonly GridCoord[] = [];
  meta!: Metalocation;
  count = 0;
  walls = 0;
  bridges = 0;
  maxPartitions = 1;
  minSpikes = 2;

  constructor(readonly params: Params, seed = 1) {
    this.tileset = params.tileset;
    const w = this.w = params.width;
    const h = this.h = params.height;
    this.random = params.random || new Random(seed);
    this.grid = new Grid(h, w);
    this.grid.data.fill('');
    for (let y = 0.5; y < h; y++) {
      for (let x = 0.5; x < w; x++) {
        if (y > 1) this.grid.set2(y - 0.5, x, 'c');
        if (x > 1) this.grid.set2(y, x - 0.5, 'c');
        this.grid.set2(y, x, 'c');
      }
    }
    this.count = h * w;
    const screens: GridCoord[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        screens.push((y << 12 | x << 4) as GridCoord);
      }
    }
    this.screens = screens;
  }

  build(): Metalocation|undefined {
    //if (!this.addEarlyFeatures()) return false;
    this.addEdges();
    if (!this.addEarlyFeatures()) return;
    if (!this.refine()) return;
    this.removeSpurs();
    this.removeTightLoops();
    if (!this.addLateFeatures()) return;
    if (!this.addStairs()) return;

    // try to translate to metascreens at this point...
    if (!this.inferScreens()) return;
    if (!this.refineMetascreerns()) return;

    return this.meta;
  }

  // Add edge and/or stair exits
  addEdges() {
    //let attempts = 0;
    if (!this.params.edges) return;
    for (let dir = 0; dir < 4; dir++) {
      let count = this.params.edges[dir] || 0;
      if (!count) continue;
      const edges =
          seq(dir & 1 ? this.h : this.w, i => this.grid.border(dir, i));
      for (const edge of this.random.ishuffle(edges)) {
        //console.log(`edge: ${edge.toString(16)} count ${count} dir ${dir}`);
        if (this.grid.get(edge)) continue;
        if (dir & 1) {
          if (dir === 1) {
            if (this.addLeftEdge(edge)) count--;
          } else {
            if (this.addRightEdge(edge)) count--;
          }
        } else {
          if (dir === 0) {
            if (this.addUpEdge(edge)) count--;
          } else {
            if (this.addDownEdge(edge)) count--;
          }
        }
        if (!count) break;
      }
      if (count) throw new Error(`can't fit all edges`);
    }
  }

  addUpEdge(edge: GridCoord): boolean {
    // Up edges must always be arena screens, so cut off both
    // the E-W edges AND the neighboring screens as well (provided
    // there is not also an exit next to them, since that would be
    // a problem.  (These are pretty limited: vampire 1, prison,
    // stxy 1, pyramid 1, crypt 2, draygon 2).
    const below = edge + 0x800 as GridCoord;
    const left = below - 8 as GridCoord;
    const left2 = left - 8 as GridCoord;
    const left3 = left2 - 8 as GridCoord;
    const right = below + 8 as GridCoord;
    const right2 = right + 8 as GridCoord;
    const right3 = right2 + 8 as GridCoord;
    if (this.grid.isBorder(left)) {
      if (this.grid.get(left)) return false;
    } else {
      if (this.grid.get(edge - 16 as GridCoord)) return false;
      if (this.grid.isBorder(left3) && this.grid.get(left3)) return false;
    }
    if (this.grid.isBorder(right)) {
      if (this.grid.get(right)) return false;
    } else {
      if (this.grid.get(edge + 16 as GridCoord)) return false;
      if (this.grid.isBorder(right3) && this.grid.get(right3)) return false;
    }
    this.fixed.add(edge);
    this.grid.set(edge, 'n');
    this.grid.set(left, '');
    this.grid.set(right, '');
    return true;
  }

  addDownEdge(edge: GridCoord): boolean {
    // down edges must have straight N-S screens, so cut off
    // the E-W edges next to them.
    const above = edge - 0x800 as GridCoord;
    const left = above - 8 as GridCoord;
    const right = above + 8 as GridCoord;
    if (!this.grid.get(above)) return false;
    if (this.grid.isBorder(left) && this.grid.get(left)) return false;
    if (this.grid.isBorder(right) && this.grid.get(right)) return false;
    this.fixed.add(edge);
    this.grid.set(edge, 'n');
    this.grid.set(left, '');
    this.grid.set(right, '');
    return true;
  }

  addLeftEdge(edge: GridCoord): boolean {
    const right = edge + 8 as GridCoord;
    const rightUp = right - 0x800 as GridCoord;
    const rightDown = right + 0x800 as GridCoord;
//console.log(`addLeft ${hex(edge)} right ${hex(right)}:${this.grid.get(right)} ru ${hex(rightUp)}:${this.grid.isBorder(rightUp)}:${this.grid.get(rightUp)} rd ${hex(rightDown)}:${this.grid.isBorder(rightDown)}:${this.grid.get(rightDown)}`);
    if (!this.grid.get(right)) return false;
    if (this.grid.isBorder(rightUp) && this.grid.get(rightUp)) return false;
    if (this.grid.isBorder(rightDown) && this.grid.get(rightDown)) return false;
    this.fixed.add(edge);
    this.grid.set(edge, 'c');
    return true;
  }

  addRightEdge(edge: GridCoord): boolean {
    const left = edge - 8 as GridCoord;
    const leftUp = left - 0x800 as GridCoord;
    const leftDown = left + 0x800 as GridCoord;
    if (!this.grid.get(left)) return false;
    if (this.grid.isBorder(leftUp) && this.grid.get(leftUp)) return false;
    if (this.grid.isBorder(leftDown) && this.grid.get(leftDown)) return false;
    this.fixed.add(edge);
    this.grid.set(edge, 'c');
    return true;
  }

  // addArenasEarly(): boolean {
  //   // Specifically, just arenas...
  //   let arenas = this.params.features?.['a'];
  //   if (!arenas) return true;
  //   const g = this.grid;
  //   for (const c of this.random.ishuffle(this.screens)) {
  //     const middle = (c | 0x808) as GridCoord;
  //     const left = (middle - 8) as GridCoord;
  //     const left2 = (left - 8) as GridCoord;
  //     const left3 = (left2 - 8) as GridCoord;
  //     const left2Up = (left2 - 0x800) as GridCoord;
  //     const left2Down = (left2 + 0x800) as GridCoord;
  //     const right = (middle + 8) as GridCoord;
  //     const right2 = (right + 8) as GridCoord;
  //     const right3 = (right2 + 8) as GridCoord;
  //     const right2Up = (right2 - 0x800) as GridCoord;
  //     const right2Down = (right2 + 0x800) as GridCoord;
  //     if (!g.isBorder(left)) {
  //       if (g.isBorder(left3) && g.get(left3)) continue;
  //       if (g.isBorder(left2Up) && g.get(left2Up)) continue;
  //       if (g.isBorder(left2Down) && g.get(left2Down)) continue;
  //     }
  //     if (!g.isBorder(right)) {
  //       if (g.isBorder(right3) && g.get(right3)) continue;
  //       if (g.isBorder(right2Up) && g.get(right2Up)) continue;
  //       if (g.isBorder(right2Down) && g.get(right2Down)) continue;
  //     }
  //     this.fixed.add(middle);
  //     g.set(middle, 'a');
  //     g.set(left, '');
  //     g.set(left2, '');
  //     g.set(right, '');
  //     g.set(right2, '');
  //     arenas--;
  //     if (!arenas) return true;
  //   }
  //   return false;
  // }

  addEarlyFeatures(): boolean {
    if (!this.addSpikes(this.params.features?.['s'] ?? 0)) return false;
    return true;
  }

  addLateFeatures(): boolean {
    if (!this.addArenas(this.params.features?.['a'] ?? 0)) return false;
    // if (!this.addPits(this.params.features?.['p'] ?? 0)) return false;
    if (!this.addRamps(this.params.features?.['r'] ?? 0)) return false;
    return true;
  }

  addArenas(arenas: number): boolean {
    if (!arenas) return true;
    const g = this.grid;
    for (const c of this.random.ishuffle(this.screens)) {
      const middle = (c | 0x808) as GridCoord;
      const left = (middle - 8) as GridCoord;
      const left2 = (left - 8) as GridCoord;
      const right = (middle + 8) as GridCoord;
      const right2 = (right + 8) as GridCoord;
      if (g.get(middle) !== 'c') continue;
      if (g.get(left) || g.get(right)) continue;
      if (!g.isBorder(left) && g.get(left2)) continue;
      if (!g.isBorder(right) && g.get(right2)) continue;
      const tile = extract(g, c);
      const arenaTile = tile.substring(0, 4) + 'a' + tile.substring(5);
      const options = this.tileset.getMetascreensFromTileString(arenaTile);
      if (!options.length) continue;
      this.fixed.add(middle);
      g.set(middle, 'a');
      // g.set(left, '');
      // g.set(left2, '');
      // g.set(right, '');
      // g.set(right2, '');
      arenas--;
      if (!arenas) return true;
    }
    //console.error('could not add arena');
    return false;
  }

  addRamps(ramps: number): boolean {
    if (!ramps) return true;
    const g = this.grid;
    for (const c of this.random.ishuffle(this.screens)) {
      const middle = (c | 0x808) as GridCoord;
      const left = (middle - 8) as GridCoord;
      const right = (middle + 8) as GridCoord;
      if (g.get(middle) !== 'c') continue;
      if (g.get(left) || g.get(right)) continue;
      const tile = extract(g, c);
      const arenaTile = tile.substring(0, 4) + '/' + tile.substring(5);
      const options = this.tileset.getMetascreensFromTileString(arenaTile);
      if (!options.length) continue;
      this.fixed.add(middle);
      g.set(middle, '/');
      ramps--;
      if (!ramps) return true;
    }
    //console.error('could not add ramp');
    return false;
  }

  addSpikes(spikes: number): boolean {
    if (!spikes) return true;
    const g = this.grid;
    let attempts = 0;
    while (spikes > 0) {
      if (++attempts > 20) return false;

      // TODO - try to be smarter about spikes
      //  - if total > 2 then use min(total, h*.6, ??) as len
      //  - if len > 2 and w > 3, avoid putting spikes on edge?
      let len = Math.min(spikes, Math.floor(this.h * 0.6));
      while (len < spikes - 1 && len > 2) {
        if (this.random.next() < 0.2) len--;
      }
      //if (len === spikes - 1) len++;
      const x =
          (len > 2 && this.w > 3) ?
              this.random.nextInt(this.w - 2) + 1 :
              this.random.nextInt(this.w);
      // const r =
      //     this.random.nextInt(Math.min(this.h - 2, spikes) - this.minSpikes);
      // let len = this.minSpikes + r;
      if (len === spikes - 1) {
        if (len === this.h - 2) { // && len > this.minSpikes) {
          len--;
        } else {
          len++;
        }
      }
      const y0 = this.random.nextInt(this.h - len - 2) + 1;
      const t0 = y0 << 12 | x << 4 | 0x808;
      const t1 = t0 + ((len - 1) << 12);
      for (let t = t0 - 0x1000; len && t <= t1 + 0x1000; t += 0x800) {
        if (g.get(t as GridCoord) !== 'c') len = 0;
      }
      if (!len) continue;
      const cleared = [t0 - 8, t0 + 8, t1 - 8, t1 + 8] as GridCoord[];
      const orphaned = this.tryClear(cleared);
      if (!orphaned.length) continue;
      for (const c of orphaned) {
        g.set(c, '');
      }
      this.fixed.add((t0 - 0x800) as GridCoord);
      this.fixed.add((t0 - 0x1000) as GridCoord);
      this.fixed.add((t1 + 0x800) as GridCoord);
      this.fixed.add((t1 + 0x1000) as GridCoord);
      for (let t = t0; t <= t1; t += 0x800) {
        this.fixed.add(t as GridCoord);
        g.set(t as GridCoord, 's');
      }
      spikes -= len;
      attempts = 0;
    }
    return spikes === 0;
  }

  canRemove(c: string): boolean {
    // Notably, exclude stairs, narrow edges, arenas, etc.
    return c === 'c';
  }

  /**
   * Does a traversal with the given coordinate(s) cleared, and returns
   * an array of coordinates that would be cut off (including the cleared
   * coordinates).  If clearing would create more than the allowed number
   * of partitions (usually 1), then returns an empty array to signify
   * that the clear is not allowed.
   */
  tryClear(coords: GridCoord[]): GridCoord[] {
    const replace = new Map<GridCoord, string>();
    for (const c of coords) {
      if (this.fixed.has(c)) return [];
      replace.set(c, '');
    }
    const parts = this.grid.partition(replace);
    // Check simple case first - only one partition
    const [first] = parts.values();
    if (first.size === parts.size) { // a single partition
      return [...coords];
    }
    // More complex case - need to see what we actually have,
    // see if anything got cut off.
    const connected = new Set<Set<GridCoord>>();
    const allParts = new Set<Set<GridCoord>>(parts.values());
    for (const fixed of this.fixed) {
      connected.add(parts.get(fixed)!);
    }
    if (connected.size > this.maxPartitions) return []; // no good
    const orphaned = [...coords];
    for (const part of allParts) {
      if (connected.has(part)) continue;
      orphaned.push(...part);
    }
    return orphaned;
  }

  refine(): boolean {
    let filled = new Set<GridCoord>();
    for (let i = 0 as GridIndex; i < this.grid.data.length; i++) {
      if (this.grid.data[i]) filled.add(this.grid.coord(i));
    }
    let attempts = 0;
    while (this.count > this.params.size) {
      if (attempts++ > 50) throw new Error(`refine failed: attempts`);
      //console.log(`main: ${this.count} > ${this.params.size}`);
      let removed = 0;
//if(this.params.id===4){debugger;[...this.random.ishuffle(filled)];}
      for (const coord of this.random.ishuffle([...filled])) {
        if (this.grid.isBorder(coord) ||
            !this.canRemove(this.grid.get(coord)) ||
            this.fixed.has(coord)) {
          continue;
        }
        if (removed > 3) break;
        
        const parts = this.grid.partition(new Map([[coord, '']]));
        //console.log(`  coord: ${coord.toString(16)} => ${parts.size}`);
        const [first] = parts.values();
        if (first.size === parts.size && parts.size > 1) { // a single partition
          // ok to remove
          removed++;
          filled.delete(coord);
          if ((coord & 0x808) === 0x808) this.count--;
          this.grid.set(coord, '');
        } else {
          // find the biggest partition.
          let part!: Set<GridCoord>;
          for (const set of parts.values()) {
            if (!part || set.size > part.size) part = set;
          }
          // make sure all the fixed screens are in it.
          if (![...this.fixed].every(c => part.has(c))) continue;
          // check that it's big enough.
          const count = [...part].filter(c => (c & 0x808) == 0x808).length;
          //console.log(`part: ${[...part].map(x=>x.toString(16)).join(',')} count=${count}`);
          if (count < this.params.size) continue;
          // ok to remove
          removed++;
          filled = part;
          this.count = count;
          this.grid.set(coord, '');
          for (const [k, v] of parts) {
            if (v !== part) this.grid.set(k, '');
          }
        }
      }
      if (!removed) return false; // throw new Error(`refine failed: progress`);
    }
    return true;
  }

  /**
   * We can't handle a tile ' c |c  |   ' so get rid of one or the
   * other of the edges.  Leave tiles of the form ' c |   | c ' since
   * that works fine.  TODO - how to preserve ' > |   | < '?
   */
  removeSpurs() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = (y << 12 | 0x808 | x << 4) as GridCoord;
        if (this.grid.get(c)) continue;
        const up = (c - 0x800) as GridCoord;
        const down = (c + 0x800) as GridCoord;
        const left = (c - 0x8) as GridCoord;
        const right = (c + 0x8) as GridCoord;
        if ((this.grid.get(up) || this.grid.get(down)) &&
            (this.grid.get(left) || this.grid.get(right))) {
          if (this.random.nextInt(2)) {
            this.grid.set(up, '');
            this.grid.set(down, '');
          } else {
            this.grid.set(left, '');
            this.grid.set(right, '');
          }
          //console.log(`remove ${y} ${x}:\n${this.grid.show()}`);
        }
      }
    }
  }

  removeTightLoops() {
    for (let y = 0; y < this.h - 1; y++) {
      const row = y << 12 | 0x800;
      for (let x = 0; x < this.w - 1; x++) {
        const coord = (row | (x << 4) | 8) as GridCoord;
        if (this.isTightLoop(coord)) this.breakTightLoop(coord);
      }
    }
  }

  isTightLoop(coord: GridCoord): boolean {
    for (let dy = 0; dy < 0x1800; dy += 0x800) {
      for (let dx = 0; dx < 0x18; dx += 8) {
        const delta = dy | dx
        if (delta === 0x808) continue;
        if (this.grid.get((coord + delta) as GridCoord) !== 'c') return false;
      }
    }
    return true;
  }

  breakTightLoop(coord: GridCoord) {
    // Pick a delta - either 8, 1008, 800, 810
    const r = this.random.nextInt(0x10000);
    const delta = r & 1 ? (r & 0x1000) | 8 : (r & 0x10) | 0x800;
    this.grid.set((coord + delta) as GridCoord, '');
  }

  addStairs(): boolean {
    // Find spots where we can add stairs
    const stairs = [this.params.stairs?.[0] ?? 0, this.params.stairs?.[1] ?? 0];
    if (!stairs[0] && !stairs[1]) return true; // no stairs
    for (const c of this.random.ishuffle(this.screens)) {
      if (!this.tryAddStair(c, stairs)) continue;
      if (!stairs[0] && !stairs[1]) return true; // no stairs
    }
    return false;
  }

  tryAddStair(c: GridCoord, stairs: number[]): boolean {
    const tile = extract(this.grid, c);
    const both = stairs[0] && stairs[1];
    const total = stairs[0] + stairs[1];
    const up = this.random.nextInt(total) < stairs[0];
    const candidates = [up ? 0 : 1];
    if (both) candidates.push(up ? 1 : 0);
    for (const stair of candidates) {
      const stairChar = '<>'[stair];
      const stairTile = tile.substring(0, 4) + stairChar + tile.substring(5);
      if (this.tileset.getMetascreensFromTileString(stairTile).length) {
        this.grid.set((c | 0x808) as GridCoord, stairChar);
        stairs[stair]--;
        return true;
      }
    }
    return false;
  }

  /** Make arrangements to maximize the success chances of infer. */
  preinfer() {
    if (this.params.features?.['s']) this.preinferSpikes();
  }

  preinferSpikes() {
    // make sure there's a 'c' above each 's'
    // check sides?
  }

  inferScreens(): boolean {
    const screens: Metascreen[] = [];
    for (const s of this.screens) {
      const tile = extract(this.grid, s);
      const candidates =
          this.tileset.getMetascreensFromTileString(tile)
              .filter(s => !s.data.mod);
      if (!candidates.length) return false;
      const pick = this.random.pick(candidates);
      screens.push(pick);
      if (pick.hasFeature('wall')) this.walls++;
      if (pick.hasFeature('bridge')) this.bridges++;

      // TODO - any other features to track?

    }

    this.meta = new Metalocation(this.params.id, this.tileset, this.h, this.w);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        this.meta.set(y << 4 | x, screens[y * this.w + x]);
      }
    }

    return true;
  }

  refineMetascreerns(): boolean {
    // make sure we have the right number of walls and bridges
    const bridges = this.params.features?.['b'] || 0;
    const walls = this.params.features?.['w'] || 0;
    for (const pos of this.random.ishuffle(this.meta.allPos())) {
      const c = ((pos << 8 | pos << 4) & 0xf0f0) as GridCoord;
      const tile = extract(this.grid, c)
      const scr = this.meta.get(pos);
      if (this.tryMeta(pos, this.tileset.withMod(tile, 'block'))) continue;
      if (this.bridges > bridges && scr.hasFeature('bridge')) {
        if (this.tryMeta(pos, this.tileset.withMod(tile, 'bridge'))) {
          this.bridges--;
          continue;
        }
      } else if (bridges < this.bridges && scr.hasFeature('bridge')) {
        // can't add bridges?
        return false;
      }
      if (this.walls < walls && !scr.hasFeature('wall')) {
        if (this.tryMeta(pos, this.tileset.withMod(tile, 'wall'))) {
          this.walls++;
          continue;
        }
      }
    }
    //console.warn(`bridges ${this.bridges} ${bridges} / walls ${this.walls} ${walls}`);
    return this.bridges === bridges && this.walls === walls;
  }

  tryMeta(pos: Pos, screens: Iterable<Metascreen>): boolean {
    for (const s of screens) {
      if (!this.checkMeta(pos, s)) continue;
      this.meta.set(pos, s);
      return true;
    }
    return false;
  }

  checkMeta(pos: Pos, scr: Metascreen): boolean {
    const parts = this.meta.traverse({with: new Map([[pos, scr]])});
    return new Set(parts.values()).size === this.maxPartitions;
  }

  // checkReachability(replace?: Map<GridCoord, string>): boolean {
  //   throw new Error();
  // }
}

/** Extract a 3x3 section into a 9-character string. */
function extract(g: Grid<string>, c: GridCoord): string {
  const index = g.index(c);
  let out = '';
  const end = index + 3 * g.row;
  for (let r = index as number; r < end; r += g.row) {
    for (let i = r; i < r + 3; i++) {
      out += (g.data[i] || ' ');
    }
  }
  return out;
}

export function shuffleCave(loc: Location, random: Random) {
  // take a survey.
  const meta = loc.meta;
  const survey = {
    id: loc.id,
    random,
    tileset: meta.tileset,
    size: 0,
    edges: [0, 0, 0, 0],
    stairs: [0, 0],
    features: {'a': 0, 'b': 0, 'p': 0, 'r': 0, 's': 0, 'w': 0},
  };
  for (const pos of meta.allPos()) {
    const scr = meta.get(pos);
    if (!scr.isEmpty() || scr.data.exits?.length) survey.size++;
    for (const exit of scr.data.exits ?? []) {
      const {type} = exit;
      if (type === 'edge:top') {
        if ((pos >>> 4) === 0) survey.edges[0]++;
        continue;
      } else if (type === 'edge:left') {
        if ((pos & 0xf) === 0) survey.edges[1]++;
        continue;
      } else if (type === 'edge:bottom') {
        if ((pos >>> 4) === loc.height - 1) survey.edges[2]++;
        continue;
      } else if (type === 'edge:right') {
        if ((pos & 0xf) === loc.width - 1) survey.edges[3]++;
        continue;
      } else if (exit.dir & 1) {
        throw new Error(`Bad exit direction: ${exit.dir}`);
      } else {
        survey.stairs[exit.dir >>> 1]++;
      }
    }
    if (scr.hasFeature('arena')) survey.features['a']++;
    if (scr.hasFeature('bridge')) survey.features['b']++;
    if (scr.hasFeature('pit')) survey.features['p']++;
    if (scr.hasFeature('ramp')) survey.features['r']++;
    if (scr.hasFeature('spikes')) survey.features['s']++;
    if (scr.hasFeature('wall')) survey.features['w']++;
  }
  for (let attempt = 0; attempt < 100; attempt++) {
    const width =
        Math.max(1, Math.min(8, loc.width +
                             Math.floor((random.nextInt(6) - 1) / 3)));
    const height =
        Math.max(1, Math.min(16, loc.height +
                             Math.floor((random.nextInt(6) - 1) / 3)));
    const params = {...survey, height, width};
    const shuffle = new CaveShuffle(params);
    if (shuffle.build()) {
      shuffle.meta.transferFlags(meta, random);
      shuffle.meta.transferExits(meta, random);
      shuffle.meta.transferSpawns(meta, random);
      shuffle.meta.replaceMonsters(random);
      loc.meta = shuffle.meta;
      return;
    }
  }
}
