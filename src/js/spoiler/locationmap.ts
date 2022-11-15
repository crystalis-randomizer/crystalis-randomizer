// Renders a single location.

import {Canvas} from './canvas';
import {Rom} from '../rom';
import {Location} from '../rom/location';
import {Screen} from '../rom/screen';
import {TileId} from '../logic/tileid';

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
    // 4 layers:
    //   1. background tiles
    //   2. area lines
    //   3. sprites
    //   4. shading
    super(rom, 1, 1, 4);
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
    this.redraw();
  }

  get id() { return this.location.id; }
  set id(id: number) {
    this.location = this.rom.locations[id];
    this.height = (this.location.used ? this.location.height : 1) * 240;
    this.width = (this.location.used ? this.location.width : 1) * 256;
    this.ensureWidth();
    this.redraw();
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

  clearOverlay() {
    this.useLayer(1);
    this.fill(0);
    this.useLayer(3);
    this.fill(0);
    this.render();
  }

  overlayShade(color: number) {
    this.useLayer(3);
    this.fill(color);
  }

  overlayArea(area: Set<TileId>, borderColor: number, fillColor?: number) {
    for (const tile of area) {
      if (tile >>> 16 !== this.location.id) continue;
      const ys = (tile >>> 12) & 15;
      const xs = (tile >>> 8) & 15;
      const yt = (tile >>> 4) & 15;
      const xt = tile & 15;
      const y0 = 240 * ys + 16 * yt;
      const x0 = 256 * xs + 16 * xt;
      if (fillColor != null) {
        this.useLayer(3);
        this.rect(y0 - 1, x0 - 1, 18, 18, 0);
      }      
      this.useLayer(1);
      if (!area.has(TileId.add(tile, -1, 0))) {
        this.rect(y0 - 1, x0 - 1, 2, 18, borderColor);
      }
      if (!area.has(TileId.add(tile, 0, -1))) {
        this.rect(y0 - 1, x0 - 1, 18, 2, borderColor);
      }
      if (!area.has(TileId.add(tile, 1, 0))) {
        this.rect(y0 + 15, x0 - 1, 2, 18, borderColor);
      }
      if (!area.has(TileId.add(tile, 0, 1))) {
        this.rect(y0 - 1, x0 + 15, 18, 2, borderColor);
      }
    }
  }

  redraw() {
    this.useLayer(0);
    this.clear(this.location.tilePalettes[0]);
    // Draw the background
    for (let y = 0; y < this.location.height; y++) {
      for (let x = 0; x < this.location.width; x++) {
        const screenId = this.location.screens[y][x];
        this.drawScreen(this.rom.screens[screenId], y, x);
      }
    }
    // TODO - add monsters/chests
    this.useLayer(2);
    for (const spawn of this.location.spawns) {
      let offset = 0;
      let {x, y} = spawn;
      y -= spawn.yt & 0xf0;
      let metaspriteId: number|undefined;
      const frame = 0;
      if (spawn.isNpc()) {
        const npcData = this.rom.npcs[spawn.id];
        if (!npcData || !npcData.data) continue;
        x += 8;
        y += 12;
        metaspriteId = (((frame >> 5) + 2) & 3) | npcData.data[3];
      } else if (spawn.isChest()) {
        metaspriteId = 0xaa;
        // TODO - if it's a mimic, use 0x90 instead?
        // TODO - override pattern table for invisible chests?
      } else if (spawn.isMonster()) {
        const objData = this.rom.objects[spawn.monsterId];
        if (!objData) continue;
        metaspriteId = objData.metasprite;
        if (objData.action == 0x29) { // blob
          metaspriteId = frame & 32 ? 0x6b : 0x68;
        } else if ([0x2a, 0x5e].includes(objData.action)) {
          // directional walker (soldier, etc); also tower def mech (5e)
          metaspriteId = (((frame >> 5) + 2) & 3) | objData.data[31];
        }
      }
      if (spawn.patternBank) offset += 0x40;
      if (metaspriteId != null) {
        this.metasprite(y, x, metaspriteId, this.location.id, offset);
      }
    }
    this.render();
  }

  drawScreen(screen: Screen, ys: number, xs: number) {
    const y0 = ys * 240;
    const x0 = xs * 256;
    const tileset = this.rom.tilesets[this.location.tileset];
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
