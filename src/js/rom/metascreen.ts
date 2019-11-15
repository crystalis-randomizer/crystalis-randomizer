import {MetascreenData} from './metascreendata.js';
import {Metatileset, Metatilesets} from './metatileset.js';
import {Rom} from '../rom.js';

export class Metascreen {
  readonly screen?: number;

  used = false;

  flag?: 'always' | 'calm';

  // TODO - make data private?
  constructor(readonly rom: Rom, readonly data: MetascreenData) {
    this.screen = data.id;
    for (const tileset of Object.values(data.tilesets)) {
      if (!tileset!.requires) this.used = true;
    }
  }

  /**
   * Replace occurrences of a metatile within this screen.
   */
  replace(from: number, to: number): Metascreen {
    if (this.screen == null) throw new Error(`cannot replace unused screen`);
    const scr = this.rom.screens[this.screen];
    for (let i = 0; i < scr.tiles.length; i++) {
      if (scr.tiles[i] === from) scr.tiles[i] = to;
    }
    return this;
  }

  remove() {
    // Remove self from all metatilesets.
    for (const key in this.data.tilesets) {
      const tileset =
          this.rom.metatilesets[key as keyof Metatilesets] as Metatileset;
      tileset.screens.delete(this);
    }
  }

  get id(): number {
    return this.data.id;
  }

  set id(id: number) {
    if (this.id === id) return;
    this.rom.metascreens.renumber(this.id, id);
  }
}
