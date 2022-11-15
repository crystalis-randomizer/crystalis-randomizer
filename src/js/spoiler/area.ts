import {LocationMap} from './locationmap';
import {Terrain, debugLabel} from '../logic/terrain';
import {AreaData, WorldData} from '../logic/world';
import {Rom} from '../rom';
import {Location} from '../rom/location';
import {hex} from '../rom/util';

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
      option.textContent = `${hex(loc.id)} ${loc.name}`;
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
    map.overlayShade(0x55000000);
    for (const a of this.world.locations[location.id].areas) {
      if (a !== area) map.overlayArea(a.tiles, 0xffff0000);
    }
    map.overlayArea(area.tiles, 0xff00ffff, 0);
    map.render();
    return map.element;
  }

  // TODO - click handlers for world...?
  //      - field visibility is an issue...
  //      - toggle out to different area when click on it
  //      - list all checks, neighbors?  (click handlers on list?)

  // mode that only shows a location and no areas, click to find area.
}
