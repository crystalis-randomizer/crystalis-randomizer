import {LocationMap} from './locationmap.js';
import {Terrain, debugLabel} from '../logic/terrain.js';
import {TileId} from '../logic/tileid.js';
import {AreaData, WorldData} from '../logic/world.js';
import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';

// Basic idea: a simple controller with a navigable canvas.
//   Checks: [Leaf Elder ▽]
//   Areas: [1. Mezame Shrine (+ 5 others) 2040 tiles ▽]
//   Locations: [00 Mezame Shrine ▽]
//   Map of 1 or more locations ...

export class Area {

  area!: AreaData;
  element: HTMLDivElement;

  constructor(readonly rom: Rom, readonly world: WorldData) {
    this.element = document.createElement('div');
    this.element.addEventListener('click', (e: MouseEvent) => this.click(e));
    this.element.addEventListener('mousemove', (e: MouseEvent) => this.move(e));
    this.renderArea(0);
  }

  click(e: MouseEvent) {
    const data = LocationMap.getData(e);
    if (!data) return;
    let tile = this.world.tiles.get(data.tile);
    if (tile == null) return;
//     console.log(`Tile: ${data.tile.toString(16).padStart(6, '0')}
// area: ${tile.area} exit: ${tile.exit?.toString(16).padStart(6, '0')}
// `, tile);
    if (tile.area === this.area) {
      const exit = tile.exit != null ? this.world.tiles.get(tile.exit) : null;
      if (exit && exit.area !== this.area) {
        tile = exit;
      }
    }
    if (tile.area && tile.area !== this.area) {
      this.renderArea(tile.area.id);
    }
  }

  move(e: MouseEvent) {
    const data = LocationMap.getData(e);
    if (!data) return;
    const tile = this.world.tiles.get(data.tile);
    if (tile == null) return;
    const exit = tile.exit != null && !this.area.tiles.has(tile.exit);
    data.target.element.style.cursor = exit ? 'pointer' : 'default';
  }

  clear() {
    while (this.element.childNodes.length) {
      this.element.childNodes[0].remove();
    }
  }

  renderArea(index: number) {
    this.clear();
    const select = document.createElement('select');
    select.appendChild(document.createElement('option'));
    select.children[0].textContent = 'Select location';
    for (const loc of this.rom.locations) {
      if (!loc.used) continue;
      const area =
          this.world.locations[loc.id]?.areas[Symbol.iterator]().next().value;
      if (area == null) continue;
      const option = document.createElement('option');
      option.textContent = loc.name;
      option.value = String(area.id);
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      this.renderArea(Number(select.value));
    });
    this.element.appendChild(select);
    this.area = this.world.areas[index];
    const info = document.createElement('pre');
    info.textContent = `Area ${index}
Locations: ${this.area.locations.size}
Tiles: ${this.area.tiles.size}
Terrain: ${Terrain.label(this.area.terrain, this.rom)}
Checks:
  ${[...new Set(this.area.checks.map(([flag, req]) =>
                     `${flag.debug}: ${debugLabel(req, this.rom)}`))]
               .join('\n  ')}
Routes:
  ${debugLabel(this.area.routes, this.rom).split(' | ').join('\n  ')
    .replace(/[()]/g, '')}`;
    this.element.appendChild(info);
    for (const l of this.area.locations) {
      const location = this.rom.locations[l];
      const title = document.createElement('h2');
      title.textContent = location.name;
      this.element.appendChild(title);
      this.element.appendChild(this.makeLocation(this.area, location));
    }
  }

  makeLocation(area: AreaData, location: Location): HTMLDivElement {
    const map = new LocationMap(this.rom, location.id);
    map.maxWidth = 574;
    // Iterate through locations and add yellow borders.
    const line = (t: TileId, dy1: number, dx1: number) => {
      const [y0, x0] = yx(t);
      for (let dy = -1; dy < dy1; dy++) {
        const y = y0 + dy;
        for (let dx = -1; dx < dx1; dx++) {
          const x = x0 + dx;
          if (x >= 0 && y >= 0 && x < map.width && y < map.height) {
            map.overlay[y * map.width + x] = 0xff00ffff;
          }
        }
      }
    };
    const yx = (t: TileId) => {
      const ys = (t >> 12) & 15;
      const xs = (t >> 8) & 15;
      const yt = (t >> 4) & 15;
      const xt = t & 15;
      return [240 * ys + 16 * yt, 256 * xs + 16 * xt];
    }
    const hline = (t: TileId) => line(t, 1, 17);
    const vline = (t: TileId) => line(t, 17, 1);
    map.overlay.fill(0x55000000);
    for (const tile of area.tiles) {
      if (tile >>> 16 !== location.id) continue;
      const [y0, x0] = yx(tile);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          map.overlay[(y0 + y) * map.width + (x0 + x)] = 0;
        }
      }
      const tx = TileId.add(tile, 1, 0);
      const ty = TileId.add(tile, 0, 1);
      if (!area.tiles.has(TileId.add(tile, -1, 0))) hline(tile);
      if (!area.tiles.has(TileId.add(tile, 0, -1))) vline(tile);
      if (!area.tiles.has(tx)) hline(tx);
      if (!area.tiles.has(ty)) vline(ty);
    }
    map.render();
    return map.element;
  }

  // TODO - click handlers for world...?
  //      - field visibility is an issue...
  //      - toggle out to different area when click on it
  //      - list all checks, neighbors?  (click handlers on list?)

  // mode that only shows a location and no areas, click to find area.
}
