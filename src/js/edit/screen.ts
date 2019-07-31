// screen editor

import {Rom} from '../rom.js';
import {Graphics} from './graphics.js';

export class Screen {
  // Selection context w/ current screen/tileset/patterns/etc?
  screen: number = 0;
  tileset: number = 0x80;
  patterns: [number, number] = [0, 0];
  palettes: [number, number, number] = [0, 0, 0];

  constructor(readonly rom: Rom, readonly graphics: Graphics, readonly el: HTMLElement) {
    // remove all children from element, then add style
    while (el.firstChild) el.firstChild.remove();
    el.classList.add('screen-grid');
    // add event listener for drop events
    el.addEventListener('drop', (ev) => this.handleDrop(ev as DragEvent));
    el.addEventListener('dragstart', (ev) => this.handleDragStart(ev as DragEvent));
    el.addEventListener('dragover', (ev) => ev.preventDefault());
    // add 240 children
    for (let i = 0; i < 240; i++) {
      const img = document.createElement('img');
      img.dataset['index'] = String(i);
      img.draggable = true;
      el.appendChild(img);
    }
  }

  redraw() {
    const tiles = this.rom.screens[this.screen].tiles;
    const tileset = this.rom.tileset(this.tileset);
    for (let i = 0; i < 240; i++) {
      const tile = tiles[i];
      let attr = tileset.attrs[tile];
      const pal = attr < 3 ? this.palettes[attr] : 0x7f;
      (this.el.children[i] as HTMLImageElement).src =
          this.graphics.metatile(tile, this.patterns, this.tileset, pal);
    }
    this.el.style.background = this.graphics.paletteCss(this.palettes[0]);
  }

  private handleDragStart(ev: DragEvent) {
    console.log(`DRAG: `, ev);
    const target = ev.target as HTMLImageElement;
    if (!target.dataset['index']) return;
    const index = Number(target.dataset['index']);
    if (!ev.dataTransfer) throw new Error(`Expected data: ${ev}`);
    ev.dataTransfer.setData('application/json', JSON.stringify({
      'metatile': this.rom.screens[this.screen].tiles[index],
      'png': target.src,
    }));
  }

  private handleDrop(ev: DragEvent) {
    console.log(`DROP: `, ev);
    const target = ev.target as HTMLImageElement;
    if (!target.dataset['index']) return;
    const index = Number(target.dataset['index']);
    if (!ev.dataTransfer) throw new Error(`Expected data: ${ev}`);
    const json = JSON.parse(ev.dataTransfer.getData('application/json'));
    if ('metatile' in json) {
      // Figure out which map tile we're in.
      this.rom.screens[this.screen].tiles[index] = json['metatile'];
      target.src = json['png'];
    }
  }
}
