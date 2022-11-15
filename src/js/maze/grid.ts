import { Random } from '../random';
import { UnionFind } from '../unionfind';
import { Pos } from '../rom/metalocation';
import { hex } from '../rom/util';

export type GridIndex = number & {__grid_index__: never};
export type GridCoord = number & {__grid_coord__: never};

/**
 * A grid of nodes, edges, and corners.  We can represent a single
 * point on the grid in one of three ways: (1) as a pair [y, x] of
 * half-integers; (2) as a single 16-bit hex number, where we use
 * the high nibble of each byte for the whole part and the 08 bit
 * for the half; or (3) as an index into a dense array.
 *
 * Nodes have halfs in both bytes, edges have halfs in exactly one
 * byte, and corners have edges in neither.  For example,
 * ```
 *        0008        0018
 *  0800  0808  0810  0818  0820
 *        1008        1018
 *  1800  1808  1810  1818  1820
 *        2008        2018
 *  2800  2808  2810  2818  2820
 *        3008        3018
 * ```
 * This is a height-3, width-2 grid with the corners (0000, 0010,
 * 1000, etc) omitted, as they would be for cave mazes.
 *
 * Note that it may be possible to have 100xx for the bottom
 * edge of a very tall maze.
 *
 * If expressed as [y, x] pairs, the top-left corner is [0, 0],
 * while the bottom-right is [height, width].  Corners are again
 * on the whole numbers, edges on odd pairs, and centers on even
 * half pairs.
 */
export class Grid<T> {
  data: T[];
  readonly row: number; // length of a row = 2 * width + 1
  private _coords?: readonly GridCoord[] = undefined;

  constructor(readonly height: number, readonly width: number) {
    this.data = new Array((height << 1 | 1) * (width << 1 | 1));
    this.row = this.width << 1 | 1;
  }

  /** Returns GridCoords for the top-left corner of each screen. */
  screens(): readonly GridCoord[] {
    if (this._coords) return this._coords;
    const coords: GridCoord[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        coords.push((y << 12 | x << 4) as GridCoord);
      }
    }
    return this._coords = coords;
  }

  index(c: GridCoord): GridIndex {
    return (((c & 0xf8) >> 3) + this.row * (c >>> 11)) as GridIndex;
  }

  index2(y: number, x: number): GridIndex {
    return ((this.row << 1) * y + 2 * x) as GridIndex;
  }

  yx(index: GridIndex): [number, number] {
    const x = index % this.row;
    const y = (index - x) / this.row;
    return [y / 2, x / 2];
  }

  coord(index: GridIndex): GridCoord {
    const x = index % this.row;
    const y = (index - x) / this.row;
    return (y << 11 | x << 3) as GridCoord;
  }

  get(c: GridCoord): T {
    return this.data[this.index(c)];
  }

  set(c: GridCoord, v: T) {
    this.data[this.index(c)] = v;
  }

  get2(y: number, x: number): T {
    return this.data[this.index2(y, x)];
  }

  set2(y: number, x: number, v: T) {
    this.data[this.index2(y, x)] = v;
  }

  plus(index: GridIndex, dy: number, dx: number): GridIndex {
    return (index + (this.row << 1) * dy + 2 * dx) as GridIndex;
  }

  x(index: GridIndex): number {
    return (index % this.row) / 2;
  }

  y(index: GridIndex): number {
    return Math.floor(index / this.row) / 2;
  }

  border(dir: number, position: number): GridCoord {
    let x, y: number;
    if (dir & 1) { // horizontal edge (along left or right)
      y = position << 12 | 0x800;
      x = dir & 2 ? this.width << 4 : 0;
    } else { // vertical edge (along top or bottom)
      y = dir & 2 ? this.height << 12 : 0;
      x = position << 4 | 0x8;
    }
    return (y | x) as GridCoord;
  }

  randomBorder(random: Random, dir?: number): GridCoord {
    let x, y: number;
    if (dir != null) {
      // if dir is specified, returns an edge on that wall
      if (dir & 1) { // horizontal edge (along left or right)
        y = random.nextInt(this.height) << 12 | 0x800;
        x = dir & 2 ? this.width << 4 : 0;
      } else { // vertical edge (along top or bottom)
        y = dir & 2 ? this.height << 12 : 0;
        x = random.nextInt(this.width) << 4 | 0x8;
      }
    } else {
      // otherwise pick an edge with equal probability
      const semiperimiter = this.width + this.height;
      let s = random.nextInt(semiperimiter << 1) - semiperimiter;
      let d = false;
      if (s < 0) {
        s = ~s;
        d = true;
      }
      if (s < this.width) {
        x = s << 4 | 0x8;
        y = d ? this.height << 12 : 0;
      } else {
        y = (s - this.width) << 12 | 0x800;
        x = d ? this.width << 4 : 0;
      }
    }
    return (y | x) as GridCoord;
  }

  oppositeBorder(edge: GridCoord): GridCoord {
    return edge & 0x8 ?
        (edge ^ (this.height << 12)) as GridCoord :
        (edge ^ (this.width << 4)) as GridCoord;
  }

  furthestBorder(edge: GridCoord): GridCoord {
    return ((this.height << 12 | this.width << 4) - edge) as GridCoord;
  }

  /** Returns the number of non-empty edges. */
  edgeCoordination(center: GridCoord, want?: T): number {
    let count = 0;
    if ((center & 0x808) !== 0x808) throw new Error(`Bad tile: ${hex(center)}`);
    for (const dir of [8, -8, 0x800, -0x800]) {
      const s = this.get(center + dir as GridCoord);
      if (want ? s === want : s) count++;
    }
    return count;
  }

  isBorder(c: GridCoord): boolean {
    if (c & 8) {
      if (c & 0x800) return false;
      const y = c >>> 12;
      return !y || y === this.height;
    } else if (c & 0x800) {
      const x = (c >>> 4) & 0xf;
      return !x || x === this.width;
    }
    return false;
  }

  partition(replace?: Map<GridCoord, T>): Map<GridCoord, Set<GridCoord>> {
    const uf = new UnionFind<GridCoord>();
    for (let y = 0; y < this.data.length; y += this.row) {
      for (let x = 0; x < this.row; x++) {
        const i = (y + x) as GridIndex;
        const coord = this.coord(i);
        const val = replace?.get(coord) ?? this.data[i];
        if (!val) continue;
        uf.find(coord);
        const above = (coord - 0x800) as GridCoord;
        if (y && (replace?.get(above) ?? this.data[i - this.row])) {
          uf.union([coord, above]);
        }
        const left = (coord - 8) as GridCoord;
        if (x && (replace?.get(left) ?? this.data[i - 1])) {
          uf.union([coord, left]);
        }
      }
    }
    return uf.map();
  }

  show() {
    const lines = [];
    for (let y = 0; y < this.data.length; y += this.row) {
      let line = '';
      for (let x = 0; x < this.row; x++) {
        line += this.data[y + x] || ' ';
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  static writeGrid2d(g: Grid<String>, c: GridCoord, data: readonly string[]) {
    const top = g.index(c);
    for (let y = 0; y < data.length; y++) {
      const row = data[y];
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        g.data[top + y * g.row + x] = c !== ' ' ? c : '';
      }
    }
  }
}

// TODO - posToCoord? (presumably center)
export function coordToPos(c: GridCoord): Pos {
  return (c >> 4) & 0xf | (c >> 8) & 0xf0;
}

export function W(c: GridCoord, n = 1): GridCoord {
  return c - n * 8 as GridCoord;
}

export function E(c: GridCoord, n = 1): GridCoord {
  return c + n * 8 as GridCoord;
}

export function N(c: GridCoord, n = 1): GridCoord {
  return c - n * 0x800 as GridCoord;
}

export function S(c: GridCoord, n = 1): GridCoord {
  return c + n * 0x800 as GridCoord;
}
