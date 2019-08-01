import {Rom} from '../rom.js';
import {Context} from './context.js';
import {ScreenEditor} from './screeneditor.js';
import {extendSwampScreens} from '../pass/shufflemazes.js';

async function main() {
  const el = document.getElementById('load-rom');
  if (!el) throw new Error(`element not found`);
  const rom = await Rom.load(undefined, (picker) => {
    el.classList.add('visible');
    el.appendChild(picker);
  });
  extendSwampScreens(rom);
  el.classList.remove('visible');

  const context = new Context(rom);
  new ScreenEditor(context, document.getElementById('screen-editor')!);

  // TODO - better UI for this
  (window as any).screen = (id: number) => {
    console.log(new Array(15).fill(0).map(
      (_, y) => rom.screens[id].tiles.slice(16 * y,16 * y + 16).map(
        x => x.toString(16).padStart(2, '0')).join(' ')).join('\n'));
  };
  // populate stuff?

  // TODO - project file?
}

main();
