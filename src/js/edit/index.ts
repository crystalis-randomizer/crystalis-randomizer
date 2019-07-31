import {Rom} from '../rom.js';
import {Graphics} from './graphics.js';
import {ScreenEditor} from './screeneditor.js';

async function main() {
  const el = document.getElementById('load-rom');
if (!el) throw new Error(`element not found`);
  const rom = await Rom.load(undefined, (picker) => {
    el.classList.add('visible');
    el.appendChild(picker);
  });
  el.classList.remove('visible');

  const graphics = new Graphics(rom);
  new ScreenEditor(rom, graphics, document.getElementById('screen-editor')!);

  // populate stuff?

  // TODO - project file?
}

main();
