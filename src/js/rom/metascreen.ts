import {Feature, MetascreenData} from './metascreendata.js';
import {Metatileset, Metatilesets} from './metatileset.js';
import {Screen} from './screen.js';
import {Rom} from '../rom.js';

export class Metascreen {
  private readonly _features = new Set<Feature>();
  private readonly _tilesets = new Set<Metatileset>();

  used = false;

  flag?: 'always' | 'calm' | 'cave';

  // TODO - make data private?
  constructor(readonly rom: Rom, readonly uid: number,
              readonly data: MetascreenData) {
    for (const tileset of Object.values(data.tilesets)) {
      if (!tileset!.requires) this.used = true;
    }
    for (const feature of data.feature || []) {
      this._features.add(feature);
    }
  }

  features(): Iterable<Feature> {
    return this._features.values();
  }

  hasFeature(feature: Feature): boolean {
    return this._features.has(feature);
  }

  /**
   * Replace occurrences of a metatile within this screen.
   */
  replace(from: number, to: number): Metascreen {
    const {tiles} = this.screen;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === from) tiles[i] = to;
    }
    return this;
  }

  remove() {
    // Remove self from all metatilesets.  Used by labyrinthVariant to
    // ensure impossible variants aren't added (note: with a dedicated
    // page we could make more available).
    for (const key in this.data.tilesets) {
      const tileset =
          this.rom.metatilesets[key as keyof Metatilesets] as Metatileset;
      tileset.deleteScreen(this);
    }
  }

  get id(): number {
    return this.data.id;
  }

  set id(id: number) {
    if (this.id === id) return;
    this.rom.metascreens.renumber(this.id, id);
  }

  get screen(): Screen {
    const {id, rom: {screens}} = this;
    return id < 0 ? screens.unallocated[~id] : screens[id];
  }

  // Only Metascreens.renumber should call this.
  unsafeSetId(id: number) {
    (this.data as {id: number}).id = id;
    for (const tileset of this._tilesets) {
      tileset.invalidate();
    }
  }
  // Only Metatileset.addScreen should call this.
  unsafeAddTileset(tileset: Metatileset) {
    this._tilesets.add(tileset);
  }
  // Only Metatileset.removeScreen should call this.
  unsafeRemoveTileset(tileset: Metatileset) {
    this._tilesets.delete(tileset);
  }
}
