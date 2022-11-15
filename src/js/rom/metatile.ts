import {Metascreen} from './metascreen';
import {Tileset} from './tileset';

/**
 * A single map tile, composed of four CHR tiles, that can be
 * manipulated as a unit.  A Metatile can be gotten from a Tileset
 * (not a Metatileset) since it corresponds to a physical entity in
 * the rom, rather than a logical subset of the tileset (which is
 * what the Metatileset represents).
 */
export class Metatile {
  private copiedFrom = -1;
  constructor(readonly tileset: Tileset, readonly id: number) {}

  // get topLeft(): number { return this.tileset.tileset.tiles[0][this.id]; }
  // set topLeft(x: number) { this.tileset.tileset.tiles[0][this.id] = x; }

  // get topRight(): number { return this.tileset.tileset.tiles[1][this.id]; }
  // set topRight(x: number) { this.tileset.tileset.tiles[1][this.id] = x; }

  // get bottomLeft(): number { return this.tileset.tileset.tiles[2][this.id]; }
  // set bottomLeft(x: number) { this.tileset.tileset.tiles[2][this.id] = x; }

  // get bottomRight(): number { return this.tileset.tileset.tiles[3][this.id]; }
  // set bottomRight(x: number) { this.tileset.tileset.tiles[3][this.id] = x; }

  // TODO - getters?

  get tiles(): readonly number[] {
    return [0, 1, 2, 3].map(i => this.tileset.tiles[i][this.id]);
  }
  setTiles(tiles: ReadonlyArray<number|undefined>): this {
    for (let i = 0; i < 4; i++) {
      const tile = tiles[i];
      if (tile != null) this.tileset.tiles[i][this.id] = tile;
    }
    return this;
  }

  get alternative(): number|null {
    const alt = this.id < 0x20 ? this.tileset.alternates[this.id] : this.id;
    return alt !== this.id ? alt : null;
  }
  setAlternative(tile: number|null): this {
    if (this.id >= 0x20) return this;
    this.tileset.alternates[this.id] = tile != null ? tile : this.id;
    this.tileset.effects().effects[this.id] |= 0x08;
    return this;
  }

  get attrs(): number {
    return this.tileset.attrs[this.id];
  }
  setAttrs(attrs: number): this {
    this.tileset.attrs[this.id] = attrs;
    return this;
  }

  get effects(): number {
    return this.tileset.effects().effects[this.id];
  }
  setEffects(effects: number): this {
    this.tileset.effects().effects[this.id] = effects;
    return this;
  }

  copyFrom(other: number, ...screens: Metascreen[]): this {
    const that = new Metatile(this.tileset, other);
    this.copiedFrom = other;
    this.setTiles(that.tiles);
    if ((this.id | that.id) < 0x20) {
      this.setAlternative(that.alternative);
    }
    this.setAttrs(that.attrs);
    this.setEffects(that.effects);
    return this;
  }

  replaceIn(...screens: Metascreen[]): this {
    if (this.copiedFrom < 0) throw new Error(`Must copyFrom first.`);
    for (const screen of screens) {
      screen.replace(this.copiedFrom, this.id);
    }
    return this;
  }
}
