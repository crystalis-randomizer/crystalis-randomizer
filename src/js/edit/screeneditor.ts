import {Screen} from './screen.js';
import {Graphics} from './graphics.js';
import {Rom} from '../rom.js';
import {seq} from '../rom/util.js';
import { BackgroundAttrs } from './backgroundattrs.js';

export class ScreenEditor {

  bg: BackgroundAttrs;
  screen: Screen;

  constructor(readonly rom: Rom, readonly graphics: Graphics, readonly el: Element) {
    // Expect a SECTION element with class already.

    const screenEl = document.createElement('div');
    el.appendChild(screenEl);
    this.screen = new Screen(rom, graphics, screenEl);
  }
}


// TODO
//   - toggle for gridlines (border top/left)
//   - tileset palette
//   - undo???
//   - info on hover
//   - terrain effect overlays
//   - log hex values to console
