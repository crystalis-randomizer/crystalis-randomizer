// screen editor

import {Rom} from '../rom.js';
import {makeInput} from './backgroundattrs.js';
import {Context} from './context.js';
import {Graphics} from './graphics.js';

export class Screen {
  // Selection context w/ current screen/tileset/patterns/etc?

  readonly el: HTMLDivElement;
  readonly grid: HTMLDivElement;
  readonly rom: Rom;
  readonly graphics: Graphics;

  screen: number = 0;

  constructor(readonly context: Context, invert: boolean = false) {
    this.rom = context.rom;
    this.graphics = context.graphics;
    const el = this.el = document.createElement('div');
    const grid = this.grid = document.createElement('div');
    if (invert) el.appendChild(grid);
    el.appendChild(makeInput(context, [], {
      get: (_) => this.screen,
      set: (_, s: number) => {
        this.screen = s;
        this.redraw();
      },
    }));
    if (!invert) el.appendChild(grid);
    grid.classList.add('screen-grid');
    // add event listener for drop events
    grid.addEventListener('drop', (ev) => this.handleDrop(ev as DragEvent));
    grid.addEventListener('dragstart', (ev) => this.handleDragStart(ev as DragEvent));
    grid.addEventListener('dragover', (ev) => ev.preventDefault());
    grid.addEventListener('click', (ev) => this.handleClick(ev as MouseEvent));
    // add 240 children
    for (let i = 0; i < 240; i++) {
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
    const tiles = this.rom.screens[this.screen].tiles;
    const tileset = this.rom.tileset(this.context.tileset);
    for (let i = 0; i < 240; i++) {
      let tile = tiles[i];
      if (tile < 0x20 && this.context.flag) tile = tileset.alternates[tile];
      let attr = tileset.attrs[tile];
      const pal = attr < 3 ? this.context.tilePalettes[attr] : 0x7f;
      (this.grid.children[i] as HTMLImageElement).src =
          this.graphics.metatile(tile, this.context.tilePatterns,
                                 this.context.tileset, pal);
    }
    this.grid.style.background = this.graphics.paletteCss(this.context.tilePalettes[0]);
  }

  private handleDragStart(ev: DragEvent) {
    const target = ev.target as HTMLImageElement;
    if (!target.dataset['index']) return;
    const index = Number(target.dataset['index']);
    if (!ev.dataTransfer) throw new Error(`Expected data: ${ev}`);
    ev.dataTransfer.setData('application/json', JSON.stringify({
      'metatile': this.rom.screens[this.screen].tiles[index],
      'png': target.src,
    }));
  }

  private handleClick(ev: MouseEvent) {
    const json: any = this.context.selection;
    const target = ev.target as HTMLImageElement;
    if (!target.dataset['index']) return;
    const index = Number(target.dataset['index']);
    if (ev.shiftKey) {
      this.context.selection = {
        'metatile': this.rom.screens[this.screen].tiles[index],
        'png': target.src,
      };
    } else if (json && json['metatile']) {
      this.rom.screens[this.screen].tiles[index] = json['metatile'];
      target.src = json['png'];
    }
  }

  private handleDrop(ev: DragEvent) {
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
