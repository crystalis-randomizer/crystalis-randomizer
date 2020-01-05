// Renders a single location.

import {Canvas} from './canvas.js';
import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';
import {Screen} from '../rom/screen.js';
import {TileId} from '../logic/tileid.js';

export interface LocationMouseData {
  target: LocationMap;
  tile: TileId;
  // TODO - entrance, exit, monsters, etc.
}

const DATA: unique symbol = Symbol('[LocationMap data]');
interface HasData {
  [DATA]: LocationMouseData;
}

export class LocationMap extends Canvas {

  static getData(e: unknown): LocationMouseData|undefined {
    return (e as unknown as HasData)[DATA];
  }

  static setData(e: unknown, data: LocationMouseData) {
    (e as unknown as HasData)[DATA] = data;
  }

  private location: Location;
  flags = new Set<number>();
  _maxWidth = Infinity;

  constructor(readonly rom: Rom, id = 0) {
    super(rom, 1, 1);
    const location = rom.locations[id];
    this.width = (location.used ? location.width : 1) * 256;
    this.height = (location.used ? location.height : 1) * 240;
    this.location = location;
    const mouseListener = (e: MouseEvent) => {
      let x = e.offsetX;
      let y = e.offsetY;
      let t = e.target as HTMLElement|null;
      while (t && t !== this.element) {
        // x += t.offsetLeft;
        // y += t.offsetTop;
        t = t.parentElement;
      }
      // NOTE: have to reapply scale/translate?!?
      if (!t) return;
      // x -= t.offsetLeft;
      // y -= t.offsetTop;
      const xs = x >> 8;
      const ys = Math.floor(y / 240);
      const xt = (x - 256 * xs) >> 4;
      const yt = (y - 240 * ys) >> 4;
      const locid = this.location.id;
      const tile = (locid << 16 | ys << 12 | xs << 8 | yt << 4 | xt) as TileId;
      LocationMap.setData(e, {tile, target: this});
    };
    this.element.addEventListener('mousemove', mouseListener);
    this.element.addEventListener('mousedown', mouseListener);
    this.element.addEventListener('mouseup', mouseListener);
    this.element.addEventListener('click', mouseListener);
    this.render();
  }

  get id() { return this.location.id; }
  set id(id: number) {
    this.location = this.rom.locations[id];
    this.height = (this.location.used ? this.location.height : 1) * 240;
    this.width = (this.location.used ? this.location.width : 1) * 256;
    this.ensureWidth();
    this.render();
  }

  get maxWidth() { return this._maxWidth; }
  set maxWidth(width: number) {
    this._maxWidth = width;
    this.ensureWidth();
  }

  ensureWidth() {
    if (this.width <= this._maxWidth) {
      this.element.style.transform = '';
      this.element.style.width = '';
      this.element.style.height = '';
      return;
    }
    const s = this._maxWidth / this.width;
    const t = (1 - s) * 50;
    this.element.style.transform = `translate(-${t}%,-${t}%) scale(${s})`;
    this.element.style.width = `${(this.width * s)}px`;
    this.element.style.height = `${(this.height * s)}px`;
  }

  render() {
    this.clear(this.location.tilePalettes[0]);
    // Draw the background
    for (let y = 0; y < this.location.height; y++) {
      for (let x = 0; x < this.location.width; x++) {
        const screenId = this.location.screens[y][x] | this.location.screenPage;
        this.renderScreen(this.rom.screens[screenId], y, x);
      }
    }
    // TODO - add monsters/chests?
    super.render();
  }

  renderScreen(screen: Screen, ys: number, xs: number) {
    const y0 = ys * 240;
    const x0 = xs * 256;
    const tileset = this.rom.tileset(this.location.tileset);
    let flag: number|undefined;
    let alwaysTrue = false;
    for (const f of this.location.flags) {
      if (f.xs === xs && f.ys === ys) {
        flag = f.flag;
        if (this.rom.flags[flag]?.logic.assumeTrue) alwaysTrue = true;
        break;
      }
    }
    for (let y = 0; y < 240; y += 16) {
      for (let x = 0; x < 16; x++) {
        let metatileId = screen.tiles[y | x];
        if (metatileId < 0x20 && (this.flags.has(flag!) || alwaysTrue)) {
          metatileId = tileset.alternates[metatileId];
        }
        this.metatile(y0 + y, x0 + x * 16, metatileId, this.location.id, 0);
      }
    }
  }
}
