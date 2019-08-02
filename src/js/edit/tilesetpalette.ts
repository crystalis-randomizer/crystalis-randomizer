// tileset palette

import {Rom} from '../rom.js';
import {Context} from './context.js';
import {Graphics} from './graphics.js';

export class TilesetPalette {
  // Selection context w/ current screen/tileset/patterns/etc?

  readonly el: HTMLDivElement;
  readonly rom: Rom;
  readonly graphics: Graphics;

  constructor(readonly context: Context) {
    this.rom = context.rom;
    this.graphics = context.graphics;
    const grid = this.el = document.createElement('div');
    grid.classList.add('tileset-palette-grid');
    // add event listener for drop events
    //grid.addEventListener('drop', (ev) => this.handleDrop(ev as DragEvent));
    grid.addEventListener('dragstart', (ev) => this.handleDragStart(ev as DragEvent));
    //grid.addEventListener('dragover', (ev) => ev.preventDefault());
    grid.addEventListener('click', (ev) => this.handleClick(ev as MouseEvent));
    // add 240 children
    for (let i = 0; i < 256; i++) {
      const img = document.createElement('img');
      img.dataset['index'] = String(i);
      img.draggable = true;
      grid.appendChild(img);
    }
    (async () => {
      for await (const update of context.updates()) {
        if (update.graphics) this.redraw();
      }
    })();
  }

  redraw() {
    const tileset = this.rom.tileset(this.context.tileset);
    for (let tile = 0; tile < 256; tile++) {
      let attr = tileset.attrs[tile];
      const pal = attr < 3 ? this.context.tilePalettes[attr] : 0x7f;
      (this.el.children[tile] as HTMLImageElement).src =
          this.graphics.metatile(tile, this.context.tilePatterns,
                                 this.context.tileset, pal);
    }
    this.el.style.background = this.graphics.paletteCss(this.context.tilePalettes[0]);
  }

  private handleDragStart(ev: DragEvent) {
    const target = ev.target as HTMLImageElement;
    if (!target.dataset['index']) return;
    const index = Number(target.dataset['index']);
    if (!ev.dataTransfer) throw new Error(`Expected data: ${ev}`);
    ev.dataTransfer.setData('application/json', JSON.stringify({
      'metatile': index,
      'png': target.src,
    }));
  }

  private handleClick(ev: MouseEvent) {
    const target = ev.target as HTMLImageElement;
    if (!target.dataset['index']) return;
    const index = Number(target.dataset['index']);
    if (ev.shiftKey) {
      this.context.selection = {
        'metatile': index,
        'png': target.src,
      };
    }
  }
}
