import {BackgroundAttrs} from './backgroundattrs';
import {Context} from './context';
import {Screen} from './screen';
import {TilesetPalette} from './tilesetpalette';

export class ScreenEditor {

  constructor(readonly context: Context, readonly el: Element) {
    // Expect a SECTION element with class already.
    el.appendChild(new BackgroundAttrs(context).el);
    let div = document.createElement('div');
    div.classList.add('row');
    el.appendChild(div);
    div.appendChild(new Screen(context).el);
    div.appendChild(new Screen(context).el);
    div = document.createElement('div');
    div.classList.add('row');
    el.appendChild(div);
    div.appendChild(new Screen(context, true).el);
    div.appendChild(new Screen(context, true).el);
    el.appendChild(new TilesetPalette(context).el);
  }
}


// TODO
//   - toggle for gridlines (border top/left)
//   - tileset palette
//   - undo???
//   - info on hover
//   - terrain effect overlays
//   - log hex values to console
