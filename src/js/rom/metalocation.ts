import {Location} from './location.js';
//import {Metascreen} from './metascreen.js';
import {Metatileset} from './metatileset.js';
import {Multiset} from '../util.js';

// Model of a location with metascreens, etc.

// Trick: we need something to own the neighbor cache.
//  - probably this belongs in the Metatileset.
//  - method to regenerate, do it after the screen mods?
// Data we want to keep track of:
//  - given two screens and a direction, can they abut?
//  - given a screen and a direction, what screens open/close that edge?
//    - which one is the "default"?

type Pos = number;
type Uid = number;

export class Metalocation {

  /**
   * Parse out a metalocation from the given location.  Infer the
   * tileset if possible, otherwise it must be explicitly specified.
   */
  static of(location: Location, tileset?: Metatileset): Metalocation {
    




    throw new Error();
  }

  private readonly _empty: number;

  private _height: number;
  private _width: number;

  /** Key: ((y+1)<<4)|x; Value: Uid */
  private _screens: Uid[];
  private _pos: Pos[]|undefined = undefined;
  /** Count of consolidateable screen tile IDs. */
  private _counts?: Multiset<number>;
  /** Maps UID to ID of counted metascreens. */
  private readonly _counted = new Map<number, number>();

  constructor(readonly tileset: Metatileset, height: number, width: number) {
    this._empty = tileset.empty.uid;
    this._height = height;
    this._width = width;
    this._screens = new Array((height + 2) << 4).fill(this._empty);
    this._counts = tileset.data.consolidated ? new Multiset() : undefined;
    if (this._counts) {
      for (const screen of tileset) {
        if (screen.hasFeature('consolidate')) {
          this._counted.set(screen.uid, screen.id);
        }
      }
    }
  }

  // Readonly accessor.
  get screens(): readonly Uid[] {
    return this._screens;
  }

  get width(): number {
    return this._width;
  }
  set width(width: number) {
    this._width = width;
    this._pos = undefined;
  }

  get height(): number {
    return this._height;
  }
  set height(height: number) {
    if (this._height > height) {
      this._screens.splice((height + 2) << 4, (this._height - height) << 4);
    } else if (this._height < height) {
      this._screens.length = (height + 2) << 4;
      this._screens.fill(this._empty,
                         (this.height + 2) << 4, this._screens.length);
    }
    this._height = height;
    this._pos = undefined;
  }

  resize(top: number, left: number, bottom: number, right: number) {
    // number of screens to add on any side
    this.setInternal(0, 0);
    throw new Error();
  }

  allPos(): readonly Pos[] {
    if (this._pos) return this._pos;
    const p: number[] = this._pos = [];
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        p.push((y + 1) << 4 | x);
      }
    }
    return p;
  }

  private setInternal(pos: Pos, uid: Uid | null) {
    const prev = this._counted.get(this._screens[pos]);
    if (uid == null) uid = this._empty;
    this._screens[pos] = uid;
    if (prev != null) this._counts!.delete(prev);
    if (this._counts) {
      const next = this._counted.get(this._screens[pos]);
      if (next != null) this._counts.add(next);
    }
  }

  // TODO - saveExcursion to snake a corridor around to target?
}

